import {TexSpecialChars} from "./const"
import {BibTypes, BibFieldTypes} from "../const"

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

 const TAGS = {
     'strong': {open:'\\mkbibbold{', close: '}'},
     'em': {open:'\\mkbibitalic{', close: '}'},
     'sub': {open:'_{', close: '}'},
     'sup': {open:'^{', close: '}'},
     'smallcaps': {open:'\\textsc{', close: '}'},
     'nocase': {open:'{{', close: '}}'},
     'math': {open:'$', close: '$'}
  }

export class BibLatexExporter {

    constructor(bibDB, pks) {
        this.bibDB = bibDB // The bibliography database to export from.
        if (pks) {
            this.pks = pks // A list of pk values of the bibliography items to be exported.
        } else {
            this.pks = Object.keys(bibDB) // If none are selected, all keys are exporter
        }

    }

    get output() {
        let that = this
        this.bibtexArray = []
        this.bibtexStr = ''

        let len = this.pks.length

        for (let i = 0; i < len; i++) {
            let pk = this.pks[i]
            let bib = this.bibDB[pk]
            let bibEntry = {
                'type': BibTypes[bib['bib_type']]['biblatex'],
                'key': bib['entry_key']
            }
            let fValues = {}
            for (let fKey in bib.fields) {
                if (!BibFieldTypes[fKey]) {
                    continue
                }
                let fValue = bib.fields[fKey]
                let fType = BibFieldTypes[fKey]['type']
                let key = BibFieldTypes[fKey]['biblatex']
                switch (fType) {
                    case 'f_date':
                        fValues[key] = this._reformDate(fValue)
                        break
                    case 'f_integer':
                        fValues[key] = this._reformInteger(fValue)
                        break
                    case 'f_key':
                        fValues[key] = this._escapeTeX(fValue)
                        break
                    case 'f_literal':
                        fValues[key] = this._reformText(fValue)
                        break
                    case 'f_range':
                        fValues[key] = this._escapeTeX(fValue)
                        break
                    case 'f_uri':
                    case 'f_verbatim':
                        fValues[key] = this._escapeTeX(fValue)
                        break
                    case 'l_key':
                        let escapedTexts = []
                        fValue.forEach((text)=>{
                            escapedTexts.push(that._escapeTeX(text))
                        })
                        fValues[key] = escapedTexts.join(' and ')
                        break
                    case 'l_literal':
                        let reformedTexts = []
                        fValue.forEach((text)=>{
                            reformedTexts.push(that._reformText(text))
                        })
                        fValues[key] = reformedTexts.join(' and ')
                        break
                    case 'l_name':
                        fValues[key] = this._reformName(fValue)
                        break
                    default:
                        console.warn(`Unrecognized type: ${fType}!`)
                }

            }
            bibEntry.values = fValues
            this.bibtexArray[this.bibtexArray.length] = bibEntry
        }
        this.bibtexStr = this._getBibtexString(this.bibtexArray)
        return this.bibtexStr
    }

    _reformDate(theValue) {
        // reform date-field

        let dateParts = theValue.slice()
        if (typeof dateParts[0] === 'object') {
            // We have a range of dates
            return `${this._reformDate(dateParts[0])}/${this._reformDate(dateParts[1])}`
        } else {
            let dateStringParts = []
            dateStringParts.push(String(dateParts.shift())) // year
            while (dateParts.length > 0) {
                let datePart = dateParts.shift()
                dateStringParts.push(('0'+datePart).slice(-2)) // month + day with two characters
            }
            return dateStringParts.join('-')
        }
    }

    _reformInteger(theValue) {
        return window.String(theValue)
    }

    _reformName(theValue) {
        let names = [], that = this
        theValue.forEach((name)=>{
            if (name.literal) {
                let literal = that._escapeTeX(name.literal)
                names.push(`{${literal}}`)
            } else {
                let family = that._escapeTeX(name.family)
                let given = that._escapeTeX(name.given)
                names.push(`{${family}} {${given}}`)
            }
        })
        return names.join(' and ')
    }

    _escapeTeX(theValue) {
        if ('string' != typeof (theValue)) {
            return false
        }
        let len = TexSpecialChars.length
        for (let i = 0; i < len; i++) {
            theValue = theValue.replace(
                TexSpecialChars[i][0],
                TexSpecialChars[i][1]
            )
        }
        return theValue
    }

    _reformText(theValue) {
        let that = this, latex = '', lastMarks = []
        theValue.forEach((textNode)=>{
            let newMarks = []
            if (textNode.marks) {
                let mathMode = false
                textNode.marks.forEach((mark)=>{
                    // We need to activate mathmode for the lowest level sub/sup node.
                    if (['sup','sub'].indexOf(mark.type) !== -1 && !mathMode) {
                        newMarks.push('math')
                    }
                    newMarks.push(mark.type)
                })
            }
            // close all tags that are not present in current text node.
            // Go through last marksd in revrse order to close innermost tags first.
            let closing = false
            lastMarks.slice().reverse().forEach((mark, rIndex)=>{
                let index = lastMarks.length - rIndex
                if (mark != newMarks[index]) {
                    closing = true
                }
                if (closing) {
                    latex += TAGS[mark].close
                }
            })
            // open all new tags that were not present in the last text node.
            let opening = false
            newMarks.forEach((mark, index)=>{
                if (mark != lastMarks[index]) {
                    opening = true
                }
                if (opening) {
                    latex += TAGS[mark].open
                }
            })
            latex += that._escapeTeX(textNode.text)
            lastMarks = newMarks
        })
        // Close all still open tags
        lastMarks.slice().reverse().forEach((mark)=>{
            latex += TAGS[mark].close
        })
        return latex
    }

    _getBibtexString(biblist) {
        let len = biblist.length,
            str = ''
        for (let i = 0; i < len; i++) {
            if (0 < i) {
                str += '\r\n\r\n'
            }
            let data = biblist[i]
            str += '@' + data.type + '{' + data.key
            for (let vKey in data.values) {
                str += ',\r\n' + vKey + ' = {' + data.values[vKey] + '}'
            }
            str += "\r\n}"
        }
        return str
    }
}
