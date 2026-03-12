/**
 * PubMed NBIB format parser
 * Handles the PubMed/MEDLINE tagged export format (e.g., PMID- 12345678)
 *
 * Format specification:
 * https://www.nlm.nih.gov/bsd/mms/medlineelements.html
 */

import {
    BibTypes,
    BibFieldTypes,
    NodeArray,
    EntryObject,
    NameDictObject,
    RangeArray,
} from "../const"
import { makeEntryKey, lookupLangid } from "./tools"

/**
 * Map from PubMed publication type strings (PT tag) to internal BibTypes.
 * PubMed entries can have multiple PT values; the first recognised one wins.
 * Source: https://www.nlm.nih.gov/mesh/pubtypes.html
 */
const NBIBTypeMap: Record<string, string> = {
    "Journal Article": "article-journal",
    Review: "article-journal",
    "Systematic Review": "article-journal",
    "Meta-Analysis": "article-journal",
    "Clinical Trial": "article-journal",
    "Clinical Trial, Phase I": "article-journal",
    "Clinical Trial, Phase II": "article-journal",
    "Clinical Trial, Phase III": "article-journal",
    "Clinical Trial, Phase IV": "article-journal",
    "Randomized Controlled Trial": "article-journal",
    "Controlled Clinical Trial": "article-journal",
    "Multicenter Study": "article-journal",
    "Observational Study": "article-journal",
    "Case Reports": "article-journal",
    "Comparative Study": "article-journal",
    Editorial: "article-journal",
    Letter: "article-journal",
    Comment: "article-journal",
    News: "article-newspaper",
    "Newspaper Article": "article-newspaper",
    "Magazine Article": "article-magazine",
    Book: "book",
    "Book Chapter": "inbook",
    "Collected Works": "collection",
    Congress: "proceedings",
    "Conference Paper": "inproceedings",
    Dataset: "dataset",
    Preprint: "unpublished",
    "Technical Report": "report",
    Report: "report",
    "Government Publication": "report",
    "Legal Case": "legal_case",
    Legislation: "legislation",
    Patent: "patent",
    Thesis: "thesis",
    Biography: "article-journal",
    "Historical Article": "article-journal",
    Interview: "article-journal",
    Lecture: "misc",
    "Video-Audio Media": "video",
    "Audiovisual Aids": "video",
    "Retracted Publication": "article-journal",
    "Retraction of Publication": "article-journal",
    "Published Erratum": "article-journal",
    Address: "article-journal",
    Portrait: "misc",
    Guideline: "report",
    "Practice Guideline": "report",
    Advisory: "report",
    "Consensus Development Conference": "article-journal",
    "Consensus Development Conference, NIH": "article-journal",
    "Evaluation Study": "article-journal",
    "Validation Study": "article-journal",
    "Twin Study": "article-journal",
    "Clinical Conference": "inproceedings",
    "Introductory Journal Article": "article-journal",
    "Scientific Integrity Review": "article-journal",
    "Expression of Concern": "article-journal",
    Overall: "article-journal",
    "Classical Article": "article-journal",
    "English Abstract": "article-journal",
    "Duplicate Publication": "article-journal",
    Festschrift: "collection",
    Bibliography: "misc",
    Directory: "misc",
    Autobiography: "book",
    "Interactive Tutorial": "misc",
    Webcasts: "online",
    "Electronic Supplementary Materials": "misc",
    "Online Only": "online",
    "Corrected and Republished Article": "article-journal",
    Retraction: "article-journal",
}

/**
 * NBIB tags that are explicitly handled during conversion.
 * Any tag in a record not in this set will trigger an `unknown_tag` warning.
 * Source: https://www.nlm.nih.gov/bsd/mms/medlineelements.html
 */
const KNOWN_NBIB_TAGS = new Set([
    "PMID", // PubMed Unique Identifier
    "OWN", // Owner
    "STAT", // Status
    "DCOM", // Date Completed
    "LR", // Last Revision Date
    "IS", // ISSN
    "VI", // Volume
    "IP", // Issue
    "DP", // Date of Publication
    "TI", // Title
    "TT", // Transliterated Title
    "PG", // Pagination
    "LID", // Location Identifier (DOI, pii, etc.)
    "AB", // Abstract
    "CI", // Copyright Information
    "FAU", // Full Author Name
    "AU", // Author
    "AD", // Affiliation / Author Address
    "FED", // Full Editor Name
    "ED", // Editor
    "LA", // Language
    "PT", // Publication Type
    "DEP", // Date of Electronic Publication
    "PL", // Place of Publication
    "TA", // Journal Title Abbreviation
    "JT", // Full Journal Title
    "JID", // NLM Unique ID
    "SB", // Subset
    "MH", // MeSH Terms
    "OTO", // Other Term Owner
    "OT", // Other Term (Keywords)
    "COIS", // Conflict of Interest Statement
    "EDAT", // Entrez Date
    "MHDA", // MeSH Date
    "CRDT", // Create Date
    "PHST", // Publication History Status
    "AID", // Article Identifier
    "PST", // Publication Status
    "SO", // Source
    "GR", // Grant Number
    "PMC", // PubMed Central ID
    "PMCR", // PubMed Central Release
    "RN", // Registry Number / EC Number
    "NM", // Substance Name
    "OID", // Other ID
    "RF", // Number of References
    "SFM", // Space Flight Mission
    "CIN", // Comment In
    "CON", // Comment On
    "EIN", // Erratum In
    "EON", // Erratum For
    "EFR", // Erratum For (Retraction)
    "RI", // Republished In
    "RIN", // Retraction In
    "ROF", // Retraction Of
    "UIN", // Update In
    "UOF", // Update Of
    "SPIN", // Summary For Patients In
    "ORI", // Original Report In
    "IR", // Investigator
    "FIR", // Full Investigator Name
    "BTI", // Book Title
    "CTI", // Collection Title
    "ISBN", // ISBN
    "PB", // Publisher
    "CN", // Corporate Author
    "EN", // Edition
    "VTI", // Volume Title
    "IRAD", // Investigator Affiliation
    "CRF", // Correction and Republication For
    "CRI", // Correction and Republication In
    "ECI", // Expression of Concern In
    "ECF", // Expression of Concern For
])

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
    tag?: string
}

export interface NBIBParseResult {
    entries: Record<number, EntryObject>
    errors: ErrorObject[]
    warnings: ErrorObject[]
}

interface NBIBRecord {
    [key: string]: string[]
}

export class NBIBParser {
    input: string
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]
    private usedKeys: Set<string> = new Set()

    constructor(input: string) {
        this.input = input
        this.entries = []
        this.errors = []
        this.warnings = []
    }

    parse(): NBIBParseResult {
        const records = this.parseNBIBFormat()

        for (let i = 0; i < records.length; i++) {
            const convertedEntry = this.convertRecord(records[i], i + 1)
            if (convertedEntry) {
                this.entries.push(convertedEntry)
            }
        }

        const entries: Record<number, EntryObject> = {}
        this.entries.forEach((entry, index) => {
            entries[index + 1] = entry
        })

        return {
            entries,
            errors: this.errors,
            warnings: this.warnings,
        }
    }

    /**
     * Parse raw NBIB text into an array of tag→values records.
     *
     * The NBIB/MEDLINE format uses lines of the form:
     *   TAG - value
     * where TAG is a 2–4 character identifier padded with spaces to a fixed
     * column width of 6 before the hyphen-space delimiter.  Continuation lines
     * start with 6 spaces.  Records are delimited by a blank line following the
     * final tag (often "SO"), or by the start of a new PMID tag.
     */
    private parseNBIBFormat(): NBIBRecord[] {
        const records: NBIBRecord[] = []
        const normalizedInput = this.input
            .replace(/\r\r\n/g, "\n")
            .replace(/\r\n/g, "\n")
        const lines = normalizedInput.split("\n")

        let currentRecord: NBIBRecord = {}
        let currentTag: string | null = null

        const saveRecord = () => {
            if (Object.keys(currentRecord).length > 0) {
                records.push(currentRecord)
                currentRecord = {}
                currentTag = null
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // A tag line: up to 4 non-space chars, then spaces up to column 4,
            // then "- " (with at least one space before and after the dash).
            // The canonical format is "XXXX- value" where the tag field is
            // left-justified in a 4-character column followed by "- ".
            const tagMatch = line.match(/^([A-Z]+)\s*-\s(.*)$/)

            if (tagMatch) {
                const tag = tagMatch[1].trim()
                const value = tagMatch[2]

                // A new PMID tag means a new record starts
                if (tag === "PMID" && Object.keys(currentRecord).length > 0) {
                    saveRecord()
                }

                if (!currentRecord[tag]) {
                    currentRecord[tag] = []
                }
                currentRecord[tag].push(value)
                currentTag = tag
            } else if (line.match(/^\s{6}/) && currentTag) {
                // Continuation line: 6 leading spaces
                const value = line.trim()
                const lastIdx = currentRecord[currentTag].length - 1
                // Append with a space to join the multi-line field naturally
                currentRecord[currentTag][lastIdx] += " " + value
            } else if (line.trim() === "") {
                // Blank line ends a record
                saveRecord()
            }
            // Lines that don't match any pattern are silently ignored
            // (e.g. file headers, blank tag lines)
        }

        // Flush the last record if the file doesn't end with a blank line
        saveRecord()

        return records
    }

    private convertRecord(
        record: NBIBRecord,
        index: number
    ): EntryObject | false {
        // Determine entry type from PT (Publication Type) tags.
        // A single NBIB record may list multiple PT values; we use the first
        // one that maps to a known internal type, falling back to misc.
        const pubTypes = record["PT"] || []
        let mappedBibType: string | undefined
        let matchedPT: string | undefined
        for (const pt of pubTypes) {
            const trimmed = pt.trim()
            if (NBIBTypeMap[trimmed]) {
                mappedBibType = NBIBTypeMap[trimmed]
                matchedPT = trimmed
                break
            }
        }

        if (!mappedBibType && pubTypes.length > 0) {
            this.warnings.push({
                type: "unknown_type",
                value: pubTypes[0].trim(),
                entry: String(index),
            })
        }

        const bibType = mappedBibType || "misc"

        if (mappedBibType && !BibTypes[bibType]) {
            this.errors.push({
                type: "unknown_type",
                value: matchedPT,
                entry: String(index),
            })
            return false
        }

        const entryKey = this.generateEntryKey(record, index)
        const fields: Record<string, unknown> = {}

        // ── Title ─────────────────────────────────────────────────────────────
        // TI = article/chapter title; BTI = book title (for book records)
        const title =
            this.getFirstValue(record["TI"]) ||
            this.getFirstValue(record["BTI"])
        if (title) {
            fields["title"] = this.setField("title", title)
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "title",
                entry: entryKey,
            })
        }

        // ── Transliterated / alternate title ──────────────────────────────────
        const transTitle = this.getFirstValue(record["TT"])
        if (transTitle) {
            fields["origtitle"] = this.setField("origtitle", transTitle)
        }

        // ── Journal title ─────────────────────────────────────────────────────
        // JT = full journal title; TA = abbreviated title; CTI = collection title
        const journalTitle =
            this.getFirstValue(record["JT"]) ||
            this.getFirstValue(record["CTI"])
        if (journalTitle) {
            fields["journaltitle"] = this.setField("journaltitle", journalTitle)
        }

        const journalAbbrev = this.getFirstValue(record["TA"])
        if (journalAbbrev && !journalTitle) {
            // Only use abbreviation when the full title is absent
            fields["journaltitle"] = this.setField(
                "journaltitle",
                journalAbbrev
            )
        }
        if (journalAbbrev) {
            fields["shortjournal"] = this.setField(
                "shortjournal",
                journalAbbrev
            )
        }

        // ── Volume title (VTI) ────────────────────────────────────────────────
        const volumeTitle = this.getFirstValue(record["VTI"])
        if (volumeTitle) {
            fields["booktitle"] = this.setField("booktitle", volumeTitle)
        }

        // ── Authors ───────────────────────────────────────────────────────────
        // FAU = full author name (preferred); AU = abbreviated author name;
        // CN = corporate/collective author (treated as literal name)
        const fullAuthors = record["FAU"] || []
        const shortAuthors = record["AU"] || []
        const corpAuthors = record["CN"] || []

        const authorNames: NameDictObject[] = []
        if (fullAuthors.length > 0) {
            authorNames.push(...this.parseNames(fullAuthors))
        } else if (shortAuthors.length > 0) {
            authorNames.push(...this.parseNames(shortAuthors))
        }
        // Corporate authors are appended as literal names
        for (const corp of corpAuthors) {
            const trimmed = corp.trim()
            if (trimmed) {
                authorNames.push({
                    literal: this.convertRichText(trimmed),
                })
            }
        }

        if (authorNames.length > 0) {
            fields["author"] = authorNames
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "author",
                entry: entryKey,
            })
        }

        // ── Editors ───────────────────────────────────────────────────────────
        // FED = full editor name; ED = abbreviated editor name
        const fullEditors = record["FED"] || []
        const shortEditors = record["ED"] || []
        const editorNames: NameDictObject[] =
            fullEditors.length > 0
                ? this.parseNames(fullEditors)
                : this.parseNames(shortEditors)
        if (editorNames.length > 0) {
            fields["editor"] = editorNames
        }

        // ── Abstract ─────────────────────────────────────────────────────────
        const abstract = this.getFirstValue(record["AB"])
        if (abstract) {
            fields["abstract"] = this.setField("abstract", abstract)
        }

        // ── Date of publication ───────────────────────────────────────────────
        // DP contains a human-readable date such as "2025 May", "2025 May 1",
        // "2025", "2025 Spring", etc.  We parse out a best-effort EDTF string.
        const dp = this.getFirstValue(record["DP"])
        if (dp) {
            fields["date"] = this.parsePublicationDate(dp)
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "date",
                entry: entryKey,
            })
        }

        // ── Volume ────────────────────────────────────────────────────────────
        const volume = this.getFirstValue(record["VI"])
        if (volume) {
            fields["volume"] = this.setField("volume", volume)
        }

        // ── Issue ─────────────────────────────────────────────────────────────
        const issue = this.getFirstValue(record["IP"])
        if (issue) {
            fields["issue"] = this.setField("issue", issue)
        }

        // ── Pages ─────────────────────────────────────────────────────────────
        const pages = this.getFirstValue(record["PG"])
        if (pages) {
            fields["pages"] = this.convertRange(pages)
        }

        // ── Publisher ─────────────────────────────────────────────────────────
        const publisher = this.getFirstValue(record["PB"])
        if (publisher) {
            fields["publisher"] = this.setField("publisher", publisher)
        }

        // ── Place of publication ──────────────────────────────────────────────
        const place = this.getFirstValue(record["PL"])
        if (place) {
            fields["location"] = this.setField("location", place)
        }

        // ── DOI and other location identifiers ───────────────────────────────
        // LID lines carry a value AND a type tag, e.g.:
        //   "10.1016/j.xxx.2024.11.004 [doi]"
        //   "S1094-9194(24)00064-1 [pii]"
        // AID lines use the same convention.
        const doi = this.extractLID(record, "doi")
        if (doi) {
            fields["doi"] = this.setField("doi", doi)
        }

        const pii = this.extractLID(record, "pii")
        if (pii && !doi) {
            // Store pii as eprint when there is no DOI
            fields["eprint"] = this.setField("eprint", pii)
            fields["eprinttype"] = "pii"
        }

        // ── ISSN ─────────────────────────────────────────────────────────────
        // IS lines may appear multiple times (print/electronic ISSN).
        // We keep all values joined by space, or store each separately.
        if (record["IS"] && record["IS"].length > 0) {
            // Prefer the first value; it is often the print ISSN
            const issn = record["IS"][0].trim()
            if (issn) {
                fields["issn"] = this.setField("issn", issn)
            }
        }

        // ── ISBN ─────────────────────────────────────────────────────────────
        const isbn = this.getFirstValue(record["ISBN"])
        if (isbn) {
            fields["isbn"] = this.setField("isbn", isbn)
        }

        // ── PubMed ID ─────────────────────────────────────────────────────────
        const pmid = this.getFirstValue(record["PMID"])
        if (pmid) {
            fields["eprint"] = this.setField("eprint", pmid.trim())
            fields["eprinttype"] = "pubmed"
        }

        // ── PubMed Central ID ─────────────────────────────────────────────────
        const pmc = this.getFirstValue(record["PMC"])
        if (pmc) {
            // Only overwrite eprint with PMC if PMID was not set
            if (!pmid) {
                fields["eprint"] = this.setField("eprint", pmc.trim())
                fields["eprinttype"] = "pmcid"
            }
            fields["note"] = this.setField("note", `PMC: ${pmc.trim()}`)
        }

        // ── Language ─────────────────────────────────────────────────────────
        const language = this.getFirstValue(record["LA"])
        if (language) {
            const langid = this.setField("langid", language.trim())
            if (langid !== undefined) {
                fields["langid"] = langid
            }
        }

        // ── Keywords (MeSH + author keywords) ────────────────────────────────
        // OT = other terms (author-supplied keywords)
        // MH = MeSH headings — we include these too as they are topic keywords
        const otKeywords = (record["OT"] || [])
            .map((k) => k.trim())
            .filter(Boolean)
        const meshKeywords = (record["MH"] || [])
            .map((k) => {
                // Strip leading asterisks used to denote major MeSH headings
                // and trailing qualifiers like "/pathology"
                return k.replace(/^\*/, "").split("/")[0].trim()
            })
            .filter(Boolean)

        const allKeywords = [
            ...otKeywords,
            // Deduplicate MeSH terms against already-present OT keywords
            ...meshKeywords.filter(
                (m) =>
                    !otKeywords.some((o) => o.toLowerCase() === m.toLowerCase())
            ),
        ]
        if (allKeywords.length > 0) {
            fields["keywords"] = allKeywords
        }

        // ── Edition ───────────────────────────────────────────────────────────
        const edition = this.getFirstValue(record["EN"])
        if (edition) {
            fields["edition"] = this.setField("edition", edition)
        }

        // ── Grant numbers ─────────────────────────────────────────────────────
        if (record["GR"] && record["GR"].length > 0) {
            // Store as a note — there is no dedicated internal field for grants
            const grants = record["GR"].map((g) => g.trim()).join("; ")
            if (grants && !fields["note"]) {
                fields["note"] = this.setField("note", `Grants: ${grants}`)
            }
        }

        this.checkUnknownTags(record, entryKey)

        return {
            entry_key: entryKey,
            bib_type: bibType,
            fields,
        }
    }

    /**
     * Scan LID and AID tag arrays for a value carrying a specific type label
     * (e.g. "[doi]", "[pii]") and return the bare identifier.
     */
    private extractLID(record: NBIBRecord, type: string): string {
        const pattern = new RegExp(`\\[${type}\\]`, "i")
        for (const tagKey of ["LID", "AID"]) {
            for (const value of record[tagKey] || []) {
                if (pattern.test(value)) {
                    return value.replace(pattern, "").trim()
                }
            }
        }
        return ""
    }

    /**
     * Convert a MEDLINE "Date of Publication" string into a best-effort
     * EDTF/ISO 8601 date string.
     *
     * Examples of DP values encountered in practice:
     *   "2025"                → "2025"
     *   "2025 May"            → "2025-05"
     *   "2025 May 1"          → "2025-05-01"
     *   "2025 May-Jun"        → "2025-05/2025-06"
     *   "2024 Winter"         → "2024"  (season dropped — not valid EDTF)
     *   "2024 Jan-Mar"        → "2024-01/2024-03"
     */
    private parsePublicationDate(dp: string): string {
        const monthMap: Record<string, string> = {
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            may: "05",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12",
        }

        dp = dp.trim()

        // Year only
        const yearOnly = dp.match(/^(\d{4})$/)
        if (yearOnly) {
            return yearOnly[1]
        }

        // "YYYY Season" — seasons are not representable in EDTF; keep year only
        const withSeason = dp.match(
            /^(\d{4})\s+(spring|summer|fall|autumn|winter)$/i
        )
        if (withSeason) {
            return withSeason[1]
        }

        // "YYYY Mon" or "YYYY Mon-Mon" or "YYYY Mon Day" or "YYYY Mon Day-Day"
        const yearMonthMatch = dp.match(
            /^(\d{4})\s+([A-Za-z]{3})(?:-([A-Za-z]{3}))?(?:\s+(\d{1,2})(?:-(\d{1,2}))?)?$/
        )
        if (yearMonthMatch) {
            const year = yearMonthMatch[1]
            const mon1 = monthMap[yearMonthMatch[2].toLowerCase()]
            const mon2 = yearMonthMatch[3]
                ? monthMap[yearMonthMatch[3].toLowerCase()]
                : undefined
            const day1 = yearMonthMatch[4]
                ? yearMonthMatch[4].padStart(2, "0")
                : undefined
            const day2 = yearMonthMatch[5]
                ? yearMonthMatch[5].padStart(2, "0")
                : undefined

            if (!mon1) {
                return year
            }

            const start = day1 ? `${year}-${mon1}-${day1}` : `${year}-${mon1}`

            if (mon2) {
                const end = day2 ? `${year}-${mon2}-${day2}` : `${year}-${mon2}`
                return `${start}/${end}`
            }

            return start
        }

        // Fallback — return the raw value and let the consumer deal with it
        return dp
    }

    /**
     * Emit `unknown_tag` warnings for every tag in a parsed NBIB record that
     * is not present in the {@link KNOWN_NBIB_TAGS} set.
     */
    private checkUnknownTags(record: NBIBRecord, entryKey: string): void {
        for (const tag of Object.keys(record)) {
            if (!KNOWN_NBIB_TAGS.has(tag)) {
                const value = this.getFirstValue(record[tag])
                this.warnings.push({
                    type: "unknown_tag",
                    tag,
                    value: value ? value.substring(0, 100) : undefined,
                    entry: entryKey,
                })
            }
        }
    }

    private getFirstValue(values: string[] | undefined): string {
        if (!values || values.length === 0) {
            return ""
        }
        return values[0].trim()
    }

    private parseNames(names: string[]): NameDictObject[] {
        return names
            .map((name) => this.parseName(name.trim()))
            .filter((n): n is NameDictObject => n !== null)
    }

    /**
     * Parse an author name string.
     *
     * PubMed FAU names are in "Family, Given" format:
     *   "Vergneau-Grosset, Claire"
     *   "van der Berg, Jan Willem"
     *
     * AU (abbreviated) names look like:
     *   "Raulic J"
     *   "Smith AB"
     */
    private parseName(nameText: string): NameDictObject | null {
        nameText = nameText.trim()
        if (!nameText) {
            return null
        }

        const nameObj: NameDictObject = {}

        if (nameText.includes(",")) {
            // "Family, Given" format
            const commaIdx = nameText.indexOf(",")
            const family = nameText.slice(0, commaIdx).trim()
            const given = nameText.slice(commaIdx + 1).trim()
            nameObj.family = this.convertRichText(family)
            if (given) {
                nameObj.given = this.convertRichText(given)
            }
            return nameObj
        }

        // Abbreviated format: "Smith AB" — last token is initials, rest is family
        const words = nameText.split(/\s+/)
        if (words.length === 1) {
            nameObj.literal = this.convertRichText(nameText)
        } else {
            const lastWord = words[words.length - 1]
            // If the last word looks like initials (all uppercase letters), treat
            // it as given initials and the preceding words as family name
            if (/^[A-Z]{1,4}$/.test(lastWord)) {
                nameObj.family = this.convertRichText(
                    words.slice(0, -1).join(" ")
                )
                nameObj.given = this.convertRichText(lastWord)
            } else {
                // Otherwise treat entire string as a single literal
                nameObj.literal = this.convertRichText(nameText)
            }
        }

        return nameObj
    }

    private generateEntryKey(record: NBIBRecord, index: number): string {
        // Prefer full author name, fall back to abbreviated
        const firstAuthor =
            this.getFirstValue(record["FAU"]) ||
            this.getFirstValue(record["AU"])
        const dp = this.getFirstValue(record["DP"])
        const year = dp ? dp.match(/\d{4}/)?.[0] ?? "" : ""

        // Use the family name part (before the comma, if present)
        let lastName: string | undefined
        if (firstAuthor) {
            const family = firstAuthor.includes(",")
                ? firstAuthor.split(",")[0].trim()
                : firstAuthor.split(/\s+/).slice(0, -1).join("") ||
                  firstAuthor.split(/\s+/)[0]
            const cleanFamily = family.replace(/[^A-Za-z0-9]/g, "")
            if (cleanFamily) lastName = cleanFamily
        }

        // Use PMID as the candidate when no author is available so that the
        // prefixed form "pmid{number}" is preserved as a fallback base.
        const pmid = this.getFirstValue(record["PMID"])
        const candidate = pmid ? `pmid${pmid.trim()}` : String(index)

        return makeEntryKey(
            candidate,
            this.usedKeys,
            lastName,
            year || undefined
        )
    }

    private convertRange(value: string): RangeArray[] {
        if (!value) {
            return []
        }
        // Pages field may look like "315-330", "e123", "315-330, e1-e5", etc.
        return String(value)
            .split(/,|;/)
            .map((range) => {
                const trimmed = range.trim()
                // Split on hyphen/en-dash/em-dash, but only when both sides
                // look numeric or alphanumeric (avoids splitting "e123-456")
                const parts = trimmed.split(/(?<=\w)[-–—](?=\w)/)
                if (parts.length >= 2) {
                    return [
                        parts.map((part) => ({
                            type: "text" as const,
                            text: part.trim(),
                        })),
                    ] as RangeArray
                }
                return [
                    [{ type: "text" as const, text: trimmed }],
                ] as RangeArray
            })
    }

    /**
     * Stores a plain text value into the correct internal shape for the given
     * BibField key:
     *   - l_literal  → NodeArray[]  (array of NodeArrays)
     *   - f_verbatim / f_uri / f_date → plain string
     *   - f_key      → matched option key string, or undefined if unrecognised
     *   - everything else → NodeArray
     */
    private setField(
        fieldKey: string,
        text: string
    ): NodeArray | NodeArray[] | string | undefined {
        const fieldDef = BibFieldTypes[fieldKey]
        const fieldType = fieldDef?.type
        if (fieldType === "l_literal") {
            return [this.convertRichText(text)]
        } else if (
            fieldType === "f_verbatim" ||
            fieldType === "f_uri" ||
            fieldType === "f_date"
        ) {
            return text
        } else if (fieldType === "f_key") {
            const options = fieldDef?.options
            if (Array.isArray(options)) {
                // Array options (e.g. bookpagination, type): plain string match
                const lower = text.toLowerCase().trim()
                const matched = options.find(
                    (k: string) => k.toLowerCase() === lower
                )
                return matched // undefined if no match
            } else if (options) {
                // Object options (e.g. langid): use shared lookup that handles
                // BCP-47 codes, ISO 639-2 codes, full names, biblatex aliases
                return lookupLangid(text) // undefined if no match
            }
            return text
        }
        return this.convertRichText(text)
    }

    private convertRichText(text: string): NodeArray {
        if (typeof text !== "string") {
            return [{ type: "text", text: String(text) }]
        }
        if (!text) {
            return [{ type: "text", text: "" }]
        }
        // Decode common HTML entities that may appear in PubMed abstracts
        const decodedText = text
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#xD;/g, "\n")
            .replace(/&#xA;/g, "\n")
            .replace(/&#13;/g, "\n")
            .replace(/&#10;/g, "\n")

        return [{ type: "text", text: decodedText }]
    }
}

export function parseNBIB(input: string): NBIBParseResult {
    return new NBIBParser(input).parse()
}
