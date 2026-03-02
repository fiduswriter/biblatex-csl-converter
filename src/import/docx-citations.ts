/**
 * DOCX Citations importer
 *
 * Extracts bibliographic citations from the XML of a DOCX file's
 * word/document.xml (or any XML fragment containing the same markup).
 *
 * Supported citation manager formats and how each is handled:
 *
 *   - Word native / JabRef  `CITATION key \l locale` inline field +
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
 *                           B. Otherwise (the common case) only UUIDs are
 *                              present.  The caller must supply the full
 *                              Citavi project JSON via `options.citaviJson`;
 *                              matching references are looked up by UUID and
 *                              converted via CitaviParser.
 *
 * Usage:
 *   const parser = new DocxCitationsParser(documentXml, {
 *     sourcesXml,   // contents of customXml/item1.xml (Word-native / JabRef)
 *     citaviJson,   // parsed Citavi project JSON export (CitaviInput)
 *   })
 *   const result  = parser.parse()
 *   // result.entries  → BibDB  (Record<number, EntryObject>)
 *   // result.errors   → ErrorObject[]
 *   // result.warnings → ErrorObject[]
 *
 * The `sourcesXml` option must be the contents of `customXml/item1.xml` from
 * the DOCX ZIP when Word-native / JabRef citations are present.
 *
 * The `citaviJson` option must be the parsed JSON from a Citavi project export
 * (any shape accepted by CitaviInput) when Citavi citations are present.
 */

import { EntryObject } from "../const"
import { CSLParser, CSLEntry } from "./csl"
import { CitaviParser, CitaviInput, CitaviReference } from "./citavi"
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
// Options
// ---------------------------------------------------------------------------

export interface DocxCitationsParserOptions {
    /**
     * Contents of `customXml/item1.xml` from the DOCX ZIP, using the MS
     * Office Bibliography XML namespace.  Required to resolve Word-native and
     * JabRef `CITATION` keys into full bibliographic data.
     */
    sourcesXml?: string

    /**
     * Parsed Citavi project JSON export (`CitaviInput`).  When provided, the
     * `ReferenceId` UUIDs collected from `ADDIN CitaviPlaceholder` field codes
     * are looked up in this data set and the matching references are converted
     * via `CitaviParser`.
     *
     * Citavi's WordPlaceholder payloads embed only a `ReferenceId` (UUID) and
     * formatted display text — the full bibliographic data lives in the Citavi
     * project file, which must be exported separately (as JSON) and supplied
     * here.
     */
    citaviJson?: CitaviInput
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
    /**
     * Citavi ReferenceId UUIDs collected from WordPlaceholder payloads.
     * Populated during `parseSdtBlocks()`; consumed by `parseCitaviJson()`.
     */
    private citaviReferenceIds: Set<string>

    constructor(documentXml: string, options: DocxCitationsParserOptions = {}) {
        this.documentXml = documentXml
        this.options = options
        this.entries = []
        this.errors = []
        this.warnings = []
        this.seenKeys = new Set()
        this.citaviReferenceIds = new Set()
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    parse(): DocxCitationsParseResult {
        // 1. Structured Document Tags (Mendeley Cite v3, Citavi)
        this.parseSdtBlocks()

        // 2. Field codes (begin → separate), which covers Zotero, Mendeley
        //    Desktop legacy, EndNote, Word-native CITATION fields
        this.parseFieldCodes()

        // 3. Citavi: resolve collected ReferenceIds against the project JSON
        if (this.options.citaviJson) {
            this.parseCitaviJson(this.options.citaviJson)
        }

        // 4. Word-native / JabRef sources from customXml/item1.xml
        if (this.options.sourcesXml) {
            this.parseSourcesXml(this.options.sourcesXml)
        }

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
            this.processSdtBlock(m[1])
        }
    }

    private processSdtBlock(sdtBody: string): void {
        const tagMatch = sdtBody.match(/<w:tag\s+w:val="([^"]*)"/)
        if (!tagMatch) return
        const tagVal = tagMatch[1]

        // --- Mendeley Cite v3 ---
        if (tagVal.startsWith("MENDELEY_CITATION_v3_")) {
            const b64 = tagVal.slice("MENDELEY_CITATION_v3_".length)
            this.processCslCitationJson(this.decodeBase64(b64), "mendeley_v3")
            return
        }

        // --- Citavi ---
        if (tagVal.startsWith("CitaviPlaceholder#")) {
            // The base64 payload is inside w:instrText within the sdt content
            const instrMatch = sdtBody.match(
                /<w:instrText[^>]*>ADDIN CitaviPlaceholder([A-Za-z0-9+/=\s]+)<\/w:instrText>/
            )
            if (instrMatch) {
                this.processCitaviBase64(instrMatch[1].replace(/\s/g, ""))
            } else {
                this.warnings.push({
                    type: "citavi_missing_payload",
                    value: tagVal,
                })
            }
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
                this.dispatchFieldInstruction(instr, frame.fldData)
            } else if (
                stack.length > 0 &&
                !stack[stack.length - 1].pastSeparate
            ) {
                stack[stack.length - 1].instrParts.push(token.text)
            }
        }
    }

    private dispatchFieldInstruction(instr: string, fldData?: string): void {
        const upper = instr.toUpperCase()

        if (upper.startsWith("ADDIN ZOTERO_ITEM")) {
            this.processZoteroField(instr)
        } else if (
            upper.startsWith("ADDIN CSL_CITATION") ||
            // older Mendeley: "ADDIN Mendeley Citation{UUID} CSL_CITATION …"
            upper.match(/^ADDIN MENDELEY[_ ]CITATION/)
        ) {
            this.processMendeleyLegacyField(instr)
        } else if (
            upper.startsWith("ADDIN EN.CITE") &&
            !upper.startsWith("ADDIN EN.CITE.DATA")
        ) {
            this.processEndNoteField(instr, fldData)
        } else if (upper.startsWith("ADDIN EN.CITE.DATA")) {
            // Inner nested field — the payload is in fldData
            this.processEndNoteField("", fldData)
        } else if (upper.startsWith("ADDIN CITAVIPLACHOLDER")) {
            // Older Citavi without the w:sdt wrapper
            const b64 = instr.slice("ADDIN CitaviPlaceholder".length).trim()
            this.processCitaviBase64(b64)
        } else if (upper.startsWith("CITATION ")) {
            // Word-native / JabRef: resolved later from sourcesXml
            this.processWordNativeCitationKey(instr)
        }
        // ZOTERO_BIBL, EN.REFLIST, BIBLIOGRAPHY — bibliography rendering
        // fields that carry no source data we can import.
    }

    // -----------------------------------------------------------------------
    // Format handlers — each delegates to an existing parser
    // -----------------------------------------------------------------------

    // --- Zotero DOCX ---

    private processZoteroField(instr: string): void {
        // "ADDIN ZOTERO_ITEM CSL_CITATION {…json…} RND<randomId>"
        // Zotero appends a trailing random ID after the JSON object; use
        // extractJsonObject to take only the balanced {} portion.
        const jsonStart = instr.indexOf("{")
        if (jsonStart === -1) {
            this.warnings.push({ type: "zotero_missing_json" })
            return
        }
        const jsonStr = extractJsonObject(instr, jsonStart)
        if (jsonStr === null) {
            this.warnings.push({ type: "zotero_missing_json" })
            return
        }
        this.processCslCitationJson(jsonStr, "zotero")
    }

    // --- Mendeley Desktop legacy DOCX ---

    private processMendeleyLegacyField(instr: string): void {
        // "ADDIN CSL_CITATION {…json…}" — may also have a trailing random ID
        const jsonStart = instr.indexOf("{")
        if (jsonStart === -1) {
            this.warnings.push({ type: "mendeley_missing_json" })
            return
        }
        const jsonStr = extractJsonObject(instr, jsonStart)
        if (jsonStr === null) {
            this.warnings.push({ type: "mendeley_missing_json" })
            return
        }
        this.processCslCitationJson(jsonStr, "mendeley_legacy")
    }

    /**
     * Shared handler for any CSL-JSON citation payload (Zotero, Mendeley).
     *
     * The payload shape is:
     *   { citationItems: [{ itemData: CSLEntry, id: … }, …] }
     *
     * We extract the `itemData` objects, key them by their `id` field (falling
     * back to a positional index), and hand the resulting Record to CSLParser.
     */
    private processCslCitationJson(jsonStr: string, source: string): void {
        let citation: {
            citationItems?: Array<{ itemData?: CSLEntry; id?: unknown }>
        }
        try {
            citation = JSON.parse(jsonStr) as typeof citation
        } catch {
            this.warnings.push({
                type: `${source}_invalid_json`,
                value: jsonStr.slice(0, 80),
            })
            return
        }

        const items = citation.citationItems ?? []
        if (items.length === 0) return

        // Build a Record<string, CSLEntry> for CSLParser, skipping items whose
        // key we have already seen in a previous field.
        const cslRecord: Record<string, CSLEntry> = {}
        items.forEach((item, i) => {
            if (!item.itemData) return
            const key =
                item.itemData.id === undefined
                    ? `${source}_${i}`
                    : String(item.itemData.id)
            if (this.seenKeys.has(key)) return
            cslRecord[key] = item.itemData
        })

        if (Object.keys(cslRecord).length === 0) return

        const parser = new CSLParser(cslRecord)
        const bibDB = parser.parse()

        this.errors.push(...parser.errors)
        this.warnings.push(...parser.warnings)

        for (const entry of Object.values(bibDB)) {
            this.seenKeys.add(entry.entry_key)
            this.entries.push(entry)
        }
    }

    // --- EndNote DOCX ---

    private processEndNoteField(instr: string, fldData?: string): void {
        let xmlPayload = ""

        if (fldData && fldData.length > 0) {
            // fldData form: base64-encoded EndNote XML
            try {
                xmlPayload = this.decodeBase64(fldData)
            } catch {
                this.warnings.push({
                    type: "endnote_invalid_flddata",
                    value: fldData.slice(0, 40),
                })
                return
            }
        } else {
            // Inline form: XML is entity-escaped directly in instrText
            const idx = instr.toUpperCase().indexOf("ADDIN EN.CITE")
            if (idx === -1) return
            xmlPayload = this.unescapeXmlEntities(
                instr.slice(idx + "ADDIN EN.CITE".length).trim()
            )
        }

        if (xmlPayload.includes("<EndNote") || xmlPayload.includes("<record")) {
            this.parseAndDelegateEndNoteXml(xmlPayload)
        } else {
            this.warnings.push({
                type: "endnote_no_xml",
                value: xmlPayload.slice(0, 80),
            })
        }
    }

    /**
     * Parses the raw EndNote XML payload (the `<EndNote><Cite>…</Cite></EndNote>`
     * structure) into EndNoteRecord objects using the same regex approach used
     * by the existing import-endnote.mjs test helper, then delegates to
     * EndNoteParser.
     */
    private parseAndDelegateEndNoteXml(xml: string): void {
        const records: EndNoteRecord[] = []

        // Extract every <record>…</record> from within <Cite> blocks
        const citeRe = /<Cite>([\s\S]*?)<\/Cite>/g
        let citeMatch: RegExpExecArray | null
        while ((citeMatch = citeRe.exec(xml)) !== null) {
            const citeXml = citeMatch[1]
            const recordMatch = /<record>([\s\S]*?)<\/record>/.exec(citeXml)
            if (recordMatch) {
                const record = this.parseEndNoteRecordXml(recordMatch[0])
                const key = String(record["rec-number"] ?? "")
                if (key && !this.seenKeys.has(key)) {
                    records.push(record)
                    // Mark now; EndNoteParser will assign the real entry_key
                    this.seenKeys.add(key)
                }
            }
        }

        if (records.length === 0) return

        const parser = new EndNoteParser(records)
        const result = parser.parse()

        this.errors.push(...result.errors)
        this.warnings.push(...result.warnings)
        this.entries.push(...Object.values(result.entries))
    }

    /**
     * Converts a raw `<record>…</record>` XML string into an EndNoteRecord
     * plain object that EndNoteParser expects.
     *
     * The structure mirrors what the import-endnote.mjs `parseRecord` helper
     * produces: simple string values for scalar elements, and nested objects /
     * arrays for multi-valued elements.
     */
    private parseEndNoteRecordXml(recordXml: string): EndNoteRecord {
        const record: EndNoteRecord = {}

        // ref-type (may carry a `name` attribute and a numeric text node)
        const refTypeMatch = recordXml.match(
            /<ref-type(?:\s+name="([^"]*)")?[^>]*>(\d+)<\/ref-type>/
        )
        if (refTypeMatch) {
            record["ref-type"] = {
                name: refTypeMatch[1] ?? "",
                "#text": refTypeMatch[2],
            }
        }

        // rec-number
        const recNumMatch = recordXml.match(
            /<rec-number[^>]*>([\s\S]*?)<\/rec-number>/
        )
        if (recNumMatch) {
            record["rec-number"] = recNumMatch[1].trim()
        }

        // titles
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
                if (m) titles[tag] = { "#text": this.stripStyleTags(m[1]) }
            }
            if (Object.keys(titles).length > 0) record.titles = titles
        }

        // contributors
        const contribMatch = recordXml.match(
            /<contributors>([\s\S]*?)<\/contributors>/
        )
        if (contribMatch) {
            record.contributors = this.parseContributorsXml(contribMatch[1])
        }

        // periodical
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
                if (m) periodical[tag] = { "#text": this.stripStyleTags(m[1]) }
            }
            if (Object.keys(periodical).length > 0)
                record.periodical = periodical
        }

        // scalar text fields
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
                    "#text": this.stripStyleTags(m[1]),
                }
            }
        }

        // pub-location maps to publisher-place
        const pubLocMatch = recordXml.match(
            /<pub-location[^>]*>([\s\S]*?)<\/pub-location>/
        )
        if (pubLocMatch) {
            record["pub-location"] = {
                "#text": this.stripStyleTags(pubLocMatch[1]),
            }
        }

        // dates
        const datesMatch = recordXml.match(/<dates>([\s\S]*?)<\/dates>/)
        if (datesMatch) {
            record.dates = this.parseDatesXml(datesMatch[1])
        }

        // keywords
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
                        "#text": this.stripStyleTags(kw[1]),
                    })),
                }
            }
        }

        // urls
        const urlsMatch = recordXml.match(/<urls>([\s\S]*?)<\/urls>/)
        if (urlsMatch) {
            record.urls = this.parseUrlsXml(urlsMatch[1])
        }

        return record
    }

    private parseContributorsXml(
        xml: string
    ): Record<string, { author: Array<{ "#text": string }> }> {
        const result: Record<string, { author: Array<{ "#text": string }> }> =
            {}

        for (const group of [
            "authors",
            "secondary-authors",
            "tertiary-authors",
            "subsidiary-authors",
            "translated-authors",
        ] as const) {
            const m = xml.match(
                new RegExp(`<${group}>([\\s\\S]*?)<\\/${group}>`)
            )
            if (!m) continue
            const authorMatches = [
                ...m[1].matchAll(/<author[^>]*>([\s\S]*?)<\/author>/g),
            ]
            if (authorMatches.length > 0) {
                result[group] = {
                    author: authorMatches.map((a) => ({
                        "#text": this.stripStyleTags(a[1]),
                    })),
                }
            }
        }

        return result
    }

    private parseDatesXml(xml: string): Record<string, unknown> {
        const dates: Record<string, unknown> = {}

        const yearMatch = xml.match(/<year[^>]*>([\s\S]*?)<\/year>/)
        if (yearMatch) {
            dates.year = { "#text": this.stripStyleTags(yearMatch[1]) }
        }

        const pubDatesMatch = xml.match(/<pub-dates>([\s\S]*?)<\/pub-dates>/)
        if (pubDatesMatch) {
            const dateMatches = [
                ...pubDatesMatch[1].matchAll(/<date[^>]*>([\s\S]*?)<\/date>/g),
            ]
            if (dateMatches.length > 0) {
                dates["pub-dates"] = {
                    date: dateMatches.map((d) => ({
                        "#text": this.stripStyleTags(d[1]),
                    })),
                }
            }
        }

        return dates
    }

    private parseUrlsXml(xml: string): Record<string, unknown> {
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
                        "#text": this.stripStyleTags(u[1]),
                    })),
                }
            }
        }

        return urls
    }

    /** Strips `<style>` and other inline XML markup to yield plain text. */
    private stripStyleTags(text: string): string {
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

    // --- Citavi DOCX ---

    /**
     * Decodes the base64 CitaviPlaceholder JSON.
     *
     * Two cases are handled:
     *
     *   A. The payload contains embedded `Reference` objects inside `Entries`
     *      (occurs in some Citavi versions / export modes).  In this case the
     *      payload is handed directly to `CitaviParser` for immediate
     *      conversion.
     *
     *   B. The payload contains only `ReferenceId` UUIDs with no embedded
     *      reference data (another case of Citavi DOCX files).  In
     *      this case the UUIDs are stored in `citaviReferenceIds` so that
     *      `parseCitaviJson()` can resolve them later against the Citavi
     *      project JSON supplied via `options.citaviJson`.
     */
    private processCitaviBase64(b64: string): void {
        let payload: CitaviInput
        try {
            const decoded = this.decodeBase64(b64)
            payload = JSON.parse(decoded) as CitaviInput
        } catch {
            this.warnings.push({
                type: "citavi_invalid_payload",
                value: b64.slice(0, 40),
            })
            return
        }

        // Check whether the Entries carry embedded Reference objects.
        const hasEmbeddedReferences =
            !Array.isArray(payload) &&
            Array.isArray((payload as { Entries?: unknown[] }).Entries) &&
            (
                payload as { Entries: Array<{ Reference?: unknown }> }
            ).Entries!.some(
                (e) => e.Reference !== null && e.Reference !== undefined
            )

        if (hasEmbeddedReferences) {
            // Case A — full reference data is embedded; convert immediately.
            const parser = new CitaviParser(payload)
            const bibDB = parser.parse()

            this.errors.push(...parser.errors)
            this.warnings.push(...parser.warnings)

            for (const entry of Object.values(bibDB)) {
                if (!this.seenKeys.has(entry.entry_key)) {
                    this.seenKeys.add(entry.entry_key)
                    this.entries.push(entry)
                }
            }
        } else if (!Array.isArray(payload)) {
            // Case B — only ReferenceIds present; collect them for later
            // resolution via parseCitaviJson().
            const entries = (
                payload as { Entries?: Array<{ ReferenceId?: string }> }
            ).Entries
            if (Array.isArray(entries)) {
                for (const e of entries) {
                    if (e.ReferenceId) {
                        this.citaviReferenceIds.add(e.ReferenceId)
                    }
                }
            }
        }
    }

    /**
     * Resolves Citavi `ReferenceId` UUIDs (collected during `parseSdtBlocks`)
     * against the full Citavi project JSON supplied in `options.citaviJson`.
     *
     * The project JSON may be in any of the three shapes that `CitaviInput`
     * supports:
     *   - `{ References: CitaviReference[] }`  (project-export format)
     *   - `CitaviReference[]`                  (plain array)
     *   - `{ Entries: [{ Reference: … }] }`    (WordPlaceholder with refs)
     *
     * Only references whose `Id` matches a collected UUID are converted,
     * unless no UUIDs were collected (i.e. no CitaviPlaceholder fields were
     * found in the document), in which case the entire project JSON is
     * imported.
     */
    private parseCitaviJson(citaviJson: CitaviInput): void {
        // Flatten all references from the project JSON.
        let allRefs: CitaviReference[]
        if (Array.isArray(citaviJson)) {
            allRefs = citaviJson as CitaviReference[]
        } else {
            const obj = citaviJson as {
                References?: CitaviReference[]
                Entries?: Array<{ Reference?: CitaviReference }>
            }
            if (obj.References && Array.isArray(obj.References)) {
                allRefs = obj.References
            } else if (obj.Entries && Array.isArray(obj.Entries)) {
                allRefs = obj.Entries.flatMap((e) => {
                    return e.Reference ? [e.Reference] : []
                })
            } else {
                allRefs = []
            }
        }

        // Filter to only the cited references (or take all if no IDs were
        // collected, which happens when the document had no CitaviPlaceholder
        // fields but the caller still supplied a project JSON).
        const filtered: CitaviReference[] =
            this.citaviReferenceIds.size > 0
                ? allRefs.filter((r) =>
                      Boolean(r.Id && this.citaviReferenceIds.has(r.Id))
                  )
                : allRefs

        if (filtered.length === 0) return

        const parser = new CitaviParser(filtered)
        const bibDB = parser.parse()

        this.errors.push(...parser.errors)
        this.warnings.push(...parser.warnings)

        for (const entry of Object.values(bibDB)) {
            if (!this.seenKeys.has(entry.entry_key)) {
                this.seenKeys.add(entry.entry_key)
                this.entries.push(entry)
            }
        }
    }

    // --- Word native / JabRef CITATION key ---

    /**
     * Records the cited key so that `parseSourcesXml` can later look up
     * matching `<b:Source>` entries.  No conversion happens here.
     */
    private processWordNativeCitationKey(instr: string): void {
        const m = /^CITATION\s+(\S+)/i.exec(instr.trim())
        if (m) {
            // Store the key; actual source data comes from sourcesXml
            this.seenKeys.add(m[1])
        }
    }

    // --- Word native / JabRef sources XML ---

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

    // -----------------------------------------------------------------------
    // Utilities
    // -----------------------------------------------------------------------

    private unescapeXmlEntities(text: string): string {
        return text
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
    }

    private decodeBase64(b64: string): string {
        // Use atob + TextDecoder for browser compatibility.
        // atob() decodes base64 to a binary string (one char per byte);
        // TextDecoder then re-interprets those bytes as UTF-8, which is
        // required for EndNote XML that contains non-ASCII characters.
        // We also strip any trailing null bytes that Word appends (\x00).
        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        // Strip trailing null terminator(s) that Word appends to the payload
        let end = bytes.length
        while (end > 0 && bytes[end - 1] === 0) {
            end--
        }
        return new TextDecoder("utf-8").decode(bytes.subarray(0, end))
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
