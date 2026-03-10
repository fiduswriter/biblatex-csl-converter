/**
 * DOCX Citations importer
 *
 * Extracts bibliographic citations from the XML of a DOCX file's
 * word/document.xml (or any XML fragment containing the same markup).
 *
 * Supported citation manager formats and how each is handled:
 *
 *   - Word native           `CITATION key \l locale` inline field +
 *                           `customXml/item1.xml` sources (passed as
 *                           `sourcesXml` option). Delegated to
 *                           DocxNativeParser in docx-native.ts.
 *
 *   - Zotero                `ADDIN ZOTERO_ITEM CSL_CITATION {json}` inline
 *                           field.  The embedded CSL-JSON `citationItems`
 *                           array is reshaped into a Record<string, CSLEntry>
 *                           and fed to CSLParser.
 *
 *   - Mendeley Cite v3      Current add-in: `<w:sdt>` with the citation JSON
 *     (current)             base64-encoded in `w:tag w:val=
 *                           "MENDELEY_CITATION_v3_{base64}"`.  Decoded payload
 *                           is CSL-JSON; handled identically to Zotero.
 *
 *   - Mendeley Desktop      Legacy add-in: `ADDIN CSL_CITATION {json}` inline
 *     (legacy)              field.  Same CSL-JSON shape; handled identically
 *                           to Zotero.
 *
 *   - EndNote               `ADDIN EN.CITE <EndNote>…</EndNote>` — XML is
 *                           either entity-escaped inline or base64-encoded in
 *                           `<w:fldData>`.  The `<record>` subtree is
 *                           converted to an EndNoteRecord object and passed to
 *                           EndNoteParser.
 *
 *   - Citavi                `<w:sdt>` wrapping `ADDIN CitaviPlaceholder
 *                           {base64}`.  The base64-decoded JSON contains a
 *                           WordPlaceholder with `Entries[].ReferenceId`
 *                           UUIDs.  Two sub-cases:
 *
 *                           A. If the payload already embeds `Reference`
 *                              objects (some Citavi export modes), they are
 *                              passed directly to CitaviParser.
 *
 *                           B. In older or incomplete formats, only UUIDs may
 *                              be present without embedded references. Such
 *                              citations cannot be fully resolved and will
 *                              generate warnings.
 *
 * Usage:
 *   const parser = new DocxCitationsParser(documentXml, {
 *     sourcesXml,   // contents of customXml/item1.xml (Word-native)
 *   })
 *   const result  = parser.parse()
 *   // result.entries  → BibDB  (Record<number, EntryObject>)
 *   // result.errors   → ErrorObject[]
 *   // result.warnings → ErrorObject[]
 *
 * The `sourcesXml` option must be the contents of `customXml/item1.xml` from
 * the DOCX ZIP when Word-native citations are present.
 *
 * Citavi citations embed complete bibliographic data directly in each citation
 * field, so no external Citavi project file is required.
 */

import { EntryObject } from "../const"
import { CSLParser, CSLEntry } from "./csl"
import { CitaviParser, CitaviInput } from "./citavi"
import { EndNoteParser, EndNoteRecord } from "./endnote"
import { DocxNativeParser } from "./docx-native"
import { extractJsonObject } from "./tools"

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface DocxCitationsParseResult {
    entries: Record<number, EntryObject>
    errors: ErrorObject[]
    warnings: ErrorObject[]
}

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
}

// ---------------------------------------------------------------------------
// Static utility result types
// ---------------------------------------------------------------------------

export interface CitationResult {
    isCitation: boolean
    format?: string // e.g., "zotero", "mendeley_v3", "endnote", "citavi", "word_native"
    entries?: Record<number, EntryObject>
    errors?: ErrorObject[]
    warnings?: ErrorObject[]
}

export interface BibliographyResult {
    isBibliography: boolean
    format?: string
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface DocxCitationsParserOptions {
    /**
     * Contents of `customXml/item1.xml` from the DOCX ZIP, using the MS
     * Office Bibliography XML namespace.  Required to resolve Word-native and
     * `CITATION` keys into full bibliographic data.
     */
    sourcesXml?: string
}

// ---------------------------------------------------------------------------
// Parser class
// ---------------------------------------------------------------------------

export class DocxCitationsParser {
    private documentXml: string
    private options: DocxCitationsParserOptions
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]
    /** Entry keys already added — prevents duplicates across multiple fields. */
    private seenKeys: Set<string>

    constructor(documentXml: string, options: DocxCitationsParserOptions = {}) {
        this.documentXml = documentXml
        this.options = options
        this.entries = []
        this.errors = []
        this.warnings = []
        this.seenKeys = new Set()
    }

    // -----------------------------------------------------------------------
    // Static utility methods for reusable citation detection and extraction
    // -----------------------------------------------------------------------

    /**
     * Check if an SDT block contains citation data (without full document parsing).
     *
     * @param sdtXml - XML string of a single <w:sdt>...</w:sdt> block
     * @returns CitationCheckResult indicating whether it's a citation and its format
     */
    static sdtCitation(
        sdtXml: string,
        retrieve = true,
        entries: EntryObject[] = [],
        errors: ErrorObject[] = [],
        warnings: ErrorObject[] = [],
        seenKeys: Set<string> = new Set<string>()
    ): CitationResult {
        const tagMatch = sdtXml.match(/<w:tag\s+w:val="([^"]*)"/)
        if (!tagMatch) return { isCitation: false }
        const tagVal = tagMatch[1]

        let format: string | undefined

        if (tagVal.startsWith("MENDELEY_CITATION_v3_")) {
            format = "mendeley_v3"
        } else if (tagVal.startsWith("CitaviPlaceholder#")) {
            format = "citavi"
        }

        if (!format) {
            return { isCitation: false }
        }

        if (!retrieve) {
            return { isCitation: true, format }
        }

        // Extract citation data
        if (format === "mendeley_v3") {
            const b64 = tagVal.slice("MENDELEY_CITATION_v3_".length)
            DocxCitationsParser.extractCslJsonData(
                DocxCitationsParser.decodeBase64Static(b64),
                "mendeley_v3",
                entries,
                errors,
                warnings,
                seenKeys
            )
        } else if (format === "citavi") {
            const instrMatch = sdtXml.match(
                /<w:instrText[^>]*>ADDIN CitaviPlaceholder([A-Za-z0-9+/=\s]+)<\/w:instrText>/
            )
            if (instrMatch) {
                DocxCitationsParser.extractCitaviData(
                    instrMatch[1].replace(/\s/g, ""),
                    entries,
                    errors,
                    warnings,
                    seenKeys
                )
            } else {
                warnings.push({
                    type: "citavi_missing_payload",
                    value: tagVal,
                })
            }
        }

        const bibDB: Record<number, EntryObject> = {}
        entries.forEach((entry, i) => {
            bibDB[i + 1] = entry
        })

        return {
            isCitation: true,
            format,
            entries: bibDB,
            errors,
            warnings,
        }
    }

    /**
     * Check or extract bibliography rendering region from an SDT block.
     *
     * @param sdtXml - XML string of a single <w:sdt>...</w:sdt> block
     * @param retrieve - If true, extract data (currently returns empty as bibliographies have no importable data)
     * @returns BibliographyResult indicating whether it's a bibliography
     */
    static sdtBibliography(sdtXml: string): BibliographyResult {
        const tagMatch = sdtXml.match(/<w:tag\s+w:val="([^"]*)"/)
        if (!tagMatch) return { isBibliography: false }
        const tagVal = tagMatch[1]

        let format: string | undefined

        if (tagVal.startsWith("MENDELEY_BIBLIOGRAPHY_v3_")) {
            format = "mendeley_v3"
        }

        if (!format) {
            return { isBibliography: false }
        }

        const result: BibliographyResult = {
            isBibliography: true,
            format,
        }

        return result
    }

    /**
     * Check or extract citation data from a field instruction.
     *
     * @param instrText - The concatenated instruction text from w:instrText elements
     * @param retrieve - If true, extract and return full citation data
     * @param fldData - Optional field data (for EndNote base64 payloads)
     * @param options - Optional parser options (e.g., sourcesXml for Word native)
     * @returns CitationResult with format and optionally entries/errors/warnings
     */
    static fieldCitation(
        instrText: string,
        retrieve = true,
        fldData?: string,
        options: DocxCitationsParserOptions = {},
        entries: EntryObject[] = [],
        errors: ErrorObject[] = [],
        warnings: ErrorObject[] = [],
        seenKeys: Set<string> = new Set<string>(),
        extractWordNative = true
    ): CitationResult {
        const upper = instrText.trim().toUpperCase()

        let format: string | undefined

        if (upper.startsWith("ADDIN ZOTERO_ITEM")) {
            format = "zotero"
        } else if (
            upper.startsWith("ADDIN CSL_CITATION") ||
            upper.startsWith("CSL_CITATION")
        ) {
            format = "mendeley_legacy"
        } else if (upper.startsWith("ADDIN EN.CITE")) {
            format = "endnote"
        } else if (upper.startsWith("ADDIN CITAVIPLACEHOLDER")) {
            format = "citavi"
        } else if (upper.startsWith("CITATION ")) {
            format = "word_native"
        }

        if (!format) {
            return { isCitation: false }
        }

        if (!retrieve) {
            return { isCitation: true, format }
        }

        // Extract citation data
        if (format === "zotero" || format === "mendeley_legacy") {
            const jsonStart = instrText.indexOf("{")
            if (jsonStart === -1) {
                warnings.push({ type: `${format}_missing_json` })
            } else {
                const jsonStr = extractJsonObject(instrText, jsonStart)
                if (jsonStr === null) {
                    warnings.push({ type: `${format}_missing_json` })
                } else {
                    DocxCitationsParser.extractCslJsonData(
                        jsonStr,
                        format,
                        entries,
                        errors,
                        warnings,
                        seenKeys
                    )
                }
            }
        } else if (format === "endnote") {
            DocxCitationsParser.extractEndNoteData(
                instrText,
                fldData,
                entries,
                errors,
                warnings,
                seenKeys
            )
        } else if (format === "citavi") {
            const b64Match = instrText.match(
                /ADDIN CitaviPlaceholder([A-Za-z0-9+/=\s]+)/i
            )
            if (b64Match) {
                DocxCitationsParser.extractCitaviData(
                    b64Match[1].replace(/\s/g, ""),
                    entries,
                    errors,
                    warnings,
                    seenKeys
                )
            }
        } else if (format === "word_native") {
            // Record the key for later resolution
            const m = /^CITATION\s+(\S+)/i.exec(instrText.trim())
            if (m) {
                seenKeys.add(m[1])
            }
            // Only extract data if sourcesXml is provided AND extractWordNative is true.
            // When called from instance methods, extractWordNative is false and we
            // should only record keys - extraction happens later in parseSourcesXml.
            if (options.sourcesXml && extractWordNative) {
                DocxCitationsParser.extractWordNativeData(
                    instrText,
                    options.sourcesXml,
                    entries,
                    errors,
                    warnings,
                    seenKeys
                )
            }
        }

        const bibDB: Record<number, EntryObject> = {}
        entries.forEach((entry, i) => {
            bibDB[i + 1] = entry
        })

        return {
            isCitation: true,
            format,
            entries: bibDB,
            errors,
            warnings,
        }
    }

    /**
     * Check or extract bibliography rendering region from a field instruction.
     *
     * @param instrText - The concatenated instruction text
     * @param retrieve - If true, extract data (currently returns empty as bibliographies have no importable data)
     * @returns BibliographyResult indicating whether it's a bibliography
     */
    static fieldBibliography(instrText: string): BibliographyResult {
        const upper = instrText.trim().toUpperCase()

        let format: string | undefined

        if (upper.startsWith("ADDIN ZOTERO_BIBL")) {
            format = "zotero"
        } else if (upper.startsWith("ADDIN EN.REFLIST")) {
            format = "endnote"
        } else if (upper.startsWith("BIBLIOGRAPHY")) {
            format = "word_native"
        }

        if (!format) {
            return { isBibliography: false }
        }

        const result: BibliographyResult = {
            isBibliography: true,
            format,
        }

        return result
    }

    // -----------------------------------------------------------------------
    // Static helper methods for extraction logic
    // -----------------------------------------------------------------------

    /**
     * Extract CSL citation JSON data.
     */
    private static extractCslJsonData(
        jsonStr: string,
        source: string,
        entries: EntryObject[],
        errors: ErrorObject[],
        warnings: ErrorObject[],
        seenKeys: Set<string>
    ): void {
        let citation: {
            citationItems?: Array<{ itemData?: CSLEntry; id?: unknown }>
        }
        try {
            citation = JSON.parse(jsonStr) as typeof citation
        } catch {
            warnings.push({
                type: `${source}_invalid_json`,
                value: jsonStr.slice(0, 80),
            })
            return
        }

        const items = citation.citationItems ?? []
        if (items.length === 0) return

        const cslRecord: Record<string, CSLEntry> = {}
        items.forEach((item, i) => {
            if (!item.itemData) return
            const key =
                item.itemData.id === undefined
                    ? `${source}_${i}`
                    : String(item.itemData.id)
            if (seenKeys.has(key)) return
            cslRecord[key] = item.itemData
        })

        if (Object.keys(cslRecord).length === 0) return

        const parser = new CSLParser(cslRecord)
        const bibDB = parser.parse()

        errors.push(...parser.errors)
        warnings.push(...parser.warnings)

        for (const entry of Object.values(bibDB)) {
            seenKeys.add(entry.entry_key)
            entries.push(entry)
        }
    }

    /**
     * Extract EndNote citation data.
     */
    private static extractEndNoteData(
        instrText: string,
        fldData: string | undefined,
        entries: EntryObject[],
        errors: ErrorObject[],
        warnings: ErrorObject[],
        seenKeys: Set<string>
    ): void {
        let xmlPayload = ""

        if (fldData && fldData.length > 0) {
            try {
                xmlPayload = DocxCitationsParser.decodeBase64Static(fldData)
            } catch {
                warnings.push({
                    type: "endnote_invalid_flddata",
                    value: fldData.slice(0, 40),
                })
                return
            }
        } else {
            const idx = instrText.toUpperCase().indexOf("ADDIN EN.CITE")
            if (idx === -1) return
            xmlPayload = DocxCitationsParser.unescapeXmlEntitiesStatic(
                instrText.slice(idx + "ADDIN EN.CITE".length).trim()
            )
        }

        if (xmlPayload.includes("<EndNote") || xmlPayload.includes("<record")) {
            DocxCitationsParser.parseEndNoteXml(
                xmlPayload,
                entries,
                errors,
                warnings,
                seenKeys
            )
        } else {
            warnings.push({
                type: "endnote_no_xml",
                value: xmlPayload.slice(0, 80),
            })
        }
    }

    /**
     * Extract Citavi citation data from base64-encoded WordPlaceholder JSON.
     *
     * Citavi embeds complete bibliographic data directly in each citation via
     * `Reference` objects within the `Entries` array. This method checks for
     * embedded references and converts them via CitaviParser. If no embedded
     * references are found (only UUIDs), a warning is generated.
     */
    private static extractCitaviData(
        b64: string,
        entries: EntryObject[],
        errors: ErrorObject[],
        warnings: ErrorObject[],
        seenKeys: Set<string>
    ): void {
        let payload: CitaviInput
        try {
            const decoded = DocxCitationsParser.decodeBase64Static(b64)
            payload = JSON.parse(decoded) as CitaviInput
        } catch {
            warnings.push({
                type: "citavi_invalid_payload",
                value: b64.slice(0, 40),
            })
            return
        }

        // Check if the payload has embedded references
        const hasEmbeddedReferences =
            !Array.isArray(payload) &&
            Array.isArray((payload as { Entries?: unknown[] }).Entries) &&
            (
                payload as { Entries: Array<{ Reference?: unknown }> }
            ).Entries!.some(
                (e) => e.Reference !== null && e.Reference !== undefined
            )

        if (!hasEmbeddedReferences) {
            warnings.push({
                type: "citavi_missing_embedded_references",
                value: b64.slice(0, 40),
            })
            return
        }

        const parser = new CitaviParser(payload)
        const bibDB = parser.parse()

        errors.push(...parser.errors)
        warnings.push(...parser.warnings)

        for (const entry of Object.values(bibDB)) {
            if (!seenKeys.has(entry.entry_key)) {
                seenKeys.add(entry.entry_key)
                entries.push(entry)
            }
        }
    }

    /**
     * Extract Word native citation data.
     */
    private static extractWordNativeData(
        instrText: string,
        sourcesXml: string,
        entries: EntryObject[],
        errors: ErrorObject[],
        warnings: ErrorObject[],
        seenKeys: Set<string>
    ): void {
        const m = /^CITATION\s+(\S+)/i.exec(instrText.trim())
        if (m) {
            const citationKey = m[1]
            seenKeys.add(citationKey)

            const nativeParser = new DocxNativeParser(sourcesXml)
            const result = nativeParser.parse(seenKeys)

            errors.push(...result.errors)
            warnings.push(...result.warnings)
            entries.push(...result.entries)
        }
    }

    /**
     * Parse EndNote XML payload.
     */
    private static parseEndNoteXml(
        xml: string,
        entries: EntryObject[],
        errors: ErrorObject[],
        warnings: ErrorObject[],
        seenKeys: Set<string>
    ): void {
        const records: EndNoteRecord[] = []

        const citeRe = /<Cite>([\s\S]*?)<\/Cite>/g
        let citeMatch: RegExpExecArray | null
        while ((citeMatch = citeRe.exec(xml)) !== null) {
            const citeXml = citeMatch[1]
            const recordMatch = /<record>([\s\S]*?)<\/record>/.exec(citeXml)
            if (recordMatch) {
                const record = DocxCitationsParser.parseEndNoteRecordXml(
                    recordMatch[0]
                )
                const key = String(record["rec-number"] ?? "")
                if (key && !seenKeys.has(key)) {
                    records.push(record)
                    seenKeys.add(key)
                }
            }
        }

        if (records.length === 0) return

        const parser = new EndNoteParser(records)
        const result = parser.parse()

        errors.push(...result.errors)
        warnings.push(...result.warnings)
        entries.push(...Object.values(result.entries))
    }

    /**
     * Parse EndNote record XML.
     */
    private static parseEndNoteRecordXml(recordXml: string): EndNoteRecord {
        const record: EndNoteRecord = {}

        const refTypeMatch = recordXml.match(
            /<ref-type(?:\s+name="([^"]*)")?[^>]*>(\d+)<\/ref-type>/
        )
        if (refTypeMatch) {
            record["ref-type"] = {
                name: refTypeMatch[1] ?? "",
                "#text": refTypeMatch[2],
            }
        }

        const recNumMatch = recordXml.match(
            /<rec-number[^>]*>([\s\S]*?)<\/rec-number>/
        )
        if (recNumMatch) {
            record["rec-number"] = recNumMatch[1].trim()
        }

        const titlesMatch = recordXml.match(/<titles>([\s\S]*?)<\/titles>/)
        if (titlesMatch) {
            const t = titlesMatch[1]
            const titles: Record<string, { "#text": string }> = {}
            for (const tag of [
                "title",
                "secondary-title",
                "tertiary-title",
                "short-title",
                "alt-title",
                "translated-title",
            ] as const) {
                const m = t.match(
                    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
                )
                if (m)
                    titles[tag] = {
                        "#text": DocxCitationsParser.stripStyleTagsStatic(m[1]),
                    }
            }
            if (Object.keys(titles).length > 0) record.titles = titles
        }

        const contribMatch = recordXml.match(
            /<contributors>([\s\S]*?)<\/contributors>/
        )
        if (contribMatch) {
            record.contributors = DocxCitationsParser.parseContributorsXml(
                contribMatch[1]
            )
        }

        const periodicalMatch = recordXml.match(
            /<periodical>([\s\S]*?)<\/periodical>/
        )
        if (periodicalMatch) {
            const p = periodicalMatch[1]
            const periodical: Record<string, { "#text": string }> = {}
            for (const tag of [
                "full-title",
                "abbr-1",
                "abbr-2",
                "abbr-3",
            ] as const) {
                const m = p.match(
                    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
                )
                if (m)
                    periodical[tag] = {
                        "#text": DocxCitationsParser.stripStyleTagsStatic(m[1]),
                    }
            }
            if (Object.keys(periodical).length > 0)
                record.periodical = periodical
        }

        const scalarFields: Array<[keyof EndNoteRecord, string]> = [
            ["pages", "pages"],
            ["volume", "volume"],
            ["number", "number"],
            ["issue", "issue"],
            ["edition", "edition"],
            ["section", "section"],
            ["publisher", "publisher"],
            ["isbn", "isbn"],
            ["issn", "issn"],
            ["abstract", "abstract"],
            ["notes", "notes"],
            ["language", "language"],
            ["label", "label"],
            ["doi", "doi"],
            ["electronic-resource-num", "electronic-resource-num"],
        ]
        for (const [recordKey, xmlTag] of scalarFields) {
            const m = recordXml.match(
                new RegExp(`<${xmlTag}[^>]*>([\\s\\S]*?)<\\/${xmlTag}>`)
            )
            if (m) {
                // eslint-disable-next-line @typescript-eslint/no-extra-semi
                ;(record as Record<string, unknown>)[recordKey as string] = {
                    "#text": DocxCitationsParser.stripStyleTagsStatic(m[1]),
                }
            }
        }

        const pubLocMatch = recordXml.match(
            /<pub-location[^>]*>([\s\S]*?)<\/pub-location>/
        )
        if (pubLocMatch) {
            record["pub-location"] = {
                "#text": DocxCitationsParser.stripStyleTagsStatic(
                    pubLocMatch[1]
                ),
            }
        }

        const datesMatch = recordXml.match(/<dates>([\s\S]*?)<\/dates>/)
        if (datesMatch) {
            record.dates = DocxCitationsParser.parseDatesXml(datesMatch[1])
        }

        const keywordsMatch = recordXml.match(
            /<keywords>([\s\S]*?)<\/keywords>/
        )
        if (keywordsMatch) {
            const kwMatches = [
                ...keywordsMatch[1].matchAll(
                    /<keyword[^>]*>([\s\S]*?)<\/keyword>/g
                ),
            ]
            if (kwMatches.length > 0) {
                record.keywords = {
                    keyword: kwMatches.map((kw) => ({
                        "#text": DocxCitationsParser.stripStyleTagsStatic(
                            kw[1]
                        ),
                    })),
                }
            }
        }

        const urlsMatch = recordXml.match(/<urls>([\s\S]*?)<\/urls>/)
        if (urlsMatch) {
            record.urls = DocxCitationsParser.parseUrlsXml(urlsMatch[1])
        }

        return record
    }

    /**
     * Parse contributors XML.
     */
    private static parseContributorsXml(
        xml: string
    ): Record<string, { author: Array<{ "#text": string }> }> {
        const result: Record<string, { author: Array<{ "#text": string }> }> =
            {}

        for (const group of [
            "authors",
            "secondary-authors",
            "tertiary-authors",
            "subsidiary-authors",
        ] as const) {
            const m = xml.match(
                new RegExp(`<${group}[^>]*>([\\s\\S]*?)<\\/${group}>`)
            )
            if (m) {
                const authorMatches = [
                    ...m[1].matchAll(/<author[^>]*>([\s\S]*?)<\/author>/g),
                ]
                if (authorMatches.length > 0) {
                    result[group] = {
                        author: authorMatches.map((author) => ({
                            "#text": DocxCitationsParser.stripStyleTagsStatic(
                                author[1]
                            ),
                        })),
                    }
                }
            }
        }

        return result
    }

    /**
     * Parse dates XML.
     */
    private static parseDatesXml(xml: string): Record<string, unknown> {
        const dates: Record<string, unknown> = {}

        const yearMatch = xml.match(/<year[^>]*>([\s\S]*?)<\/year>/)
        if (yearMatch) {
            dates.year = {
                "#text": DocxCitationsParser.stripStyleTagsStatic(yearMatch[1]),
            }
        }

        const pubDatesMatch = xml.match(/<pub-dates>([\s\S]*?)<\/pub-dates>/)
        if (pubDatesMatch) {
            const dateMatches = [
                ...pubDatesMatch[1].matchAll(/<date[^>]*>([\s\S]*?)<\/date>/g),
            ]
            if (dateMatches.length > 0) {
                dates["pub-dates"] = {
                    date: dateMatches.map((d) => ({
                        "#text": DocxCitationsParser.stripStyleTagsStatic(d[1]),
                    })),
                }
            }
        }

        return dates
    }

    /**
     * Parse URLs XML.
     */
    private static parseUrlsXml(xml: string): Record<string, unknown> {
        const urls: Record<string, unknown> = {}

        for (const group of [
            "web-urls",
            "pdf-urls",
            "related-urls",
            "text-urls",
            "image-urls",
        ] as const) {
            const m = xml.match(
                new RegExp(`<${group}>([\\s\\S]*?)<\\/${group}>`)
            )
            if (!m) continue
            const urlMatches = [
                ...m[1].matchAll(/<url[^>]*>([\s\S]*?)<\/url>/g),
            ]
            if (urlMatches.length > 0) {
                urls[group] = {
                    url: urlMatches.map((u) => ({
                        "#text": DocxCitationsParser.stripStyleTagsStatic(u[1]),
                    })),
                }
            }
        }

        return urls
    }

    /**
     * Strip style tags and decode XML entities.
     */
    private static stripStyleTagsStatic(text: string): string {
        return text
            .replace(/<style[^>]*>([\s\S]*?)<\/style>/g, "$1")
            .replace(/<[^>]+>/g, "")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim()
    }

    /**
     * Unescape XML entities.
     */
    private static unescapeXmlEntitiesStatic(text: string): string {
        return text
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
    }

    /**
     * Decode base64.
     */
    private static decodeBase64Static(b64: string): string {
        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        let end = bytes.length
        while (end > 0 && bytes[end - 1] === 0) {
            end--
        }
        return new TextDecoder("utf-8").decode(bytes.subarray(0, end))
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    parse(): DocxCitationsParseResult {
        // 1) Parse SDT blocks (Mendeley v3, Citavi with embedded references).
        this.parseSdtBlocks()

        // 2) Parse field codes (Zotero, legacy Mendeley, Word native, etc.).
        this.parseFieldCodes()

        // 3) Parse sources XML if provided (Word native).
        if (this.options.sourcesXml) {
            this.parseSourcesXml(this.options.sourcesXml)
        }

        // Build final BibDB
        const bibDB: Record<number, EntryObject> = {}
        this.entries.forEach((entry, i) => {
            bibDB[i + 1] = entry
        })

        return {
            entries: bibDB,
            errors: this.errors,
            warnings: this.warnings,
        }
    }

    // -----------------------------------------------------------------------
    // Step 1 — <w:sdt> structured document tags
    // -----------------------------------------------------------------------

    private parseSdtBlocks(): void {
        const sdtRe = /<w:sdt\b[^>]*>([\s\S]*?)<\/w:sdt>/g
        let m: RegExpExecArray | null
        while ((m = sdtRe.exec(this.documentXml)) !== null) {
            DocxCitationsParser.sdtCitation(
                m[1],
                true,
                this.entries,
                this.errors,
                this.warnings,
                this.seenKeys
            )
        }
    }

    // -----------------------------------------------------------------------
    // Step 2 — field codes (begin → separate)
    // -----------------------------------------------------------------------

    /**
     * Tokenises the document XML into field-code events, replays them with a
     * depth counter to handle nested fields (EN.CITE wraps EN.CITE.DATA), and
     * dispatches each completed instruction to the correct handler.
     *
     * Per the DOCX spec (and documented in CITATIONS_IN_DOCS.md), all
     * <w:instrText> elements between `begin` and `separate` must be
     * concatenated before the instruction is interpreted.
     */
    private parseFieldCodes(): void {
        type Token =
            | { kind: "begin"; fldData?: string }
            | { kind: "separate" }
            | { kind: "end" }
            | { kind: "instr"; text: string }
            | { kind: "flddata"; data: string }

        const tokens: Token[] = []

        // Matches, in order of priority:
        //   1. fldChar begin  (optionally contains a <w:fldData> child element
        //      when the fldData is nested inside the fldChar tag itself)
        //   2. fldChar separate
        //   3. fldChar end
        //   4. instrText
        //   5. standalone <w:fldData> element (the common real-world form where
        //      EndNote places the base64 payload in its own <w:r> run as a
        //      sibling of <w:fldChar>, not nested inside it)
        const tokenRe =
            /<w:fldChar\s+w:fldCharType="begin"[^>]*\/?>(?:<w:fldData[^>]*>([\s\S]*?)<\/w:fldData>(?:<\/w:fldChar>))?|<w:fldChar\s+w:fldCharType="separate"[^>]*\/?>|<w:fldChar\s+w:fldCharType="end"[^>]*\/?>|<w:instrText[^>]*>([\s\S]*?)<\/w:instrText>|<w:fldData[^>]*>([\s\S]*?)<\/w:fldData>/g

        let t: RegExpExecArray | null
        while ((t = tokenRe.exec(this.documentXml)) !== null) {
            const full = t[0]
            if (full.includes('fldCharType="begin"')) {
                const raw = t[1] ?? ""
                tokens.push({
                    kind: "begin",
                    fldData: raw ? raw.replace(/\s/g, "") : undefined,
                })
            } else if (full.includes('fldCharType="separate"')) {
                tokens.push({ kind: "separate" })
            } else if (full.includes('fldCharType="end"')) {
                tokens.push({ kind: "end" })
            } else if (full.startsWith("<w:fldData")) {
                // Standalone <w:fldData> element (sibling run, not nested in
                // <w:fldChar>). Capture group index 3 (the fifth alternation).
                const raw = t[3] ?? ""
                tokens.push({
                    kind: "flddata",
                    data: raw.replace(/\s/g, ""),
                })
            } else {
                tokens.push({ kind: "instr", text: t[2] ?? "" })
            }
        }

        // Replay with a stack so nested fields are handled correctly
        const stack: Array<{
            instrParts: string[]
            fldData: string | undefined
            pastSeparate: boolean
        }> = []

        for (const token of tokens) {
            if (token.kind === "begin") {
                stack.push({
                    instrParts: [],
                    fldData: token.fldData,
                    pastSeparate: false,
                })
            } else if (token.kind === "flddata") {
                // Attach sibling fldData to the innermost open field frame,
                // but only if that frame does not already have fldData (the
                // nested-child form takes precedence).
                if (stack.length > 0 && !stack[stack.length - 1].fldData) {
                    stack[stack.length - 1].fldData = token.data
                }
            } else if (token.kind === "separate") {
                if (stack.length > 0) {
                    stack[stack.length - 1].pastSeparate = true
                }
            } else if (token.kind === "end") {
                if (stack.length === 0) continue
                const frame = stack.pop()!
                const instr = frame.instrParts.join("").trim()
                DocxCitationsParser.fieldCitation(
                    instr,
                    true,
                    frame.fldData,
                    this.options,
                    this.entries,
                    this.errors,
                    this.warnings,
                    this.seenKeys,
                    false // Don't extract Word-native here; defer to parseSourcesXml
                )
            } else if (
                stack.length > 0 &&
                !stack[stack.length - 1].pastSeparate
            ) {
                stack[stack.length - 1].instrParts.push(token.text)
            }
        }
    }

    // -----------------------------------------------------------------------
    // Format handlers — each delegates to an existing parser
    // -----------------------------------------------------------------------

    // --- Zotero DOCX ---

    // --- Word native sources XML ---

    /**
     * Delegates to DocxNativeParser, passing `seenKeys` so that sources
     * already imported via other field types are not duplicated, and so that
     * newly imported keys are recorded for future deduplication.
     */
    private parseSourcesXml(xml: string): void {
        const nativeParser = new DocxNativeParser(xml)
        const result = nativeParser.parse(this.seenKeys)

        this.errors.push(...result.errors)
        this.warnings.push(...result.warnings)
        this.entries.push(...result.entries)
    }
}

// ---------------------------------------------------------------------------
// Convenience function
// ---------------------------------------------------------------------------

export function parseDocxCitations(
    documentXml: string,
    options: DocxCitationsParserOptions = {}
): DocxCitationsParseResult {
    return new DocxCitationsParser(documentXml, options).parse()
}
