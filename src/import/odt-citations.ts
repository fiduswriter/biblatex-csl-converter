/**
 * ODT Citations importer
 *
 * Extracts bibliographic citations from the XML of an ODT file's
 * content.xml (or any XML fragment containing the same markup).
 *
 * Supported citation manager formats and how each is handled:
 *
 *   - LibreOffice native  `<text:bibliography-mark>` elements — all
 *                         bibliographic data is stored as XML attributes.
 *                         Delegated to OdtNativeParser in odt-native.ts.
 *
 *   - Zotero              Reference mark name: `ZOTERO_ITEM CSL_CITATION
 *                         {json}`.  The JSON payload's `citationItems`
 *                         array is reshaped into a Record<string, CSLEntry>
 *                         and fed to CSLParser.
 *
 *   - Mendeley Desktop    Reference mark name: `CSL_CITATION {json}`.  Same
 *     (legacy)            CSL-JSON shape as Zotero; handled identically.
 *
 *   - JabRef              Reference mark name: `JABREF_{key} CID_{n} {id}`.
 *                         JabRef embeds fully rendered citation text inside
 *                         the mark, not raw bibliographic data.  The citation
 *                         key is extracted from the name and a stub `misc`
 *                         entry is emitted so callers know which keys are
 *                         cited.
 *
 *   - EndNote             ODT only: plain-text placeholder `{Author, Year
 *                         #RecNum}`.  No live reference marks are created.
 *                         The document body is scanned for these patterns and
 *                         a stub entry is created for each unique record
 *                         number.
 *
 * Usage:
 *   const parser = new OdtCitationsParser(contentXml)
 *   const result  = parser.parse()
 *   // result.entries  → BibDB  (Record<number, EntryObject>)
 *   // result.errors   → ErrorObject[]
 *   // result.warnings → ErrorObject[]
 */

import { EntryObject } from "../const"
import { CSLParser, CSLEntry } from "./csl"
import { OdtNativeParser } from "./odt-native"
import { extractJsonObject } from "./tools"

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

export interface OdtCitationsParseResult {
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
    /**
     * Persistent map from raw CSL `id` strings to the normalised `entry_key`
     * values assigned by `CSLParser`.  Accumulated across all citation elements
     * processed with the same accumulator so that duplicate items (already in
     * `seenKeys`) can still have their metadata resolved to the correct key.
     */
    cslRawIdToEntryKey: Map<string, string>
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
 * | Field          | Zotero | Mendeley | EndNote (ODT placeholder) |
 * |----------------|--------|----------|---------------------------|
 * | locator        | ✅     | ✅       | –                         |
 * | label          | ✅     | ✅       | –                         |
 * | prefix         | ✅     | ✅       | –                         |
 * | suffix         | ✅     | ✅       | –                         |
 * | suppressAuthor | ✅     | ✅       | –                         |
 * | authorOnly     | ✅     | ✅       | –                         |
 * | authorYear     | –      | –        | –                         |
 */
export interface CitationItemMetadata {
    /** The `entry_key` of the corresponding entry in the returned `entries` BibDB. */
    entry_key: string
    /**
     * Pinpoint location within the cited work (page number, chapter, etc.).
     * For CSL formats this is the raw `locator` string.
     */
    locator?: string
    /**
     * CSL locator type label (e.g. `"page"`, `"chapter"`, `"section"`).
     * Only populated for CSL-based formats (Zotero, Mendeley).
     */
    label?: string
    /** Text to prepend to the formatted citation (e.g. `"see "`, `"cf. "`). */
    prefix?: string
    /** Text to append to the formatted citation. */
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
     * Not used by ODT formats; included for interface parity with the DOCX parser.
     */
    authorYear?: boolean
}

// ---------------------------------------------------------------------------
// Static utility result types
// ---------------------------------------------------------------------------

export interface CitationResult {
    isCitation: boolean
    format?: string // e.g., "zotero", "mendeley_legacy", "jabref", "libreoffice_native", "endnote"
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
// Parser class
// ---------------------------------------------------------------------------

export class OdtCitationsParser {
    private contentXml: string
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]
    /** Prevents inserting the same source twice across different mark types. */
    private seenKeys: Set<string>
    /** Persistent raw CSL id → normalised entry_key map for the instance parse. */
    private cslRawIdToEntryKey: Map<string, string>

    constructor(contentXml: string) {
        this.contentXml = contentXml
        this.entries = []
        this.errors = []
        this.warnings = []
        this.seenKeys = new Set()
        this.cslRawIdToEntryKey = new Map()
    }

    // -----------------------------------------------------------------------
    // Static utility methods for reusable citation detection and extraction
    // -----------------------------------------------------------------------

    /**
     * Check or extract citation data from a reference mark name.
     *
     * @param markName - The text:name attribute value from a reference-mark-start
     * @param retrieve - If true, extract and return full citation data; if false, only check presence
     * @returns CitationResult with format and optionally entries/errors/warnings
     */
    static referenceMarkCitation(
        markName: string,
        retrieve = true,
        retrieveMetadata = false,
        acc: CitationAccumulator = {
            entries: [],
            errors: [],
            warnings: [],
            seenKeys: new Set<string>(),
            cslRawIdToEntryKey: new Map<string, string>(),
        }
    ): CitationResult {
        const { entries, errors, warnings } = acc
        // Detect format
        let format: string | undefined

        if (markName.startsWith("ZOTERO_ITEM CSL_CITATION")) {
            format = "zotero"
        } else if (markName.startsWith("CSL_CITATION")) {
            format = "mendeley_legacy"
        } else if (markName.startsWith("JABREF_")) {
            format = "jabref"
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
            OdtCitationsParser.extractCslMarkData(
                markName,
                format,
                acc,
                retrieveMetadata ? metadata : undefined
            )
        } else if (format === "jabref") {
            OdtCitationsParser.extractJabRefMarkData(markName, acc)
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
     * Check or extract bibliography rendering region from a reference mark name.
     *
     * @param markName - The text:name attribute value from a reference-mark-start
     * @param retrieve - If true, extract data (currently returns empty as bibliographies have no importable data)
     * @returns BibliographyResult indicating whether it's a bibliography
     */
    static referenceMarkBibliography(markName: string): BibliographyResult {
        let format: string | undefined

        if (markName.startsWith("CSL_BIBLIOGRAPHY")) {
            format = "mendeley_legacy"
        }

        if (!format) {
            return { isBibliography: false }
        }

        // Bibliography marks are rendering regions with no importable source data
        const result: BibliographyResult = {
            isBibliography: true,
            format,
        }

        return result
    }

    /**
     * Check or extract bibliography rendering region from a text:section element.
     *
     * @param sectionName - The text:name attribute value from a text:section element
     * @returns BibliographyResult indicating whether it's a bibliography and the format
     */
    static sectionBibliography(sectionName: string): BibliographyResult {
        let format: string | undefined

        // Zotero creates bibliography sections with text:name starting with "ZOTERO_BIBL"
        if (sectionName.startsWith("ZOTERO_BIBL")) {
            format = "zotero"
            // JabRef creates bibliography sections with text:name="JR_bib" or "JR_BIB"
        } else if (sectionName.toUpperCase() === "JR_BIB") {
            format = "jabref"
        }

        if (!format) {
            return { isBibliography: false }
        }

        // Section bibliographies are rendering regions with no importable source data
        const result: BibliographyResult = {
            isBibliography: true,
            format,
        }

        return result
    }

    /**
     * Check or extract citation data from a LibreOffice native bibliography-mark element.
     *
     * @param bibMarkXml - XML string of a <text:bibliography-mark> element
     * @param retrieve - If true, extract and return full citation data
     * @returns CitationResult with format and optionally entries/errors/warnings
     */
    static bibliographyMarkCitation(
        bibMarkXml: string,
        retrieve = true
    ): CitationResult {
        if (!bibMarkXml.includes("<text:bibliography-mark")) {
            return { isCitation: false }
        }

        const format = "libreoffice_native"

        if (!retrieve) {
            return { isCitation: true, format }
        }

        // Extract citation data by delegating to OdtNativeParser
        const errors: ErrorObject[] = []
        const warnings: ErrorObject[] = []

        try {
            const nativeParser = new OdtNativeParser(bibMarkXml)
            const { entries: entryList, warnings: parseWarnings } =
                nativeParser.parse()

            warnings.push(...parseWarnings)

            const bibDB: Record<number, EntryObject> = {}
            entryList.forEach((entry, i) => {
                bibDB[i + 1] = entry
            })

            return {
                isCitation: true,
                format,
                entries: bibDB,
                errors,
                warnings,
            }
        } catch (error) {
            errors.push({
                type: "libreoffice_parse_error",
                value: String(error),
            })
            return {
                isCitation: true,
                format,
                entries: {},
                errors,
                warnings,
            }
        }
    }

    /**
     * Check or extract citation data from EndNote placeholder text.
     *
     * @param text - Text containing EndNote placeholders like {Author, Year #RecNum}
     * @param retrieve - If true, extract and return full citation data
     * @returns CitationResult with format and optionally entries/errors/warnings
     */
    static endNotePlaceholder(text: string, retrieve = true): CitationResult {
        // EndNote placeholders look like {Author, Year #RecNum}
        const hasPlaceholder = /\{[^{}]+#\d+[^{}]*\}/g.test(text)

        if (!hasPlaceholder) {
            return { isCitation: false }
        }

        const format = "endnote"

        if (!retrieve) {
            return { isCitation: true, format }
        }

        // Extract citation data
        const acc: CitationAccumulator = {
            entries: [],
            errors: [],
            warnings: [],
            seenKeys: new Set<string>(),
            cslRawIdToEntryKey: new Map<string, string>(),
        }
        const placeholderRe = /\{([^{}]+#\d+[^{}]*)\}/g
        let m: RegExpExecArray | null

        while ((m = placeholderRe.exec(text)) !== null) {
            for (const part of m[1].split(";").map((s) => s.trim())) {
                OdtCitationsParser.extractEndNotePlaceholderData(part, acc)
            }
        }

        const bibDB: Record<number, EntryObject> = {}
        acc.entries.forEach((entry, i) => {
            bibDB[i + 1] = entry
        })

        return {
            isCitation: true,
            format,
            entries: bibDB,
            errors: [],
            warnings: [],
        }
    }

    // -----------------------------------------------------------------------
    // Static helper methods for extraction logic
    // -----------------------------------------------------------------------

    /**
     * Extract CSL citation data from Zotero or Mendeley legacy marks.
     */
    private static extractCslMarkData(
        markName: string,
        source: string,
        acc: CitationAccumulator,
        metadata?: CitationItemMetadata[]
    ): void {
        const { warnings } = acc
        const jsonStart = markName.indexOf("{")
        if (jsonStart === -1) {
            warnings.push({ type: `${source}_missing_json` })
            return
        }

        const jsonStr = extractJsonObject(markName, jsonStart)
        if (jsonStr === null) {
            warnings.push({ type: `${source}_missing_json` })
            return
        }

        OdtCitationsParser.processCslJson(jsonStr, source, acc, metadata)
    }

    /**
     * Extract JabRef citation key from mark name.
     */
    private static extractJabRefMarkData(
        markName: string,
        acc: CitationAccumulator
    ): void {
        const { entries, warnings, seenKeys } = acc
        const withoutPrefix = markName.slice("JABREF_".length)
        const cidIndex = withoutPrefix.indexOf(" CID_")
        const rawKey =
            cidIndex === -1
                ? withoutPrefix.split(" ")[0]
                : withoutPrefix.slice(0, cidIndex)

        if (!rawKey) {
            warnings.push({ type: "jabref_missing_key", value: markName })
            return
        }

        const citationKey = rawKey.trim()

        if (seenKeys.has(citationKey)) return
        seenKeys.add(citationKey)

        entries.push({
            entry_key: citationKey,
            bib_type: "misc",
            fields: {},
        })
    }

    /**
     * Process CSL-JSON citation payload.
     */
    private static processCslJson(
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
        // Track the raw CSL id for each item index so we can attach metadata later
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
            // Always record the raw key; skip adding to cslRecord if already seen
            itemKeys.push(key)
            if (seenKeys.has(key)) return
            cslRecord[key] = item.itemData
        })

        if (Object.keys(cslRecord).length > 0) {
            const parser = new CSLParser(cslRecord)
            const bibDB = parser.parse()

            errors.push(...parser.errors)
            warnings.push(...parser.warnings)

            for (const entry of Object.values(bibDB)) {
                seenKeys.add(entry.entry_key)
                entries.push(entry)
            }
            // Merge the authoritative raw-id → entry_key map from this parse
            // into the accumulator so future citations can resolve duplicates.
            for (const [rawId, entryKey] of parser.rawIdToEntryKey) {
                acc.cslRawIdToEntryKey.set(rawId, entryKey)
            }
        }

        if (metadata) {
            items.forEach((item, i) => {
                const rawKey = itemKeys[i]
                if (!rawKey) return
                // Resolve normalised entry_key via the persistent accumulator map;
                // fall back to rawKey only if the entry was never successfully parsed.
                const entry_key = acc.cslRawIdToEntryKey.get(rawKey) ?? rawKey
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
     * Parse a single EndNote placeholder segment.
     */
    private static extractEndNotePlaceholderData(
        segment: string,
        acc: CitationAccumulator
    ): void {
        const { entries, seenKeys } = acc
        const re = /^(.*?)[,\s]+(\d{4})\s+#(\d+)/
        const m = re.exec(segment.trim())
        if (!m) return

        const authorPart = m[1].trim()
        const year = m[2]
        const recNum = m[3]
        const key = `EN${recNum}`

        if (seenKeys.has(key)) return
        seenKeys.add(key)

        const fields: Record<string, unknown> = {}

        if (authorPart) {
            const nameObj: {
                family?: import("../const").NodeArray
                given?: import("../const").NodeArray
                literal?: import("../const").NodeArray
            } = {}
            if (authorPart.includes(",")) {
                const parts = authorPart.split(",").map((p) => p.trim())
                nameObj.family = [{ type: "text", text: parts[0] }]
                if (parts[1]) nameObj.given = [{ type: "text", text: parts[1] }]
            } else {
                nameObj.literal = [{ type: "text", text: authorPart }]
            }
            fields["author"] = [nameObj]
        }

        if (year) fields["date"] = year

        entries.push({
            entry_key: key,
            bib_type: "misc",
            fields,
        })
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

    // -----------------------------------------------------------------------
    // Instance API
    // -----------------------------------------------------------------------

    parse(): OdtCitationsParseResult {
        // 1. LibreOffice-native <text:bibliography-mark> elements
        this.parseLibreOfficeBibMarks()

        // 2. Named reference marks (Zotero, Mendeley legacy, JabRef)
        this.parseReferenceMarks()

        // 3. EndNote plain-text placeholders {Author, Year #RecNum}
        this.parseEndNotePlaceholders()

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
    // Step 1 — LibreOffice native bibliography marks
    // -----------------------------------------------------------------------

    /**
     * Delegates to OdtNativeParser, passing `seenKeys` so that the native
     * parser can skip identifiers already seen by the other steps (and vice
     * versa — the set is mutated in place).
     */
    private parseLibreOfficeBibMarks(): void {
        const nativeParser = new OdtNativeParser(this.contentXml)
        const { entries, warnings } = nativeParser.parse(this.seenKeys)
        this.entries.push(...entries)
        this.warnings.push(...warnings)
    }

    // -----------------------------------------------------------------------
    // Step 2 — reference marks (Zotero, Mendeley legacy, JabRef)
    // -----------------------------------------------------------------------

    private parseReferenceMarks(): void {
        // Match all text:reference-mark-start elements
        // All marks must be properly closed but we ignore the end tags for extraction.
        const markRe = /<text:reference-mark-start[^>]+text:name="([^"]+)"/g
        let m: RegExpExecArray | null
        while ((m = markRe.exec(this.contentXml)) !== null) {
            const name = OdtCitationsParser.unescapeXmlEntitiesStatic(m[1])
            OdtCitationsParser.referenceMarkCitation(name, true, false, {
                entries: this.entries,
                errors: this.errors,
                warnings: this.warnings,
                seenKeys: this.seenKeys,
                cslRawIdToEntryKey: this.cslRawIdToEntryKey,
            })
        }
    }

    // --- LibreOffice Native Bibliography Marks ---
    // -----------------------------------------------------------------------
    // Step 3 — EndNote plain-text placeholders
    // -----------------------------------------------------------------------

    /**
     * EndNote does not use live reference marks in ODT files.  Instead it
     * leaves temporary citation placeholders directly in the document body:
     *
     *   {Smith, 2023 #291}
     *   {Smith, 2023 #291; Jones, 2019 #47}
     *
     * This method scans the raw XML text for these patterns.  Because the
     * placeholder contains no full bibliographic record — only author name,
     * year, and EndNote record number — the emitted entry is a stub `misc`
     * entry keyed by `EN{RecNum}`.
     */
    private parseEndNotePlaceholders(): void {
        // The `#\d+` guard prevents false positives from other brace-delimited
        // constructs that do not resemble EndNote placeholders.
        const placeholderRe = /\{([^{}]+#\d+[^{}]*)\}/g
        let m: RegExpExecArray | null
        while ((m = placeholderRe.exec(this.contentXml)) !== null) {
            // Multiple simultaneous citations are separated by ";"
            for (const part of m[1].split(";").map((s) => s.trim())) {
                OdtCitationsParser.extractEndNotePlaceholderData(part, {
                    entries: this.entries,
                    errors: this.errors,
                    warnings: this.warnings,
                    seenKeys: this.seenKeys,
                    cslRawIdToEntryKey: this.cslRawIdToEntryKey,
                })
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Convenience function
// ---------------------------------------------------------------------------

export function parseOdtCitations(contentXml: string): OdtCitationsParseResult {
    return new OdtCitationsParser(contentXml).parse()
}
