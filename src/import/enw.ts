/**
 * EndNote .enw format parser
 * Handles the EndNote tagged export format (e.g., %A Author, %T Title)
 */

import {
    BibFieldTypes,
    BibTypes,
    type EntryObject,
    type NameDictObject,
    type NodeArray,
    type RangeArray,
} from "../const"
import { lookupLangid, makeEntryKey } from "./tools"

// EndNote .enw format type mapping (%0)
// Source: Endnote 21 User Guide, p. 248-249
const EndNoteTypeMap: Record<string, string> = {
    "Aggregated Database": "misc",
    "Ancient Text": "classic",
    Artwork: "artwork",
    "Audiovisual Material": "video",
    Bill: "legislation",
    Blog: "online",
    Book: "book",
    "Book Section": "inbook",
    Case: "legal_case",
    Catalog: "book",
    "Chart or Table": "figure",
    "Classical Work": "classic",
    "Computer Program": "software",
    "Conference Paper": "inproceedings",
    "Conference Proceedings": "proceedings",
    Dataset: "dataset",
    Dictionary: "inreference",
    "Discussion Forum": "post",
    "Edited Book": "collection",
    "Electronic Article": "article",
    "Electronic Book": "book",
    "Electronic Book Section": "inbook",
    Encyclopedia: "inreference",
    Equation: "misc",
    Figure: "figure",
    "Film or Broadcast": "video",
    Generic: "misc",
    "Government Document": "report",
    Grant: "report",
    Hearing: "hearing",
    Interview: "interview",
    "Journal Article": "article-journal",
    "Legal Rule or Regulation": "legislation",
    "Magazine Article": "article-magazine",
    Manuscript: "unpublished",
    Map: "map",
    "Multimedia Application": "software",
    Music: "audio",
    "Newspaper Article": "article-newspaper",
    "Online Database": "misc",
    "Online Multimedia": "online",
    Pamphlet: "booklet",
    Patent: "patent",
    "Personal Communication": "personal_communication",
    Podcast: "audio",
    "Press Release": "misc",
    Report: "report",
    Serial: "book",
    "Social Media": "post",
    Standard: "standard",
    Statute: "legislation",
    "Television Episode": "video",
    Thesis: "thesis",
    "Unpublished Work": "unpublished",
    "Web Page": "online",
}

/**
 * ENW tags that are explicitly handled during conversion.
 * Any tag present in a record but not in this set will trigger an
 * `unknown_tag` warning so callers know data may have been dropped.
 */
const KNOWN_ENW_TAGS = new Set([
    "%0", // Reference type
    "%T", // Title
    "%J", // Journal title
    "%B", // Secondary title / book title
    "%A", // Authors
    "%E", // Editors
    "%X", // Abstract
    "%Z", // Notes
    "%D", // Year
    "%V", // Volume
    "%N", // Number / issue
    "%P", // Pages
    "%I", // Publisher
    "%C", // Place
    "%7", // Edition
    "%O", // DOI / other info
    "%U", // URL
    "%@", // ISBN / ISSN
    "%K", // Keywords
    "%M", // PubMed ID / accession number
    "%!", // Short title
    "%L", // Call number
    "%F", // Label / entry key
])

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
    tag?: string
}

export interface ENWParseResult {
    entries: Record<number, EntryObject>
    errors: ErrorObject[]
    warnings: ErrorObject[]
}

interface ENWRecord {
    [key: string]: string[]
}

export class ENWParser {
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

    parse(): ENWParseResult {
        // Parse records
        const records = this.parseENWFormat()

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

    private parseENWFormat(): ENWRecord[] {
        const records: ENWRecord[] = []
        // Normalize line endings - handle \r\r\n and \r\n
        const normalizedInput = this.input
            .replace(/\r\r\n/g, "\n")
            .replace(/\r\n/g, "\n")
        const lines = normalizedInput.split("\n")

        let currentRecord: ENWRecord = {}
        let currentTag: string | null = null

        for (const line of lines) {
            // EndNote format: %X value
            const match = line.match(/^%([0-9A-Z!@])\s+(.*)$/)
            if (match) {
                currentTag = `%${match[1]}`
                const value = match[2].trim()

                if (!currentRecord[currentTag]) {
                    currentRecord[currentTag] = []
                }
                currentRecord[currentTag].push(value)
            } else if (currentTag && line.trim() !== "") {
                // Continuation of previous tag (for keywords, abstract, etc.)
                const lastIndex = currentRecord[currentTag].length - 1
                currentRecord[currentTag][lastIndex] += `\n${line.trim()}`
            } else if (
                line.trim() === "" &&
                Object.keys(currentRecord).length > 0
            ) {
                // Empty line indicates end of record
                if (currentRecord["%0"] && currentRecord["%0"].length > 0) {
                    records.push(currentRecord)
                    currentRecord = {}
                    currentTag = null
                }
            }
        }

        // Add last record if exists
        if (Object.keys(currentRecord).length > 0 && currentRecord["%0"]) {
            records.push(currentRecord)
        }

        return records
    }

    private convertRecord(
        record: ENWRecord,
        index: number,
    ): EntryObject | false {
        // Get the reference type
        const typeValue = this.getFirstValue(record["%0"]) || "Generic"
        const mappedBibType = EndNoteTypeMap[typeValue]
        const bibType = mappedBibType || "misc"

        // Warn when the ENW type string is not recognised at all
        if (!mappedBibType) {
            this.warnings.push({
                type: "unknown_type",
                value: typeValue,
                entry: String(index),
            })
        } else if (!BibTypes[bibType]) {
            // The mapped type itself is not a known BibType — treat as error
            this.errors.push({
                type: "unknown_type",
                value: typeValue,
                entry: String(index),
            })
            return false
        }

        // Derive the entry key early so warnings can reference it
        const entryKey = this.generateEntryKey(record, index)
        const fields: Record<string, unknown> = {}

        // Title
        const title = this.getFirstValue(record["%T"])
        if (title) {
            fields.title = this.setField("title", title)
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "title",
                entry: entryKey,
            })
        }

        // Secondary title (journal)
        const secondaryTitle =
            this.getFirstValue(record["%J"]) || this.getFirstValue(record["%B"])
        if (secondaryTitle) {
            fields.journaltitle = this.setField("journaltitle", secondaryTitle)
        }

        // Book title (for chapters)
        const bookTitle = this.getFirstValue(record["%B"])
        if (bookTitle && !secondaryTitle) {
            fields.booktitle = this.setField("booktitle", bookTitle)
        }

        // Authors
        if (record["%A"] && record["%A"].length > 0) {
            fields.author = this.parseNames(record["%A"])
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "author",
                entry: entryKey,
            })
        }

        // Secondary authors (editors)
        if (record["%E"] && record["%E"].length > 0) {
            fields.editor = this.parseNames(record["%E"])
        }

        // Abstract
        const abstract = this.getFirstValue(record["%X"])
        if (abstract) {
            fields.abstract = this.setField("abstract", abstract)
        }

        // Notes
        const notes = this.getFirstValue(record["%Z"])
        if (notes) {
            fields.note = this.setField("note", notes)
        }

        // Year
        const year = this.getFirstValue(record["%D"])
        if (year) {
            fields.date = year
        } else {
            this.warnings.push({
                type: "missing_required_field",
                field: "date",
                entry: entryKey,
            })
        }

        // Volume
        const volume = this.getFirstValue(record["%V"])
        if (volume) {
            fields.volume = this.setField("volume", volume)
        }

        // Number/Issue
        const number = this.getFirstValue(record["%N"])
        if (number) {
            fields.number = this.setField("number", number)
        }

        // Pages
        const pages = this.getFirstValue(record["%P"])
        if (pages) {
            fields.pages = this.convertRange(pages)
        }

        // Publisher
        const publisher = this.getFirstValue(record["%I"])
        if (publisher) {
            fields.publisher = this.setField("publisher", publisher)
        }

        // Place
        const place = this.getFirstValue(record["%C"])
        if (place) {
            fields.location = this.setField("location", place)
        }

        // Edition
        const edition = this.getFirstValue(record["%7"])
        if (edition) {
            fields.edition = this.setField("edition", edition)
        }

        // DOI
        const doi = this.getFirstValue(record["%O"])
        if (doi) {
            fields.doi = this.setField("doi", doi)
        }

        // URL
        const url = this.getFirstValue(record["%U"])
        if (url) {
            fields.url = this.setField("url", url)
        }

        // ISBN/ISSN
        const isbn = this.getFirstValue(record["%@"])
        if (isbn) {
            fields.isbn = this.setField("isbn", isbn)
        }

        // Keywords — l_tag expects string[], split on comma/semicolon like
        // the BibLaTeX importer does
        if (record["%K"] && record["%K"].length > 0) {
            fields.keywords = record["%K"].flatMap((kw) =>
                kw
                    .split(/[,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
            )
        }

        // PubMed ID / Accession
        const pmid = this.getFirstValue(record["%M"])
        if (pmid) {
            fields.eprint = this.setField("eprint", pmid)
        }

        // Short title
        const shortTitle = this.getFirstValue(record["%!"])
        if (shortTitle) {
            fields.shorttitle = this.setField("shorttitle", shortTitle)
        }

        // Call number
        const callNum = this.getFirstValue(record["%L"])
        if (callNum) {
            fields.library = this.setField("library", callNum)
        }

        // Label
        const label = this.getFirstValue(record["%F"])
        if (label) {
            fields.label = this.setField("label", label)
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
     * Emit `unknown_tag` warnings for every ENW tag in a parsed record that
     * is not present in the {@link KNOWN_ENW_TAGS} set.  This lets callers
     * detect data that the converter silently dropped.
     */
    private checkUnknownTags(record: ENWRecord, entryKey: string): void {
        for (const tag of Object.keys(record)) {
            if (!KNOWN_ENW_TAGS.has(tag)) {
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

    private generateEntryKey(record: ENWRecord, index: number): string {
        const firstAuthor = this.getFirstValue(record["%A"])
        const yearRaw = this.getFirstValue(record["%D"])
        // Extract a clean four-digit year from whatever the field contains.
        const year = yearRaw ? (yearRaw.match(/\d{4}/)?.[0] ?? "") : ""
        const lastName = firstAuthor ? firstAuthor.split(",")[0].trim() : ""
        return makeEntryKey(
            String(index),
            this.usedKeys,
            lastName || undefined,
            year || undefined,
        )
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
        text: string,
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
                    (k: string) => k.toLowerCase() === lower,
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

export function parseENW(input: string): ENWParseResult {
    return new ENWParser(input).parse()
}
