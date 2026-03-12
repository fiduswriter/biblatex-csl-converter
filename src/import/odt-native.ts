/**
 * LibreOffice native bibliography-mark importer
 *
 * Handles `<text:bibliography-mark>` elements that LibreOffice writes into
 * ODT content.xml.  All bibliographic data is stored as XML attributes
 * directly on the element, so no external parser is needed.
 *
 * This module is consumed by OdtCitationsParser in odt-citations.ts.
 */

import { EntryObject, NodeArray, RangeArray } from "../const"

// ---------------------------------------------------------------------------
// Type map
// ---------------------------------------------------------------------------

/**
 * Maps `text:bibliography-type` attribute values (ODF 1.2 spec) to internal
 * BibLaTeX type strings.
 */
export const ODTBibTypeMap: Record<string, string> = {
    article: "article-journal",
    book: "book",
    booklet: "booklet",
    conference: "inproceedings",
    inbook: "inbook",
    incollection: "inbook",
    inproceedings: "inproceedings",
    journal: "article-journal",
    manual: "manual",
    mastersthesis: "thesis",
    misc: "misc",
    phdthesis: "thesis",
    proceedings: "proceedings",
    techreport: "report",
    unpublished: "unpublished",
    www: "online",
    email: "misc",
    custom1: "misc",
    custom2: "misc",
    custom3: "misc",
    custom4: "misc",
    custom5: "misc",
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface OdtNativeParseResult {
    entries: EntryObject[]
    warnings: Array<{
        type: string
        field?: string
        value?: unknown
        entry?: string
    }>
}

// ---------------------------------------------------------------------------
// Parser class
// ---------------------------------------------------------------------------

export class OdtNativeParser {
    private contentXml: string

    constructor(contentXml: string) {
        this.contentXml = contentXml
    }

    /**
     * Scans `contentXml` for all `<text:bibliography-mark>` elements and
     * returns the parsed entries together with any warnings produced.
     *
     * Duplicate detection (via `seenKeys`) is the responsibility of the
     * caller; this parser will emit an entry for every mark it finds,
     * including duplicates.  Pass a pre-populated `seenKeys` set to skip
     * keys that have already been processed.
     */
    parse(seenKeys?: Set<string>): OdtNativeParseResult {
        const entries: EntryObject[] = []
        const warnings: Array<{
            type: string
            field?: string
            value?: unknown
            entry?: string
        }> = []

        const markRe =
            /<text:bibliography-mark\b([\s\S]*?)(?:\/>|>[\s\S]*?<\/text:bibliography-mark>)/g
        let m: RegExpExecArray | null
        while ((m = markRe.exec(this.contentXml)) !== null) {
            const result = processLibreOfficeMarkAttrs(m[1], seenKeys)
            if (result.warning) warnings.push(result.warning)
            if (result.entry) entries.push(result.entry)
        }

        return { entries, warnings }
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function processLibreOfficeMarkAttrs(
    attrString: string,
    seenKeys?: Set<string>
): {
    entry?: EntryObject
    warning?: { type: string; field?: string; value?: unknown; entry?: string }
} {
    const getAttr = (name: string): string => {
        const re = new RegExp(`${name}="([^"]*)"`)
        const m = re.exec(attrString)
        if (m) return unescapeXmlEntities(m[1])
        // also handle single-quoted values
        const re2 = new RegExp(`${name}='([^']*)'`)
        const m2 = re2.exec(attrString)
        return m2 ? unescapeXmlEntities(m2[1]) : ""
    }

    const identifier = getAttr("text:identifier")
    if (!identifier) {
        return { warning: { type: "odt_bibmark_missing_identifier" } }
    }

    if (seenKeys?.has(identifier)) return {}
    seenKeys?.add(identifier)

    const bibTypeName = getAttr("text:bibliography-type") || "misc"
    const bibType = ODTBibTypeMap[bibTypeName] ?? "misc"

    const warning = ODTBibTypeMap[bibTypeName]
        ? undefined
        : {
              type: "odt_bibmark_unknown_type",
              value: bibTypeName,
              entry: identifier,
          }

    const fields: Record<string, unknown> = {}

    const title = getAttr("text:title")
    if (title) fields["title"] = makeRichText(title)

    // text:author is a plain string (may contain multiple authors
    // separated by semicolons, e.g. "Jones, Alice; Smith, Bob")
    const author = getAttr("text:author")
    if (author) fields["author"] = parseODTNameString(author)

    const year = getAttr("text:year")
    if (year) fields["date"] = year

    const journal = getAttr("text:journal")
    if (journal) fields["journaltitle"] = makeRichText(journal)

    const booktitle = getAttr("text:booktitle")
    if (booktitle) fields["booktitle"] = makeRichText(booktitle)

    const volume = getAttr("text:volume")
    if (volume) fields["volume"] = makeRichText(volume)

    const number = getAttr("text:number")
    if (number) fields["number"] = makeRichText(number)

    const pages = getAttr("text:pages")
    if (pages) fields["pages"] = convertRange(pages)

    const publisher = getAttr("text:publisher")
    if (publisher) fields["publisher"] = [makeRichText(publisher)]

    // text:address is the ODF attribute for publisher address / place
    const address = getAttr("text:address")
    if (address) fields["location"] = [makeRichText(address)]

    const edition = getAttr("text:edition")
    if (edition) fields["edition"] = makeRichText(edition)

    const isbn = getAttr("text:isbn")
    if (isbn) fields["isbn"] = makeRichText(isbn)

    const issn = getAttr("text:issn")
    if (issn) fields["issn"] = makeRichText(issn)

    const doi = getAttr("text:doi")
    if (doi) fields["doi"] = doi

    const url = getAttr("text:url")
    if (url) fields["url"] = url

    const note = getAttr("text:note")
    if (note) fields["note"] = makeRichText(note)

    const annote = getAttr("text:annote")
    if (annote && !fields["note"]) {
        fields["note"] = makeRichText(annote)
    }

    // text:institution / text:school → institution field
    const institution = getAttr("text:institution")
    if (institution) fields["institution"] = [makeRichText(institution)]

    const school = getAttr("text:school")
    if (school && !fields["institution"]) {
        fields["institution"] = [makeRichText(school)]
    }

    const reportType = getAttr("text:report-type")
    if (reportType) fields["type"] = reportType

    const chapter = getAttr("text:chapter")
    if (chapter) fields["chapter"] = makeRichText(chapter)

    const series = getAttr("text:series")
    if (series) fields["series"] = makeRichText(series)

    const editor = getAttr("text:editor")
    if (editor) fields["editor"] = parseODTNameString(editor)

    return {
        entry: { entry_key: identifier, bib_type: bibType, fields },
        warning,
    }
}

/**
 * ODT bibliography marks store names as plain strings such as
 * "Jones, Alice" or "Smith, John; Doe, Jane".  We split on semicolons
 * then parse each individual name in "Last, First" or "First Last" form.
 */
function parseODTNameString(nameStr: string): Array<{
    family?: NodeArray
    given?: NodeArray
    literal?: NodeArray
}> {
    return nameStr
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => {
            const obj: {
                family?: NodeArray
                given?: NodeArray
                literal?: NodeArray
            } = {}
            if (name.includes(",")) {
                const parts = name.split(",").map((p) => p.trim())
                obj.family = makeRichText(parts[0])
                if (parts[1]) obj.given = makeRichText(parts[1])
            } else {
                const words = name.split(/\s+/)
                if (words.length === 1) {
                    obj.literal = makeRichText(words[0])
                } else {
                    obj.family = makeRichText(words[words.length - 1])
                    obj.given = makeRichText(words.slice(0, -1).join(" "))
                }
            }
            return obj
        })
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
