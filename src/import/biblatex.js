import {BibFieldTypes, BibTypes} from "../const"
import {TeXSpecialChars, BiblatexAliasTypes, BiblatexFieldAliasTypes} from "./const"
import {BibLatexNameParser} from "./name-parser"
import {BibLatexLiteralParser} from "./literal-parser"
import {splitTeXString} from "./tools"

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

    constructor(input) {
        this.input = input
        this.pos = 0
        this.entries = []
        this.bibDB = {}
        this.currentKey = ""
        this.currentEntry = false
        this.currentType = ""
        this.errors = []
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
                found: this.input.substring(this.pos)
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
            let k = this.key().toLowerCase()
            if (VARIABLES[k.toUpperCase()]) {
                return VARIABLES[k.toUpperCase()]
            } else if (k.match("^[0-9]+$")) {
                return k
            } else {
                this.errors.push({
                    type: 'value_unexpected',
                    value: this.input.substring(start)
                })
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
        let key = this.key().toLowerCase()
        if (this.tryMatch("=")) {
            this.match("=")
            let val = this.value()
            return [key, val]
        } else {
            this.errors.push({
                type: 'missing_equal_sign',
                key: this.input.substring(this.pos)
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
        this.currentEntry['fields'][kv[0]] = kv[1]
        // date may come either as year, year + month or as date field.
        // We therefore need to catch these hear and transform it to the
        // date field after evaluating all the fields.
        // All other date fields only come in the form of a date string.
        let date = {}
        while (this.tryMatch(",")) {
            this.match(",")
            //fixes problems with commas at the end of a list
            if (this.tryMatch("}")) {
                break
            }
            kv = this.keyEqualsValue()
            if (typeof (kv) === 'undefined') {
                this.errors.push({type: 'variable_error'})
                break
            }
            let val = kv[1]
            switch (kv[0]) {
                case 'date':
                case 'month':
                case 'year':
                    date[kv[0]] = val
                    break
                default:
                    this.currentEntry['fields'][kv[0]] = val
            }

        }
        if (date.date) {
            // date string has precedence.
            this.currentEntry['fields']['date'] = date.date
        } else if (date.year && date.month) {
            this.currentEntry['fields']['date'] = `${date.year}-${date.month}`
        } else if (date.year) {
            this.currentEntry['fields']['date'] = `${date.year}`
        }

        for(let fKey in this.currentEntry['fields']) {
            // Replace alias fields with their main term.
            let aliasKey = BiblatexFieldAliasTypes[fKey]
            if (aliasKey) {
                if (this.currentEntry['fields'][aliasKey]) {
                    this.errors.push({
                        type: 'alias_creates_duplicate_field',
                        entry: this.currentEntry['entry_key'],
                        field: fKey,
                        alias_of: aliasKey,
                        value: this.currentEntry['fields'][fKey]
                    })
                    delete this.currentEntry['fields'][fKey]
                    continue
                }
                let value = this.currentEntry['fields'][fKey]
                delete this.currentEntry['fields'][fKey]
                fKey = aliasKey
                this.currentEntry['fields'][fKey] = value
            }
            let field = BibFieldTypes[fKey]

            if('undefined' == typeof(field)) {
                this.errors.push({
                    type: 'unknown_field',
                    entry: this.currentEntry['entry_key'],
                    field_name: fKey
                })
                delete this.currentEntry['fields'][fKey]
                continue
            }
            let fType = field['type']
            let fValue = this.currentEntry['fields'][fKey]
            switch(fType) {
                case 'f_date':
                    let dateParts = this._reformDate(fValue)
                    if (dateParts) {
                        this.currentEntry['fields'][fKey] = dateParts
                    } else {
                        this.errors.push({
                            type: 'unknown_date',
                            entry: this.currentEntry['entry_key'],
                            field_name: fKey,
                            value: fValue
                        })
                        delete this.currentEntry['fields'][fKey]
                    }
                    break
                case 'f_integer':
                    this.currentEntry['fields'][fKey] = this._reformInteger(fValue)
                    break
                case 'f_key':
                    break
                case 'f_literal':
                    this.currentEntry['fields'][fKey] = this._reformLiteral(fValue)
                    break
                case 'f_range':
                case 'f_uri':
                case 'f_verbatim':
                    break
                case 'l_key':
                    this.currentEntry['fields'][fKey] = splitTeXString(fValue)
                    break
                case 'l_tag':
                    this.currentEntry['fields'][fKey] = fValue.split(',').map((string)=>{return string.trim()})
                    break
                case 'l_literal':
                    let items = splitTeXString(fValue)
                    this.currentEntry['fields'][fKey] = []
                    items.forEach((item) => {
                        this.currentEntry['fields'][fKey].push(this._reformLiteral(item))
                    })
                    break
                case 'l_name':
                    this.currentEntry['fields'][fKey] = this._reformNameList(fValue)
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
        let that = this
        if (dateStr.indexOf('/') !== -1) {
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

        return dateArray

    }


    _reformLiteral(theValue) {
        let parser = new BibLatexLiteralParser(theValue)
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

        let bibType = ''
        Object.keys(BibTypes).forEach((bType) => {
            if (BibTypes[bType]['biblatex'] === biblatexType) {
                bibType = bType
            }
        })

        if(bibType === '') {
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
            'fields': {}
        }
        this.entries.push(this.currentEntry)
        this.match(",")
        this.keyValueList()
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
            let texCharReBraces = new RegExp(`{${texChar[0]}}`,'g')
            value = value.replace(texCharReBraces, texChar[1])
            let texCharRe = new RegExp(texChar[0],'g')
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
