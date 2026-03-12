/**
 * EndNote XML parser
 * Supports EndNote XML export format (both EndNote.dtd and RSXML.dtd variants)
 * as well as EndNote Cite While You Write format
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

// EndNote reference type name to BibType mapping
// Direct mapping to internal BibType names
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

export interface EndNoteParseResult {
    entries: Record<number, EntryObject>
    errors: ErrorObject[]
    warnings: ErrorObject[]
}

// Style element for formatted text
interface EndNoteStyle {
    "#text"?: string
    color?: string
    face?: string
    font?: string
    size?: string
}

// Field value that may contain styled text
type EndNoteStyledValue =
    | string
    | { "#text"?: string; style?: EndNoteStyle | EndNoteStyle[] }
    | EndNoteStyle

interface EndNoteAuthor {
    "#text"?: string
    style?: EndNoteStyle | EndNoteStyle[]
    "corp-name"?: string
    "first-name"?: string
    initials?: string
    "last-name"?: string
    "middle-initial"?: string
    role?: string
    salutation?: string
    suffix?: string
    title?: string
}

interface EndNoteDate {
    "#text"?: string
    style?: EndNoteStyle | EndNoteStyle[]
    day?: string
    julian?: string
    month?: string
    year?: string
}

interface EndNoteUrl {
    "#text"?: string
    style?: EndNoteStyle | EndNoteStyle[]
    "has-ut"?: "yes" | "no"
    "ppv-app"?: string
    "ppv-ref"?: "yes" | "no"
    "ppv-ut"?: string
}

interface EndNoteUrlGroup {
    url?: EndNoteUrl | EndNoteUrl[]
}

interface EndNoteUrls {
    "web-urls"?: EndNoteUrlGroup
    "pdf-urls"?: EndNoteUrlGroup
    "text-urls"?: EndNoteUrlGroup
    "related-urls"?: EndNoteUrlGroup
    "image-urls"?: EndNoteUrlGroup
}

interface EndNoteRecord {
    // Core elements
    database?: string | { "#text"?: string; name?: string; path?: string }
    "source-app"?:
        | string
        | { "#text"?: string; name?: string; version?: string }
    "rec-number"?: string | number
    "foreign-keys"?: {
        key?:
            | {
                  "#text"?: string
                  app?: string
                  "db-id"?: string
                  timestamp?: string
              }
            | Array<{
                  "#text"?: string
                  app?: string
                  "db-id"?: string
                  timestamp?: string
              }>
    }
    "ref-type"?: string | { "#text"?: string; name?: string }

    // Contributors
    contributors?: {
        authors?: { author?: EndNoteAuthor | EndNoteAuthor[] }
        "secondary-authors"?: { author?: EndNoteAuthor | EndNoteAuthor[] }
        "tertiary-authors"?: { author?: EndNoteAuthor | EndNoteAuthor[] }
        "subsidiary-authors"?: { author?: EndNoteAuthor | EndNoteAuthor[] }
        "translated-authors"?: { author?: EndNoteAuthor | EndNoteAuthor[] }
        editors?: { editor?: EndNoteAuthor | EndNoteAuthor[] }
        translators?: { translator?: EndNoteAuthor | EndNoteAuthor[] }
    }
    "auth-address"?: EndNoteStyledValue
    "auth-affiliaton"?: EndNoteStyledValue

    // Titles
    titles?: {
        title?: EndNoteStyledValue
        "secondary-title"?: EndNoteStyledValue
        "tertiary-title"?: EndNoteStyledValue
        "alt-title"?: EndNoteStyledValue
        "short-title"?: EndNoteStyledValue
        "translated-title"?: EndNoteStyledValue
    }

    // Periodical
    periodical?: {
        "full-title"?: EndNoteStyledValue
        "abbr-1"?: EndNoteStyledValue
        "abbr-2"?: EndNoteStyledValue
        "abbr-3"?: EndNoteStyledValue
    }

    // Volume/issue
    pages?:
        | EndNoteStyledValue
        | { "#text"?: string; start?: string; end?: string }
    volume?: EndNoteStyledValue
    number?: EndNoteStyledValue
    issue?: EndNoteStyledValue
    "secondary-volume"?: EndNoteStyledValue
    "secondary-issue"?: EndNoteStyledValue
    "num-vols"?: EndNoteStyledValue
    edition?: EndNoteStyledValue
    section?: EndNoteStyledValue
    "reprint-edition"?: EndNoteStyledValue
    "reprint-status"?: {
        date?: string
        status: "in-file" | "no-file" | "on-request"
    }

    // Keywords
    keywords?: {
        keyword?: EndNoteStyledValue | EndNoteStyledValue[]
    }

    // Dates
    dates?: {
        year?: EndNoteDate | EndNoteDate[]
        "pub-dates"?: { date?: EndNoteDate | EndNoteDate[] }
        "copyright-dates"?: { date?: EndNoteDate | EndNoteDate[] }
        month?: EndNoteStyledValue
        day?: EndNoteStyledValue
    }

    // Publisher
    "pub-location"?: EndNoteStyledValue
    publisher?: EndNoteStyledValue
    "orig-pub"?: EndNoteStyledValue

    // Identifiers
    isbn?: EndNoteStyledValue
    issn?: EndNoteStyledValue
    "accession-num"?: EndNoteStyledValue
    "call-num"?: EndNoteStyledValue
    "report-id"?: EndNoteStyledValue
    coden?: EndNoteStyledValue
    "electronic-resource-num"?: EndNoteStyledValue

    // Abstract/Notes
    abstract?: EndNoteStyledValue
    label?: EndNoteStyledValue
    image?: string | { "#text"?: string; file?: string; name?: string }
    caption?: EndNoteStyledValue
    notes?: EndNoteStyledValue
    "research-notes"?: EndNoteStyledValue

    // Other
    "work-type"?: EndNoteStyledValue
    "reviewed-item"?: EndNoteStyledValue
    availability?: EndNoteStyledValue
    "remote-source"?: EndNoteStyledValue
    "meeting-place"?: EndNoteStyledValue
    "work-location"?: EndNoteStyledValue
    "work-extent"?: EndNoteStyledValue
    "pack-method"?: EndNoteStyledValue
    size?: EndNoteStyledValue
    "repro-ratio"?: EndNoteStyledValue
    "remote-database-name"?: EndNoteStyledValue
    "remote-database-provider"?: EndNoteStyledValue
    language?: EndNoteStyledValue

    // URLs
    urls?: EndNoteUrls

    // Record info
    "access-date"?: EndNoteStyledValue
    "modified-date"?: EndNoteStyledValue

    // Custom/Misc
    custom1?: EndNoteStyledValue
    custom2?: EndNoteStyledValue
    custom3?: EndNoteStyledValue
    custom4?: EndNoteStyledValue
    custom5?: EndNoteStyledValue
    custom6?: EndNoteStyledValue
    custom7?: EndNoteStyledValue
    misc1?: EndNoteStyledValue
    misc2?: EndNoteStyledValue
    misc3?: EndNoteStyledValue

    [key: string]: unknown
}

export class EndNoteParser {
    input: EndNoteRecord[]
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]
    private usedKeys: Set<string> = new Set()
    /**
     * Maps each record's `rec-number` string to the final `entry_key` assigned
     * after normalisation.  Populated during `parse()` so that callers (e.g.
     * `DocxCitationsParser`) can resolve a rec-number back to the actual key
     * used in the returned entries without fragile suffix-matching heuristics.
     */
    recNumberToEntryKey: Map<string, string> = new Map()

    constructor(input: EndNoteRecord[]) {
        this.input = Array.isArray(input) ? input : [input]
        this.entries = []
        this.errors = []
        this.warnings = []
    }

    parse(): EndNoteParseResult {
        // Convert each EndNote entry to internal format
        for (let i = 0; i < this.input.length; i++) {
            const record = this.input[i]
            const convertedEntry = this.convertRecord(record, i + 1)
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

    private convertRecord(
        record: EndNoteRecord,
        index: number
    ): EntryObject | false {
        // Get the reference type and map directly to BibType
        const refType = this.getRefType(record)
        const mappedBibType = EndNoteTypeMap[refType]
        const bibType = mappedBibType || "misc"

        // Warn when the EndNote ref-type string is not recognised at all
        if (!mappedBibType) {
            this.warnings.push({
                type: "unknown_type",
                value: refType,
                entry: String(index),
            })
        } else if (!BibTypes[bibType]) {
            // The mapped type itself is not a known BibType — treat as error
            this.errors.push({
                type: "unknown_type",
                value: refType,
                entry: String(index),
            })
            return false
        }

        const entryKey = this.generateEntryKey(record, index)
        const fields: Record<string, unknown> = {}
        const processedFields: Set<string> = new Set()
        const unhandledData: string[] = []

        // Mark core fields as processed
        processedFields.add("rec-number")
        processedFields.add("ref-type")
        processedFields.add("foreign-keys")
        processedFields.add("database")
        processedFields.add("source-app")

        // Extract and convert titles
        this.extractField(
            record.titles?.title,
            fields,
            "title",
            processedFields,
            "titles.title"
        )
        this.extractField(
            record.titles?.["secondary-title"],
            fields,
            "booktitle",
            processedFields,
            "titles.secondary-title"
        )
        this.extractField(
            record.titles?.["tertiary-title"],
            fields,
            "series",
            processedFields,
            "titles.tertiary-title"
        )
        this.extractField(
            record.titles?.["short-title"],
            fields,
            "shorttitle",
            processedFields,
            "titles.short-title"
        )

        // Handle journal title from periodical or secondary-title
        processedFields.add("periodical")
        const periodicalTitle = this.getTextContent(
            record.periodical?.["full-title"]
        )
        const periodicalAbbr = this.getTextContent(
            record.periodical?.["abbr-1"]
        )
        if (periodicalTitle) {
            fields["journaltitle"] = this.convertRichText(periodicalTitle)
        } else if (!fields["booktitle"]) {
            // If no booktitle was set from secondary-title, try it as journal
            const secondaryTitle = this.getTextContent(
                record.titles?.["secondary-title"]
            )
            if (secondaryTitle) {
                fields["journaltitle"] = this.convertRichText(secondaryTitle)
            }
        }
        if (periodicalAbbr) {
            fields["shortjournal"] = this.convertRichText(periodicalAbbr)
        }

        // Volume/issue/number fields
        this.extractField(
            record.volume,
            fields,
            "volume",
            processedFields,
            "volume"
        )
        this.extractField(
            record.number,
            fields,
            "number",
            processedFields,
            "number"
        )
        this.extractField(
            record.issue,
            fields,
            "issue",
            processedFields,
            "issue"
        )
        this.extractField(
            record["secondary-volume"],
            fields,
            "volume",
            processedFields,
            "secondary-volume"
        )
        this.extractField(
            record["secondary-issue"],
            fields,
            "issue",
            processedFields,
            "secondary-issue"
        )
        this.extractField(
            record["num-vols"],
            fields,
            "volumes",
            processedFields,
            "num-vols"
        )
        this.extractField(
            record.edition,
            fields,
            "edition",
            processedFields,
            "edition"
        )
        this.extractField(
            record.section,
            fields,
            "chapter",
            processedFields,
            "section"
        )

        // Pages with special handling for start/end attributes
        processedFields.add("pages")
        if (record.pages) {
            const pagesText = this.getTextContent(record.pages)
            const startPage =
                typeof record.pages === "object" && "start" in record.pages
                    ? record.pages.start
                    : null
            const endPage =
                typeof record.pages === "object" && "end" in record.pages
                    ? record.pages.end
                    : null

            if (startPage && endPage && !pagesText) {
                fields["pages"] = [
                    [
                        [
                            { type: "text", text: String(startPage) },
                            { type: "text", text: String(endPage) },
                        ],
                    ],
                ]
            } else if (pagesText) {
                fields["pages"] = this.convertRange(pagesText)
            }
        }

        // Publisher info
        this.extractField(
            record.publisher,
            fields,
            "publisher",
            processedFields,
            "publisher"
        )
        this.extractField(
            record["pub-location"],
            fields,
            "location",
            processedFields,
            "pub-location"
        )
        this.extractField(
            record["orig-pub"],
            fields,
            "origpublisher",
            processedFields,
            "orig-pub"
        )

        // Identifiers
        this.extractField(record.isbn, fields, "isbn", processedFields, "isbn")
        this.extractField(record.issn, fields, "issn", processedFields, "issn")
        this.extractField(
            record["accession-num"],
            fields,
            "eprint",
            processedFields,
            "accession-num"
        )
        this.extractField(
            record["call-num"],
            fields,
            "library",
            processedFields,
            "call-num"
        )
        this.extractField(
            record["report-id"],
            fields,
            "number",
            processedFields,
            "report-id"
        )
        this.extractField(
            record.coden,
            fields,
            "coden",
            processedFields,
            "coden"
        )
        this.extractField(
            record["electronic-resource-num"],
            fields,
            "doi",
            processedFields,
            "electronic-resource-num"
        )

        // Abstract and notes
        this.extractField(
            record.abstract,
            fields,
            "abstract",
            processedFields,
            "abstract"
        )
        this.extractField(
            record.notes,
            fields,
            "note",
            processedFields,
            "notes"
        )
        this.extractField(
            record["research-notes"],
            fields,
            "annotation",
            processedFields,
            "research-notes"
        )
        this.extractField(
            record.caption,
            fields,
            "annotation",
            processedFields,
            "caption"
        )
        this.extractField(
            record.label,
            fields,
            "label",
            processedFields,
            "label"
        )

        // Language
        this.extractField(
            record.language,
            fields,
            "langid",
            processedFields,
            "language"
        )

        // Work type
        processedFields.add("work-type")
        const workType = this.getTextContent(record["work-type"])
        if (workType && bibType === "misc") {
            fields["type"] = { type: "text", text: workType }
        }

        // Reviewed item
        processedFields.add("reviewed-item")
        const reviewedItem = this.getTextContent(record["reviewed-item"])
        if (reviewedItem) {
            fields["related"] = this.convertRichText(reviewedItem)
        }

        // Custom fields
        for (let i = 1; i <= 7; i++) {
            const fieldName = `custom${i}`
            processedFields.add(fieldName)
            const customField = record[fieldName as keyof EndNoteRecord]
            if (customField) {
                const customText = this.getTextContent(customField)
                if (customText) {
                    fields[fieldName] = this.convertRichText(customText)
                }
            }
        }

        // Misc fields
        for (let i = 1; i <= 3; i++) {
            const fieldName = `misc${i}`
            processedFields.add(fieldName)
            const miscField = record[fieldName as keyof EndNoteRecord]
            if (miscField) {
                const miscText = this.getTextContent(miscField)
                if (miscText) {
                    fields[fieldName] = this.convertRichText(miscText)
                }
            }
        }

        // URLs - combine all URL types
        processedFields.add("urls")
        const urls: string[] = []
        const urlFields = [
            record.urls?.["web-urls"],
            record.urls?.["related-urls"],
            record.urls?.["pdf-urls"],
            record.urls?.["text-urls"],
        ]
        for (const urlGroup of urlFields) {
            if (urlGroup?.url) {
                const urlArray = Array.isArray(urlGroup.url)
                    ? urlGroup.url
                    : [urlGroup.url]
                for (const url of urlArray) {
                    const urlText = this.getTextContent(url)
                    if (urlText) {
                        urls.push(urlText)
                    }
                }
            }
        }
        if (urls.length > 0) {
            // url is f_uri — store as a plain string, not a NodeArray
            fields["url"] = urls.length > 1 ? urls.join("; ") : urls[0]
        }

        // Access date
        this.extractField(
            record["access-date"],
            fields,
            "urldate",
            processedFields,
            "access-date"
        )

        // Mark dates as processed (handled separately)
        processedFields.add("dates")

        // Mark contributors as processed
        if (record.contributors) {
            processedFields.add("contributors")
        }
        if (record.keywords) {
            processedFields.add("keywords")
        }
        if (record.image) {
            processedFields.add("image")
        }
        if (record.titles) {
            processedFields.add("titles")
        }
        if (record.periodical) {
            processedFields.add("periodical")
        }
        if (record["reprint-status"]) {
            processedFields.add("reprint-status")
        }
        if (record["auth-address"]) {
            processedFields.add("auth-address")
        }
        if (record["auth-affiliaton"]) {
            processedFields.add("auth-affiliaton")
        }
        if (record["modified-date"]) {
            processedFields.add("modified-date")
        }

        // Handle dates
        const dateValue = this.extractDate(record, processedFields)
        if (dateValue) {
            fields["date"] = dateValue
        }

        // Copyright date
        const copyrightDate = this.extractCopyrightDate(record, processedFields)
        if (copyrightDate?.length) {
            fields["origdate"] = copyrightDate
        }

        // Handle translated authors: in EndNote, "translated-authors" are the
        // original authors of the source work that was translated. The "authors"
        // field in that case holds the translators of the work.
        const translatedAuthors = this.extractAuthors(
            record.contributors?.["translated-authors"]?.author
        )

        // Handle primary authors
        const authors = this.extractAuthors(
            record.contributors?.authors?.author
        )

        if (translatedAuthors.length > 0) {
            // When original authors are recorded via translated-authors, the
            // regular authors are actually the translators.
            fields["author"] = translatedAuthors
            if (authors.length > 0) {
                fields["translator"] = authors
            }
        } else if (authors.length > 0) {
            fields["author"] = authors
        }

        // Handle secondary authors (editors)
        const secondaryAuthors = this.extractAuthors(
            record.contributors?.["secondary-authors"]?.author
        )
        if (secondaryAuthors.length > 0) {
            fields["editor"] = secondaryAuthors
        }

        // Handle tertiary authors (book authors for inbook/book types)
        const tertiaryAuthors = this.extractAuthors(
            record.contributors?.["tertiary-authors"]?.author
        )
        if (tertiaryAuthors.length > 0) {
            // For book sections, tertiary authors are the book authors
            if (bibType === "inbook" || bibType === "book") {
                fields["bookauthor"] = tertiaryAuthors
            }
        }

        // Handle subsidiary authors
        const subsidiaryAuthors = this.extractAuthors(
            record.contributors?.["subsidiary-authors"]?.author
        )
        if (subsidiaryAuthors.length > 0) {
            fields["editora"] = subsidiaryAuthors
        }

        // Handle keywords
        const keywords = this.extractKeywords(
            record.keywords?.keyword,
            processedFields
        )
        if (keywords.length > 0) {
            fields["keywords"] = keywords
        }

        // Handle image
        if (record.image) {
            const imageText =
                typeof record.image === "string"
                    ? record.image
                    : record.image.file || record.image.name
            if (imageText) {
                fields["file"] = { type: "text", text: imageText }
            }
        }

        // Check for unprocessed fields and add warnings
        // Warn about missing title
        if (!fields["title"]) {
            this.warnings.push({
                type: "missing_required_field",
                field: "title",
                entry: entryKey,
            })
        }

        // Warn about missing author/editor when neither is present
        if (!fields["author"] && !fields["editor"]) {
            this.warnings.push({
                type: "missing_required_field",
                field: "author",
                entry: entryKey,
            })
        }

        // Warn about missing date
        if (!fields["date"]) {
            this.warnings.push({
                type: "missing_required_field",
                field: "date",
                entry: entryKey,
            })
        }

        this.checkUnhandledFields(
            record,
            processedFields,
            index,
            fields,
            unhandledData
        )

        // Add unhandled data to note field if there's any
        if (unhandledData.length > 0 && !fields["note"]) {
            fields["note"] = this.convertRichText(
                "EndNote import: Unhandled fields - " + unhandledData.join("; ")
            )
        }

        return {
            entry_key: entryKey,
            bib_type: bibType,
            fields,
        }
    }

    private generateEntryKey(record: EndNoteRecord, index: number): string {
        // Try to get the first primary author's last name for the key.
        const authorsRaw = record.contributors?.authors?.author
        let authorsArr: EndNoteAuthor[]
        if (!authorsRaw) {
            authorsArr = []
        } else if (Array.isArray(authorsRaw)) {
            authorsArr = authorsRaw
        } else {
            authorsArr = [authorsRaw]
        }
        const firstAuthor = authorsArr[0]
        let lastName: string | undefined
        if (firstAuthor) {
            const raw =
                firstAuthor["last-name"] ||
                firstAuthor["#text"] ||
                firstAuthor["corp-name"] ||
                ""
            const clean = (typeof raw === "string" ? raw : "").replace(
                /[^A-Za-z0-9]/g,
                ""
            )
            if (clean) lastName = clean
        }

        // Extract a four-digit year from the dates structure.
        const datesYear = record.dates?.year
        const yearNode = Array.isArray(datesYear) ? datesYear[0] : datesYear
        let year: string | undefined
        if (yearNode) {
            const rawYear =
                typeof yearNode === "string"
                    ? yearNode
                    : yearNode["#text"] ?? ""
            const m = String(rawYear).match(/\d{4}/)
            if (m) year = m[0]
        }

        // Use rec-number as the candidate so the numeric identifier is
        // preserved in the key prefix ("ref{recNum}") when no author/year
        // are available.
        const candidate = String(record["rec-number"] || index)
        const key = makeEntryKey(candidate, this.usedKeys, lastName, year)

        // Record rec-number → entry_key so callers can do an O(1) lookup.
        const recNum = String(record["rec-number"] ?? "")
        if (recNum) {
            this.recNumberToEntryKey.set(recNum, key)
        }

        return key
    }

    private getRefType(record: EndNoteRecord): string {
        const refType = record["ref-type"]
        if (typeof refType === "object" && refType) {
            return refType.name || String(refType["#text"] || "Generic")
        }
        return String(refType || "Generic")
    }

    private getTextContent(
        value: EndNoteStyledValue | EndNoteAuthor | EndNoteDate | undefined
    ): string {
        if (!value) {
            return ""
        }
        if (typeof value === "string") {
            return value
        }
        // Direct text content
        if ("#text" in value && value["#text"]) {
            return value["#text"]
        }
        // Handle author attributes directly
        if ("last-name" in value || "corp-name" in value) {
            const author = value as EndNoteAuthor
            if (author["corp-name"]) {
                return author["corp-name"]
            }
            if (author["last-name"]) {
                const parts: string[] = [author["last-name"]]
                if (author["first-name"]) {
                    parts.unshift(author["first-name"])
                } else if (author.initials) {
                    parts.unshift(author.initials)
                }
                return parts.join(", ")
            }
        }
        // Handle date attributes
        if ("year" in value && (value as EndNoteDate).year) {
            return (value as EndNoteDate).year || ""
        }
        // Handle style element directly
        if ("style" in value && value.style) {
            const style = value.style
            if (typeof style === "string") {
                return style
            }
            if (Array.isArray(style)) {
                return style.map((s) => s["#text"] || "").join("")
            }
            return style["#text"] || ""
        }
        return ""
    }

    // eslint-disable-next-line max-params
    private extractField(
        value: EndNoteStyledValue | undefined,
        fields: Record<string, unknown>,
        targetField: string,
        processedFields?: Set<string>,
        sourceField?: string
    ): void {
        if (!value) {
            return
        }
        const textContent = this.getTextContent(value)
        if (!textContent) {
            return
        }

        if (processedFields && sourceField) {
            processedFields.add(sourceField)
        }

        const fieldDef = BibFieldTypes[targetField]
        const fieldType = fieldDef?.type
        if (fieldType === "l_range") {
            fields[targetField] = this.convertRange(textContent)
        } else if (fieldType === "l_literal") {
            // l_literal expects NodeArray[] — an array of NodeArrays
            fields[targetField] = [this.convertRichText(textContent)]
        } else if (
            fieldType === "f_verbatim" ||
            fieldType === "f_uri" ||
            fieldType === "f_date"
        ) {
            // verbatim, URI, and date fields are stored as plain strings
            fields[targetField] = textContent
        } else if (fieldType === "f_key") {
            // f_key fields (e.g. langid) must be stored as a key string that
            // matches one of the option keys in the field definition.
            const options = fieldDef?.options
            if (Array.isArray(options)) {
                // Array options (e.g. bookpagination, type): plain string match
                const lower = textContent.toLowerCase().trim()
                const matched = options.find(
                    (k: string) => k.toLowerCase() === lower
                )
                if (matched) {
                    fields[targetField] = matched
                }
            } else if (options) {
                // Object options (e.g. langid): use shared lookup that handles
                // BCP-47 codes, ISO 639-2 codes, full names, biblatex aliases
                const matched = lookupLangid(textContent)
                if (matched) {
                    fields[targetField] = matched
                }
                // If no match is found, omit the field entirely rather than
                // storing an invalid key that would break the exporters.
            } else {
                fields[targetField] = textContent
            }
        } else {
            fields[targetField] = this.convertRichText(textContent)
        }
    }
    // eslint-disable-next-line max-params

    private extractDate(
        record: EndNoteRecord,
        processedFields?: Set<string>
    ): string {
        // Always read the base year from the <year> element first so it can be
        // used as a fallback when pub-dates only carries month/day information
        // (e.g. Mendeley exports <pub-dates><date>4</date></pub-dates> for April).
        let baseYear = ""
        const yearEl = record.dates?.year
        if (yearEl) {
            if (processedFields) processedFields.add("dates.year")
            baseYear = Array.isArray(yearEl)
                ? this.getTextContent(yearEl[0])
                : yearEl.year ||
                  this.getTextContent(yearEl) ||
                  yearEl["#text"] ||
                  ""
        }

        // Try pub-dates for month / day refinement
        const pubDates = record.dates?.["pub-dates"]
        if (pubDates?.date) {
            if (processedFields) processedFields.add("dates.pub-dates")
            const dates = Array.isArray(pubDates.date)
                ? pubDates.date
                : [pubDates.date]
            const dateTexts: string[] = []
            for (const d of dates) {
                const dYear = d.year || ""
                const month = d.month
                const day = d.day

                if (dYear || month || day) {
                    // Has structured attributes — use explicit year or fall back
                    // to the base year extracted from <year>.
                    const effectiveYear = dYear || baseYear
                    let dateStr = effectiveYear
                    if (month) {
                        dateStr += `-${month.padStart(2, "0")}`
                        if (day) {
                            dateStr += `-${day.padStart(2, "0")}`
                        }
                    }
                    dateTexts.push(dateStr)
                } else {
                    const text = this.getTextContent(d)
                    if (text) {
                        const trimmed = text.trim()
                        const parsed = this.parsePubDateText(trimmed, baseYear)
                        if (parsed) {
                            dateTexts.push(parsed)
                        }
                        // If parsePubDateText returns null the text could not
                        // be interpreted as a real calendar date — skip it and
                        // let the fallback below use the plain <year> element.
                    }
                }
            }
            if (dateTexts.length > 0) {
                return dateTexts.join("/")
            }
        }

        // Fall back to the year element alone (with any inline month/day attrs)
        if (baseYear) {
            const month =
                (yearEl && !Array.isArray(yearEl) ? yearEl.month : null) ||
                this.getTextContent(record.dates?.month)
            const day =
                (yearEl && !Array.isArray(yearEl) ? yearEl.day : null) ||
                this.getTextContent(record.dates?.day)

            let dateStr = baseYear
            if (month) {
                dateStr += `-${month.padStart(2, "0")}`
                if (day) {
                    dateStr += `-${day.padStart(2, "0")}`
                }
            }
            return dateStr
        }

        return ""
    }

    /**
     * Try to turn a free-text pub-date string from an EndNote `<date>` element
     * into a valid EDTF / ISO-8601 date string (YYYY, YYYY-MM, or YYYY-MM-DD),
     * or preserve it verbatim when it carries human-readable date information
     * that cannot be normalised.
     *
     * EndNote lets users type arbitrary text in the publication-date field, so
     * the content is unreliable.  Known patterns encountered in real exports:
     *
     *   "2009"           → "2009"       bare four-digit year
     *   "4"              → "YYYY-04"    bare integer 1–12 (Mendeley month)
     *   "April 2005"     → "2005-04"    month-name + year (any order)
     *   "Apr 2005"       → "2005-04"    abbreviated month name
     *   "2005 April"     → "2005-04"    year-first variant
     *   "Apr. 2005"      → "2005-04"    abbreviated with period
     *   "August 02"      → "YYYY-08-02" month + day, no year → uses baseYear
     *   "01 Jan. 2020"   → "2020-01-01" DD Mon. YYYY
     *   "2012/07/01/"    → "2012-07-01" YYYY/MM/DD/ (trailing slash)
     *   "2021/10/01/"    → "2021-10-01" same
     *   "2012/06/01"     → "2012-06-01" YYYY/MM/DD (no trailing slash)
     *   "2009/001/001"   → null         EndNote pseudo-date (invalid month 001)
     *   "10/31/print"    → null         MM/DD/garbage — no usable year
     *   "15-17 June 2021"→ (verbatim)   complex range — kept as-is
     *   "Mar"            → (verbatim)   bare month name, no baseYear available
     *
     * The only values actively discarded (returning `null`, causing the caller
     * to fall back to the plain `<year>` element) are those that contain no
     * recoverable date information at all — specifically the EndNote
     * `YYYY/NNN/NNN` pseudo-date format and similar non-date constructs.
     * Everything else is either normalised to ISO 8601 or returned verbatim.
     *
     * @param trimmed   Already-trimmed text content of the `<date>` element.
     * @param baseYear  Year string from the sibling `<year>` element, used when
     *                  the pub-date text supplies only a month (and/or day).
     * @returns A date string (normalised or verbatim), or `null` to signal
     *          "no usable date information here".
     */
    private parsePubDateText(trimmed: string, baseYear: string): string | null {
        // Shared month-name lookup (full names + standard abbreviations).
        const monthMap: Record<string, string> = {
            january: "01",
            february: "02",
            march: "03",
            april: "04",
            may: "05",
            june: "06",
            july: "07",
            august: "08",
            september: "09",
            october: "10",
            november: "11",
            december: "12",
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12",
        }

        // Helper: normalise a month token ("Jan", "Jan.", "january") → "01" | undefined
        const resolveMonth = (tok: string): string | undefined =>
            monthMap[tok.replace(/\.$/, "").toLowerCase()]

        // ── 1. Bare four-digit year ───────────────────────────────────────────
        if (/^\d{4}$/.test(trimmed)) {
            return trimmed
        }

        // ── 2. Bare integer 1–12 — Mendeley month number ─────────────────────
        //    Must be an exact integer string with no leading zeros so that we
        //    don't accidentally treat "01" (a day token elsewhere) as a month.
        const bareInt = parseInt(trimmed)
        if (
            !isNaN(bareInt) &&
            bareInt >= 1 &&
            bareInt <= 12 &&
            String(bareInt) === trimmed
        ) {
            if (!baseYear) return null
            return `${baseYear}-${trimmed.padStart(2, "0")}`
        }

        // ── 3. Slash-separated numeric dates: YYYY/MM/DD[/] ──────────────────
        //    EndNote sometimes emits "2012/07/01/" (note trailing slash).
        //    We accept both with and without the trailing slash and validate the
        //    month/day ranges so that the "2009/001/001" pseudo-date (invalid
        //    month 001) is correctly rejected here.
        //    Tokens are limited to 1–2 digits so that zero-padded issue numbers
        //    like "001" (3 digits) are always rejected rather than silently
        //    parsed as integer 1 and accepted as a valid month.
        const slashDateRe = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\/?$/
        const slashMatch = slashDateRe.exec(trimmed)
        if (slashMatch) {
            const mm = parseInt(slashMatch[2])
            const dd = parseInt(slashMatch[3])
            if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
                // Valid calendar date — normalise to ISO 8601 with 2-digit padding
                return `${slashMatch[1]}-${String(mm).padStart(
                    2,
                    "0"
                )}-${String(dd).padStart(2, "0")}`
            }
            // Out-of-range values → not a real calendar date
            return null
        }
        // Slash-date with 3+-digit tokens (e.g. "2009/001/001") — pseudo-date
        if (/^\d{4}\/\d{3,}\/\d+$|^\d{4}\/\d+\/\d{3,}/.test(trimmed)) {
            return null
        }

        // ── 4. "DD Mon. YYYY" — e.g. "01 Jan. 2020" ─────────────────────────
        const ddMonYearRe = /^(\d{1,2})\s+([a-z]+\.?)\s+(\d{4})$/i
        const ddMonYearMatch = ddMonYearRe.exec(trimmed)
        if (ddMonYearMatch) {
            const monthNum = resolveMonth(ddMonYearMatch[2])
            if (monthNum) {
                const day = parseInt(ddMonYearMatch[1])
                if (day >= 1 && day <= 31) {
                    return `${
                        ddMonYearMatch[3]
                    }-${monthNum}-${ddMonYearMatch[1].padStart(2, "0")}`
                }
            }
        }

        // ── 5. "Month YYYY" or "YYYY Month" — e.g. "April 2005", "2005 Apr." ─
        const monthYearRe = /^([a-z]+\.?)\s+(\d{4})$|^(\d{4})\s+([a-z]+\.?)$/i
        const myMatch = monthYearRe.exec(trimmed)
        if (myMatch) {
            const monthStr = myMatch[1] ?? myMatch[4]
            const yearStr = myMatch[2] ?? myMatch[3]
            const monthNum = resolveMonth(monthStr)
            if (monthNum) {
                return `${yearStr}-${monthNum}`
            }
            // Recognised the year but not the month name — return just the year.
            return yearStr
        }

        // ── 6. "Month DD" — e.g. "August 02" — use baseYear ─────────────────
        const monthDayRe = /^([a-z]+\.?)\s+(\d{1,2})$/i
        const mdMatch = monthDayRe.exec(trimmed)
        if (mdMatch) {
            const monthNum = resolveMonth(mdMatch[1])
            const day = parseInt(mdMatch[2])
            if (monthNum && day >= 1 && day <= 31 && baseYear) {
                return `${baseYear}-${monthNum}-${mdMatch[2].padStart(2, "0")}`
            }
            // Can't build a full date — fall through to verbatim return
        }

        // ── 7. Bare month name — e.g. "Mar", "March" ─────────────────────────
        const monthOnlyRe = /^([a-z]+\.?)$/i
        const moMatch = monthOnlyRe.exec(trimmed)
        if (moMatch) {
            const monthNum = resolveMonth(moMatch[1])
            if (monthNum && baseYear) {
                return `${baseYear}-${monthNum}`
            }
            // Known month but no year, or unknown word — keep verbatim so the
            // caller preserves whatever signal is present.
            return trimmed
        }

        // ── 8. Everything else — keep verbatim ───────────────────────────────
        //    Complex strings like "15-17 June 2021" that we cannot normalise are
        //    passed through unchanged so that human-readable date information is
        //    not silently discarded.
        return trimmed
    }

    private extractCopyrightDate(
        record: EndNoteRecord,
        processedFields?: Set<string>
    ): string {
        const copyrightDates = record.dates?.["copyright-dates"]
        if (copyrightDates?.date) {
            if (processedFields) processedFields.add("dates.copyright-dates")
            const dates = Array.isArray(copyrightDates.date)
                ? copyrightDates.date
                : [copyrightDates.date]
            const dateTexts: string[] = []
            for (const d of dates) {
                const year = d.year || this.getTextContent(d)
                if (year) dateTexts.push(year)
            }
            if (dateTexts.length > 0) {
                return dateTexts.join("/")
            }
        }
        return ""
    }

    private extractAuthors(
        authorsData: EndNoteAuthor | EndNoteAuthor[] | undefined
    ): NameDictObject[] {
        if (!authorsData) {
            return []
        }

        const authors = Array.isArray(authorsData) ? authorsData : [authorsData]
        const names: NameDictObject[] = []

        for (const author of authors) {
            const nameObj = this.parseAuthor(author)
            if (nameObj) {
                names.push(nameObj)
            }
        }

        return names
    }

    private parseAuthor(author: EndNoteAuthor): NameDictObject | null {
        const nameObj: NameDictObject = {}

        // First check for structured name attributes
        const lastName = author["last-name"]
        const firstName = author["first-name"]
        const initials = author.initials
        const suffix = author.suffix
        const corpName = author["corp-name"]

        if (corpName) {
            // Corporate/institutional author
            nameObj.literal = this.convertRichText(corpName)
            return nameObj
        }

        if (lastName) {
            nameObj.family = this.convertRichText(lastName)
            if (firstName) {
                nameObj.given = this.convertRichText(firstName)
            } else if (initials) {
                nameObj.given = this.convertRichText(initials)
            }
            if (suffix) {
                nameObj.suffix = this.convertRichText(suffix)
            }
            return nameObj
        }

        // Fall back to parsing the text content
        const nameText = this.getTextContent(author)
        if (!nameText) {
            return null
        }

        return this.parseNameText(nameText)
    }

    private parseNameText(nameText: string): NameDictObject | null {
        nameText = nameText.trim()
        if (!nameText) {
            return null
        }

        const nameObj: NameDictObject = {}

        // Handle comma-separated names (Last, First) or (Last, Jr, First)
        if (nameText.includes(",")) {
            const parts = nameText.split(",").map((p) => p.trim())
            if (parts.length >= 2) {
                nameObj.family = this.convertRichText(parts[0])
                // Check if middle part looks like a suffix
                if (
                    parts.length >= 3 &&
                    /^(Jr|Sr|I{1,3}|IV|V|VI|VII|2nd|3rd|\d+th)\.?$/i.test(
                        parts[1]
                    )
                ) {
                    nameObj.suffix = this.convertRichText(parts[1])
                    nameObj.given = this.convertRichText(parts[2])
                } else {
                    nameObj.given = this.convertRichText(parts[1])
                    if (parts.length >= 3) {
                        nameObj.suffix = this.convertRichText(parts[2])
                    }
                }
                return nameObj
            }
        }

        // Handle space-separated names (First von Last)
        const words = nameText.split(/\s+/)
        if (words.length === 1) {
            nameObj.literal = this.convertRichText(nameText)
        } else {
            // Last word is family name, rest is given
            nameObj.family = this.convertRichText(words[words.length - 1])
            nameObj.given = this.convertRichText(words.slice(0, -1).join(" "))
        }

        return nameObj
    }

    private extractKeywords(
        keywordsData: EndNoteStyledValue | EndNoteStyledValue[] | undefined,
        processedFields?: Set<string>
    ): string[] {
        if (!keywordsData) {
            return []
        }

        if (processedFields) processedFields.add("keywords")

        const keywords = Array.isArray(keywordsData)
            ? keywordsData
            : [keywordsData]
        const result: string[] = []

        for (const kw of keywords) {
            const text = this.getTextContent(kw)
            if (text) {
                // Keywords may be separated by semicolons or commas
                const parts = text.split(/[;,]/).map((p) => p.trim())
                result.push(...parts.filter((p) => p))
            }
        }

        return result
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

    // eslint-disable-next-line max-params
    private checkUnhandledFields(
        record: EndNoteRecord,
        processedFields: Set<string>,
        index: number,
        fields: Record<string, unknown>,
        unhandledData: string[]
    ): void {
        // Define which top-level fields should be checked
        const knownFields = [
            "database",
            "source-app",
            "rec-number",
            "foreign-keys",
            "ref-type",
            "contributors",
            "auth-address",
            "auth-affiliaton",
            "titles",
            "periodical",
            "pages",
            "volume",
            "number",
            "issue",
            "secondary-volume",
            "secondary-issue",
            "num-vols",
            "edition",
            "section",
            "reprint-edition",
            "reprint-status",
            "keywords",
            "dates",
            "pub-location",
            "publisher",
            "orig-pub",
            "isbn",
            "issn",
            "accession-num",
            "call-num",
            "report-id",
            "coden",
            "electronic-resource-num",
            "abstract",
            "label",
            "image",
            "caption",
            "notes",
            "research-notes",
            "work-type",
            "reviewed-item",
            "availability",
            "remote-source",
            "meeting-place",
            "work-location",
            "work-extent",
            "pack-method",
            "size",
            "repro-ratio",
            "remote-database-name",
            "remote-database-provider",
            "language",
            "urls",
            "access-date",
            "modified-date",
            "custom1",
            "custom2",
            "custom3",
            "custom4",
            "custom5",
            "custom6",
            "custom7",
            "misc1",
            "misc2",
            "misc3",
        ]

        for (const fieldName of knownFields) {
            // Skip if already processed
            if (processedFields.has(fieldName)) continue

            // Check if field exists in record
            const fieldValue = record[fieldName as keyof EndNoteRecord]

            // Skip undefined/null/empty values
            if (!fieldValue) continue
            if (typeof fieldValue === "string" && fieldValue.trim() === "")
                continue
            if (
                typeof fieldValue === "object" &&
                !Array.isArray(fieldValue) &&
                Object.keys(fieldValue).length === 0
            ) {
                continue
            }

            // Field has content but wasn't processed
            const textContent = this.getTextContent(
                fieldValue as EndNoteStyledValue
            )
            if (!textContent) continue
            if (textContent && textContent.trim()) {
                this.warnings.push({
                    type: "unhandled_field",
                    field: fieldName,
                    value: textContent.substring(0, 100),
                    entry: String(index),
                })
                unhandledData.push(
                    `${fieldName}: ${textContent.substring(0, 50)}`
                )
            }
        }
    }
}

// Parse EndNote XML from various input formats
export function parseEndNote(
    input:
        | EndNoteRecord[]
        | {
              records?: { record?: EndNoteRecord | EndNoteRecord[] }
              xml?: { records?: { record?: EndNoteRecord | EndNoteRecord[] } }
          }
): EndNoteParseResult {
    let records: EndNoteRecord[] = []

    if (Array.isArray(input)) {
        records = input
    } else if (input.xml?.records?.record) {
        const recordData = input.xml.records.record
        records = Array.isArray(recordData) ? recordData : [recordData]
    } else if (input.records?.record) {
        const recordData = input.records.record
        records = Array.isArray(recordData) ? recordData : [recordData]
    }

    return new EndNoteParser(records).parse()
}

export type { EndNoteRecord }
