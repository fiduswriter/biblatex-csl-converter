// @flow

import {BibTypes, BibFieldTypes} from "../const"
import {edtfParse} from "../edtf-parser"

/** Converts a BibDB to a DB of the CSL type.
 * @param bibDB The bibliography database to convert.
 */

const TAGS = {
    'strong': {open:'<b>', close: '</b>'},
    'em': {open:'<i>', close: '</i>'},
    'sub': {open:'<sub>', close: '</sub>'},
    'sup': {open:'<sup>', close: '</sup>'},
    'smallcaps': {open:'<span style="font-variant:small-caps;">', close: '</span>'},
    'nocase': {open:'<span class="nocase">', close: '</span>'},
    'enquote': {open:'“', close: '”'},
    'url': {open:'', close: ''},
    'undefined': {open:'[', close: ']'}
 }

 /*::
import type {NodeArray, RangeArray, NameDictObject} from "../const"

type ErrorObject = {
    type: string;
    variable: string;
}

type CSLDateObject = {
    'date-parts'?: [Array<number>] | [Array<number>, Array<number>];
    circa?: boolean;
}

type CSLNameObject = {
    literal?: string;
    given?: string;
    family?: string;
    suffix?: string;
    'non-dropping-particle'?: string;
    'dropping-particle'?: string;
}

 */

export class CSLExporter {
    /*::
    bibDB: Object;
    pks: Array<string>
    cslDB: Object;
    errors: Array<ErrorObject>;
    */
    constructor(bibDB /*: Object */, pks /*: Array<string> | false */ = false) {
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
        console.warn('CSLExporter.output will be deprecated in biblatex-csl-converter 2.x. Use CSLExporter.parse() instead.')
        return this.parse()
    }

    parse() {
        for (let bibId in this.bibDB) {
            if (this.pks.indexOf(bibId) !== -1) {
                this.cslDB[bibId] = this.getCSLEntry(bibId)
                this.cslDB[bibId].id = this.bibDB[bibId].entry_key
            }
        }
        return this.cslDB
    }
    /** Converts one BibDB entry to CSL format.
     * @function getCSLEntry
     * @param id The id identifying the bibliography entry.
     */
    getCSLEntry(id /*: string */) {
        let bib = this.bibDB[id], fValues = {}
        if (!bib.fields || !bib.bib_type || !BibTypes[bib.bib_type]) {
            return fValues
        }
        for (let fKey in bib.fields) {
            if (bib.fields[fKey] !== '' && fKey in BibFieldTypes && 'csl' in BibFieldTypes[fKey]) {
                let fValue = bib.fields[fKey]
                let fType = BibFieldTypes[fKey]['type']
                let key = BibFieldTypes[fKey]['csl']
                let reformedValue
                switch(fType) {
                    case 'f_date':
                        reformedValue = this._reformDate(fValue)
                        if (reformedValue) {
                            fValues[key] = reformedValue
                        }
                        break
                    case 'f_integer':
                        fValues[key] = this._reformInteger(fValue)
                        break
                    case 'f_key':
                        fValues[key] = this._reformKey(fValue, fKey)
                        break
                    case 'f_literal':
                    case 'f_long_literal':
                        fValues[key] = this._reformText(fValue)
                        break
                    case 'l_range':
                        fValues[key] = this._reformRange(fValue)
                        break
                    case 'f_title':
                        fValues[key] = this._reformText(fValue)
                        break
                    case 'f_uri':
                    case 'f_verbatim':
                        fValues[key] = fValue
                        break
                    case 'l_key':
                        fValues[key] = fValue.map(key=>{return this._reformKey(key, fKey)}).join(' and ')
                        break
                    case 'l_literal':
                        fValues[key] = fValue.map(text => this._reformText(text)).join(', ')
                        break
                    case 'l_name':
                        fValues[key] = this._reformName(fValue)
                        break
                    case 'l_tag':
                        fValues[key] = fValue.join(', ')
                        break
                    default:
                        console.warn(`Unrecognized field type: ${fType}!`)
                }
            }
        }
        fValues['type'] = BibTypes[bib.bib_type].csl
        return fValues
    }

    _reformKey(theValue /*: string | NodeArray */, fKey /*: string */) {
        if (typeof theValue==='string') {
            let fieldType = BibFieldTypes[fKey]
            if (Array.isArray(fieldType['options'])) {
                return theValue
            } else {
                return fieldType['options'][theValue]['csl']
            }
        } else {
            return this._reformText(theValue)
        }
    }

    _reformRange(theValue /*: Array<RangeArray> */) /*: string */ {
        return theValue.map(
            range => range.map(
                text=> this._reformText(text)
            ).join('--')
        ).join(',')
    }

    _reformInteger(theValue /*: NodeArray */) {
        let theString = this._reformText(theValue)
        let theInt = parseInt(theString)
        if (theString !== String(theInt)) {
            return theString
        }
        return theInt
    }

    _reformText(theValue /*: NodeArray */) {
        let html = '', lastMarks = []
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
            let newMarks = node.marks ? node.marks.map(mark => mark.type) : []
            // close all tags that are not present in current text node.
            let closing = false, closeTags = []
            lastMarks.forEach((mark, index)=>{
                if (mark != newMarks[index]) {
                    closing = true
                }
                if (closing) {
                    closeTags.push(TAGS[mark].close)
                }
            })
            // Add close tags in reverse order to close innermost tags
            // first.
            closeTags.reverse()
            html += closeTags.join('')

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
            html += node.text
            lastMarks = newMarks
        })
        // Close all still open tags
        lastMarks.slice().reverse().forEach((mark)=>{
            html += TAGS[mark].close
        })
        return html
    }

    _reformDate(dateStr /*: string */) {
        let dateObj = edtfParse(dateStr)
        const reformedDate /*: CSLDateObject */ = {}
        if (!dateObj.valid) {
            return false
        } else if (
            dateObj.values.length > 1 &&
            Array.isArray(dateObj.values[0]) &&
            Array.isArray(dateObj.values[1])
        ) {
            const intervalFrom /*: Array<number | string> */ = dateObj.values[0],
                intervalTo /*: Array<number | string> */ = dateObj.values[1]
            const intervalDateParts /*: [Array<number>, Array<number>] */ = [
                intervalFrom.slice(0,3).map(value => parseInt(value)),
                intervalTo.slice(0,3).map(value => parseInt(value))
            ]
            reformedDate['date-parts'] = intervalDateParts
        } else {
            const values /*: Array<number> */ =
                dateObj.values.slice(0,3).map(value => parseInt(value))
            reformedDate['date-parts'] = [values]
            if (dateObj.type === 'Interval') {
                // Open interval that we cannot represent, so we make it circa instead.
                reformedDate['circa'] = true
            }
        }

        if (dateObj.uncertain || dateObj.approximate) {
            reformedDate['circa'] = true
        }
        return reformedDate
    }

    _reformName(theNames /*: Array<NameDictObject> */) /*: Array<CSLNameObject> */ {
        const names = theNames.map(name => {
            const reformedName /*: CSLNameObject */ = {}
            if (name.literal) {
                 let literal = this._reformText(name.literal)
                 if (literal.length) {
                     reformedName['literal'] = literal
                 } else {
                     return false
                 }
            } else {
                reformedName['given'] = this._reformText(name.given)
                reformedName['family'] = this._reformText(name.family)
                if (name.suffix) {
                    reformedName['suffix'] = this._reformText(name.suffix)
                }
                if (name.prefix) {
                    if(name.useprefix) {
                        reformedName['non-dropping-particle'] = this._reformText(name.prefix)
                    } else {
                        reformedName['dropping-particle'] = this._reformText(name.prefix)
                    }
                }
                reformedName['family'] = this._reformText(name['family'])
            }
            return reformedName
        })
        return ((names.filter(name => name)/*: Array<any>*/)/*: Array<CSLNameObject>*/)
    }

}
