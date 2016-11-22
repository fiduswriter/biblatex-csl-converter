import {TexSpecialChars} from "./const"
import {BibTypes, BibFieldTypes} from "../const"

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

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
                if ("" === fValue)
                    continue
                let fType = BibFieldTypes[fKey]['type']
                switch (fType) {
                    case 'l_name':
                        fValues[BibFieldTypes[fKey]['biblatex']] = this._reformName(fValue)
                        break
                    case 'f_date':
                        fValues[BibFieldTypes[fKey]['biblatex']] = this._reformDate(fValue)
                        break
                    case 'f_literal':
                    case 'f_key':
                        fValues[BibFieldTypes[fKey]['biblatex']] = this._htmlToLatex(fValue)
                        break
                    case 'l_literal':
                    case 'l_key':
                        let eValues = []
                        fValue.forEach((value) => {
                            let eValue = that._htmlToLatex(value)
                            eValues.push(eValue)
                        })
                        fValues[BibFieldTypes[fKey]['biblatex']] = eValues.join(' and ')
                        break
                    default:
                        fValue = this._escapeTexSpecialChars(fValue)
                        fValues[BibFieldTypes[fKey]['biblatex']] = fValue
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

    _reformName(theValue) {
        let names = [], that = this
        theValue.forEach((name)=>{
            if (name.literal) {
                let literal = that._escapeTexSpecialChars(name.literal)
                names.push(`{${literal}}`)
            } else {
                let family = that._escapeTexSpecialChars(name.family)
                let given = that._escapeTexSpecialChars(name.given)
                names.push(`{${family}} {${given}}`)
            }
        })
        return names.join(' and ')
    }

    _escapeTexSpecialChars(theValue) {
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


    _htmlToLatex(theValue) {
        let el = document.createElement('div')
        el.innerHTML = theValue
        let walker = this._htmlToLatexTreeWalker(el,"")
        return walker
    }


    _htmlToLatexTreeWalker(el, outString) {
        if (el.nodeType === 3) { // Text node
            outString += this._escapeTexSpecialChars(el.nodeValue)
        } else if (el.nodeType === 1) {
            let braceEnd = ""
            if (el.matches('i')) {
                outString += "\\emph{"
                braceEnd = "}"
            } else if (el.matches('b')) {
                outString += "\\textbf{"
                braceEnd = "}"
            } else if (el.matches('sup')) {
                outString += "$^{"
                braceEnd = "}$"
            } else if (el.matches('sub')) {
                outString += "$_{"
                braceEnd = "}$"
            } else if (el.matches('span[class*="nocase"]')) {
                outString += "{{"
                braceEnd = "}}"
            } else if (el.matches('span[style*="small-caps"]')) {
                outString += "\\textsc{"
                braceEnd = "}"
            }
            for (let i = 0; i < el.childNodes.length; i++) {
                outString = this._htmlToLatexTreeWalker(el.childNodes[i], outString)
            }
            outString += braceEnd
        }
        return outString
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
