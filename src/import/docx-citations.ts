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

// ---------------------------------------------------------------------------
// Citation accumulator — shared mutable state for multi-element processing
// ---------------------------------------------------------------------------

/**
 * Mutable accumulator passed to static extraction methods when processing
 * multiple document elements in a single pass.  All four fields are mutated
 * in place as entries are discovered and keys are deduplicated.
 */
export interface CitationAccumulator {
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]
    seenKeys: Set<string>
}

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
}

// ---------------------------------------------------------------------------
// Citation item metadata
// ---------------------------------------------------------------------------

/**
 * Per-entry citation metadata, keyed by `entry_key`.
 *
 * This captures the cite-specific decorations that surround a bibliographic
 * reference inside a single citation: page locators, textual prefixes /
 * suffixes, and author-rendering flags.  It is returned alongside the
 * `entries` BibDB when `retrieveMetadata` is `true` on a static method call.
 *
 * Field availability by format:
 *
 * | Field            | Zotero | Mendeley | EndNote              | Citavi                              |
 * |------------------|--------|----------|----------------------|-------------------------------------|
 * | locator          | ✅     | ✅       | ✅ (Pages)           | ✅ (PageRange.OriginalString)       |
 * | label            | ✅     | ✅       | –                    | ✅ (derived from PageRange.NumberingType; mapping inferred from manual) |
 * | prefix           | ✅     | ✅       | ✅                   | ✅                                  |
 * | suffix           | ✅     | ✅       | ✅                   | ✅ (confirmed by manual; not yet seen in real files) |
 * | suppressAuthor   | ✅     | ✅       | –                    | –                                   |
 * | authorOnly       | ✅     | ✅       | –                    | –                                   |
 * | authorYear       | –      | –        | ✅ (AuthorYear attr) | –                                   |
 * | bibliographyEntry| –      | –        | –                    | ✅ (confirmed by manual; not yet seen in real files) |
 * | ruleSet          | –      | –        | –                    | ✅ (confirmed by manual; serialised form unknown) |
 * | formatOption     | –      | –        | –                    | ✅ (confirmed by manual; serialised form unknown) |
 * | insertAs         | –      | –        | –                    | ✅ (confirmed by manual; serialised form unknown) |
 */
export interface CitationItemMetadata {
    /** The `entry_key` of the corresponding entry in the returned `entries` BibDB. */
    entry_key: string
    /**
     * Pinpoint location within the cited work (page number, chapter, etc.).
     * For CSL formats this is the raw `locator` string; for EndNote it is the
     * `<Pages>` element text; for Citavi it is `PageRange.OriginalString`.
     */
    locator?: string
    /**
     * CSL locator type label (e.g. `"page"`, `"chapter"`, `"section"`).
     * For CSL-based formats (Zotero, Mendeley) this is the raw `label` string
     * from the citation item.  For Citavi it is derived from `PageRange.NumberingType`:
     * `0` (Pages) → `"page"`, `1` (Columns) → `"column"`,
     * `2` (Section numbers) → `"section"`, `3` (Margin numbers) → `"note"`,
     * `4` (Other / free-form) → `"custom"`.
     * The integer-to-label mapping for Citavi is inferred from the Citavi manual
     * and has not been confirmed against observed data beyond value `0`.
     */
    label?: string
    /** Text to prepend to the formatted citation (e.g. `"see "`, `"cf. "`). */
    prefix?: string
    /** Text to append to the formatted citation (e.g. `", etc."`). */
    suffix?: string
    /**
     * When `true`, author names are suppressed in the formatted output,
     * leaving only the year (and locator) in parentheses: `(2020, p. 45)`.
     * Only populated for CSL-based formats (Zotero, Mendeley).
     */
    suppressAuthor?: boolean
    /**
     * When `true`, only the author name is rendered with nothing else:
     * `William T. Williams`.
     * Only populated for CSL-based formats (Zotero, Mendeley).
     */
    authorOnly?: boolean
    /**
     * When `true`, the author name is rendered outside the parentheses while
     * the year (and locator) remain inside: `William T. Williams (2020, p. 45)`.
     * This reflects the `AuthorYear="1"` attribute on EndNote's `<Cite>` element.
     * Only populated for EndNote citations.
     */
    authorYear?: boolean
    /**
     * Controls whether and where this reference appears in the bibliography.
     * Only populated for Citavi citations (from `Entries[].BibliographyEntry`).
     *
     * Known values:
     *   `"/bibonly"` – reference appears only in the bibliography, not in-text
     *   `"/nobib"`   – reference appears only in-text, not in the bibliography
     *
     * When absent the reference appears in both (default behaviour).
     * Confirmed by the Citavi manual; not yet observed in real files.
     */
    bibliographyEntry?: string
    /**
     * Overrides which citation-style rule set (formatting variant) is used for
     * this entry.  Only populated for Citavi citations (from `Entries[].RuleSet`).
     * Serialised form not yet observed in real files.
     */
    ruleSet?: unknown
    /**
     * Selects among the citation style's optional formatting variants for this
     * entry (values 1, 2, or 3).  Only populated for Citavi citations (from
     * `Entries[].FormatOption`).  Serialised form not yet observed in real files.
     */
    formatOption?: unknown
    /**
     * Overrides where the citation is physically inserted (in-text vs. footnote).
     * Only populated for Citavi citations (from `Entries[].InsertAs`).
     * Serialised form not yet observed in real files.
     */
    insertAs?: unknown
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
    /**
     * Per-entry citation metadata (locators, prefixes, suffixes, flags).
     * Only populated when `retrieveMetadata` is `true` on the static method call.
     */
    metadata?: CitationItemMetadata[]
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
        retrieveMetadata = false,
        acc: CitationAccumulator = {
            entries: [],
            errors: [],
            warnings: [],
            seenKeys: new Set<string>(),
        }
    ): CitationResult {
        const { entries, errors, warnings } = acc
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
        const metadata: CitationItemMetadata[] = []

        if (format === "mendeley_v3") {
            const b64 = tagVal.slice("MENDELEY_CITATION_v3_".length)
            DocxCitationsParser.extractCslJsonData(
                DocxCitationsParser.decodeBase64Static(b64),
                "mendeley_v3",
                acc,
                retrieveMetadata ? metadata : undefined
            )
        } else if (format === "citavi") {
            const instrMatch = sdtXml.match(
                /<w:instrText[^>]*>ADDIN CitaviPlaceholder([A-Za-z0-9+/=\s]+)<\/w:instrText>/
            )
            if (instrMatch) {
                DocxCitationsParser.extractCitaviData(
                    instrMatch[1].replace(/\s/g, ""),
                    acc,
                    retrieveMetadata ? metadata : undefined
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

        const result: CitationResult = {
            isCitation: true,
            format,
            entries: bibDB,
            errors,
            warnings,
        }
        if (retrieveMetadata) result.metadata = metadata
        return result
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
        retrieveMetadata = false,
        extractWordNative = true,
        fldData?: string,
        options: DocxCitationsParserOptions = {},
        acc: CitationAccumulator = {
            entries: [],
            errors: [],
            warnings: [],
            seenKeys: new Set<string>(),
        }
    ): CitationResult {
        const { entries, errors, warnings, seenKeys } = acc
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
        const metadata: CitationItemMetadata[] = []

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
                        acc,
                        retrieveMetadata ? metadata : undefined
                    )
                }
            }
        } else if (format === "endnote") {
            DocxCitationsParser.extractEndNoteData(
                instrText,
                fldData,
                acc,
                retrieveMetadata ? metadata : undefined
            )
        } else if (format === "citavi") {
            const b64Match = instrText.match(
                /ADDIN CitaviPlaceholder([A-Za-z0-9+/=\s]+)/i
            )
            if (b64Match) {
                DocxCitationsParser.extractCitaviData(
                    b64Match[1].replace(/\s/g, ""),
                    acc,
                    retrieveMetadata ? metadata : undefined
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
                    acc
                )
            }
        }

        const bibDB: Record<number, EntryObject> = {}
        entries.forEach((entry, i) => {
            bibDB[i + 1] = entry
        })

        const result: CitationResult = {
            isCitation: true,
            format,
            entries: bibDB,
            errors,
            warnings,
        }
        if (retrieveMetadata) result.metadata = metadata
        return result
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
        acc: CitationAccumulator,
        metadata?: CitationItemMetadata[]
    ): void {
        const { entries, errors, warnings, seenKeys } = acc
        let citation: {
            citationItems?: Array<{
                itemData?: CSLEntry
                id?: unknown
                locator?: unknown
                label?: unknown
                prefix?: unknown
                suffix?: unknown
                "suppress-author"?: unknown
                "author-only"?: unknown
            }>
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
        // Track the resolved key for each item index so we can attach metadata later
        const itemKeys: Array<string | undefined> = []
        items.forEach((item, i) => {
            if (!item.itemData) {
                itemKeys.push(undefined)
                return
            }
            const key =
                item.itemData.id === undefined
                    ? `${source}_${i}`
                    : String(item.itemData.id)
            if (seenKeys.has(key)) {
                itemKeys.push(key)
                return
            }
            cslRecord[key] = item.itemData
            itemKeys.push(key)
        })

        // Map rawKey (CSL id string) → normalised entry_key produced by CSLParser
        const rawKeyToEntryKey = new Map<string, string>()

        if (Object.keys(cslRecord).length > 0) {
            const parser = new CSLParser(cslRecord)
            const bibDB = parser.parse()

            errors.push(...parser.errors)
            warnings.push(...parser.warnings)

            for (const entry of Object.values(bibDB)) {
                seenKeys.add(entry.entry_key)
                entries.push(entry)
            }
            // Build rawKey → entry_key from cslRecord order matching bibDB order
            const cslIds = Object.keys(cslRecord)
            const bibEntries = Object.values(bibDB)
            cslIds.forEach((cslId, i) => {
                if (bibEntries[i])
                    rawKeyToEntryKey.set(cslId, bibEntries[i].entry_key)
            })
        }

        if (metadata) {
            items.forEach((item, i) => {
                const rawKey = itemKeys[i]
                if (!rawKey) return
                // Resolve normalised entry_key; fall back to rawKey if not found
                const entry_key = rawKeyToEntryKey.get(rawKey) ?? rawKey
                const meta: CitationItemMetadata = { entry_key }
                if (
                    item.locator !== undefined &&
                    item.locator !== null &&
                    item.locator !== ""
                )
                    meta.locator = String(item.locator)
                if (
                    item.label !== undefined &&
                    item.label !== null &&
                    item.label !== ""
                )
                    meta.label = String(item.label)
                if (
                    item.prefix !== undefined &&
                    item.prefix !== null &&
                    item.prefix !== ""
                )
                    meta.prefix = String(item.prefix)
                if (
                    item.suffix !== undefined &&
                    item.suffix !== null &&
                    item.suffix !== ""
                )
                    meta.suffix = String(item.suffix)
                if (item["suppress-author"]) meta.suppressAuthor = true
                if (item["author-only"]) meta.authorOnly = true
                metadata.push(meta)
            })
        }
    }

    /**
     * Extract EndNote citation data.
     */
    private static extractEndNoteData(
        instrText: string,
        fldData: string | undefined,
        acc: CitationAccumulator,
        metadata?: CitationItemMetadata[]
    ): void {
        const { warnings } = acc
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
            DocxCitationsParser.parseEndNoteXml(xmlPayload, acc, metadata)
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
        acc: CitationAccumulator,
        metadata?: CitationItemMetadata[]
    ): void {
        const { entries, errors, warnings, seenKeys } = acc
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
        const typedPayload = payload as {
            Entries?: Array<import("./citavi").CitaviEntry>
        }
        const hasEmbeddedReferences =
            !Array.isArray(payload) &&
            Array.isArray(typedPayload.Entries) &&
            typedPayload.Entries!.some(
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

        if (metadata && typedPayload.Entries) {
            // After insertion, re-scan entries to map ReferenceId → entry_key
            // CitaviParser uses ReferenceId (UUID) as entry_key when available
            for (const citaviEntry of typedPayload.Entries) {
                const refId = citaviEntry.ReferenceId
                if (!refId) continue
                // Find the entry whose key matches (CitaviParser normalises UUIDs)
                const entry = entries.find(
                    (e) =>
                        e.entry_key === refId ||
                        e.entry_key.startsWith(refId.slice(0, 8))
                )
                const entry_key = entry?.entry_key ?? refId
                const meta: CitationItemMetadata = { entry_key }

                if (citaviEntry.Prefix) meta.prefix = citaviEntry.Prefix
                if (citaviEntry.Suffix) meta.suffix = citaviEntry.Suffix

                const pageRange = citaviEntry.PageRange
                const pageStr = pageRange?.OriginalString
                if (pageStr !== undefined && pageStr !== null && pageStr !== "")
                    meta.locator = pageStr

                // Derive a CSL-style locator label from NumberingType.
                // The integer-to-type mapping is inferred from the Citavi manual's
                // prose (types listed in order) and has NOT been confirmed against
                // observed data beyond value 0 (Pages).
                if (
                    pageRange &&
                    !citaviEntry.UseNumberingTypeOfParentDocument
                ) {
                    const nt = pageRange.NumberingType
                    if (nt !== undefined && nt !== null && nt !== 0) {
                        const numberingTypeLabels: Record<number, string> = {
                            1: "column", // Columns (Col.) — inferred
                            2: "section", // Section numbers (Nr./§) — inferred
                            3: "note", // Margin numbers — inferred
                            4: "custom", // Other / free-form — inferred
                        }
                        const label = numberingTypeLabels[nt]
                        if (label !== undefined) meta.label = label
                    }
                }

                if (citaviEntry.BibliographyEntry)
                    meta.bibliographyEntry = citaviEntry.BibliographyEntry
                if (
                    citaviEntry.RuleSet !== undefined &&
                    citaviEntry.RuleSet !== null
                )
                    meta.ruleSet = citaviEntry.RuleSet
                if (
                    citaviEntry.FormatOption !== undefined &&
                    citaviEntry.FormatOption !== null
                )
                    meta.formatOption = citaviEntry.FormatOption
                if (
                    citaviEntry.InsertAs !== undefined &&
                    citaviEntry.InsertAs !== null
                )
                    meta.insertAs = citaviEntry.InsertAs

                metadata.push(meta)
            }
        }
    }

    /**
     * Extract Word native citation data.
     */
    private static extractWordNativeData(
        instrText: string,
        sourcesXml: string,
        acc: CitationAccumulator
    ): void {
        const { entries, errors, warnings, seenKeys } = acc
        const m = /^CITATION\s+(\S+)/i.exec(instrText.trim())
        if (m) {
            const citationKey = m[1]
            seenKeys.add(citationKey)

            // citedKeys = the key we just recorded (the allowlist for this call).
            // importedKeys = keys already pushed into `entries` so we don't
            // duplicate them across multiple CITATION fields in the same document.
            const citedKeys = new Set<string>([citationKey])
            const importedKeys = new Set<string>(
                entries.map((e) => e.entry_key)
            )
            const nativeParser = new DocxNativeParser(sourcesXml)
            const result = nativeParser.parse(citedKeys, importedKeys)

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
        acc: CitationAccumulator,
        metadata?: CitationItemMetadata[]
    ): void {
        const { entries, errors, warnings, seenKeys } = acc
        const records: EndNoteRecord[] = []

        // When collecting metadata, capture per-Cite fields before deduplication
        interface CiteFields {
            recNum: string
            prefix?: string
            suffix?: string
            pages?: string
            authorYear?: boolean
        }
        const citeFieldsList: CiteFields[] = []

        // Match the full opening tag (which may carry AuthorYear="1") plus body
        const citeRe = /<Cite(\s[^>]*)?>([\s\S]*?)<\/Cite>/g
        let citeMatch: RegExpExecArray | null
        while ((citeMatch = citeRe.exec(xml)) !== null) {
            const citeAttrs = citeMatch[1] ?? ""
            const citeXml = citeMatch[2]
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

                if (metadata && key) {
                    // AuthorYear="1" on the opening <Cite> tag means show author outside parens
                    const authorYear = /AuthorYear\s*=\s*["']?1["']?/i.test(
                        citeAttrs
                    )

                    // Only search for citation-level fields (Prefix, Suffix,
                    // Pages) in the portion of <Cite> that comes *before* the
                    // embedded <record> element.  The <record> block contains
                    // the reference's own <pages> field, and matching against
                    // the full citeXml would confuse the reference page range
                    // with a per-citation locator.
                    const recordStart = citeXml.indexOf("<record>")
                    const citeHeader =
                        recordStart === -1
                            ? citeXml
                            : citeXml.slice(0, recordStart)

                    const prefixMatch =
                        /<Prefix[^>]*>([\s\S]*?)<\/Prefix>/i.exec(citeHeader)
                    const suffixMatch =
                        /<Suffix[^>]*>([\s\S]*?)<\/Suffix>/i.exec(citeHeader)
                    const pagesMatch = /<Pages[^>]*>([\s\S]*?)<\/Pages>/i.exec(
                        citeHeader
                    )

                    citeFieldsList.push({
                        recNum: key,
                        prefix: prefixMatch
                            ? DocxCitationsParser.stripStyleTagsStatic(
                                  prefixMatch[1]
                              )
                            : undefined,
                        suffix: suffixMatch
                            ? DocxCitationsParser.stripStyleTagsStatic(
                                  suffixMatch[1]
                              )
                            : undefined,
                        pages: pagesMatch
                            ? DocxCitationsParser.stripStyleTagsStatic(
                                  pagesMatch[1]
                              )
                            : undefined,
                        authorYear,
                    })
                }
            }
        }

        if (records.length === 0) return

        const parser = new EndNoteParser(records)
        const result = parser.parse()

        errors.push(...result.errors)
        warnings.push(...result.warnings)
        entries.push(...Object.values(result.entries))

        if (metadata) {
            // EndNoteParser uses the rec-number as the entry_key prefix; find by matching
            for (const cite of citeFieldsList) {
                const entry = entries.find(
                    (e) =>
                        e.entry_key === cite.recNum ||
                        e.entry_key === `EN${cite.recNum}` ||
                        e.entry_key.endsWith(cite.recNum)
                )
                const entry_key = entry?.entry_key ?? cite.recNum
                const meta: CitationItemMetadata = { entry_key }
                if (cite.prefix) meta.prefix = cite.prefix
                if (cite.suffix) meta.suffix = cite.suffix
                if (cite.pages) meta.locator = cite.pages
                if (cite.authorYear) meta.authorYear = true
                metadata.push(meta)
            }
        }
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
            DocxCitationsParser.sdtCitation(m[1], true, false, {
                entries: this.entries,
                errors: this.errors,
                warnings: this.warnings,
                seenKeys: this.seenKeys,
            })
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
                    false, // Don't retrieve metadata here;
                    false, // Don't extract Word-native here; defer to parseSourcesXml
                    frame.fldData,
                    this.options,
                    {
                        entries: this.entries,
                        errors: this.errors,
                        warnings: this.warnings,
                        seenKeys: this.seenKeys,
                    }
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
        // this.seenKeys contains every citation key recorded from CITATION
        // field instructions — use it as the cited-keys allowlist so that only
        // sources actually referenced in the document are imported.
        // A fresh importedKeys set is used for deduplication within this call;
        // at this point this.entries is still empty for the Word-native path so
        // there is nothing to pre-populate it with.
        const importedKeys = new Set<string>(
            this.entries.map((e) => e.entry_key)
        )
        const nativeParser = new DocxNativeParser(xml)
        const result = nativeParser.parse(this.seenKeys, importedKeys)

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
