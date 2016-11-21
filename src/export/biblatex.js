import {TexSpecialChars, TexSpecialCharsShort} from "./const"
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
                    case 'f_date':
                        let dateParts = this._reformDate(fValue, fKey)
                        for (let datePart in dateParts) {
                            fValues[datePart] = dateParts[datePart]
                        }
                        break
                    case 'f_literal':
                        fValue = this._htmlToLatex(fValue)
                        fValues[BibFieldTypes[fKey]['biblatex']] = fValue
                        break
                    default:
                        fValue = this._escapeTexSpecialChars(fValue, true)
                        fValues[BibFieldTypes[fKey]['biblatex']] = fValue
                }

            }
            bibEntry.values = fValues
            this.bibtexArray[this.bibtexArray.length] = bibEntry
        }
        this.bibtexStr = this._getBibtexString(this.bibtexArray)
        return this.bibtexStr
    }

    _reformDate(theValue, typeName) {
        //reform date-field
        let dates = theValue.split('/'),
            datesValue = [],
            len = dates.length

        for (let i = 0; i < len; i++) {
            let eachDate = dates[i]
            let dateParts = eachDate.split('-')
            let dateValue = []
            let len2 = dateParts.length
            for (let j = 0; j < len2; j++) {
                let datePart = dateParts[j]
                if (datePart != parseInt(datePart)) {
                    break
                }
                dateValue[dateValue.length] = datePart
            }
            datesValue[datesValue.length] = dateValue
        }
        let valueList = {}
        let dateLen = datesValue[0].length
        if (1 < datesValue.length)
            dateLen = Math.min(dateLen, datesValue[1].length)
        if (3 == dateLen) {
            theValue = datesValue[0].join('-')
            if (1 < datesValue.length)
                theValue += '/' + datesValue[1].join('-')
            valueList[typeName] = theValue
        } else if ('date' == typeName) {
            let year = datesValue[0][0]
            if (1 < datesValue.length)
                year += '/' + datesValue[1][0]
            valueList.year = year
            if (2 == dateLen) {
                let month = datesValue[0][1]
                if (1 < datesValue.length)
                    month += '/' + datesValue[1][1]
                valueList.month = month
            }
        } else {
            if (dateLen < datesValue[0].length)
                datesValue[0].splice(dateLen)
            theValue = datesValue[0].join('-')
            if (1 < datesValue.length) {
                if (dateLen < datesValue[1].length)
                    datesValue[1].splice(dateLen)
                theValue += '/' + datesValue[1].join('-')
            }
            valueList[typeName] = theValue
        }
        return valueList
    }

    _escapeTexSpecialChars(theValue, short) {
        if ('string' != typeof (theValue)) {
            return false
        }
        let texChars = short? TexSpecialCharsShort : TexSpecialChars
        let len = texChars.length
        for (let i = 0; i < len; i++) {
            theValue = theValue.replace(
                texChars[i][0],
                texChars[i][1]
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
            outString += this._escapeTexSpecialChars(el.nodeValue, false)
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
