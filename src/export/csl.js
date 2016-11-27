import {BibTypes, BibFieldTypes} from "../const"
import edtf from "edtf"

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
    'undefined': {open:'<span class="undef-variable">', close: '</span>'}
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
        this.errors = []
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
                        fValues[key] = this._reformDate(fValue)
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
                    case 'f_title':
                        fValues[key] = this._reformText(fValue)
                        break
                    case 'f_uri':
                    case 'f_verbatim':
                        fValues[key] = this._escapeHtml(fValue)
                        break
                    case 'l_key':
                        fValues[key] = this._escapeHtml(fValue.join(' and '))
                        break
                    case 'l_literal':
                        let reformedTexts = []
                        fValue.forEach((text)=>{
                            reformedTexts.push(that._reformText(text))
                        })
                        fValues[key] = reformedTexts.join(', ')
                        break
                    case 'l_name':
                        fValues[key] = this._reformName(fValue)
                        break
                    case 'l_tag':
                        fValues[key] = this._escapeHtml(fValue.join(', '))
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
        return String(theValue)
    }

    _reformText(theValue) {
        let that = this, html = '', lastMarks = []
        theValue.forEach((node)=>{
            if (node.type === 'variable') {
                // This is an undefined variable
                // This should usually not happen, as CSL doesn't know what to
                // do with these. We'll put them into an unsupported tag.
                html += `${TAGS.undefined.open}${node.attrs.variable}${TAGS.undefined.close}`
                this.errors.push({
                    type: 'undefined_variable',
                    variable: node.attrs.variable
                })
                return
            }
            let newMarks = []
            if (node.marks) {
                node.marks.forEach((mark)=>{
                    newMarks.push(mark.type)
                })
            }
            // close all tags that are not present in current text node.
            // Go through last marksd in reverse order to close innermost tags first.
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
            html += that._escapeHtml(node.text)
            lastMarks = newMarks
        })
        // Close all still open tags
        lastMarks.slice().reverse().forEach((mark)=>{
            html += TAGS[mark].close
        })
        return html
    }

    _reformDate(dateStr) {
        let dateObj = edtf.parse(
            dateStr.replace(/^y/, 'Y') // Convert to edtf draft spec format supported by edtf.js
                .replace(/unknown/g, '*')
                .replace(/open/g, '')
                .replace(/u/g, 'X')
                .replace(/\?~/g, '%')
        )
        if (dateObj.type === 'Interval') {
            return {
                'date-parts': [
                    dateObj.values[0].values.slice(0,3),
                    dateObj.values[1].values.slice(0,3)
                ]
            }
        } else {
            return {
                'date-parts': dateObj.values.slice(0,3)
            }
        }
    }

    _reformName(theNames) {
        let reformedNames = [], that = this
        theNames.forEach((name) => {
            let reformedName = {}
            if (name.literal) {
                reformedName['literal'] = that._reformText(name.literal)
            } else {
                reformedName['given'] = that._reformText(name.given)
                reformedName['family'] = that._reformText(name.family)
                if (name.suffix) {
                    reformedName['suffix'] = that._reformText(name.suffix)
                }
                if (name.prefix) {
                    if(name.useprefix === true) {
                        reformedName['non-dropping-particle'] = that._reformText(name.prefix)
                    } else {
                        reformedName['dropping-particle'] = that._reformText(name.prefix)
                    }
                }
                reformedName['family'] = that._reformText(name['family'])
            }
            reformedNames.push(reformedName)
        })
        return reformedNames
    }

}
