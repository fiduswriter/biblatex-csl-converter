import {TexSpecialChars} from "./const"
import {BibTypes, BibFieldTypes} from "../const"

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

 const TAGS = {
     'strong': {open:'\\mkbibbold{', close: '}'},
     'em': {open:'\\mkbibitalic{', close: '}'},
     'smallcaps': {open:'\\textsc{', close: '}'},
     'enquote': {open:'\\enquote{', close: '}'},
     'nocase': {open:'{{', close: '}}'},
     'sub': {open:'_{', close: '}'},
     'sup': {open:'^{', close: '}'},
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
        this.warnings = []
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
                        fValues[key] = fValue // EDTF 1.0 level 0/1 compliant string.
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
                    case 'f_title':
                        fValues[key] = this._reformText(fValue)
                        break
                    case 'f_uri':
                    case 'f_verbatim':
                        fValues[key] = this._escapeTeX(fValue)
                        break
                    case 'l_key':
                        fValues[key] = this._escapeTeX(fValue.join(' and '))
                        break
                    case 'l_literal':
                        fValues[key] = fValue.map((text)=>{return that._reformText(text)}).join(' and ')
                        break
                    case 'l_name':
                        fValues[key] = this._reformName(fValue)
                        break
                    case 'l_tag':
                        fValues[key] = this._escapeTeX(fValue.join(', '))
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

    _reformInteger(theValue) {
        return String(theValue)
    }

    _reformName(theValue) {
        let names = [], that = this
        theValue.forEach((name)=>{
            if (name.literal) {
                let literal = that._reformText(name.literal)
                names.push(`{${literal}}`)
            } else {
                let family = that._reformText(name.family)
                let given = that._reformText(name.given)
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
        theValue.forEach((node)=>{
            if (node.type === 'variable') {
                // This is an undefined variable
                // This should usually not happen, as CSL doesn't know what to
                // do with these. We'll put them into an unsupported tag.
                latex += `} # ${node.attrs.variable} # {`
                this.warnings.push({
                    type: 'undefined_variable',
                    variable: node.attrs.variable
                })
                return
            }
            let newMarks = []
            if (node.marks) {
                let mathMode = false
                node.marks.forEach((mark)=>{
                    // We need to activate mathmode for the lowest level sub/sup node.
                    if ((mark.type === 'sup' || mark.type === 'sub') && !mathMode) {
                        newMarks.push('math')
                        newMarks.push(mark.type)
                        mathMode = true
                    } else if (mark.type === 'nocase') {
                        // No case has to be applied at the top level to be effective.
                        newMarks.unshift(mark.type)
                    } else {
                        newMarks.push(mark.type)
                    }
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
                    // If not inside of a nocase, add a protective brace around tag.
                    if (lastMarks[0] !== 'nocase' && TAGS[mark].open[0] === '\\') {
                        latex += '}'
                    }
                }

            })
            // open all new tags that were not present in the last text node.
            let opening = false
            newMarks.forEach((mark, index)=>{
                if (mark != lastMarks[index]) {
                    opening = true
                }
                if (opening) {
                    // If not inside of a nocase, add a protective brace around tag.
                    if (newMarks[0] !== 'nocase' && TAGS[mark].open[0] === '\\') {
                        latex += '{'
                    }
                    latex += TAGS[mark].open
                }
            })
            latex += that._escapeTeX(node.text)
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
            str += `@${data.type}{${data.key}`
            for (let vKey in data.values) {
                let value = `{${data.values[vKey]}}`.replace(/\{\} \# /g,'').replace(/\# \{\}/g,'')
                str += `,\r\n${vKey} = ${value}`
            }
            str += "\r\n}"
        }
        return str
    }
}
