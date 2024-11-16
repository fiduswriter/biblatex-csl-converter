import {
    BibFieldTypes,
    BibTypes,
    GroupObject,
    NodeArray,
    EntryObject,
    NameDictObject,
    RangeArray,
    LangidOptions,
} from "../const"
import {
    TeXSpecialChars,
    BiblatexAliasTypes,
    BiblatexFieldAliasTypes,
    BiblatexAliasOptions,
    DefaultCrossRefInheritance,
    TypeInheritance,
} from "./const"
import { BibLatexNameParser } from "./name-parser"
import { BibLatexLiteralParser } from "./literal-parser"
import { GroupParser } from "./group-parser"
import { splitTeXString } from "./tools"
import { edtfParse } from "../edtf-parser"

/** Parses files in BibTeX/BibLaTeX format
 */

/* Based on original work by Henrik Muehe (c) 2010,
 * licensed under the MIT license,
 * https://code.google.com/archive/p/bibtex-js/
 */

export interface ConfigObject {
    /**
     * - processUnknown (object [specifying content type for specific unknown]):
     *
     * Processes fields with names that are unknown, adding them to an `unknown_fields`
     * object to each entry.
     *
     * example:
     *   > a = new BibLatexParser(..., {processUnknown: true})
     *   > a.output
     *   {
     *       "0:": {
     *           ...
     *           unknown_fields: {
     *               ...
     *           }
     *       }
     *   }
     *
     *   > a = new BibLatexParser(..., {processUnknown: {commentator: 'l_name'}})
     *   > a.output
     *   {
     *       "0:": {
     *           ...
     *           unknown_fields: {
     *               commentator: [
     *                   {
     *                       given: ...,
     *                       family: ...
     *                   }
     *               ]
     *               ...
     *           }
     *       }
     *   }
     */
    processUnknown?: boolean | Record<string, string>
    /**
     * Processes fields with names that are known, but are not expected for the given bibtype,
     * adding them to an `unexpected_fields` object to each entry.
     */
    processUnexpected?: boolean
    processInvalidURIs?: boolean
    processComments?: boolean
    /**
     * Include source location to an `location` object on each entry
     *
     * example:
     *   > a = new BibLatexParser(..., {includeLocation: true})
     *   > a.output
     *   {
     *       "0:": {
     *           ...
     *           location: {
     *               start: 1,
     *               end: 42
     *           }
     *       }
     *   }
     */
    includeLocation?: boolean
    /**
     * Include source text to an `raw_text` property on each entry
     *
     * example:
     *   > a = new BibLatexParser(..., {includeRawText: true})
     *   > a.output
     *   {
     *       "0:": {
     *           ...
     *           raw_text: '@article{...}'
     *       }
     *   }
     */
    includeRawText?: boolean
    crossRefInheritance?: TypeInheritance[]
    includeUnusedNocase?: boolean
}

interface ErrorObject {
    type: string
    expected?: string
    found?: string
    line?: number
    key?: string
    entry?: string
    field?: string
    field_name?: string
    alias_of?: string
    alias_of_value?: unknown
    value?: string[] | string
    variable?: string
    type_name?: string
}

interface MatchOptionsObject {
    skipWhitespace: string | boolean
}

export interface BiblatexParseResult {
    entries: { [key: number]: EntryObject }
    errors: ErrorObject[]
    warnings: ErrorObject[]
    comments: string[]
    strings: Record<string, string>
    jabref: {
        groups: GroupObject[] | false
        meta: Record<string, string>
    }
}

type Month =
    | "JAN"
    | "FEB"
    | "MAR"
    | "APR"
    | "MAY"
    | "JUN"
    | "JUL"
    | "AUG"
    | "SEP"
    | "OCT"
    | "NOV"
    | "DEC"

const hasbackslash = /\\/

export interface BibDB {
    [key: number]: EntryObject
}

export class BibLatexParser {
    input: string
    config: ConfigObject
    pos: number
    startPosition = -1
    endPosition = -1
    entries: EntryObject[]
    currentKey: string | false
    currentEntry?: EntryObject
    currentType: string
    currentRawFields?: Record<string, unknown>
    bibDB: BibDB
    errors: ErrorObject[]
    warnings: ErrorObject[]
    months: {
        JAN: string
        FEB: string
        MAR: string
        APR: string
        MAY: string
        JUN: string
        JUL: string
        AUG: string
        SEP: string
        OCT: string
        NOV: string
        DEC: string
    }
    strings: Record<string, string>
    comments: string[]
    groupParser: GroupParser
    groups: GroupObject[] | false
    jabrefMeta: Record<string, string>
    jabref?: {
        groups: GroupObject[] | false
        meta: number
    }
    crossrefs: Record<string, string>

    constructor(input: string, config: ConfigObject = {}) {
        this.input = input
        this.config = config
        this.pos = 0
        this.entries = []
        this.bibDB = {}
        this.currentKey = false
        this.currentType = ""
        this.errors = []
        this.warnings = []
        this.comments = []
        this.strings = {}
        // These variables are expected to be defined by some bibtex sources.
        this.months = {
            JAN: "01",
            FEB: "02",
            MAR: "03",
            APR: "04",
            MAY: "05",
            JUN: "06",
            JUL: "07",
            AUG: "08",
            SEP: "09",
            OCT: "10",
            NOV: "11",
            DEC: "12",
        }
        this.groupParser = new GroupParser(this.entries)
        this.groups = false
        this.jabrefMeta = {}
        this.crossrefs = {}
    }

    isWhitespace(s: string): boolean {
        return s == " " || s == "\r" || s == "\t" || s == "\n"
    }

    error(data: ErrorObject): void {
        this.errors.push(
            Object.assign({}, data, {
                line: this.input.slice(0, this.pos).split("\n").length,
            })
        )
    }

    warning(data: ErrorObject): void {
        this.warnings.push(
            Object.assign({}, data, {
                line: this.input.slice(0, this.pos).split("\n").length,
            })
        )
    }

    match(
        s: string,
        options: MatchOptionsObject = { skipWhitespace: true }
    ): void {
        if (
            options.skipWhitespace === true ||
            options.skipWhitespace === "leading"
        ) {
            this.skipWhitespace()
        }
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            this.pos += s.length
        } else {
            this.error({
                type: "token_mismatch",
                expected: s,
                found: this.input.substring(this.pos, this.pos + s.length),
            })
        }
        if (
            options.skipWhitespace === true ||
            options.skipWhitespace === "trailing"
        ) {
            this.skipWhitespace()
        }
    }

    tryMatch(s: string): boolean {
        this.skipWhitespace()
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            return true
        } else {
            return false
        }
    }

    skipWhitespace(): void {
        while (this.isWhitespace(this.input[this.pos])) {
            this.pos++
        }
        if (this.input[this.pos] == "%") {
            while (this.input[this.pos] != "\n") {
                this.pos++
            }
            this.skipWhitespace()
        }
    }

    skipToNext(): boolean {
        while (this.input.length > this.pos && this.input[this.pos] != "@") {
            this.pos++
        }
        if (this.input.length == this.pos) {
            return false
        } else {
            return true
        }
    }

    valueBraces(): string {
        let bracecount = 0
        this.match("{", { skipWhitespace: "leading" })
        let string = ""
        while (this.pos < this.input.length) {
            switch (this.input[this.pos]) {
                case "\\":
                    string += this.input.substring(this.pos, this.pos + 2)
                    this.pos++
                    break
                case "}":
                    if (bracecount === 0) {
                        this.match("}")
                        return string
                    }
                    string += "}"
                    bracecount--
                    break
                case "{":
                    string += "{"
                    bracecount++
                    break
                default:
                    string += this.input[this.pos]
                    break
            }
            this.pos++
        }
        this.errors.push({ type: "unexpected_eof" })
        return string
    }

    valueQuotes(): string {
        this.match('"', { skipWhitespace: "leading" })
        let string = ""
        while (this.pos < this.input.length) {
            switch (this.input[this.pos]) {
                case "\\":
                    string += this.input.substring(this.pos, this.pos + 2)
                    this.pos++
                    break
                case '"':
                    this.match('"')
                    return string
                default:
                    string += this.input[this.pos]
                    break
            }
            this.pos++
        }
        this.errors.push({ type: "unexpected_eof" })
        return string
    }

    singleValue(): string {
        if (this.tryMatch("{")) {
            return this.valueBraces()
        } else if (this.tryMatch('"')) {
            return this.valueQuotes()
        } else {
            let k = this.key()
            const kUp = k.toUpperCase()
            if (this.strings[k.toUpperCase()]) {
                return this.strings[k.toUpperCase()]
            } else if (kUp in this.months) {
                return this.months[kUp as Month]
            } else if (k.match("^[0-9]+$")) {
                return k
            } else {
                const warning: ErrorObject = {
                    type: "undefined_variable",
                    variable: k,
                }
                if (this.currentEntry) {
                    warning.entry = this.currentEntry["entry_key"]
                }
                if (this.currentKey) {
                    warning.key = this.currentKey
                }
                this.warning(warning)
                // Using \u0870 as a delimiter for variables as they cannot be
                // used in regular latex code.
                return `\u0870${k}\u0870`
            }
        }
    }

    value(asis = false): string {
        let values: string[] = []
        values.push(this.singleValue())
        while (this.tryMatch("#")) {
            this.match("#")
            values.push(this.singleValue())
        }
        let joined = values.join("")
        if (!asis) joined = joined.replace(/[\t ]+/g, " ").trim()
        return joined
    }

    key(optional = false): string {
        let start = this.pos
        while (true) {
            if (this.pos == this.input.length) {
                this.error({ type: "runaway_key" })
                break
            }
            if (
                ["(", ")", ",", "{", "}", " ", "=", "\t", "\n"].includes(
                    this.input[this.pos]
                )
            ) {
                let key = this.input.substring(start, this.pos)
                if (optional && this.input[this.pos] != ",") {
                    this.skipWhitespace()
                    if (this.input[this.pos] != ",") {
                        this.pos = start
                        return ""
                    }
                }
                return key
            } else {
                this.pos++
            }
        }

        return ""
    }

    keyEqualsValue(asis = false): [string, string] | false {
        let key = this.key()
        if (!key.length) {
            const error: ErrorObject = {
                type: "cut_off_citation",
            }
            if (this.currentEntry) {
                error.entry = this.currentEntry["entry_key"]
                // The citation is not full, we remove the existing parts.
                this.currentEntry["incomplete"] = true
            }
            this.error(error)
            return false
        }
        this.currentKey = key.toLowerCase()
        if (this.tryMatch("=")) {
            this.match("=")
            const val = this.value(asis)
            if (this.currentKey) {
                return [this.currentKey, val]
            } else {
                return false
            }
        } else {
            const error: ErrorObject = {
                type: "missing_equal_sign",
            }
            if (this.currentEntry) {
                error.entry = this.currentEntry["entry_key"]
            }
            if (this.currentKey) {
                error.key = this.currentKey
            }
            this.error(error)
        }
        return false
    }

    keyValueList(): void {
        let kv = this.keyEqualsValue()
        if (!kv || !this.currentRawFields) {
            // Entry has no fields, so we delete it.
            // It was the last one pushed, so we remove the last one
            this.entries.pop()
            return
        }
        let rawFields = this.currentRawFields
        rawFields[kv[0]] = kv[1]
        while (this.tryMatch(",")) {
            this.match(",")
            //fixes problems with commas at the end of a list
            if (this.tryMatch("}") || this.tryMatch(")")) {
                break
            }
            kv = this.keyEqualsValue()
            if (!kv) {
                const error: ErrorObject = {
                    type: "key_value_error",
                }
                if (this.currentEntry) {
                    error.entry = this.currentEntry["entry_key"]
                }
                this.error(error)
                break
            }
            rawFields[kv[0]] = kv[1]
        }
    }

    processFields(): void {
        if (!this.currentEntry) {
            return
        }
        let rawFields = this.currentRawFields!
        let fields = this.currentEntry["fields"]

        if ("crossref" in rawFields) {
            this.crossrefs[this.currentEntry.entry_key] =
                rawFields.crossref as string
            delete rawFields.crossref
        }

        let date: string | undefined
        if (rawFields.date) {
            // date string has precedence
            date = rawFields.date as string
        } else if (rawFields.year) {
            // Extract just the year if month is invalid
            if (rawFields.month) {
                let month = rawFields.month as string
                if (
                    isNaN(parseInt(month)) &&
                    month.toUpperCase() in this.months
                ) {
                    month = this.months[month.toUpperCase() as Month]
                }
                month = month.replace(/~|–|—|\./g, "-")

                // Validate month format: MM or MM-DD
                // MM: 01-12
                // DD: 01-31 (simplified, not checking specific months)
                if (
                    /^(0?[1-9]|1[0-2])(?:-(0?[1-9]|[12]\d|3[01]))?$/.test(month)
                ) {
                    date = `${rawFields.year}-${month}`
                } else {
                    // Use just the year if month is invalid
                    date = `${rawFields.year}`

                    // Add warning about invalid month
                    this.warnings.push({
                        type: "invalid_month",
                        field_name: "month",
                        value: String(rawFields.month),
                        entry: this.currentEntry.entry_key,
                    })
                }
            } else {
                date = `${rawFields.year}`
            }
        }

        if (date) {
            let dateObj = edtfParse(date)
            if (dateObj.valid) {
                fields["date"] = dateObj.cleanedString
                delete rawFields.year
                delete rawFields.month
            } else if (rawFields.date) {
                const error: ErrorObject = {
                    type: "invalid_date",
                    field_name: "date",
                    value: rawFields.date as string,
                    entry: this.currentEntry.entry_key,
                }
                if (this.currentEntry) {
                    error.entry = this.currentEntry["entry_key"]
                }
                this.errors.push(error)
            } else if (rawFields.year) {
                // Always try to use year even if month was invalid
                const yearObj = edtfParse(rawFields.year as string)
                if (yearObj.valid) {
                    fields["date"] = yearObj.cleanedString
                    delete rawFields.year
                    // Add warning about invalid month
                    const warning: ErrorObject = {
                        type: "unknown_date",
                        field_name: "month",
                        value: String(rawFields.month),
                        entry: this.currentEntry.entry_key,
                    }
                    if (this.currentEntry) {
                        warning.entry = this.currentEntry["entry_key"]
                    }
                    this.warnings.push(warning)
                } else {
                    // Try to find a valid year in the string
                    const yearMatches = Array.from(
                        String(rawFields.year).matchAll(/\[?(\d{4})\]?/g)
                    )

                    // Handle non-bracketed dates
                    // If there are two years, take the non-bracketed one
                    // If there is only one year, return it

                    let mainYearMatch = yearMatches.find(
                        (yearMatch) => !/[[\]]/.test(yearMatch[0])
                    )

                    if (mainYearMatch) {
                        // Handle bracketed dates (original publication dates)
                        const bracketedYearMatch = yearMatches.find(
                            (yearMatch) => /[[\]]/.test(yearMatch[0])
                        )
                        if (bracketedYearMatch) {
                            fields["origdate"] = bracketedYearMatch[1]
                        }
                    } else if (yearMatches.length) {
                        mainYearMatch = yearMatches[0]
                    }

                    if (mainYearMatch) {
                        fields["date"] = mainYearMatch[1]
                        delete rawFields.year
                    } else {
                        // Add warning about invalid year
                        const warning: ErrorObject = {
                            type: "unknown_date",
                            field_name: "year",
                            value: String(rawFields.year),
                            entry: this.currentEntry.entry_key,
                        }
                        if (this.currentEntry) {
                            warning.entry = this.currentEntry["entry_key"]
                        }
                        this.warnings.push(warning)
                    }
                }
            }
        }
        // Check for English language. If the citation is in English language,
        // titles may use case preservation.
        let langEnglish = true // By default we assume everything to be written in English.
        if (rawFields.langid && (rawFields.langid as string).length) {
            let langString = (rawFields.langid as string).toLowerCase().trim()
            let englishOptions = [
                "english",
                "american",
                "british",
                "usenglish",
                "ukenglish",
                "canadian",
                "australian",
                "newzealand",
            ]
            if (
                !englishOptions.some((option) => {
                    return langString === option
                })
            ) {
                langEnglish = false
            }
        } else if (rawFields.language) {
            // langid and language. The two mean different things, see discussion https://forums.zotero.org/discussion/33960/biblatex-import-export-csl-language-biblatex-langid
            // but in bibtex, language is often used for what is essentially langid.
            // If there is no langid, but a language, and the language happens to be
            // a known langid, set the langid to be equal to the language.
            let langid = this._reformKey(rawFields.language as string, "langid")
            if (langid.length) {
                fields["langid"] = langid
                if (
                    typeof langid === "string" &&
                    ![
                        "usenglish",
                        "ukenglish",
                        "caenglish",
                        "auenglish",
                        "nzenglish",
                    ].includes(langid)
                ) {
                    langEnglish = false
                }
            }
        }

        iterateFields: for (let bKey in rawFields) {
            if (
                bKey === "date" ||
                (["year", "month"].includes(bKey) &&
                    !this.config.processUnknown)
            ) {
                // Handled above
                continue iterateFields
            }

            // Replace alias fields with their main term.
            let aliasKey: string | undefined
            if (bKey in BiblatexFieldAliasTypes) {
                aliasKey =
                    BiblatexFieldAliasTypes[
                        bKey as keyof typeof BiblatexFieldAliasTypes
                    ]
            }

            let fKey = ""
            if (aliasKey) {
                if (rawFields[aliasKey]) {
                    const warning: ErrorObject = {
                        type: "alias_creates_duplicate_field",
                        field: bKey,
                        alias_of: aliasKey,
                        value: rawFields[bKey] as string | string[] | undefined,
                        alias_of_value: rawFields[aliasKey],
                    }
                    if (this.currentEntry) {
                        warning.entry = this.currentEntry["entry_key"]
                    }
                    this.warning(warning)
                    continue iterateFields
                }

                fKey =
                    Object.keys(BibFieldTypes).find((ft) => {
                        return (
                            BibFieldTypes[ft as keyof typeof BibFieldTypes]
                                .biblatex === aliasKey
                        )
                    }) || ""
            } else {
                fKey =
                    Object.keys(BibFieldTypes).find((ft) => {
                        return (
                            BibFieldTypes[ft as keyof typeof BibFieldTypes]
                                .biblatex === bKey
                        )
                    }) || ""
            }

            let oFields: Record<string, unknown>, fType: string
            let bType =
                BibTypes[this.currentEntry["bib_type"] as keyof typeof BibTypes]

            if (!fKey.length) {
                const warning: ErrorObject = {
                    type: "unknown_field",
                    field_name: bKey,
                }
                if (this.currentEntry) {
                    warning.entry = this.currentEntry["entry_key"]
                }
                this.warning(warning)
                if (!this.config.processUnknown) {
                    continue iterateFields
                }
                if (this.currentEntry && !this.currentEntry["unknown_fields"]) {
                    this.currentEntry["unknown_fields"] = {}
                }
                oFields =
                    this.currentEntry && this.currentEntry["unknown_fields"]
                        ? this.currentEntry["unknown_fields"]
                        : {}
                fType =
                    this.config.processUnknown &&
                    typeof this.config.processUnknown === "object" &&
                    this.config.processUnknown[bKey]
                        ? this.config.processUnknown[bKey]
                        : "f_literal"
                fKey = bKey
            } else if (
                bType["required"].includes(fKey) ||
                bType["optional"].includes(fKey) ||
                bType["eitheror"].includes(fKey)
            ) {
                oFields = fields
                fType =
                    BibFieldTypes[fKey as keyof typeof BibFieldTypes]["type"]
            } else if (fKey === "entrysubtype" && bType["biblatex-subtype"]) {
                fType = BibFieldTypes[fKey]["type"]
                oFields = {}
                continue iterateFields
            } else {
                const warning: ErrorObject = {
                    type: "unexpected_field",
                    field_name: bKey,
                }
                if (this.currentEntry) {
                    warning.entry = this.currentEntry["entry_key"]
                }
                this.warning(warning)
                if (!this.config.processUnexpected) {
                    continue iterateFields
                }
                if (
                    this.currentEntry &&
                    !this.currentEntry["unexpected_fields"]
                ) {
                    this.currentEntry["unexpected_fields"] = {}
                }
                oFields =
                    this.currentEntry && this.currentEntry["unexpected_fields"]
                        ? this.currentEntry["unexpected_fields"]
                        : {}
                fType =
                    BibFieldTypes[fKey as keyof typeof BibFieldTypes]["type"]
            }

            let fValue = rawFields[bKey],
                reformedValue
            switch (fType) {
                case "f_date":
                    reformedValue = edtfParse(fValue as string)
                    if (reformedValue.valid) {
                        oFields[fKey] = reformedValue.cleanedString
                    } else if (this.currentEntry) {
                        this.error({
                            type: "unknown_date",
                            entry: this.currentEntry["entry_key"],
                            field_name: fKey,
                            value: fValue as string | string[] | undefined,
                        })
                    }
                    break
                case "f_integer":
                    oFields[fKey] = this._reformLiteral(fValue as string)
                    break
                case "f_key":
                    reformedValue = this._reformKey(fValue as string, fKey)
                    if (reformedValue.length) {
                        oFields[fKey] = reformedValue
                    }
                    break
                case "f_literal":
                case "f_long_literal":
                    oFields[fKey] = this._reformLiteral(fValue as string)
                    break
                case "l_range":
                    oFields[fKey] = this._reformRange(fValue as string)
                    break
                case "f_title":
                    oFields[fKey] = this._reformLiteral(
                        fValue as string,
                        langEnglish
                    )
                    break
                case "f_uri":
                    if (
                        this.config.processInvalidURIs ||
                        this._checkURI(fValue as string)
                    ) {
                        oFields[fKey] = this._reformURI(fValue as string)
                    } else {
                        const error: ErrorObject = {
                            type: "unknown_uri",
                            field_name: fKey,
                            value: fValue as string | string[] | undefined,
                        }
                        if (this.currentEntry) {
                            error.entry = this.currentEntry["entry_key"]
                        }
                        this.error(error)
                    }
                    break
                case "f_verbatim":
                    oFields[fKey] = fValue
                    break
                case "l_key":
                    oFields[fKey] = splitTeXString(fValue as string).map(
                        (keyField) => this._reformKey(keyField, fKey)
                    )
                    break
                case "l_tag":
                    oFields[fKey] = (fValue as string)
                        .split(/[,;]/)
                        .map((string) => string.trim())
                    break
                case "l_literal":
                    oFields[fKey] = splitTeXString(fValue as string).map(
                        (item) => this._reformLiteral(item.trim())
                    )
                    break
                case "l_name":
                    oFields[fKey] = this._reformNameList(fValue as string)
                    break
                default:
                    // Something must be wrong in the code.
                    console.warn(`Unrecognized type: ${fType}!`)
            }
        }
    }

    _reformKey(keyString: string, fKey: string): string | NodeArray {
        let keyValue = keyString.trim().toLowerCase()
        let fieldType = BibFieldTypes[fKey as keyof typeof BibFieldTypes]
        if (
            BiblatexAliasOptions[fKey as keyof typeof BiblatexAliasOptions] &&
            (BiblatexAliasOptions as Record<string, Record<string, string>>)[
                fKey
            ][keyValue]
        ) {
            keyValue = (
                BiblatexAliasOptions as Record<string, Record<string, string>>
            )[fKey][keyValue]
        }
        if ("options" in fieldType) {
            if (Array.isArray(fieldType["options"])) {
                if (fieldType["options"].includes(keyValue)) {
                    return keyValue
                }
            } else {
                let optionValue = Object.keys(fieldType["options"]!).find(
                    (key) => {
                        return (
                            (fieldType.options as LangidOptions)[key][
                                "biblatex"
                            ] === keyValue
                        )
                    }
                )
                if (optionValue) {
                    return optionValue
                } else {
                    return ""
                }
            }
        }
        if ("strict" in fieldType && fieldType.strict) {
            const warning: ErrorObject = {
                type: "unknown_key",
                field_name: fKey,
                value: keyString,
            }
            if (this.currentEntry) {
                warning.entry = this.currentEntry["entry_key"]
            }
            this.warning(warning)
            return ""
        }
        return this._reformLiteral(keyString)
    }

    _checkURI(uriString: string): boolean {
        /* Copyright (c) 2010-2013 Diego Perini, MIT licensed
           https://gist.github.com/dperini/729294
         */
        return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
            uriString
        )
    }

    _reformURI(uriString: string): string {
        return uriString.replace(/\\/g, "")
    }

    _reformNameList(nameString: string): NameDictObject[] {
        const people = splitTeXString(nameString)
        const names = people.map((person) => {
            const nameParser = new BibLatexNameParser(person, this.config),
                name = nameParser.output
            if (name) {
                return name
            } else {
                return false
            }
        })
        const result: NameDictObject[] = names.filter(
            (name: NameDictObject | false) => {
                return typeof name === "object"
            }
        ) as NameDictObject[]
        return result
    }

    _reformRange(rangeString: string): RangeArray[] {
        return rangeString.split(",").map((string) => {
            let parts = string.split("--")
            if (parts.length > 1) {
                return [
                    this._reformLiteral(parts.shift()!.trim()),
                    this._reformLiteral(parts.join("--").trim()),
                ]
            } else {
                parts = string.split("-")
                if (parts.length > 1) {
                    return [
                        this._reformLiteral(parts.shift()!.trim()),
                        this._reformLiteral(parts.join("-").trim()),
                    ]
                } else {
                    return [this._reformLiteral(string.trim())]
                }
            }
        })
    }

    _reformLiteral(theValue: string, cpMode = false): NodeArray {
        const parser = new BibLatexLiteralParser(theValue, this.config, cpMode)
        return parser.output
    }

    bibType(): string {
        let biblatexType = this.currentType
        let biblatexSubtype = this.currentRawFields?.entrysubtype || false
        if (biblatexType in BiblatexAliasTypes) {
            const aliasType: string[] = (
                BiblatexAliasTypes as Record<string, string[]>
            )[biblatexType]
            biblatexType = aliasType[0]
            if (aliasType.length > 1) {
                biblatexSubtype = aliasType[1]
            }
        }

        let bibType
        if (
            biblatexType in BibTypes &&
            (!biblatexSubtype ||
                BibTypes[biblatexType]["biblatex-subtype"] === biblatexSubtype)
        ) {
            bibType = biblatexType
        } else {
            bibType = Object.keys(BibTypes).find((bType) => {
                return (
                    BibTypes[bType]["biblatex"] === biblatexType &&
                    (!biblatexSubtype ||
                        BibTypes[bType]["biblatex-subtype"] === biblatexSubtype)
                )
            })
        }

        if (typeof bibType === "undefined") {
            this.warning({
                type: "unknown_type",
                type_name: biblatexType,
            })
            bibType = "misc"
        }

        return bibType
    }

    createNewEntry(): void {
        const currentEntry: EntryObject = {
            bib_type: "",
            entry_key: this.key(true),
            fields: {},
        }
        this.currentRawFields = {}
        this.entries.push(currentEntry)
        if (currentEntry && currentEntry["entry_key"].length) {
            this.match(",")
        }
        this.keyValueList()
        this.endPosition = this.pos
        currentEntry["bib_type"] = this.bibType()
        if (this.config.includeLocation) {
            currentEntry["location"] = {
                start: this.startPosition,
                end: this.endPosition,
            }
        }
        if (this.config.includeRawText) {
            currentEntry["raw_text"] = this.input.substring(
                this.startPosition,
                this.endPosition + 1
            )
        }
        this.currentEntry = currentEntry
        this.processFields()
    }

    directive(): string | null {
        this.match("@")
        this.currentType = this.key()
        if (!this.currentType.length) return null
        this.currentType = this.currentType.toLowerCase()
        return "@" + this.currentType
    }

    string(): void {
        const kv = this.keyEqualsValue(true)
        if (kv) {
            this.strings[kv[0].toUpperCase()] = kv[1]
        }
    }

    preamble(): void {
        this.value()
    }

    replaceTeXChars(): void {
        let value = this.input
        let len = TeXSpecialChars.length
        for (let i = 0; i < len; i++) {
            if (!hasbackslash.test(value)) break
            let texChar = TeXSpecialChars[i]
            value = value.replace(texChar.tex, texChar.unicode)
        }
        // Delete multiple spaces
        this.input = value.replace(/ +(?= )/g, "")
        return
    }

    stepThroughBibtex(): void {
        while (this.skipToNext()) {
            this.parseNext()
        }
    }

    stepThroughBibtexAsync(): Promise<null> {
        return this.skipToNext()
            ? new Promise((resolve) => resolve(this.parseNext())).then(() =>
                  this.stepThroughBibtexAsync()
              )
            : Promise.resolve(null)
    }

    parseNext(): void {
        let closer
        this.startPosition = this.pos
        let d = this.directive()
        if (!d) return

        if (this.tryMatch("{")) {
            this.match("{")
            closer = "}"
        } else if (this.tryMatch("(")) {
            // apparently, references can also be surrended with round braces
            this.match("(")
            closer = ")"
        } else if (d === "@comment") {
            // braceless comments are a thing it appears
            closer = null
        } else {
            this.match("{")
            closer = "}"
        }

        if (d == "@string") {
            this.string()
        } else if (d == "@preamble") {
            this.preamble()
        } else if (d == "@comment") {
            this.parseComment(!closer)
        } else {
            this.createNewEntry()
        }

        if (closer) this.match(closer)
    }

    parseComment(braceless: boolean): void {
        let start = this.pos
        let braces = 1

        if (braceless) {
            while (
                this.input.length > this.pos &&
                this.input[this.pos] != "\n"
            ) {
                this.pos++
            }
        } else {
            while (this.input.length > this.pos && braces > 0) {
                switch (this.input[this.pos]) {
                    case "{":
                        braces += 1
                        break
                    case "}":
                        braces -= 1
                }
                this.pos++
            }
        }

        // no ending brace found
        if (braceless || braces !== 0) {
            return
        }

        // leave the ending brace for the main parser to pick up
        this.pos--
        let comment = this.input.substring(start, this.pos)
        this.groupParser.checkString(comment)
        if (this.groupParser.groups.length) {
            this.groups = this.groupParser.groups
        } else {
            comment = comment.trim()
            const m = comment.match(/^jabref-meta: ([a-zA-Z]+):(.*);$/)
            if (m && m[1] !== "groupsversion") {
                this.jabrefMeta[m[1]] = m[2].replace(/\\(.)/g, "$1")
            } else if (comment && this.config.processComments) {
                this.comments.push(comment)
            }
        }
    }

    createBibDB(): void {
        this.entries.forEach((entry, index) => {
            // Start index from 1 to create less issues with testing
            this.bibDB[index + 1] = entry
        })
    }

    cleanDB(): void {
        this.bibDB = JSON.parse(
            JSON.stringify(this.bibDB)
                .replace(/\u0871/, "\\\\") // Backslashes placed outside of literal fields
                .replace(/\u0870/, "") // variable start/end outside of literal fields
        )
    }

    get output(): BibDB {
        console.warn(
            "BibLatexParser.output will be deprecated in biblatex-csl-converter 2.x. Use BibLatexParser.parse() instead."
        )
        this.replaceTeXChars()
        this.stepThroughBibtex()
        this.createBibDB()
        this.cleanDB()
        return this.bibDB
    }

    _resolveCrossRef(key: string, parentKey: string): void {
        const entry = this.entries.find((e) => e.entry_key === key)!
        const parent = this.entries.find((e) => e.entry_key === parentKey)!
        const { fields: entryFields, bib_type } = entry
        const { fields: parentFields, bib_type: parentType } = parent

        const inhertitedFields: Record<string, unknown> = {}

        const inhertance =
            this.config.crossRefInheritance ?? DefaultCrossRefInheritance

        for (const ti of inhertance) {
            if (
                ti.source.includes(parentType) &&
                ti.target.includes(bib_type)
            ) {
                for (const fi of ti.fields) {
                    const field = fi.target
                    const bt = BibTypes[bib_type]
                    if (
                        bt.required.includes(field) ||
                        bt.optional.includes(field) ||
                        bt.eitheror.includes(field)
                    ) {
                        inhertitedFields[field] = parentFields[fi.source]
                    }
                }
            }
        }

        const fields = {
            ...parentFields,
            ...inhertitedFields,
            ...entryFields,
        }

        entry.fields = fields
    }

    _resoveAllCrossRefs(): void {
        const toResolve = new Set<string>(Object.keys(this.crossrefs))
        while (toResolve.size > 0) {
            const queue = new Set<string>(
                [...toResolve.values()].filter(
                    (k) => !toResolve.has(this.crossrefs[k])
                )
            )
            if (queue.size === 0) {
                const entry = toResolve.values().next().value
                // TODO: More precise error
                this.errors.push({ type: "circular_crossref", entry })
                return
            }
            const key = queue.values().next().value as string
            const parent = this.crossrefs[key]
            if (!this.entries.some((e) => e.entry_key === parent)) {
                this.errors.push({
                    type: "unknown_crossref",
                    entry: key,
                    value: parent,
                })
                return
            }

            this._resolveCrossRef(key, parent)
            queue.delete(key)
            toResolve.delete(key)
        }
    }

    parsed(): BiblatexParseResult {
        this.createBibDB()
        this._resoveAllCrossRefs()
        this.cleanDB()

        return {
            entries: this.bibDB,
            errors: this.errors,
            warnings: this.warnings,
            comments: this.comments,
            strings: this.strings,
            jabref: {
                groups: this.groups,
                meta: this.jabrefMeta,
            },
        }
    }

    parse(): BiblatexParseResult {
        this.replaceTeXChars()

        this.stepThroughBibtex()
        return this.parsed()
    }

    async parseAsync(): Promise<BiblatexParseResult> {
        this.replaceTeXChars()
        await this.stepThroughBibtexAsync()
        return this.parsed()
    }
}

export function parse(
    input: string,
    config: ConfigObject = {}
): BiblatexParseResult {
    return new BibLatexParser(input, config).parse()
}

export function parseAsync(
    input: string,
    config: ConfigObject = {}
): Promise<BiblatexParseResult> {
    return new BibLatexParser(input, config).parseAsync()
}
