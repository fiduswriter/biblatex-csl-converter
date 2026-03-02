/**
 * Word native / JabRef CITATION sources importer
 *
 * Handles the Word-native bibliography format:
 *   - `CITATION key \l locale` inline field codes, which identify which
 *     sources are cited by their citation tag/key.
 *   - `customXml/item1.xml` (MS Office Bibliography XML), which contains the
 *     full bibliographic data for every source in the document.  JabRef also
 *     writes this format when exporting to DOCX.
 *
 * Each `<b:Source>` element is converted into an internal EntryObject.
 * The type mapping and field conversion logic follow the same conventions
 * used by the ODT native parser (odt-native.ts).
 *
 * This module is consumed by DocxCitationsParser in docx-citations.ts.
 */

import { EntryObject, NodeArray, RangeArray } from "../const"

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface DocxNativeParseResult {
    entries: EntryObject[]
    errors: Array<{
        type: string
        field?: string
        value?: unknown
        entry?: string
    }>
    warnings: Array<{
        type: string
        field?: string
        value?: unknown
        entry?: string
    }>
}

// ---------------------------------------------------------------------------
// Word SourceType → internal BibType mapping
//
// Maps MS Office Bibliography XML `b:SourceType` values directly to the
// internal BibType keys defined in BibTypes (src/const.ts).
// ---------------------------------------------------------------------------

export const wordSourceTypeToBibType: Record<string, string> = {
    ArticleInAPeriodical: "article-magazine",
    Book: "book",
    BookSection: "inbook",
    JournalArticle: "article-journal",
    ConferenceProceedings: "inproceedings",
    Report: "report",
    SoundRecording: "audio",
    Performance: "misc",
    Art: "artwork",
    DocumentFromInternetSite: "online",
    InternetSite: "online",
    Film: "video",
    Interview: "interview",
    Patent: "patent",
    ElectronicSource: "article",
    Case: "legal_case",
    Misc: "misc",
}

// ---------------------------------------------------------------------------
// Parser class
// ---------------------------------------------------------------------------

export class DocxNativeParser {
    private sourcesXml: string

    constructor(sourcesXml: string) {
        this.sourcesXml = sourcesXml
    }

    /**
     * Parses `customXml/item1.xml` — the MS Office Bibliography XML file that
     * JabRef exports and Word stores inside the DOCX ZIP.
     *
     * Only sources whose citation tag is present in `seenKeys` are included
     * in the output; pass an empty set (or omit the argument) to import all
     * sources unconditionally.  The set is updated with the entry_key of
     * every entry that is added so callers can detect duplicates.
     */
    parse(seenKeys?: Set<string>): DocxNativeParseResult {
        const sourceRe = /<b:Source\b[^>]*>([\s\S]*?)<\/b:Source>/g
        let m: RegExpExecArray | null
        const entries: EntryObject[] = []
        const warnings: DocxNativeParseResult["warnings"] = []

        while ((m = sourceRe.exec(this.sourcesXml)) !== null) {
            const result = parseWordSource(m[1])
            if (result.warning) warnings.push(result.warning)
            if (result.entry) {
                if (seenKeys && seenKeys.has(result.entry.entry_key)) continue
                seenKeys?.add(result.entry.entry_key)
                entries.push(result.entry)
            }
        }

        return { entries, errors: [], warnings }
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseWordSource(sourceXml: string): {
    entry?: EntryObject
    warning?: { type: string; field?: string; value?: unknown; entry?: string }
} {
    const getB = (tag: string): string => {
        const re = new RegExp(`<b:${tag}[^>]*>([\\s\\S]*?)<\\/b:${tag}>`)
        const m = re.exec(sourceXml)
        return m ? unescapeXmlEntities(m[1].trim()) : ""
    }

    const tag = getB("Tag")
    if (!tag) {
        return { warning: { type: "word_source_missing_tag" } }
    }

    const sourceType = getB("SourceType")
    const bibType = wordSourceTypeToBibType[sourceType] ?? "misc"

    const fields: Record<string, unknown> = {}

    // Title
    const title = getB("Title")
    if (title) fields["title"] = makeRichText(title)

    // Authors
    const authorOuterMatch = sourceXml.match(/<b:Author>([\s\S]*?)<\/b:Author>/)
    if (authorOuterMatch) {
        const nameListMatch = authorOuterMatch[1].match(
            /<b:NameList>([\s\S]*?)<\/b:NameList>/
        )
        if (nameListMatch) {
            const authors = parseWordNameList(nameListMatch[1])
            if (authors.length > 0) fields["author"] = authors
        }
    }

    // Editors
    const editorMatch = sourceXml.match(/<b:Editor>([\s\S]*?)<\/b:Editor>/)
    if (editorMatch) {
        const nameListMatch = editorMatch[1].match(
            /<b:NameList>([\s\S]*?)<\/b:NameList>/
        )
        if (nameListMatch) {
            const editors = parseWordNameList(nameListMatch[1])
            if (editors.length > 0) fields["editor"] = editors
        }
    }

    // Year → date
    const year = getB("Year")
    if (year) fields["date"] = year

    // Publisher / location
    const publisher = getB("Publisher")
    if (publisher) fields["publisher"] = makeRichText(publisher)

    const city = getB("City")
    if (city) fields["location"] = makeRichText(city)

    // Journal / periodical title
    const journal = getB("JournalName") || getB("PeriodicalTitle")
    if (journal) fields["journaltitle"] = makeRichText(journal)

    // Book title (for sections / proceedings)
    const booktitle = getB("BookTitle") || getB("ConferenceName")
    if (booktitle) fields["booktitle"] = makeRichText(booktitle)

    // Volume, issue, pages
    const volume = getB("Volume")
    if (volume) fields["volume"] = makeRichText(volume)

    const issue = getB("Issue")
    if (issue) fields["issue"] = makeRichText(issue)

    const pages = getB("Pages")
    if (pages) fields["pages"] = convertRange(pages)

    // Edition
    const edition = getB("Edition")
    if (edition) fields["edition"] = makeRichText(edition)

    // Series / standard number
    const series = getB("Series") || getB("SeriesTitle")
    if (series) fields["series"] = makeRichText(series)

    // Report / patent number
    const reportNumber = getB("Number") || getB("ReportNumber")
    if (reportNumber) fields["number"] = makeRichText(reportNumber)

    // Identifiers
    const doi = getB("DOI")
    if (doi) fields["doi"] = doi

    const isbn = getB("ISBN")
    if (isbn) fields["isbn"] = makeRichText(isbn)

    const url = getB("URL") || getB("InternetSiteTitle")
    if (url) fields["url"] = url

    // Abstract / note
    const comments = getB("Comments")
    if (comments) fields["note"] = makeRichText(comments)

    // Language
    const lcid = getB("LCID")
    if (lcid) fields["langid"] = lcid

    return {
        entry: { entry_key: tag, bib_type: bibType, fields },
    }
}

/**
 * Parses a `<b:NameList>` block into the internal NameDictObject array
 * shape that the rest of the library expects.
 */
function parseWordNameList(nameListXml: string): Array<{
    family?: NodeArray
    given?: NodeArray
    literal?: NodeArray
}> {
    const names: Array<{
        family?: NodeArray
        given?: NodeArray
        literal?: NodeArray
    }> = []
    const personRe = /<b:Person>([\s\S]*?)<\/b:Person>/g
    let m: RegExpExecArray | null
    while ((m = personRe.exec(nameListXml)) !== null) {
        const personXml = m[1]
        const last =
            /<b:Last[^>]*>([\s\S]*?)<\/b:Last>/.exec(personXml)?.[1]?.trim() ??
            ""
        const first =
            /<b:First[^>]*>([\s\S]*?)<\/b:First>/
                .exec(personXml)?.[1]
                ?.trim() ?? ""
        const middle =
            /<b:Middle[^>]*>([\s\S]*?)<\/b:Middle>/
                .exec(personXml)?.[1]
                ?.trim() ?? ""
        const given = middle ? `${first} ${middle}`.trim() : first

        if (!last && !given) continue

        const obj: {
            family?: NodeArray
            given?: NodeArray
            literal?: NodeArray
        } = {}

        if (last) {
            obj.family = makeRichText(last)
            if (given) obj.given = makeRichText(given)
        } else {
            // Only a given name is present — treat as a literal/institutional name
            obj.literal = makeRichText(given)
        }

        names.push(obj)
    }
    return names
}

function makeRichText(text: string): NodeArray {
    return [{ type: "text", text: text.trim() }]
}

function convertRange(rangeText: string): RangeArray[] {
    return rangeText.split(/,\s*/).map((r): RangeArray => {
        const parts = r.split(/[-–—]/)
        if (parts.length >= 2) {
            return [
                [{ type: "text", text: parts[0].trim() }],
                [{ type: "text", text: parts.slice(1).join("-").trim() }],
            ]
        }
        return [[{ type: "text", text: r.trim() }]]
    })
}

function unescapeXmlEntities(text: string): string {
    return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
}
