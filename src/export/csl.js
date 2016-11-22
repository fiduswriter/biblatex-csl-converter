import {BibTypes, BibFieldTypes} from "../const"

/** Converts a BibDB to a DB of the CSL type.
 * @param bibDB The bibliography database to convert.
 */

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
        let bib = this.bibDB[id],
            cslOutput = {}
        for (let fKey in bib.fields) {
            if (bib.fields[fKey] !== '' && fKey in BibFieldTypes && 'csl' in BibFieldTypes[fKey]) {
                let fType = BibFieldTypes[fKey]['type']
                if ('f_date' == fType) {
                    cslOutput[BibFieldTypes[fKey]['csl']] = {'date-parts': bib.fields[fKey]}
                } else if ('l_literal' == fType || 'l_key' == fType) {
                    cslOutput[BibFieldTypes[fKey]['csl']] = bib.fields[fKey].join(', ')
                } else {
                    cslOutput[BibFieldTypes[fKey]['csl']] = bib.fields[fKey]
                }
            }
        }
        cslOutput['type'] = BibTypes[bib.bib_type].csl
        return cslOutput
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
