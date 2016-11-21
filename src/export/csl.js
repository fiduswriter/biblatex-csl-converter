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
                cslOutput[BibFieldTypes[fKey]['csl']] = bib.fields[fKey]
            }
        }
        cslOutput['type'] = BibTypes[bib.bib_type].csl
        return cslOutput
    }
}
