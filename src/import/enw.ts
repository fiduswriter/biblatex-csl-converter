/**
 * EndNote .enw format parser
 * Handles the EndNote tagged export format (e.g., %A Author, %T Title)
 */

import {
    BibTypes,
    NodeArray,
    EntryObject,
    NameDictObject,
    RangeArray,
} from "../const"

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

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
}

interface ENWRecord {
    [key: string]: string[]
}

export class ENWParser {
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

    parse(): Record<number, EntryObject> {
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
        const bibDB: Record<number, EntryObject> = {}
        this.entries.forEach((entry, index) => {
            bibDB[index + 1] = entry
        })

        return bibDB
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
            const match = line.match(/^%([0-9A-Z])\s+(.*)$/)
            if (match) {
                currentTag = "%" + match[1]
                const value = match[2].trim()

                if (!currentRecord[currentTag]) {
                    currentRecord[currentTag] = []
                }
                currentRecord[currentTag].push(value)
            } else if (currentTag && line.trim() !== "") {
                // Continuation of previous tag (for keywords, abstract, etc.)
                const lastIndex = currentRecord[currentTag].length - 1
                currentRecord[currentTag][lastIndex] += "\n" + line.trim()
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
        index: number
    ): EntryObject | false {
        // Get the reference type
        const typeValue = this.getFirstValue(record["%0"]) || "Generic"
        const bibType = EndNoteTypeMap[typeValue] || "misc"

        // Verify the BibType exists
        if (!BibTypes[bibType]) {
            this.errors.push({
                type: "unknown_type",
                value: typeValue,
                entry: String(index),
            })
            return false
        }

        const fields: Record<string, unknown> = {}

        // Title
        const title = this.getFirstValue(record["%T"])
        if (title) {
            fields["title"] = this.convertRichText(title)
        }

        // Secondary title (journal)
        const secondaryTitle =
            this.getFirstValue(record["%J"]) || this.getFirstValue(record["%B"])
        if (secondaryTitle) {
            fields["journaltitle"] = this.convertRichText(secondaryTitle)
        }

        // Book title (for chapters)
        const bookTitle = this.getFirstValue(record["%B"])
        if (bookTitle && !secondaryTitle) {
            fields["booktitle"] = this.convertRichText(bookTitle)
        }

        // Authors
        if (record["%A"] && record["%A"].length > 0) {
            fields["author"] = this.parseNames(record["%A"])
        }

        // Secondary authors (editors)
        if (record["%E"] && record["%E"].length > 0) {
            fields["editor"] = this.parseNames(record["%E"])
        }

        // Abstract
        const abstract = this.getFirstValue(record["%X"])
        if (abstract) {
            fields["abstract"] = this.convertRichText(abstract)
        }

        // Notes
        const notes = this.getFirstValue(record["%Z"])
        if (notes) {
            fields["note"] = this.convertRichText(notes)
        }

        // Year
        const year = this.getFirstValue(record["%D"])
        if (year) {
            fields["date"] = year
        }

        // Volume
        const volume = this.getFirstValue(record["%V"])
        if (volume) {
            fields["volume"] = this.convertRichText(volume)
        }

        // Number/Issue
        const number = this.getFirstValue(record["%N"])
        if (number) {
            fields["number"] = this.convertRichText(number)
        }

        // Pages
        const pages = this.getFirstValue(record["%P"])
        if (pages) {
            fields["pages"] = this.convertRange(pages)
        }

        // Publisher
        const publisher = this.getFirstValue(record["%I"])
        if (publisher) {
            fields["publisher"] = this.convertRichText(publisher)
        }

        // Place
        const place = this.getFirstValue(record["%C"])
        if (place) {
            fields["location"] = this.convertRichText(place)
        }

        // Edition
        const edition = this.getFirstValue(record["%7"])
        if (edition) {
            fields["edition"] = this.convertRichText(edition)
        }

        // DOI
        const doi = this.getFirstValue(record["%O"])
        if (doi) {
            fields["doi"] = this.convertRichText(doi)
        }

        // URL
        const url = this.getFirstValue(record["%U"])
        if (url) {
            fields["url"] = this.convertRichText(url)
        }

        // ISBN/ISSN
        const isbn = this.getFirstValue(record["%@"])
        if (isbn) {
            fields["isbn"] = this.convertRichText(isbn)
        }

        // Keywords
        if (record["%K"] && record["%K"].length > 0) {
            fields["keywords"] = record["%K"].join(", ")
        }

        // PubMed ID / Accession
        const pmid = this.getFirstValue(record["%M"])
        if (pmid) {
            fields["eprint"] = this.convertRichText(pmid)
        }

        // Short title
        const shortTitle = this.getFirstValue(record["%!"])
        if (shortTitle) {
            fields["shorttitle"] = this.convertRichText(shortTitle)
        }

        // Call number
        const callNum = this.getFirstValue(record["%L"])
        if (callNum) {
            fields["library"] = this.convertRichText(callNum)
        }

        // Label
        const label = this.getFirstValue(record["%F"])
        if (label) {
            fields["label"] = this.convertRichText(label)
        }

        // Generate entry key
        const entryKey = this.generateEntryKey(record, index)

        return {
            entry_key: entryKey,
            bib_type: bibType,
            fields,
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
        const year = this.getFirstValue(record["%D"])
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

export function parseENW(input: string): Record<number, EntryObject> {
    return new ENWParser(input).parse()
}
