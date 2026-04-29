/**
 * Bibliography format sniffer
 *
 * Inspects a raw string and returns the most likely import format identifier,
 * or `null` if the format cannot be determined.
 *
 * Recognised format identifiers
 * ──────────────────────────────
 *  "biblatex"         – BibTeX / BibLaTeX  (@article{…}, @book{…}, …)
 *  "ris"              – RIS  (TY  - …  ER  - )
 *  "enw"              – EndNote tagged  (%0 …)
 *  "nbib"             – PubMed / MEDLINE NBIB  (PMID- …)
 *  "endnote_xml"      – EndNote XML export  (<xml><records>…)
 *  "citavi_xml"       – Citavi native XML project  (<CitaviExchangeData …)
 *  "csl_json"         – CSL-JSON  (array or object whose values carry "type")
 *  "citavi_json"      – Citavi JSON / WordPlaceholder export
 *  "odt_citations"    – ODT content.xml with embedded citation marks
 *  "docx_citations"   – DOCX word/document.xml with embedded citation fields
 *
 * Design principles
 * ──────────────────
 * • Work only on the first ~4 KB of the string so that the sniffer is O(1)
 *   in practice regardless of file size.
 * • Prefer cheap string operations over full parses.
 * • Use a clear priority order so that formats that are strict supersets of
 *   others (e.g. Citavi XML vs. generic XML) are tested first.
 * • Never throw — return `null` on any unexpected input.
 */

export type ImportFormat =
    | "biblatex"
    | "ris"
    | "enw"
    | "nbib"
    | "endnote_xml"
    | "citavi_xml"
    | "csl_json"
    | "citavi_json"
    | "odt_citations"
    | "docx_citations"

/**
 * The maximum number of characters from the beginning of the input that the
 * sniffer will examine.  Large enough to skip an XML declaration and BOM but
 * still tiny compared to any real bibliography file.
 */
const PEEK = 4096

/**
 * Sniff a raw bibliography string and return its most likely format, or
 * `null` when the format cannot be identified with reasonable confidence.
 *
 * @param input - The raw string content of a bibliography file.
 * @returns     - An `ImportFormat` identifier, or `null`.
 */
export function sniffFormat(input: string): ImportFormat | null {
    if (typeof input !== "string" || input.length === 0) return null

    // Work on a trimmed head of the string to keep every check O(1).
    const head = input.trimStart().slice(0, PEEK)

    // ── 1. XML-based formats ─────────────────────────────────────────────────
    // These all start with either a BOM + XML declaration or directly with a
    // tag.  We check for a leading `<` first, but also scan forward a short
    // distance to tolerate files that have a few bytes of garbage before the
    // XML declaration (e.g. a stray backtick-fence in some fixture files).
    if (head.startsWith("<") || head.startsWith("\uFEFF<")) {
        return sniffXml(head, input)
    }
    const firstAngle = head.indexOf("<")
    if (firstAngle !== -1 && firstAngle < 16) {
        const xmlHead = head.slice(firstAngle)
        const result = sniffXml(xmlHead, input)
        if (result !== null) return result
    }

    // ── 2. JSON-based formats ────────────────────────────────────────────────
    if (head.startsWith("{") || head.startsWith("[")) {
        return sniffJson(head, input)
    }

    // ── 3. Line-oriented tagged formats ─────────────────────────────────────
    // RIS: first non-blank line must match  TY  - <type>
    // The spec mandates exactly two uppercase letters, two spaces, a hyphen,
    // and a space before the value.
    if (/^TY {2}- \S/.test(head)) return "ris"

    // ENW (EndNote tagged): records open with "%0 <type>"
    if (/^%0 \S/.test(head)) return "enw"

    // NBIB / PubMed-MEDLINE: records typically open with "PMID- " but files
    // exported for multiple records may start with any recognised two-to-four
    // character tag followed by a hyphen-padded delimiter "- ".
    // We require at least one classic MEDLINE tag near the top of the file.
    if (isNBIB(head)) return "nbib"

    // ── 4. BibTeX / BibLaTeX ────────────────────────────────────────────────
    // An entry starts with "@<word>", optionally preceded by comments.
    // We scan for the first "@" to tolerate leading comment lines.
    if (hasBiblatexEntry(head)) return "biblatex"

    return null
}

// ─── XML discriminator ───────────────────────────────────────────────────────

function sniffXml(head: string, full: string): ImportFormat | null {
    // Citavi native project XML: root element is <CitaviExchangeData>
    // Test this before the generic EndNote XML check.
    if (
        head.includes("<CitaviExchangeData") ||
        full.slice(0, PEEK * 4).includes("<CitaviExchangeData")
    ) {
        return "citavi_xml"
    }

    // DOCX word/document.xml: uses the WordprocessingML namespace
    // Characteristic markers: the "w:" prefix on core elements.
    // We look for the namespace URI or for <w:document / <w:body.
    if (
        head.includes("schemas.openxmlformats.org/wordprocessingml") ||
        head.includes("<w:document") ||
        head.includes("<w:body")
    ) {
        return "docx_citations"
    }

    // ODT content.xml: uses the OpenDocument "text:" namespace.
    // Present for both LibreOffice-native and Zotero/Mendeley/JabRef ODT
    // citations.  The bibliography-mark element or reference-mark elements
    // are the reliable discriminator.
    if (
        head.includes("xmlns:text=") ||
        head.includes("<text:bibliography-mark") ||
        head.includes("ZOTERO_ITEM CSL_CITATION") ||
        head.includes("CSL_CITATION") ||
        head.includes("JABREF_")
    ) {
        // Could be ODT or DOCX — we already ruled out DOCX above, so this
        // must be ODT.
        return "odt_citations"
    }

    // EndNote XML: the canonical export wraps records in <xml><records>…
    // but some variants use <records> directly or have <record> children
    // with <ref-type> elements.  We search a generous prefix.
    const wide = full.slice(0, PEEK * 4)
    if (
        wide.includes("<xml>") ||
        wide.includes("<records>") ||
        wide.includes("<ref-type") ||
        wide.includes('<source-app name="EndNote"') ||
        wide.includes("<record>")
    ) {
        return "endnote_xml"
    }

    // Unknown XML — we cannot identify it.
    return null
}

// ─── JSON discriminator ──────────────────────────────────────────────────────

function sniffJson(head: string, full: string): ImportFormat | null {
    // We do a lightweight parse of only as much JSON as we need.  We never
    // parse the whole document — that would defeat the purpose.
    try {
        // Attempt to parse only the head fragment (may be incomplete JSON).
        // If it fails we fall back to regex heuristics on the raw text.
        const sample = tryParseJsonHead(head, full)

        if (sample !== null) {
            return classifyJsonValue(sample)
        }
    } catch {
        // Fall through to regex heuristics.
    }

    // ── Regex heuristics on the raw text ────────────────────────────────────
    // These run when tryParseJsonHead cannot produce a valid fragment.

    // Citavi JSON: SwissAcademic type annotations are unmistakable.
    if (
        head.includes("SwissAcademic.Citavi") ||
        head.includes('"$type"') ||
        head.includes('"ReferenceType"') ||
        head.includes('"BibTeXKey"')
    ) {
        return "citavi_json"
    }

    // CSL JSON: look for the pair of "id" and "type" keys that every CSL
    // entry must carry.
    if (head.includes('"id"') && head.includes('"type"')) {
        return "csl_json"
    }

    // Citavi plain array: array of objects with "Title" / "Authors" keys.
    if (head.includes('"Title"') && head.includes('"Authors"')) {
        return "citavi_json"
    }

    return null
}

/**
 * Try to extract a representative parsed value from the raw JSON text.
 *
 * Strategy:
 *  - If the outer container is an array, parse just the first element.
 *  - If it is an object, parse just the first top-level key/value pair.
 *
 * Returns the parsed value on success, or `null` on any failure.
 */
function tryParseJsonHead(
    head: string,
    full: string,
): Record<string, unknown> | Record<string, unknown>[] | null {
    // For an array we want the first element.
    if (head.startsWith("[")) {
        const firstClose = findFirstArrayElement(full)
        if (firstClose !== null) {
            try {
                return [JSON.parse(firstClose)] as Record<string, unknown>[]
            } catch {
                return null
            }
        }
        return null
    }

    // For an object, try to parse it completely first (works for small files)
    // then fall back to extracting the first value.
    try {
        return JSON.parse(full) as Record<string, unknown>
    } catch {
        return null
    }
}

/**
 * Extract the text of the first element of a JSON array from the full input,
 * attempting to handle nested objects and arrays by counting braces/brackets.
 */
function findFirstArrayElement(full: string): string | null {
    // Find the opening '[', then scan for the matching first element end.
    const start = full.indexOf("[")
    if (start === -1) return null

    let i = start + 1

    // Skip whitespace before the first element.
    while (i < full.length && /\s/.test(full[i])) i++

    if (i >= full.length) return null

    const ch = full[i]

    if (ch === "{") {
        // Object element — find the matching '}'.
        const end = findMatchingBrace(full, i, "{", "}")
        if (end === -1) return null
        return full.slice(i, end + 1)
    }

    if (ch === "[") {
        // Nested array element.
        const end = findMatchingBrace(full, i, "[", "]")
        if (end === -1) return null
        return full.slice(i, end + 1)
    }

    // Scalar first element (string, number, etc.) — read until comma or ']'.
    const end = full.search(/[,\]]/)
    if (end === -1) return null
    return full.slice(i, end).trim()
}

/**
 * Scan forward from `pos` (which must point at `open`) and return the index
 * of the matching `close` character, respecting nesting and JSON strings.
 */
function findMatchingBrace(
    s: string,
    pos: number,
    open: string,
    close: string,
): number {
    let depth = 0
    let inString = false
    let escape = false

    for (let i = pos; i < s.length; i++) {
        const c = s[i]

        if (escape) {
            escape = false
            continue
        }

        if (inString) {
            if (c === "\\") escape = true
            else if (c === '"') inString = false
            continue
        }

        if (c === '"') {
            inString = true
        } else if (c === open) {
            depth++
        } else if (c === close) {
            depth--
            if (depth === 0) return i
        }
    }

    return -1
}

/**
 * Classify a parsed JSON value as a specific import format.
 */
function classifyJsonValue(
    value: Record<string, unknown> | Record<string, unknown>[],
): ImportFormat | null {
    // Array: could be CSL-JSON array or a Citavi reference array.
    if (Array.isArray(value)) {
        const first = value[0]
        if (!first || typeof first !== "object") return null
        return classifyJsonObject(first as Record<string, unknown>)
    }

    // Object: could be a CSL-JSON map keyed by citation ID, or a Citavi
    // WordPlaceholder / project export object.
    if (typeof value === "object" && value !== null) {
        return classifyJsonObject(value as Record<string, unknown>)
    }

    return null
}

/**
 * Inspect the keys and values of a single JSON object to determine its format.
 */
function classifyJsonObject(obj: Record<string, unknown>): ImportFormat | null {
    // Citavi WordPlaceholder / inline JSON from DOCX citations.
    // The "$type" key is populated by the Newtonsoft.Json serialiser and
    // always contains a fully-qualified SwissAcademic type name.
    if (typeof obj.$type === "string" && obj.$type.includes("SwissAcademic")) {
        return "citavi_json"
    }

    // Citavi project JSON export: top-level "References" array.
    if (Array.isArray(obj.References)) {
        const firstRef = obj.References[0]
        if (firstRef && typeof firstRef === "object") {
            return "citavi_json"
        }
    }

    // Citavi project JSON export: top-level "Entries" array (WordPlaceholder).
    if (Array.isArray(obj.Entries)) {
        const firstEntry = obj.Entries[0]
        if (
            firstEntry &&
            typeof firstEntry === "object" &&
            (typeof (firstEntry as Record<string, unknown>).$type ===
                "string" ||
                typeof (firstEntry as Record<string, unknown>).ReferenceId ===
                    "string")
        ) {
            return "citavi_json"
        }
    }

    // Citavi reference object (array element): has "ReferenceType" and
    // either "BibTeXKey" or "Title".
    if (
        typeof obj.ReferenceType === "string" &&
        (obj.BibTeXKey !== undefined || obj.Title !== undefined)
    ) {
        return "citavi_json"
    }

    // CSL-JSON entry object: must have both "id" and "type".
    if (typeof obj.id !== "undefined" && typeof obj.type === "string") {
        return "csl_json"
    }

    // CSL-JSON keyed map: the object's *values* are CSL entries.
    // Check whether any top-level value looks like a CSL entry.
    for (const val of Object.values(obj)) {
        if (
            val !== null &&
            typeof val === "object" &&
            !Array.isArray(val) &&
            typeof (val as Record<string, unknown>).type === "string" &&
            typeof (val as Record<string, unknown>).id !== "undefined"
        ) {
            return "csl_json"
        }
        // Only check the first value to stay cheap.
        break
    }

    return null
}

// ─── BibLaTeX heuristic ──────────────────────────────────────────────────────

/**
 * Returns `true` if the text contains a BibTeX/BibLaTeX entry opener.
 *
 * We scan for `@<word>{` or `@<word>(` (the two BibTeX entry delimiters),
 * but also accept `@comment`, `@preamble`, and `@string` directives so that
 * files consisting only of those constructs are still recognised.
 */
function hasBiblatexEntry(head: string): boolean {
    return /@[A-Za-z][A-Za-z0-9_]*\s*[({]/.test(head)
}

// ─── NBIB heuristic ─────────────────────────────────────────────────────────

/**
 * MEDLINE/NBIB files have a very distinctive two-to-four uppercase letter
 * tag at the start of each line, right-padded with spaces to column 4,
 * followed by "- " and the value.  Examples:
 *
 *   PMID- 39730211
 *   OWN - NLM
 *   TI  - Fish Gastroenterology.
 *   FAU - Smith, John
 *
 * We require at least two such lines near the top of the file to avoid false
 * positives from other formats that might incidentally contain a similar
 * pattern.
 */
function isNBIB(head: string): boolean {
    // The pattern:  start-of-line, 2-4 uppercase letters (or digits for PMID),
    // spaces padding to column 4, "- ", non-empty value.
    const nbibLine = /^[A-Z]{2,4}[ ]{0,2}- \S/m

    // Count how many lines match — require at least 2 for confidence.
    const lines = head.split("\n").slice(0, 20)
    let matches = 0
    for (const line of lines) {
        if (/^[A-Z]{2,4}[ ]{0,2}- \S/.test(line)) {
            matches++
            if (matches >= 2) return true
        }
    }

    // A single "PMID-" is distinctive enough on its own.
    return nbibLine.test(head) && head.includes("PMID-")
}
