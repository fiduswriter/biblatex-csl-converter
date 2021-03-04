import { BibFieldTypes, BibTypes } from "../const";
import {
    TeXSpecialChars,
    BiblatexAliasTypes,
    BiblatexFieldAliasTypes,
    BiblatexAliasOptions,
} from "./const";
import { BibLatexNameParser } from "./name-parser";
import { BibLatexLiteralParser } from "./literal-parser";
import { GroupParser } from "./group-parser";
import { splitTeXString } from "./tools";
import { edtfParse } from "../edtf-parser";

/** Parses files in BibTeX/BibLaTeX format
 */

/* Based on original work by Henrik Muehe (c) 2010,
 * licensed under the MIT license,
 * https://code.google.com/archive/p/bibtex-js/
 */

/* Config options (default value for every option is false)

    - processUnexpected (false/true):

    Processes fields with names that are known, but are not expected for the given bibtype,
    adding them to an `unexpected_fields` object to each entry.

    - processUnknown (false/true/object [specifying content type for specific unknown]):

    Processes fields with names that are unknown, adding them to an `unknown_fields`
    object to each entry.

    example:
        > a = new BibLatexParser(..., {processUnknown: true})
        > a.output
        {
            "0:": {
                ...
                unknown_fields: {
                    ...
                }
            }
        }

        > a = new BibLatexParser(..., {processUnknown: {commentator: 'l_name'}})
        > a.output
        {
            "0:": {
                ...
                unknown_fields: {
                    commentator: [
                        {
                            given: ...,
                            family: ...
                        }
                    ]
                    ...
                }
            }
        }
  */

import type {
    GroupObject,
    NodeObject,
    NodeArray,
    EntryObject,
    NameDictObject,
    RangeArray,
} from "../const";

interface ConfigObject {
    processUnknown?: any;
    processUnexpected?: boolean;
    processInvalidURIs?: boolean;
    processComments?: boolean;
}

interface ErrorObject {
    type: string;
    expected?: string;
    found?: string;
    line?: number;
    key?: string;
    entry?: string;
    field?: string;
    field_name?: string;
    alias_of?: string;
    alias_of_value?: any;
    value?: Array<string> | string;
    variable?: string;
    type_name?: string;
}

interface MatchOptionsObject {
    skipWhitespace: string | boolean;
}

export interface BiblatexParseResult {
    entries: { [key: number]: EntryObject };
    errors: ErrorObject[];
    warnings: ErrorObject[];
    comments: string[];
    strings: {
        [key: string]: string;
    };
    jabref: {
        groups: Array<GroupObject> | false;
        meta: {
            [key: string]: string;
        };
    };
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
    | "DEC";

const hasbackslash = /\\/;

export interface BibDB {
    [key: number]: EntryObject;
}

export class BibLatexParser {
    input: string;
    config: ConfigObject;
    pos: number;
    entries: Array<EntryObject>;
    currentKey: string | false;
    currentEntry?: EntryObject;
    currentType: string;
    currentRawFields: {
        [key: string]: any;
    };
    bibDB: BibDB;
    errors: Array<ErrorObject>;
    warnings: Array<ErrorObject>;
    months: {
        JAN: string;
        FEB: string;
        MAR: string;
        APR: string;
        MAY: string;
        JUN: string;
        JUL: string;
        AUG: string;
        SEP: string;
        OCT: string;
        NOV: string;
        DEC: string;
    };
    strings: {
        [key: string]: string;
    };
    comments: Array<string>;
    groupParser: GroupParser;
    groups: Array<GroupObject> | false;
    jabrefMeta: {
        [key: string]: string;
    };
    jabref: {
        groups: Array<GroupObject> | false;
        meta: number;
    };

    constructor(input: string, config: ConfigObject = {}) {
        this.input = input;
        this.config = config;
        this.pos = 0;
        this.entries = [];
        this.bibDB = {};
        this.currentKey = false;
        this.currentEntry = null;
        this.currentType = "";
        this.errors = [];
        this.warnings = [];
        this.comments = [];
        this.strings = {};
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
        };
        this.groupParser = new GroupParser(this.entries);
        this.groups = false;
        this.jabrefMeta = {};
    }

    isWhitespace(s: string) {
        return s == " " || s == "\r" || s == "\t" || s == "\n";
    }

    error(data: ErrorObject) {
        this.errors.push(
            Object.assign({}, data, {
                line: this.input.slice(0, this.pos).split("\n").length,
            })
        );
    }

    warning(data: ErrorObject) {
        this.warnings.push(
            Object.assign({}, data, {
                line: this.input.slice(0, this.pos).split("\n").length,
            })
        );
    }

    match(s: string, options: MatchOptionsObject = { skipWhitespace: true }) {
        if (
            options.skipWhitespace === true ||
            options.skipWhitespace === "leading"
        ) {
            this.skipWhitespace();
        }
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            this.pos += s.length;
        } else {
            this.error({
                type: "token_mismatch",
                expected: s,
                found: this.input.substring(this.pos, this.pos + s.length),
            });
        }
        if (
            options.skipWhitespace === true ||
            options.skipWhitespace === "trailing"
        )
            this.skipWhitespace();
    }

    tryMatch(s: string) {
        this.skipWhitespace();
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            return true;
        } else {
            return false;
        }
    }

    skipWhitespace() {
        while (this.isWhitespace(this.input[this.pos])) {
            this.pos++;
        }
        if (this.input[this.pos] == "%") {
            while (this.input[this.pos] != "\n") {
                this.pos++;
            }
            this.skipWhitespace();
        }
    }

    skipToNext() {
        while (this.input.length > this.pos && this.input[this.pos] != "@") {
            this.pos++;
        }
        if (this.input.length == this.pos) {
            return false;
        } else {
            return true;
        }
    }

    valueBraces() {
        let bracecount = 0;
        this.match("{", { skipWhitespace: "leading" });
        let string = "";
        while (this.pos < this.input.length) {
            switch (this.input[this.pos]) {
                case "\\":
                    string += this.input.substring(this.pos, this.pos + 2);
                    this.pos++;
                    break;
                case "}":
                    if (bracecount === 0) {
                        this.match("}");
                        return string;
                    }
                    string += "}";
                    bracecount--;
                    break;
                case "{":
                    string += "{";
                    bracecount++;
                    break;
                default:
                    string += this.input[this.pos];
                    break;
            }
            this.pos++;
        }
        this.errors.push({ type: "unexpected_eof" });
        return string;
    }

    valueQuotes() {
        this.match('"', { skipWhitespace: "leading" });
        let string = "";
        while (this.pos < this.input.length) {
            switch (this.input[this.pos]) {
                case "\\":
                    string += this.input.substring(this.pos, this.pos + 2);
                    this.pos++;
                    break;
                case '"':
                    this.match('"');
                    return string;
                default:
                    string += this.input[this.pos];
                    break;
            }
            this.pos++;
        }
        this.errors.push({ type: "unexpected_eof" });
        return string;
    }

    singleValue(): string {
        if (this.tryMatch("{")) {
            return this.valueBraces();
        } else if (this.tryMatch('"')) {
            return this.valueQuotes();
        } else {
            let k = this.key();
            const kUp = k.toUpperCase();
            if (this.strings[k.toUpperCase()]) {
                return this.strings[k.toUpperCase()];
            } else if (kUp in this.months) {
                return this.months[kUp as Month];
            } else if (k.match("^[0-9]+$")) {
                return k;
            } else {
                const warning: ErrorObject = {
                    type: "undefined_variable",
                    variable: k,
                };
                if (this.currentEntry) {
                    warning.entry = this.currentEntry["entry_key"];
                }
                if (this.currentKey) {
                    warning.key = this.currentKey;
                }
                this.warning(warning);
                // Using \u0870 as a delimiter for variables as they cannot be
                // used in regular latex code.
                return `\u0870${k}\u0870`;
            }
        }
    }

    value(asis: boolean = false) {
        let values: string[] = [];
        values.push(this.singleValue());
        while (this.tryMatch("#")) {
            this.match("#");
            values.push(this.singleValue());
        }
        let joined = values.join("");
        if (!asis) joined = joined.replace(/[\t ]+/g, " ").trim();
        return joined;
    }

    key(optional: boolean = false): string {
        let start = this.pos;
        while (true) {
            if (this.pos == this.input.length) {
                this.error({ type: "runaway_key" });
                break;
            }
            if (
                ["(", ")", ",", "{", "}", " ", "=", "\t", "\n"].includes(
                    this.input[this.pos]
                )
            ) {
                let key = this.input.substring(start, this.pos);
                if (optional && this.input[this.pos] != ",") {
                    this.skipWhitespace();
                    if (this.input[this.pos] != ",") {
                        this.pos = start;
                        return "";
                    }
                }
                return key;
            } else {
                this.pos++;
            }
        }

        return "";
    }

    keyEqualsValue(asis: boolean = false): [string, string] | false {
        let key = this.key();
        if (!key.length) {
            const error: ErrorObject = {
                type: "cut_off_citation",
            };
            if (this.currentEntry) {
                error.entry = this.currentEntry["entry_key"];
                // The citation is not full, we remove the existing parts.
                this.currentEntry["incomplete"] = true;
            }
            this.error(error);
            return false;
        }
        this.currentKey = key.toLowerCase();
        if (this.tryMatch("=")) {
            this.match("=");
            const val = this.value(asis);
            if (this.currentKey) {
                return [this.currentKey, val];
            } else {
                return false;
            }
        } else {
            const error: ErrorObject = {
                type: "missing_equal_sign",
            };
            if (this.currentEntry) {
                error.entry = this.currentEntry["entry_key"];
            }
            if (this.currentKey) {
                error.key = this.currentKey;
            }
            this.error(error);
        }
        return false;
    }

    keyValueList() {
        let kv = this.keyEqualsValue();
        if (!kv || !this.currentRawFields) {
            // Entry has no fields, so we delete it.
            // It was the last one pushed, so we remove the last one
            this.entries.pop();
            return;
        }
        let rawFields = this.currentRawFields;
        rawFields[kv[0]] = kv[1];
        while (this.tryMatch(",")) {
            this.match(",");
            //fixes problems with commas at the end of a list
            if (this.tryMatch("}") || this.tryMatch(")")) {
                break;
            }
            kv = this.keyEqualsValue();
            if (!kv) {
                const error: ErrorObject = {
                    type: "key_value_error",
                };
                if (this.currentEntry) {
                    error.entry = this.currentEntry["entry_key"];
                }
                this.error(error);
                break;
            }
            rawFields[kv[0]] = kv[1];
        }
    }

    processFields() {
        if (!this.currentEntry) {
            return;
        }
        let rawFields = this.currentRawFields;
        let fields = this.currentEntry["fields"];

        // date may come either as year, year + month or as date field.
        // We therefore need to catch these hear and transform it to the
        // date field after evaluating all the fields.
        // All other date fields only come in the form of a date string.

        let date: any, month: any;
        if (rawFields.date) {
            // date string has precedence.
            date = rawFields.date;
        } else if (rawFields.year && rawFields.month) {
            month = rawFields.month;
            if (isNaN(parseInt(month)) && month.toUpperCase() in this.months) {
                month = this.months[month.toUpperCase() as Month];
            } else if (
                typeof month
                    .split("~")
                    .find((monthPart: any) => isNaN(parseInt(monthPart))) ===
                "undefined"
            ) {
                // handle cases like '09~26' but not '~09' (approximate month in edtf)
                month = month.replace(/~/g, "-");
            }
            date = `${rawFields.year}-${month}`;
        } else if (rawFields.year) {
            date = `${rawFields.year}`;
        }
        if (date) {
            let dateObj = edtfParse(date);
            if (dateObj.valid) {
                fields["date"] = dateObj.cleanedString;
                delete rawFields.year;
                delete rawFields.month;
            } else {
                let fieldName, value, errorList;
                if (rawFields.date) {
                    fieldName = "date";
                    value = rawFields.date;
                    errorList = this.errors;
                } else if (rawFields.year && rawFields.month) {
                    fieldName = "year,month";
                    value = [rawFields.year, rawFields.month];
                    errorList = this.warnings;
                } else {
                    fieldName = "year";
                    value = rawFields.year;
                    errorList = this.warnings;
                }
                const error: ErrorObject = {
                    type: "unknown_date",
                    field_name: fieldName,
                    value,
                };
                if (this.currentEntry) {
                    error.entry = this.currentEntry["entry_key"];
                }
                errorList.push(error);
            }
        }
        // Check for English language. If the citation is in English language,
        // titles may use case preservation.
        let langEnglish = true; // By default we assume everything to be written in English.
        if (rawFields.langid && rawFields.langid.length) {
            let langString = rawFields.langid.toLowerCase().trim();
            let englishOptions = [
                "english",
                "american",
                "british",
                "usenglish",
                "ukenglish",
                "canadian",
                "australian",
                "newzealand",
            ];
            if (
                !englishOptions.some((option) => {
                    return langString === option;
                })
            ) {
                langEnglish = false;
            }
        } else if (rawFields.language) {
            // langid and language. The two mean different things, see discussion https://forums.zotero.org/discussion/33960/biblatex-import-export-csl-language-biblatex-langid
            // but in bibtex, language is often used for what is essentially langid.
            // If there is no langid, but a language, and the language happens to be
            // a known langid, set the langid to be equal to the language.
            let langid = this._reformKey(rawFields.language, "langid");
            if (langid.length) {
                fields["langid"] = langid;
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
                    langEnglish = false;
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
                continue iterateFields;
            }

            // Replace alias fields with their main term.
            let aliasKey =
                    bKey in BiblatexFieldAliasTypes
                        ? BiblatexFieldAliasTypes[
                              bKey as keyof typeof BiblatexFieldAliasTypes
                          ]
                        : undefined,
                fKey = "";
            if (aliasKey) {
                if (rawFields[aliasKey]) {
                    const warning: ErrorObject = {
                        type: "alias_creates_duplicate_field",
                        field: bKey,
                        alias_of: aliasKey,
                        value: rawFields[bKey],
                        alias_of_value: rawFields[aliasKey],
                    };
                    if (this.currentEntry) {
                        warning.entry = this.currentEntry["entry_key"];
                    }
                    this.warning(warning);
                    continue iterateFields;
                }

                fKey =
                    Object.keys(BibFieldTypes).find((ft) => {
                        return (
                            BibFieldTypes[ft as keyof typeof BibFieldTypes]
                                .biblatex === aliasKey
                        );
                    }) || "";
            } else {
                fKey =
                    Object.keys(BibFieldTypes).find((ft) => {
                        return (
                            BibFieldTypes[ft as keyof typeof BibFieldTypes]
                                .biblatex === bKey
                        );
                    }) || "";
            }

            let oFields: { [key: string]: any }, fType: string;
            let bType =
                BibTypes[
                    this.currentEntry["bib_type"] as keyof typeof BibTypes
                ];

            if (!fKey.length) {
                const warning: ErrorObject = {
                    type: "unknown_field",
                    field_name: bKey,
                };
                if (this.currentEntry) {
                    warning.entry = this.currentEntry["entry_key"];
                }
                this.warning(warning);
                if (!this.config.processUnknown) {
                    continue iterateFields;
                }
                if (this.currentEntry && !this.currentEntry["unknown_fields"]) {
                    this.currentEntry["unknown_fields"] = {};
                }
                oFields =
                    this.currentEntry && this.currentEntry["unknown_fields"]
                        ? this.currentEntry["unknown_fields"]
                        : {};
                fType =
                    this.config.processUnknown &&
                    this.config.processUnknown[bKey]
                        ? this.config.processUnknown[bKey]
                        : "f_literal";
                fKey = bKey;
            } else if (
                bType["required"].includes(fKey) ||
                bType["optional"].includes(fKey) ||
                bType["eitheror"].includes(fKey)
            ) {
                oFields = fields;
                fType =
                    BibFieldTypes[fKey as keyof typeof BibFieldTypes]["type"];
            } else if (
                fKey === "entrysubtype" &&
                (bType as any)["biblatex-subtype"]
            ) {
                fType = BibFieldTypes[fKey]["type"];
                oFields = {};
                continue iterateFields;
            } else {
                const warning: ErrorObject = {
                    type: "unexpected_field",
                    field_name: bKey,
                };
                if (this.currentEntry) {
                    warning.entry = this.currentEntry["entry_key"];
                }
                this.warning(warning);
                if (!this.config.processUnexpected) {
                    continue iterateFields;
                }
                if (
                    this.currentEntry &&
                    !this.currentEntry["unexpected_fields"]
                ) {
                    this.currentEntry["unexpected_fields"] = {};
                }
                oFields =
                    this.currentEntry && this.currentEntry["unexpected_fields"]
                        ? this.currentEntry["unexpected_fields"]
                        : {};
                fType =
                    BibFieldTypes[fKey as keyof typeof BibFieldTypes]["type"];
            }

            let fValue = rawFields[bKey],
                reformedValue;
            switch (fType) {
                case "f_date":
                    reformedValue = edtfParse(fValue);
                    if (reformedValue.valid) {
                        oFields[fKey] = reformedValue.cleanedString;
                    } else if (this.currentEntry) {
                        this.error({
                            type: "unknown_date",
                            entry: this.currentEntry["entry_key"],
                            field_name: fKey,
                            value: fValue,
                        });
                    }
                    break;
                case "f_integer":
                    oFields[fKey] = this._reformLiteral(fValue);
                    break;
                case "f_key":
                    reformedValue = this._reformKey(fValue, fKey);
                    if (reformedValue.length) {
                        oFields[fKey] = reformedValue;
                    }
                    break;
                case "f_literal":
                case "f_long_literal":
                    oFields[fKey] = this._reformLiteral(fValue);
                    break;
                case "l_range":
                    oFields[fKey] = this._reformRange(fValue);
                    break;
                case "f_title":
                    oFields[fKey] = this._reformLiteral(fValue, langEnglish);
                    break;
                case "f_uri":
                    if (
                        this.config.processInvalidURIs ||
                        this._checkURI(fValue)
                    ) {
                        oFields[fKey] = this._reformURI(fValue);
                    } else {
                        const error: ErrorObject = {
                            type: "unknown_uri",
                            field_name: fKey,
                            value: fValue,
                        };
                        if (this.currentEntry) {
                            error.entry = this.currentEntry["entry_key"];
                        }
                        this.error(error);
                    }
                    break;
                case "f_verbatim":
                    oFields[fKey] = fValue;
                    break;
                case "l_key":
                    oFields[fKey] = splitTeXString(fValue).map((keyField) =>
                        this._reformKey(keyField, fKey)
                    );
                    break;
                case "l_tag":
                    oFields[fKey] = (fValue as string)
                        .split(/[,;]/)
                        .map((string) => string.trim());
                    break;
                case "l_literal":
                    oFields[fKey] = splitTeXString(fValue).map((item) =>
                        this._reformLiteral(item.trim())
                    );
                    break;
                case "l_name":
                    oFields[fKey] = this._reformNameList(fValue);
                    break;
                default:
                    // Something must be wrong in the code.
                    console.warn(`Unrecognized type: ${fType}!`);
            }
        }
    }

    _reformKey(keyString: string, fKey: string): string | NodeArray {
        let keyValue = keyString.trim().toLowerCase();
        let fieldType = BibFieldTypes[fKey as keyof typeof BibFieldTypes];
        if (
            BiblatexAliasOptions[fKey as keyof typeof BiblatexAliasOptions] &&
            (BiblatexAliasOptions as any)[fKey][keyValue]
        ) {
            keyValue = (BiblatexAliasOptions as any)[fKey][keyValue];
        }
        if ("options" in fieldType) {
            if (Array.isArray(fieldType["options"])) {
                if (fieldType["options"].includes(keyValue)) {
                    return keyValue;
                }
            } else {
                let optionValue = Object.keys(fieldType["options"]).find(
                    (key) => {
                        return (
                            (fieldType as any)["options"][key]["biblatex"] ===
                            keyValue
                        );
                    }
                );
                if (optionValue) {
                    return optionValue;
                } else {
                    return "";
                }
            }
        }
        if ("strict" in fieldType && fieldType.strict) {
            const warning: ErrorObject = {
                type: "unknown_key",
                field_name: fKey,
                value: keyString,
            };
            if (this.currentEntry) {
                warning.entry = this.currentEntry["entry_key"];
            }
            this.warning(warning);
            return "";
        }
        return this._reformLiteral(keyString);
    }

    _checkURI(uriString: string) /*: boolean */ {
        /* Copyright (c) 2010-2013 Diego Perini, MIT licensed
           https://gist.github.com/dperini/729294
         */
        return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(
            uriString
        );
    }

    _reformURI(uriString: string) {
        return uriString.replace(/\\/g, "");
    }

    _reformNameList(nameString: string): Array<NameDictObject> {
        const people = splitTeXString(nameString);
        const names = people.map((person) => {
            const nameParser = new BibLatexNameParser(person),
                name = nameParser.output;
            if (name) {
                return name;
            } else {
                return false;
            }
        });
        const result: NameDictObject[] = names.filter(
            (name: NameDictObject | false) => {
                return typeof name === "object";
            }
        ) as NameDictObject[];
        return result;
    }

    _reformRange(rangeString: string): Array<RangeArray> {
        return rangeString.split(",").map((string) => {
            let parts = string.split("--");
            if (parts.length > 1) {
                return [
                    this._reformLiteral(parts.shift().trim()),
                    this._reformLiteral(parts.join("--").trim()),
                ];
            } else {
                parts = string.split("-");
                if (parts.length > 1) {
                    return [
                        this._reformLiteral(parts.shift().trim()),
                        this._reformLiteral(parts.join("-").trim()),
                    ];
                } else {
                    return [this._reformLiteral(string.trim())];
                }
            }
        });
    }

    _reformLiteral(theValue: string, cpMode: boolean = false): NodeArray {
        const parser = new BibLatexLiteralParser(theValue, cpMode);
        return parser.output;
    }

    bibType(): string {
        let biblatexType = this.currentType;
        let biblatexSubtype = this.currentRawFields.entrysubtype || false;
        if (biblatexType in BiblatexAliasTypes) {
            const aliasType: string[] = (BiblatexAliasTypes as any)[
                biblatexType
            ];
            biblatexType = aliasType[0];
            if (aliasType.length > 1) {
                biblatexSubtype = aliasType[1];
            }
        }

        let bibType = Object.keys(BibTypes).find((bType) => {
            return (
                (BibTypes as any)[bType]["biblatex"] === biblatexType &&
                (!biblatexSubtype ||
                    (BibTypes as any)[bType]["biblatex-subtype"] ===
                        biblatexSubtype)
            );
        });

        if (typeof bibType === "undefined") {
            this.warning({
                type: "unknown_type",
                type_name: biblatexType,
            });
            bibType = "misc";
        }

        return bibType;
    }

    createNewEntry() {
        const currentEntry = {
            bib_type: "",
            entry_key: this.key(true),
            fields: {},
        };
        this.currentRawFields = {};
        this.entries.push(currentEntry);
        if (currentEntry && currentEntry["entry_key"].length) {
            this.match(",");
        }
        this.keyValueList();
        currentEntry["bib_type"] = this.bibType();
        this.currentEntry = currentEntry;
        this.processFields();
    }

    directive() {
        this.match("@");
        this.currentType = this.key();
        if (!this.currentType.length) return null;
        this.currentType = this.currentType.toLowerCase();
        return "@" + this.currentType;
    }

    string() {
        const kv = this.keyEqualsValue(true);
        if (kv) {
            this.strings[kv[0].toUpperCase()] = kv[1];
        }
    }

    preamble() {
        this.value();
    }

    replaceTeXChars() {
        let value = this.input;
        let len = TeXSpecialChars.length;
        for (let i = 0; i < len; i++) {
            if (!hasbackslash.test(value)) break;
            let texChar = TeXSpecialChars[i];
            value = value.replace(texChar.tex, texChar.unicode);
        }
        // Delete multiple spaces
        this.input = value.replace(/ +(?= )/g, "");
        return;
    }

    stepThroughBibtex() {
        while (this.skipToNext()) {
            this.parseNext();
        }
    }

    stepThroughBibtexAsync(): Promise<void> {
        return this.skipToNext()
            ? new Promise((resolve) => resolve(this.parseNext())).then(() =>
                  this.stepThroughBibtexAsync()
              )
            : Promise.resolve(null);
    }

    parseNext() {
        let closer;
        let d = this.directive();
        if (!d) return;

        if (this.tryMatch("{")) {
            this.match("{");
            closer = "}";
        } else if (this.tryMatch("(")) {
            // apparently, references can also be surrended with round braces
            this.match("(");
            closer = ")";
        } else if (d === "@comment") {
            // braceless comments are a thing it appears
            closer = null;
        } else {
            this.match("{");
            closer = "}";
        }

        if (d == "@string") {
            this.string();
        } else if (d == "@preamble") {
            this.preamble();
        } else if (d == "@comment") {
            this.parseComment(!closer);
        } else {
            this.createNewEntry();
        }

        if (closer) this.match(closer);
    }

    parseComment(braceless: boolean) {
        let start = this.pos;
        let braces = 1;

        if (braceless) {
            while (
                this.input.length > this.pos &&
                this.input[this.pos] != "\n"
            ) {
                this.pos++;
            }
        } else {
            while (this.input.length > this.pos && braces > 0) {
                switch (this.input[this.pos]) {
                    case "{":
                        braces += 1;
                        break;
                    case "}":
                        braces -= 1;
                }
                this.pos++;
            }
        }

        // no ending brace found
        if (braceless || braces !== 0) {
            return;
        }

        // leave the ending brace for the main parser to pick up
        this.pos--;
        let comment = this.input.substring(start, this.pos);
        this.groupParser.checkString(comment);
        if (this.groupParser.groups.length) {
            this.groups = this.groupParser.groups;
        } else {
            comment = comment.trim();
            const m = comment.match(/^jabref-meta: ([a-zA-Z]+):(.*);$/);
            if (m && m[1] !== "groupsversion") {
                this.jabrefMeta[m[1]] = m[2].replace(/\\(.)/g, "$1");
            } else if (comment && this.config.processComments) {
                this.comments.push(comment);
            }
        }
    }

    createBibDB() {
        this.entries.forEach((entry, index) => {
            // Start index from 1 to create less issues with testing
            this.bibDB[index + 1] = entry;
        });
    }

    cleanDB() {
        this.bibDB = JSON.parse(
            JSON.stringify(this.bibDB)
                .replace(/\u0871/, "\\\\") // Backslashes placed outside of literal fields
                .replace(/\u0870/, "") // variable start/end outside of literal fields
        );
    }

    get output() {
        console.warn(
            "BibLatexParser.output will be deprecated in biblatex-csl-converter 2.x. Use BibLatexParser.parse() instead."
        );
        this.replaceTeXChars();
        this.stepThroughBibtex();
        this.createBibDB();
        this.cleanDB();
        return this.bibDB;
    }

    parsed(): BiblatexParseResult {
        this.createBibDB();
        this.cleanDB();
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
        };
    }

    parse() {
        this.replaceTeXChars();

        this.stepThroughBibtex();
        return this.parsed();
    }

    parseAsync() {
        this.replaceTeXChars();
        return this.stepThroughBibtexAsync().then(() => this.parsed());
    }
}

export function parse(input: string, config: ConfigObject = {}) {
    return new BibLatexParser(input, config).parse();
}

export function parseAsync(input: string, config: ConfigObject = {}) {
    return new BibLatexParser(input, config).parseAsync();
}
