import {BibFieldTypes, BibTypes} from "../const"
import {TeXSpecialChars, BiblatexAliasTypes, BiblatexFieldAliasTypes, BiblatexAliasOptions} from "./const"
import {BibLatexNameParser} from "./name-parser"
import {BibLatexLiteralParser} from "./literal-parser"
import {GroupParser} from "./group-parser"
import {splitTeXString} from "./tools"
import {edtfCheck} from "../edtf"

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

export class BibLatexParser {

    constructor(input, config = {}) {
        this.input = input
        this.config = config
        this.pos = 0
        this.entries = []
        this.bibDB = {}
        this.currentKey = false
        this.currentEntry = false
        this.currentType = ""
        this.errors = []
        this.warnings = []
        // These variables are expected to be defined by some bibtex sources.
        this.variables = {
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
            DEC: "12"
        }
        this.groupParser = new GroupParser(this.entries)
    }

    isWhitespace(s) {
        return (s == ' ' || s == '\r' || s == '\t' || s == '\n')
    }

    match(s) {
        this.skipWhitespace()
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            this.pos += s.length
        } else {

            this.errors.push({
                type: 'token_mismatch',
                expected: s,
                found: this.input.substring(this.pos, this.pos + s.length)
            })
        }
        this.skipWhitespace()
    }

    tryMatch(s) {
        this.skipWhitespace()
        if (this.input.substring(this.pos, this.pos + s.length) == s) {
            return true
        } else {
            return false
        }
    }

    skipWhitespace() {
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

    skipToNext() {
        while ((this.input.length > this.pos) && (this.input[this.pos] !=
            "@")) {
            this.pos++
        }
        if (this.input.length == this.pos) {
            return false
        } else {
            return true
        }
    }

    valueBraces() {
        let bracecount = 0
        this.match("{")
        let string = ""
        while (this.pos < this.input.length) {
            switch(this.input[this.pos]) {
                case '\\':
                    string += this.input.substring(this.pos, this.pos+2)
                    this.pos++
                    break
                case '}':
                    if (bracecount === 0) {
                        this.match("}")
                        return string.trim()
                    }
                    string += '}'
                    bracecount--
                    break
                case '{':
                    string += '{'
                    bracecount++
                    break
                default:
                    string += this.input[this.pos]
                    break
            }
            this.pos++
        }
        this.errors.push({type: 'unexpected_eof'})
        return string
    }

    valueQuotes() {
        this.match('"')
        let string = ""
        while (this.pos < this.input.length) {
            switch(this.input[this.pos]) {
                case '\\':
                    string += this.input.substring(this.pos, this.pos+2)
                    this.pos++
                    break
                case '"':
                    this.match('"')
                    return string.trim()
                default:
                    string += this.input[this.pos]
                    break
            }
            this.pos++
        }
        this.errors.push({type: 'unexpected_eof'})
        return string
    }

    singleValue() {
        let start = this.pos
        if (this.tryMatch("{")) {
            return this.valueBraces()
        } else if (this.tryMatch('"')) {
            return this.valueQuotes()
        } else {
            let k = this.key()
            if (this.variables[k.toUpperCase()]) {
                return this.variables[k.toUpperCase()]
            } else if (k.match("^[0-9]+$")) {
                return k
            } else {
                this.warnings.push({
                    type: 'undefined_variable',
                    entry: this.currentEntry['entry_key'],
                    key: this.currentKey,
                    variable: k
                })
                // Using \u0870 as a delimiter for variables as they cannot be
                // used in regular latex code.
                return `\u0870${k}\u0870`
            }
        }
    }

    value() {
        let values = []
        values.push(this.singleValue())
        while (this.tryMatch("#")) {
            this.match("#")
            values.push(this.singleValue())
        }
        return values.join("")
    }

    key(optional) {
        let start = this.pos
        while (true) {
            if (this.pos == this.input.length) {
                this.errors.push({type: 'runaway_key'})
                return
            }
            if ([',','{','}',' ','='].includes(this.input[this.pos])) {
                let key = this.input.substring(start, this.pos)
                if (optional && this.input[this.pos] != ',') {
                    this.skipWhitespace()
                    if (this.input[this.pos] != ',') {
                        this.pos = start
                        return null
                    }
                }
                return key
            } else {
                this.pos++
            }
        }
    }

    keyEqualsValue() {
        let key = this.key()
        if (!key) {
            this.errors.push({
                type: 'cut_off_citation',
                entry: this.currentEntry['entry_key']
            })
            // The citation is not full, we remove the existing parts.
            this.currentEntry['incomplete'] = true
            return
        }
        this.currentKey = key.toLowerCase()
        if (this.tryMatch("=")) {
            this.match("=")
            let val = this.value()
            return [this.currentKey, val]
        } else {
            this.errors.push({
                type: 'missing_equal_sign',
                key: this.currentKey,
                entry: this.currentEntry['entry_key']
            })
        }
    }

    keyValueList() {
        let kv = this.keyEqualsValue()
        if (typeof(kv) === 'undefined') {
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
            if (this.tryMatch("}")) {
                break
            }
            kv = this.keyEqualsValue()
            if (typeof (kv) === 'undefined') {
                this.errors.push({
                    type: 'key_value_error',
                    entry: this.currentEntry['entry_key']
                })
                break
            }
            rawFields[kv[0]] = kv[1]
        }
    }

    processFields() {
        let that = this
        let rawFields = this.currentRawFields
        let fields = this.currentEntry['fields']

        // date may come either as year, year + month or as date field.
        // We therefore need to catch these hear and transform it to the
        // date field after evaluating all the fields.
        // All other date fields only come in the form of a date string.

        let date
        if (rawFields.date) {
            // date string has precedence.
            date = rawFields.date
        } else if (rawFields.year && rawFields.month) {
            date = `${rawFields.year}-${rawFields.month}`
        } else if (rawFields.year) {
            date = `${rawFields.year}`
        }
        if (date) {
            if (this._checkDate(date)) {
                fields['date'] = date
            } else {
                let fieldName, value, errorList
                if (rawFields.date) {
                    fieldName = 'date'
                    value = rawFields.date
                    errorList = this.errors
                } else if (rawFields.year && rawFields.month) {
                    fieldName = 'year,month'
                    value = [rawFields.year, rawFields.month]
                    errorList = this.warnings
                } else {
                    fieldName = 'year'
                    value = rawFields.year
                    errorList = this.warnings
                }
                errorList.push({
                    type: 'unknown_date',
                    entry: this.currentEntry['entry_key'],
                    field_name: fieldName,
                    value
                })
            }
        }
        // Check for English language. If the citation is in English language,
        // titles may use case preservation.
        let langEnglish = true // By default we assume everything to be written in English.
        if (rawFields.langid && rawFields.langid.length) {
            let langString = rawFields.langid.toLowerCase().trim()
            let englishOptions = ['english', 'american', 'british', 'usenglish', 'ukenglish', 'canadian', 'australian', 'newzealand']
            if (!englishOptions.some((option)=>{return langString === option})) {
                langEnglish = false
            }
        } else if (rawFields.language) {
            // langid and language. The two mean different things, see discussion https://forums.zotero.org/discussion/33960/biblatex-import-export-csl-language-biblatex-langid
            // but in bibtex, language is often used for what is essentially langid.
            // If there is no langid, but a language, and the language happens to be
            // a known langid, set the langid to be equal to the language.
            let langid = this._reformKey(rawFields.language, 'langid')
            if (langid) {
                fields['langid'] = langid
                if (!['usenglish', 'ukenglish', 'caenglish', 'auenglish', 'nzenglish'].includes(langid)) {
                    langEnglish = false
                }
            }
        }

        iterateFields: for(let bKey in rawFields) {

            if (bKey==='date' || (['year','month'].includes(bKey) && !this.config.processUnknown)) {
                // Handled above
                continue iterateFields
            }

            // Replace alias fields with their main term.
            let aliasKey = BiblatexFieldAliasTypes[bKey], fKey
            if (aliasKey) {
                if (rawFields[aliasKey]) {
                    this.warnings.push({
                        type: 'alias_creates_duplicate_field',
                        entry: this.currentEntry['entry_key'],
                        field: bKey,
                        alias_of: aliasKey,
                        value: rawFields[bKey],
                        alias_of_value: rawFields[aliasKey]
                    })
                    continue iterateFields
                }

                fKey = Object.keys(BibFieldTypes).find((ft)=>{
                    return BibFieldTypes[ft].biblatex === aliasKey
                })
            } else {
                fKey = Object.keys(BibFieldTypes).find((ft)=>{
                    return BibFieldTypes[ft].biblatex === bKey
                })
            }

            let oFields, fType
            let bType = BibTypes[this.currentEntry['bib_type']]

            if('undefined' == typeof(fKey)) {
                this.warnings.push({
                    type: 'unknown_field',
                    entry: this.currentEntry['entry_key'],
                    field_name: bKey
                })
                if (!this.config.processUnknown) {
                    continue iterateFields
                }
                if (!this.currentEntry['unknown_fields']) {
                    this.currentEntry['unknown_fields'] = {}
                }
                oFields = this.currentEntry['unknown_fields']
                fType = this.config.processUnknown[bKey] ? this.config.processUnknown[bKey] : 'f_literal'
                fKey = bKey
            } else if (
                bType['required'].includes(fKey) ||
                bType['optional'].includes(fKey) ||
                bType['eitheror'].includes(fKey)
            ) {
                oFields = fields
                fType = BibFieldTypes[fKey]['type']
            } else {
                this.warnings.push({
                    type: 'unexpected_field',
                    entry: this.currentEntry['entry_key'],
                    field_name: bKey
                })
                if (!this.config.processUnexpected) {
                    continue iterateFields
                }
                if (!this.currentEntry['unexpected_fields']) {
                    this.currentEntry['unexpected_fields'] = {}
                }
                oFields = this.currentEntry['unexpected_fields']
                fType = BibFieldTypes[fKey]['type']
            }


            let fValue = rawFields[bKey]
            switch(fType) {
                case 'f_date':
                    if (this._checkDate(fValue)) {
                        oFields[fKey] = fValue
                    } else {
                        this.errors.push({
                            type: 'unknown_date',
                            entry: this.currentEntry['entry_key'],
                            field_name: fKey,
                            value: fValue
                        })
                    }
                    break
                case 'f_integer':
                    oFields[fKey] = this._reformLiteral(fValue)
                    break
                case 'f_key':
                    let reformedKey = this._reformKey(fValue, fKey)
                    if (reformedKey !== false) {
                        oFields[fKey] = reformedKey
                    }
                    break
                case 'f_literal':
                case 'f_long_literal':
                    oFields[fKey] = this._reformLiteral(fValue)
                    break
                case 'l_range':
                    oFields[fKey] = this._reformRange(fValue)
                    break
                case 'f_title':
                    oFields[fKey] = this._reformLiteral(fValue, langEnglish)
                    break
                case 'f_uri':
                    if (this._checkURI(fValue)) {
                        oFields[fKey] = this._reformURI(fValue)
                    } else {
                        this.errors.push({
                            type: 'unknown_uri',
                            entry: this.currentEntry['entry_key'],
                            field_name: fKey,
                            value: fValue
                        })
                    }
                    break
                case 'f_verbatim':
                    oFields[fKey] = fValue
                    break
                case 'l_key':
                    oFields[fKey] = splitTeXString(fValue).map(keyField=>{return that._reformKey(keyField, fKey)})
                    break
                case 'l_tag':
                    oFields[fKey] = fValue.split(/[,;]/).map((string)=>{return string.trim()})
                    break
                case 'l_literal':
                    let items = splitTeXString(fValue)
                    oFields[fKey] = []
                    items.forEach((item) => {
                        oFields[fKey].push(this._reformLiteral(item.trim()))
                    })
                    break
                case 'l_name':
                    oFields[fKey] = this._reformNameList(fValue)
                    break
                default:
                    // Something must be wrong in the code.
                    console.warn(`Unrecognized type: ${fType}!`)
            }
        }

    }

    _reformKey(keyString, fKey) {
        let keyValue = keyString.trim().toLowerCase()
        let fieldType = BibFieldTypes[fKey]
        if (BiblatexAliasOptions[fKey] && BiblatexAliasOptions[fKey][keyValue]) {
            keyValue = BiblatexAliasOptions[fKey][keyValue]
        }
        if (fieldType['options']) {
            if (Array.isArray(fieldType['options'])) {
                if (fieldType['options'].includes(keyValue)) {
                    return keyValue
                }
            } else {
                let optionValue = Object.keys(fieldType['options']).find(key => {
                    return fieldType['options'][key]['biblatex'] === keyValue
                })
                if (optionValue) {
                    return optionValue
                }
            }
        }
        if (fieldType.strict) {
            this.warnings.push({
                type: 'unknown_key',
                entry: this.currentEntry['entry_key'],
                field_name: fKey,
                value: keyString
            })
            return false
        }
        return this._reformLiteral(keyString)

    }

    _checkURI(uriString) {
        /* Copyright (c) 2010-2013 Diego Perini, MIT licensed
           https://gist.github.com/dperini/729294
         */
        return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(uriString)
    }

    _reformURI(uriString) {
        return uriString.replace(/\\/g,'')
    }

    _reformNameList(nameString) {
        let people = splitTeXString(nameString)
        return people.map(person => {
            let nameParser = new BibLatexNameParser(person)
            return nameParser.output
        })
    }

    _reformRange(rangeString) {
        return rangeString.split(',').map(string => {
            let parts = string.split('--')
            if (parts.length > 1) {
                return [
                    this._reformLiteral(parts.shift().trim()),
                    this._reformLiteral(parts.join('--').trim())
                ]
            } else {
                parts = string.split('-')
                if (parts.length > 1) {
                    return [
                        this._reformLiteral(parts.shift().trim()),
                        this._reformLiteral(parts.join('-').trim())
                    ]
                } else {
                    return [this._reformLiteral(string.trim())]
                }
            }
        })
    }

    _checkDate(dateStr) {
        return edtfCheck(dateStr)
    }

    _reformLiteral(theValue, cpMode) {
        let parser = new BibLatexLiteralParser(theValue, cpMode)
        return parser.output
    }

    bibType() {
        let biblatexType = this.currentType
        if (BiblatexAliasTypes[biblatexType]) {
            biblatexType = BiblatexAliasTypes[biblatexType]
        }

        let bibType = Object.keys(BibTypes).find((bType) => {
            return BibTypes[bType]['biblatex'] === biblatexType
        })

        if(typeof bibType === 'undefined') {
            this.warnings.push({
                type: 'unknown_type',
                type_name: biblatexType
            })
            bibType = 'misc'
        }

        return bibType
    }

    createNewEntry() {
        this.currentEntry = {
            'bib_type': this.bibType(),
            'entry_key': this.key(true),
            'fields': {}
        }
        this.currentRawFields = {}
        this.entries.push(this.currentEntry)
        if (this.currentEntry['entry_key'] !== null) {
            this.match(",")
        }
        this.keyValueList()
        if (this.currentEntry['entry_key'] === null) {
            this.currentEntry['entry_key'] = ''
        }
        this.processFields()
    }

    directive() {
        this.match("@")
        this.currentType = this.key().toLowerCase()
        return "@" + this.currentType
    }

    string() {
        let kv = this.keyEqualsValue()
        this.variables[kv[0].toUpperCase()] = kv[1]
    }

    preamble() {
        this.value()
    }


    replaceTeXChars() {
        let value = this.input
        let len = TeXSpecialChars.length
        for (let i = 0; i < len; i++) {
            let texChar = TeXSpecialChars[i]
            let texCharRe = /^[a-zA-Z\\]+$/.test(texChar[0]) ?
                new RegExp(`{(${texChar[0]})}|${texChar[0]}\\s|${texChar[0]}(?=\\W|\\_)`,'g') :
                new RegExp(`{(${texChar[0]})}|${texChar[0]}{}|${texChar[0]}`,'g')
            value = value.replace(texCharRe, texChar[1])
        }
        // Delete multiple spaces
        this.input = value.replace(/ +(?= )/g, '')
        return
    }

    stepThroughBibtex() {
        while (this.skipToNext()) {
            let d = this.directive()
            this.match("{")
            if (d == "@string") {
                this.string()
            } else if (d == "@preamble") {
                this.preamble()
            } else if (d == "@comment" || d == "@Comment") {
                this.parseComment()
            } else {
                this.createNewEntry()
            }
            this.match("}")
        }
    }

    parseComment() {
        let start = this.pos
        let braces = 1
        while (this.input.length > this.pos && braces > 0) {
          switch (this.input[this.pos]) {
            case '{':
              braces += 1
              break
            case '}':
              braces -= 1
          }
          this.pos++
        }

        // no ending brace found
        if (braces !== 0) { return }

        // leave the ending brace for the main parser to pick up
        this.pos--
        let comment = this.input.substring(start, this.pos)
        this.groupParser.checkString(comment)
        if (this.groupParser.groups) {
            this.groups = this.groupParser.groups
        }
    }

    createBibDB() {
        let that = this
        this.entries.forEach((entry, index)=> {
            // Start index from 1 to create less issues with testing
            that.bibDB[index + 1] = entry
        })
    }

    cleanDB() {
        this.bibDB = JSON.parse(
            JSON.stringify(this.bibDB)
                .replace(/\u0871/,'\\\\') // Backslashes placed outside of literal fields
                .replace(/\u0870/,'') // variable start/end outside of literal fields
        )
    }

    get output() {
        this.replaceTeXChars()
        this.stepThroughBibtex()
        this.createBibDB()
        this.cleanDB()
        return this.bibDB
    }

}
