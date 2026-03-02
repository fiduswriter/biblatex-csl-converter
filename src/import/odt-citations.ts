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

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
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

    constructor(contentXml: string) {
        this.contentXml = contentXml
        this.entries = []
        this.errors = []
        this.warnings = []
        this.seenKeys = new Set()
    }

    // -----------------------------------------------------------------------
    // Public API
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
        // Only start-marks carry the name; end-marks repeat it but hold no
        // additional information.
        const startRe = /<text:reference-mark-start\s+text:name="([^"]*)"/g
        let m: RegExpExecArray | null
        while ((m = startRe.exec(this.contentXml)) !== null) {
            const name = this.unescapeXmlEntities(m[1])
            this.dispatchReferenceMark(name)
        }
    }

    private dispatchReferenceMark(name: string): void {
        if (name.startsWith("ZOTERO_ITEM CSL_CITATION")) {
            this.processZoteroMark(name)
        } else if (name.startsWith("CSL_CITATION")) {
            // Mendeley Desktop legacy: "CSL_CITATION {json}"
            this.processMendeleyLegacyMark(name)
        } else if (name.startsWith("JABREF_")) {
            this.processJabRefMark(name)
        }
        // ZOTERO_BIBL … CSL_BIBLIOGRAPHY and CSL_BIBLIOGRAPHY marks are
        // bibliography rendering regions — no importable source data.
    }

    // --- Zotero ODT ---

    private processZoteroMark(name: string): void {
        // "ZOTERO_ITEM CSL_CITATION {…json…} RND<randomId>"
        // Zotero appends a trailing random ID after the JSON object; use
        // extractJsonObject to take only the balanced {} portion.
        const jsonStart = name.indexOf("{")
        if (jsonStart === -1) {
            this.warnings.push({ type: "zotero_missing_json" })
        } else {
            const jsonStr = extractJsonObject(name, jsonStart)
            if (jsonStr === null) {
                this.warnings.push({ type: "zotero_missing_json" })
            } else {
                this.processCslCitationJson(jsonStr, "zotero")
            }
        }
    }

    // --- Mendeley Desktop legacy ODT ---

    private processMendeleyLegacyMark(name: string): void {
        // "CSL_CITATION {…json…}" — may also have a trailing random ID
        const jsonStart = name.indexOf("{")
        if (jsonStart === -1) {
            this.warnings.push({ type: "mendeley_missing_json" })
        } else {
            const jsonStr = extractJsonObject(name, jsonStart)
            if (jsonStr === null) {
                this.warnings.push({ type: "mendeley_missing_json" })
            } else {
                this.processCslCitationJson(jsonStr, "mendeley_legacy")
            }
        }
    }

    /**
     * Shared handler for any CSL-JSON citation payload (Zotero, Mendeley).
     *
     * The payload shape is:
     *   { citationItems: [{ itemData: CSLEntry, id: … }, …] }
     *
     * We extract the `itemData` objects, key them by their `id` field (falling
     * back to a positional string), and hand the resulting Record to
     * CSLParser — the same parser used for standalone CSL-JSON imports.
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

        // Build Record<string, CSLEntry> for CSLParser, skipping keys already
        // seen from a previous citation mark in the same document.
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

    // --- JabRef ODT ---

    /**
     * JabRef reference mark names have the format:
     *   `JABREF_{citationKey} CID_{sequenceNumber} {randomId}`
     *
     * The content inside the marks is fully rendered text produced by JabRef's
     * layout engine — not raw bibliographic data.  We extract the citation key
     * from the mark name and emit a stub `misc` entry so callers know which
     * references are cited.  JabRef replaces spaces in citation keys with
     * underscores, so we reverse that substitution.
     */
    private processJabRefMark(name: string): void {
        // Strip "JABREF_" prefix; the key ends at " CID_"
        const withoutPrefix = name.slice("JABREF_".length)
        const cidIndex = withoutPrefix.indexOf(" CID_")
        const rawKey =
            cidIndex === -1
                ? withoutPrefix.split(" ")[0]
                : withoutPrefix.slice(0, cidIndex)

        if (!rawKey) {
            this.warnings.push({ type: "jabref_missing_key", value: name })
            return
        }

        // JabRef replaces spaces with underscores in the mark name
        const citationKey = rawKey.replace(/_/g, " ").trim()

        if (this.seenKeys.has(citationKey)) return
        this.seenKeys.add(citationKey)

        this.entries.push({
            entry_key: citationKey,
            bib_type: "misc",
            fields: {},
        })
    }

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
                this.parseEndNotePlaceholder(part)
            }
        }
    }

    /**
     * Parses a single EndNote placeholder segment such as `Smith, 2023 #291`
     * or `Bronk Ramsey, 2009 #19`.
     *
     * Format: `Author[,] Year #RecordNumber[suffix]`
     */
    private parseEndNotePlaceholder(segment: string): void {
        const re = /^(.*?)[,\s]+(\d{4})\s+#(\d+)/
        const m = re.exec(segment.trim())
        if (!m) return

        const authorPart = m[1].trim()
        const year = m[2]
        const recNum = m[3]
        const key = `EN${recNum}`

        if (this.seenKeys.has(key)) return
        this.seenKeys.add(key)

        const fields: Record<string, unknown> = {}

        if (authorPart) {
            const nameObj: {
                family?: import("../const").NodeArray
                given?: import("../const").NodeArray
                literal?: import("../const").NodeArray
            } = {}
            if (authorPart.includes(",")) {
                const parts = authorPart.split(",").map((p) => p.trim())
                nameObj.family = this.makeRichText(parts[0])
                if (parts[1]) nameObj.given = this.makeRichText(parts[1])
            } else {
                nameObj.literal = this.makeRichText(authorPart)
            }
            fields["author"] = [nameObj]
        }

        if (year) fields["date"] = year

        this.entries.push({
            entry_key: key,
            bib_type: "misc",
            fields,
        })
    }

    // -----------------------------------------------------------------------
    // Shared utilities
    // -----------------------------------------------------------------------

    private makeRichText(text: string): import("../const").NodeArray {
        return [{ type: "text", text: text.trim() }]
    }

    private unescapeXmlEntities(text: string): string {
        return text
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
    }
}

// ---------------------------------------------------------------------------
// Convenience function
// ---------------------------------------------------------------------------

export function parseOdtCitations(contentXml: string): OdtCitationsParseResult {
    return new OdtCitationsParser(contentXml).parse()
}
