import {BibFieldTypes, BibTypes} from "../const"
import {TeXSpecialChars, BiblatexAliasTypes, BiblatexFieldAliasTypes} from "./const"
import {BibLatexNameParser} from "./name-parser"
import {BibLatexLiteralParser} from "./literal-parser"
import {splitTeXString} from "./tools"
import edtf from "edtf"

// These variables are expected to be defined by some bibtex sources.
let VARIABLES  = {
    JAN: "January",
    FEB: "February",
    MAR: "March",
    APR: "April",
    MAY: "May",
    JUN: "June",
    JUL: "July",
    AUG: "August",
    SEP: "September",
    OCT: "October",
    NOV: "November",
    DEC: "December"
}

/** Parses files in BibTeX/BibLaTeX format
 */

 /* Based on original work by Henrik Muehe (c) 2010,
  * licensed under the MIT license,
  * https://code.google.com/archive/p/bibtex-js/
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
        this.skipWhitespace()
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
        let start = this.pos
        while (true) {
            if (this.input[this.pos] == '}' && this.input[this.pos - 1] !=
                '\\') {
                if (bracecount > 0) {
                    bracecount--
                } else {
                    let end = this.pos
                    this.match("}")
                    return this.input.substring(start, end)
                }
            } else if (this.input[this.pos] == '{' && this.input[this.pos - 1] !=
                '\\') {
                bracecount++
            } else if (this.pos == this.input.length - 1) {
                this.errors.push({type: 'unexpected_eof'})
            }
            this.pos++
        }
    }

    valueQuotes() {
        this.match('"')
        let start = this.pos
        while (true) {
            if (this.input[this.pos] == '"' && this.input[this.pos - 1] !=
                '\\') {
                let end = this.pos
                this.match('"')
                return this.input.substring(start, end)
            } else if (this.pos == this.input.length - 1) {
                this.errors.push({
                    type: 'unterminated_value',
                    value: this.input.substring(start)
                })
            }
            this.pos++
        }
    }

    singleValue() {
        let start = this.pos
        if (this.tryMatch("{")) {
            return this.valueBraces()
        } else if (this.tryMatch('"')) {
            return this.valueQuotes()
        } else {
            let k = this.key()
            if (VARIABLES[k.toUpperCase()]) {
                return VARIABLES[k.toUpperCase()]
            } else if (k.match("^[0-9]+$")) {
                return k
            } else {
                this.warnings.push({
                    type: 'undefined_variable',
                    entry: this.currentEntry['entry_key'],
                    key: this.currentKey,
                    variable: k
                })
                return `%${k}%` // Using % as a delimiter for variables as they cannot be used in regular latex code.
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

    key() {
        let start = this.pos
        while (true) {
            if (this.pos == this.input.length) {
                this.errors.push({type: 'runaway_key'})
                return
            }
            if (this.input[this.pos].match("[a-zA-Z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u017F_:;`\\.\\\?+/-]")) {
                this.pos++
            } else {
                return this.input.substring(start, this.pos)
            }
        }
    }

    keyEqualsValue() {
        this.currentKey = this.key().toLowerCase()
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
        let rawFields = this.currentEntry['raw_fields']
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
        let rawFields = this.currentEntry['raw_fields']
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
            let dateParts = this._reformDate(date)
            if (dateParts) {
                fields['date'] = dateParts
            } else {
                let field_name, value, error_list
                if (rawFields.date) {
                    field_name = 'date'
                    value = rawFields.date
                    error_list = this.errors
                } else if (rawFields.year && rawFields.month) {
                    field_name = 'year,month'
                    value = [rawFields.year, rawFields.month]
                    error_list = this.warnings
                } else {
                    field_name = 'year'
                    value = rawFields.year
                    error_list = this.warnings
                }

                error_list.push({
                    type: 'unknown_date',
                    entry: this.currentEntry['entry_key'],
                    field_name,
                    value
                })
            }
        }

        // Check for English language. If the citation is in English language,
        // titles may use case preservation.
        let langEnglish = true // By default we assume everything to be written in English.
        if (rawFields.language && rawFields.language.length) {
            let lang = rawFields.language.toLowerCase()
            let englishOptions = ['american', 'british', 'canadian', 'english', 'australian', 'newzealand', 'usenglish', 'ukenglish']
            if (!englishOptions.some((option)=>{return lang.includes(option)})) {
                langEnglish = false
            }
        }

        iterateFields: for(let bKey in rawFields) {

            if (bKey==='date' || (['year','month'].includes(bKey) && !this.config.parseUnknown)) {
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
                    let dateParts = this._reformDate(fValue)
                    if (dateParts) {
                        oFields[fKey] = dateParts
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
                    oFields[fKey] = this._reformInteger(fValue)
                    break
                case 'f_key':
                    break
                case 'f_literal':
                    oFields[fKey] = this._reformLiteral(fValue)
                    break
                case 'f_range':
                    break
                case 'f_title':
                    oFields[fKey] = this._reformLiteral(fValue, langEnglish)
                    break
                case 'f_uri':
                case 'f_verbatim':
                    break
                case 'l_key':
                    oFields[fKey] = splitTeXString(fValue)
                    break
                case 'l_tag':
                    oFields[fKey] = fValue.split(',').map((string)=>{return string.trim()})
                    break
                case 'l_literal':
                    let items = splitTeXString(fValue)
                    oFields[fKey] = []
                    items.forEach((item) => {
                        oFields[fKey].push(this._reformLiteral(item))
                    })
                    break
                case 'l_name':
                    oFields[fKey] = this._reformNameList(fValue)
                    break
                default:
                    console.warn(`Unrecognized type: ${fType}!`)
            }
        }

    }

    _reformNameList(nameString) {
        let people = splitTeXString(nameString)
        return people.map((person)=>{
            let nameParser = new BibLatexNameParser(person)
            return nameParser.output
        })
    }

    _reformDate(dateStr) {
        window.edtf = edtf
        window.md=edtf(dateStr)
        console.log(window.md)

        return md

        /*let that = this
        if (dateStr.includes('/')) {
            let dateRangeParts = dateStr.split('/')
            let dateRangeArray = []
            dateRangeParts.forEach((dateRangePart)=>{
                let reformedDate = that._reformDate(dateRangePart)
                if (reformedDate) {
                    dateRangeArray.push(reformedDate)
                }
            })
            if (dateRangeArray.length > 2) {
                dateRangeArray = dateRangeArray.splice(0,2)
            } else if (dateRangeArray.length === 1) {
                dateRangeArray = dateRangeArray[0]
            } else if (dateRangeArray.length === 0) {
                dateRangeArray = null
            }
            return dateRangeArray
        }
        let month = true, day = true
        let dateLen = dateStr.split(/[\s,\./\-]/g).length
        if (dateLen === 1) {
            month = false
            day = false
        } else if (dateLen === 2) {
            day = false
        }
        let theDate = new Date(dateStr)
        if ('Invalid Date' == theDate) {
            return null
        }

        let dateArray = []
        dateArray.push(theDate.getFullYear())

        if (month) {
            dateArray.push(theDate.getMonth()+1)
        }

        if (day) {
            dateArray.push(theDate.getDate())
        }

        return dateArray*/

    }


    _reformLiteral(theValue, cpMode) {
        let parser = new BibLatexLiteralParser(theValue, cpMode)
        return parser.output
    }

    _reformInteger(theValue) {
        let theInt = parseInt(theValue)
        if (isNaN(theInt)) {
            theInt = 0
        }
        return theInt
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
            this.errors.push({
                type: 'unknown_type',
                type_name: biblatexType
            })
            bibType = 'misc'
        }

        return bibType
    }

    newEntry() {
        this.currentEntry = {
            'bib_type': this.bibType(),
            'entry_key': this.key(),
            'raw_fields': {},
            'fields': {}
        }
        this.entries.push(this.currentEntry)
        this.match(",")
        this.keyValueList()
        this.processFields()
    }

    directive() {
        this.match("@")
        this.currentType = this.key().toLowerCase()
        return "@" + this.currentType
    }

    string() {
        let kv = this.keyEqualsValue()
        VARIABLES[kv[0].toUpperCase()] = kv[1]
    }

    preamble() {
        this.value()
    }


    replaceTeXChars() {
        let value = this.input
        let len = TeXSpecialChars.length
        for (let i = 0; i < len; i++) {
            let texChar = TeXSpecialChars[i]
            let texCharRe = new RegExp(`{(${texChar[0]})}|${texChar[0]}`,'g')
            value = value.replace(texCharRe, texChar[1])
        }
        // Delete multiple spaces
        this.input = value.replace(/ +(?= )/g, '')
        return
    }

    bibtex() {
        while (this.skipToNext()) {
            let d = this.directive()
            this.match("{")
            if (d == "@string") {
                this.string()
            } else if (d == "@preamble") {
                this.preamble()
            } else if (d == "@comment") {
                continue
            } else {
                this.newEntry()
            }
            this.match("}")
        }
    }

    createBibDB() {
        let that = this
        this.entries.forEach((entry, index)=> {
            that.bibDB[index] = entry
        })
    }

    get output() {
        this.replaceTeXChars()
        this.bibtex()
        this.createBibDB()
        return this.bibDB
    }

}
