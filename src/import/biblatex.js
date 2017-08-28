import {BibFieldTypes, BibTypes} from "../const"
import {TeXSpecialChars, BiblatexAliasTypes, BiblatexFieldAliasTypes, BiblatexAliasOptions} from "./const"
import {BibLatexNameParser} from "./name-parser"
import {BibLatexLiteralParser} from "./literal-parser"
import {splitTeXString} from "./tools"
import {edtfCheck} from "../edtf"

/** Parses files in BibTeX/BibLaTeX format
 */

 /* Based on original work by Henrik Muehe (c) 2010,
  * licensed under the MIT license,
  * https://code.google.com/archive/p/bibtex-js/
  */

  /* Config options (default value for every option is false)

    - rawFields (false/true):

    Adds a `raw_fields` object to each entry which contains all fields with only
    TeX character replacement and no other processing.

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
                case '\n':
                    if (this.input[this.pos-1] === '\n') {
                        string += '\n'
                    } else if (/\S/.test(this.input[this.pos+1])) {
                        string += ' '
                    }
                    break
                case '\\':
                    string += '\\'
                    string += this.input[this.pos+1]
                    //this.input.substring(this.pos, this.pos+2)
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
                case '%':
                    // Unescaped percentage - the intention must have been to
                    // escape it because unescaped ones only mean trouble.
                    string += '\\%'
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
                case '\n':
                    if (this.input[this.pos-1] === '\n') {
                        string += '\n'
                    } else if (/\S/.test(this.input[this.pos+1])) {
                        string += ' '
                    }
                    break
                case '\\':
                    string += this.input.substring(this.pos, this.pos+2)
                    this.pos++
                    break
                case '"':
                    this.match('"')
                    return string.trim()
                case '%':
                    // Unescaped percentage - the intention must have been to
                    // escape it because unescaped ones only mean trouble.
                    string += '\\%'
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

    key(optional) {
        let start = this.pos
        while (true) {
            if (this.pos == this.input.length) {
                this.errors.push({type: 'runaway_key'})
                return
            }
            if ([',','{','}',' ','='].includes(this.input[this.pos])) {
                if (optional && this.input[this.pos] != ',') {
                    this.pos = start
                    return null
                }
                return this.input.substring(start, this.pos)
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
                        oFields[fKey] = fValue
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
                        oFields[fKey].push(this._reformLiteral(item))
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

    _reformNameList(nameString) {
        let people = splitTeXString(nameString)
        return people.map(person => {
            let nameParser = new BibLatexNameParser(person)
            return nameParser.output
        })
    }

    _reformRange(rangeString) {
        return rangeString.split(',').map(string => {
            let parts = string.split('-')
            if (parts.length > 1) {
                return [
                    this._reformLiteral(parts.shift().trim()),
                    this._reformLiteral(parts.pop().trim())
                ]
            } else {
                return [this._reformLiteral(string.trim())]
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
        if (this.config.rawFields) {
            this.currentEntry['raw_fields'] = this.currentRawFields
        }
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
            } else if (d == "@comment") {
                this.parseGroups()
            } else {
                this.createNewEntry()
            }
            this.match("}")
        }
    }

    parseGroups() {
      const prefix = 'jabref-meta: groupstree:'
      let pos = this.input.indexOf(prefix, this.pos)
      if (pos < 0) { return }
      this.pos = pos + prefix.length

      /*  The JabRef Groups format is... interesting. To parse it, you must:
          1. Unwrap the lines (just remove the newlines)
          2. Split the lines on ';' (but not on '\;')
          3. Each line is a group which is formatted as follows:
             <level> <type>:<name>\;<intersect>\;<citekey1>\;<citekey2>\;....

          Each level can interact with the level it is nested under; either no interaction (intersect = 0), intersection
          (intersect = 1) or union (intersect = 2).

          There are several group types: root-level (all references are implicitly available on the root level),
          ExplicitGroup (the citation keys are listed in the group line) or query-type groups. I have only implemented
          explicit groups.
      */

      // skip any whitespace after the identifying string */
      while ((this.input.length > this.pos) && ('\r\n '.indexOf(this.input[this.pos]) >= 0)) { this.pos++ }

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

      // simplify parsing by taking the whole comment, throw away newlines, replace the escaped separators with tabs, and
      // then split on the remaining non-escaped separators
      // I use \u2004 to protect \; and \u2005 to protect \\\; (the escaped version of ';') when splitting lines at ;
      let lines = this.input.substring(start, this.pos).replace(/[\r\n]/g, '').replace(/\\\\\\;/g, '\u2005').replace(/\\;/g, '\u2004').split(';')
      lines = lines.map(line => {
          return line.replace(/\u2005/g,';')
      })
      let levels = { '0': { references: [], groups: [] } }
      for (let line of lines) {
        if (line === '') { continue }
        let match = line.match(/^([0-9])\s+([^:]+):(.*)/)
        if (!match) { return }
        let level = parseInt(match[1])
        let type = match[2]
        let references = match[3]
        references = references ? references.split('\u2004').filter(key => key) : []
        let name = references.shift()
        let intersection = references.shift() // 0 = independent, 1 = intersection, 2 = union

        // ignore root level, has no refs anyway in the comment
        if (level === 0) { continue }

        // remember this group as the current `level` level, so that any following `level + 1` levels can find it
        levels[level] = { name, groups: [], references }
        // and add it to its parent
        levels[level - 1].groups.push(levels[level])

        // treat all groups as explicit
        if (type != 'ExplicitGroup') {
            this.warnings.push({
                type: 'unsupported_jabref_group',
                group_type: type
            })
        }

        switch (intersection) {
          case '0':
            // do nothing more
            break
          case '1':
            // intersect with parent. Hardly ever used.
            levels[level].references = levels[level].references.filter(key => levels[level - 1].references.includes(key))
            break
          case '2':
            // union with parent
            levels[level].references = [...new Set([...levels[level].references, ...levels[level - 1].references])]
            break
        }
      }

      this.groups = levels['0'].groups
    }

    createBibDB() {
        let that = this
        this.entries.forEach((entry, index)=> {
            that.bibDB[index] = entry
        })
    }

    get output() {
        this.replaceTeXChars()
        this.stepThroughBibtex()
        this.createBibDB()
        return this.bibDB
    }

}
