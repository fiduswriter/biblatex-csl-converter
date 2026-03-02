/**
 * RIS (Research Information Systems) format parser
 * Supports standard RIS format (two-character tags with "  -" delimiter)
 */

import {
    BibTypes,
    BibFieldTypes,
    LangidOptions,
    NodeArray,
    EntryObject,
    NameDictObject,
    RangeArray,
} from "../const"

// RIS type to BibType mapping
// Source of types: https://github.com/zotero/translators/blob/873602eb8b0961da0b306161dc386032631ffaeb/RIS.js
const RISTypeMap: Record<string, string> = {
    ART: "artwork", // Artwork
    ABST: "article-journal", // Abstract
    ADVS: "video", // Audiovisual material
    AGGR: "misc", // Aggregated database
    ANCIENT: "classic", // Ancient text
    BILL: "legislation", // Bill
    BLOG: "post", // Blog post
    BOOK: "book", // Book
    CHAP: "inbook", // Book chapter
    CASE: "legal_case", // Case
    CHART: "figure", // Chart or table
    CLSWK: "classic", // Classical work
    COMP: "software", // Computer program
    CONF: "inproceedings", // Conference paper
    CPAPER: "inproceedings", // Conference paper
    CTLG: "article-magazine", // Catalog
    DATA: "dataset", // Dataset
    DBASE: "dataset", // Database
    DICT: "inreference", // Dictionary entry
    EBOOK: "book", // Electronic book
    ECHAP: "inbook", // Electronic book section
    EJOUR: "article-journal", // Electronic journal
    ENCYC: "inreference", // Encyclopedia entry
    EQUA: "misc", // Equation
    FIGURE: "figure", // Figure
    FILM: "video", // Film
    GEN: "misc", // Generic
    ELEC: "online", // Electronic resource
    HEAR: "hearing", // Hearing
    GOVDOC: "report", // Government document
    GRNT: "report", // Grant
    ICOMM: "personal_communication", // Internet communication (email, etc.)
    INPR: "article-journal", // In press (treat as journal article)
    JFULL: "article-journal", // Full journal article
    JOUR: "article-journal", // Journal article
    LEGAL: "legislation", // Legal document
    MGZN: "article-magazine", // Magazine article
    MPCT: "video", // Motion picture
    MANSCPT: "unpublished", // Manuscript
    MAP: "map", // Map
    MULTI: "misc", // Multimedia
    MUSIC: "audio", // Music
    NEWS: "article-newspaper", // News article
    PAMP: "booklet", // Pamphlet
    PAT: "patent", // Patent
    PCOMM: "personal_communication", // Personal communication
    RPRT: "report", // Report
    SER: "book", // Serial
    SLIDE: "misc", // Slide presentation
    SOUND: "audio", // Sound recording
    STAND: "standard", // Standard
    STAT: "legislation", // Statute
    THES: "thesis", // Thesis
    UNBILL: "legislation", // Unpublished bill
    UNPD: "unpublished", // Unpublished document
    VIDEO: "video", // Video
    WEB: "online", // Web page
}

/**
 * RIS tags that are explicitly handled during conversion.
 * Any tag present in a record but not in this set will trigger an
 * `unknown_tag` warning so callers know data may have been dropped.
 */
const KNOWN_RIS_TAGS = new Set([
    "TY", // Reference type (always handled)
    "ER", // End of record (always handled)
    "TI",
    "T1", // Title
    "T2",
    "JF",
    "JO",
    "J2", // Secondary / journal title
    "ST", // Short title
    "AU",
    "A1", // Primary authors
    "A2", // Secondary authors (editors)
    "A3", // Tertiary authors
    "AB",
    "N2", // Abstract
    "N1", // Notes
    "PY",
    "Y1", // Publication year
    "DA",
    "Y2", // Full date / access date
    "VL", // Volume
    "IS",
    "C7", // Issue / article number
    "SP", // Start page
    "EP", // End page
    "PB", // Publisher
    "CY",
    "PP", // Place / city
    "DO",
    "M3", // DOI
    "UR",
    "L1",
    "L2",
    "L3", // URL / link
    "SN",
    "SE", // ISBN / ISSN / section (dual-use: handled with fallback)
    "KW", // Keywords
    "ET", // Edition
    "CN", // Call number
    "AN",
    "M1", // Accession / article number
    "LA", // Language
])

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
    tag?: string
}

export interface RISParseResult {
    entries: Record<number, EntryObject>
    errors: ErrorObject[]
    warnings: ErrorObject[]
}

interface RISRecord {
    [key: string]: string[]
}

export class RISParser {
    input: string
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]

    constructor(input: string) {
        this.input = input
        this.entries = []
        this.errors = []
        this.warnings = []
    }

    parse(): RISParseResult {
        // Parse records
        const records = this.parseRISFormat()

        // Convert each record
        for (let i = 0; i < records.length; i++) {
            const convertedEntry = this.convertRecord(records[i], i + 1)
            if (convertedEntry) {
                this.entries.push(convertedEntry)
            }
        }

        // Create numbered index
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

    private parseRISFormat(): RISRecord[] {
        const records: RISRecord[] = []
        // Normalize line endings
        const normalizedInput = this.input
            .replace(/\r\r\n/g, "\n")
            .replace(/\r\n/g, "\n")
        const lines = normalizedInput.split("\n")

        let currentRecord: RISRecord = {}
        let currentTag: string | null = null
        let currentValue: string[] = []

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Check for new tag (format: "XX  - value" or "XX  -")
            const tagMatch = line.match(/^([A-Z][A-Z0-9])\s\s-\s?(.*)$/)

            if (tagMatch) {
                // Save previous tag value if exists
                if (currentTag && currentValue.length > 0) {
                    if (!currentRecord[currentTag]) {
                        currentRecord[currentTag] = []
                    }
                    currentRecord[currentTag].push(currentValue.join("\n"))
                }

                currentTag = tagMatch[1]
                currentValue = [tagMatch[2]]

                // Check for end of record
                if (currentTag === "ER") {
                    records.push(currentRecord)
                    currentRecord = {}
                    currentTag = null
                    currentValue = []
                }
            } else if (currentTag && line.startsWith("      ")) {
                // Continuation line (6 spaces)
                currentValue.push(line.trim())
            } else if (currentTag && line.trim() === "") {
                // Empty line - save current tag
                if (currentValue.length > 0) {
                    if (!currentRecord[currentTag]) {
                        currentRecord[currentTag] = []
                    }
                    currentRecord[currentTag].push(currentValue.join("\n"))
                    currentValue = []
                }
                currentTag = null
            }
        }

        // Handle last record if not ended with ER
        if (Object.keys(currentRecord).length > 0) {
            records.push(currentRecord)
        }

        return records
    }

    private convertRecord(
        record: RISRecord,
        index: number
    ): EntryObject | false {
        // Get the reference type
        const risType = this.getFirstValue(record["TY"]) || "GEN"
        const mappedBibType = RISTypeMap[risType]
        const bibType = mappedBibType || "misc"

        // Warn when the RIS type is not recognised at all
        if (!mappedBibType) {
            this.warnings.push({
                type: "unknown_type",
                value: risType,
                entry: String(index),
            })
        } else if (!BibTypes[bibType]) {
            // The mapped type itself is not a known BibType — treat as error
            this.errors.push({
                type: "unknown_type",
                value: risType,
                entry: String(index),
            })
            return false
        }

        const entryKey = this.generateEntryKey(record, index)
        const fields: Record<string, unknown> = {}

        // Title
        const title =
            this.getFirstValue(record["TI"]) || this.getFirstValue(record["T1"])
        if (title) {
            fields["title"] = this.setField("title", title)
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "title",
                entry: entryKey,
            })
        }

        // Secondary title (journal/book title)
        const secondaryTitle =
            this.getFirstValue(record["T2"]) ||
            this.getFirstValue(record["JF"]) ||
            this.getFirstValue(record["JO"]) ||
            this.getFirstValue(record["J2"])
        if (secondaryTitle) {
            fields["journaltitle"] = this.setField(
                "journaltitle",
                secondaryTitle
            )
        }

        // Short title
        const shortTitle = this.getFirstValue(record["ST"])
        if (shortTitle) {
            fields["shorttitle"] = this.setField("shorttitle", shortTitle)
        }

        // Authors
        const authors: string[] = [
            ...(record["AU"] || []),
            ...(record["A1"] || []),
        ]
        if (authors.length > 0) {
            fields["author"] = this.parseNames(authors)
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "author",
                entry: entryKey,
            })
        }

        // Secondary authors (editors)
        const secondaryAuthors = record["A2"] || []
        if (secondaryAuthors.length > 0) {
            fields["editor"] = this.parseNames(secondaryAuthors)
        }

        // Tertiary authors
        const tertiaryAuthors = record["A3"] || []
        if (tertiaryAuthors.length > 0) {
            fields["editora"] = this.parseNames(tertiaryAuthors)
        }

        // Abstract
        const abstract =
            this.getFirstValue(record["AB"]) || this.getFirstValue(record["N2"])
        if (abstract) {
            fields["abstract"] = this.setField("abstract", abstract)
        }

        // Notes
        const notes = this.getFirstValue(record["N1"])
        if (notes) {
            fields["note"] = this.setField("note", notes)
        }

        // Date/Publication Year
        const year =
            this.getFirstValue(record["PY"]) || this.getFirstValue(record["Y1"])
        const date =
            this.getFirstValue(record["DA"]) || this.getFirstValue(record["Y2"])
        if (year) {
            fields["date"] = year
        } else if (date) {
            fields["date"] = date
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "date",
                entry: entryKey,
            })
        }

        // Volume
        const volume = this.getFirstValue(record["VL"])
        if (volume) {
            fields["volume"] = this.setField("volume", volume)
        }

        // Issue/Number
        const issue =
            this.getFirstValue(record["IS"]) || this.getFirstValue(record["C7"])
        if (issue) {
            fields["issue"] = this.setField("issue", issue)
        }

        // Pages
        const startPage = this.getFirstValue(record["SP"])
        const endPage = this.getFirstValue(record["EP"])
        if (startPage && endPage) {
            fields["pages"] = [
                [
                    [
                        { type: "text", text: startPage },
                        { type: "text", text: endPage },
                    ],
                ],
            ]
        } else if (startPage) {
            fields["pages"] = [[[{ type: "text", text: startPage }]]]
        }

        // Publisher
        const publisher = this.getFirstValue(record["PB"])
        if (publisher) {
            fields["publisher"] = this.setField("publisher", publisher)
        }

        // Place/City
        const place =
            this.getFirstValue(record["CY"]) || this.getFirstValue(record["PP"])
        if (place) {
            fields["location"] = this.setField("location", place)
        }

        // DOI
        const doi =
            this.getFirstValue(record["DO"]) || this.getFirstValue(record["M3"])
        if (doi) {
            fields["doi"] = this.setField("doi", doi)
        }

        // URL
        const url =
            this.getFirstValue(record["UR"]) ||
            this.getFirstValue(record["L1"]) ||
            this.getFirstValue(record["L2"]) ||
            this.getFirstValue(record["L3"])
        if (url) {
            fields["url"] = this.setField("url", url)
        }

        // ISBN/ISSN
        const isbn =
            this.getFirstValue(record["SN"]) || this.getFirstValue(record["SE"])
        if (isbn) {
            // Could be ISBN or ISSN, try to determine
            if (isbn.includes("-") && isbn.length <= 13) {
                fields["isbn"] = this.setField("isbn", isbn)
            } else {
                fields["issn"] = this.setField("issn", isbn)
            }
        }

        // Keywords — l_tag expects string[], split on comma/semicolon like
        // the BibLaTeX importer does
        if (record["KW"] && record["KW"].length > 0) {
            fields["keywords"] = record["KW"].flatMap((kw) =>
                kw
                    .split(/[,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean)
            )
        }

        // Edition
        const edition = this.getFirstValue(record["ET"])
        if (edition) {
            fields["edition"] = this.setField("edition", edition)
        }

        // Call Number
        const callNum = this.getFirstValue(record["CN"])
        if (callNum) {
            fields["library"] = this.setField("library", callNum)
        }

        // Accession Number
        const accNum =
            this.getFirstValue(record["AN"]) || this.getFirstValue(record["M1"])
        if (accNum) {
            fields["eprint"] = this.setField("eprint", accNum)
        }

        // Language
        const language = this.getFirstValue(record["LA"])
        if (language) {
            const langid = this.setField("langid", language)
            if (langid !== undefined) {
                fields["langid"] = langid
            }
        }

        // Section/Chapter
        const section = this.getFirstValue(record["SE"])
        if (section) {
            fields["chapter"] = this.setField("chapter", section)
        }

        // Warn about tags present in the record that are not handled
        this.checkUnknownTags(record, entryKey)

        return {
            entry_key: entryKey,
            bib_type: bibType,
            fields,
        }
    }

    /**
     * Emit `unknown_tag` warnings for every tag in a parsed RIS record that
     * is not present in the {@link KNOWN_RIS_TAGS} set.  This lets callers
     * detect data that the converter silently dropped.
     */
    private checkUnknownTags(record: RISRecord, entryKey: string): void {
        for (const tag of Object.keys(record)) {
            if (!KNOWN_RIS_TAGS.has(tag)) {
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

    private parseName(nameText: string): NameDictObject | null {
        nameText = nameText.trim()
        if (!nameText) {
            return null
        }

        const nameObj: NameDictObject = {}

        // Handle "Last, First" format
        if (nameText.includes(",")) {
            const parts = nameText.split(",").map((p) => p.trim())
            if (parts.length >= 2) {
                nameObj.family = this.convertRichText(parts[0])
                nameObj.given = this.convertRichText(parts[1])
                return nameObj
            }
        }

        // Handle "First Last" format
        const words = nameText.split(/\s+/)
        if (words.length === 1) {
            nameObj.literal = this.convertRichText(nameText)
        } else {
            nameObj.family = this.convertRichText(words[words.length - 1])
            nameObj.given = this.convertRichText(words.slice(0, -1).join(" "))
        }

        return nameObj
    }

    private generateEntryKey(record: RISRecord, index: number): string {
        const firstAuthor =
            this.getFirstValue(record["AU"]) || this.getFirstValue(record["A1"])
        const year =
            this.getFirstValue(record["PY"]) || this.getFirstValue(record["Y1"])
        if (firstAuthor && year) {
            const lastName = firstAuthor.split(",")[0].trim()
            return `${lastName}${year}`
        }
        return String(index)
    }

    private convertRange(value: string): RangeArray[] {
        if (!value) {
            return []
        }
        return String(value)
            .split(/,|;/)
            .map((range) => {
                const parts = range.split(/[-–—]/)
                return [
                    parts.map((part) => ({
                        type: "text",
                        text: part.trim(),
                    })),
                ]
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
            const options = fieldDef?.options as LangidOptions | undefined
            if (options) {
                const lower = text.toLowerCase().trim()
                const matched = Object.keys(options).find(
                    (k) =>
                        k.toLowerCase() === lower ||
                        options[k].csl.toLowerCase() === lower ||
                        options[k].biblatex.toLowerCase() === lower
                )
                return matched // undefined if no match — caller omits the field
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

        // Decode common HTML entities
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

export function parseRIS(input: string): RISParseResult {
    return new RISParser(input).parse()
}
