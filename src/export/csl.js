import {BibTypes, BibFieldTypes} from "../const"

/** Converts a BibDB to a DB of the CSL type.
 * @param bibDB The bibliography database to convert.
 */

const TAGS = {
    'strong': {open:'<b>', close: '</b>'},
    'em': {open:'<i>', close: '</i>'},
    'sub': {open:'<sub>', close: '</sub>'},
    'sup': {open:'<sup>', close: '</sup>'},
    'smallcaps': {open:'<span style="font-variant: small-caps;">', close: '</span>'},
    'nocase': {open:'<span class="nocase">', close: '</span>'},
    'enquote': {open:'&ldquo;', close: '&rdquo;'},
 }

export class CSLExporter {
    constructor(bibDB, pks) {
        this.bibDB = bibDB
        if (pks) {
            this.pks = pks // A list of pk values of the bibliography items to be exported.
        } else {
            this.pks = Object.keys(bibDB) // If none are selected, all keys are exporter
        }
        this.cslDB = {}
    }

    get output() {
        for (let bibId in this.bibDB) {
            if (this.pks.indexOf(bibId) !== -1) {
                this.cslDB[bibId] = this.getCSLEntry(bibId)
                this.cslDB[bibId].id = bibId
            }
        }
        return this.cslDB
    }
    /** Converts one BibDB entry to CSL format.
     * @function getCSLEntry
     * @param id The id identifying the bibliography entry.
     */
    getCSLEntry(id) {
        let that = this, bib = this.bibDB[id], fValues = {}
        for (let fKey in bib.fields) {
            if (bib.fields[fKey] !== '' && fKey in BibFieldTypes && 'csl' in BibFieldTypes[fKey]) {
                let fValue = bib.fields[fKey]
                let fType = BibFieldTypes[fKey]['type']
                let key = BibFieldTypes[fKey]['csl']
                switch(fType) {
                    case 'f_date':
                        fValues[key] = {'date-parts': fValue}
                        break
                    case 'f_integer':
                        fValues[key] = this._reformInteger(fValue)
                        break
                    case 'f_key':
                        fValues[key] = this._escapeHtml(fValue)
                        break
                    case 'f_literal':
                        fValues[key] = this._reformText(fValue)
                        break
                    case 'f_range':
                        fValues[key] = this._escapeHtml(fValue)
                        break
                    case 'f_uri':
                    case 'f_verbatim':
                        fValues[key] = this._escapeHtml(fValue)
                        break
                    case 'l_key':
                        let escapedTexts = []
                        fValue.forEach((text)=>{
                            escapedTexts.push(that._escapeHtml(text))
                        })
                        fValues[key] = escapedTexts.join(', ')
                        break
                    case 'l_literal':
                        let reformedTexts = []
                        fValue.forEach((text)=>{
                            reformedTexts.push(that._reformText(text))
                        })
                        fValues[key] = reformedTexts.join(', ')
                        break
                    case 'l_name':
                        fValues[key] = fValue
                        break
                    default:
                        console.warn(`Unrecognized type: ${fType}!`)
                }
            }
        }
        fValues['type'] = BibTypes[bib.bib_type].csl
        return fValues
    }

    _escapeHtml(string) {
        return string.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/'/g, "&apos;")
         .replace(/"/g, "&quot;")
    }

    _reformInteger(theValue) {
        return window.String(theValue)
    }

    _reformText(theValue) {
        let that = this, html = '', lastMarks = []
        theValue.forEach((textNode)=>{
            let newMarks = []
            if (textNode.marks) {
                textNode.marks.forEach((mark)=>{
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
                    html += TAGS[mark].close
                }
            })
            // open all new tags that were not present in the last text node.
            let opening = false
            newMarks.forEach((mark, index)=>{
                if (mark != lastMarks[index]) {
                    opening = true
                }
                if (opening) {
                    html += TAGS[mark].open
                }
            })
            html += that._escapeHtml(textNode.text)
            lastMarks = newMarks
        })
        // Close all still open tags
        lastMarks.slice().reverse().forEach((mark)=>{
            html += TAGS[mark].close
        })
        return html
    }

    _reformDate(theValue) {
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
                if (datePart != parseInt(datePart))
                    break
                dateValue[dateValue.length] = datePart
            }
            datesValue[datesValue.length] = dateValue
        }

        return {
            'date-parts': datesValue
        }
    }

    _reformName(theValue) {
        //reform name-field
        let names = theValue.substring(1, theValue.length - 1).split(
            '} and {'),
            namesValue = [],
            len = names.length
        for (let i = 0; i < len; i++) {
            let eachName = names[i]
            let nameParts = eachName.split('} {')
            let nameValue
            if (nameParts.length > 1) {
                nameValue = {
                    'family': nameParts[1].replace(/[{}]/g, ''),
                    'given': nameParts[0].replace(/[{}]/g, '')
                }
            } else {
                nameValue = {
                    'literal': nameParts[0].replace(/[{}]/g, '')
                }
            }
            namesValue[namesValue.length] = nameValue
        }

        return namesValue
    }

}
