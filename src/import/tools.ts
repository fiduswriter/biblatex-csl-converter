import { langidOptions } from "../const"

/**
 * Reverse-lookup map: various representations of a language → internal langid
 * key used by BibFieldTypes.langid (e.g. "german", "usenglish").
 *
 * Covers:
 *  - The internal key itself          ("german" → "german")
 *  - Full BCP-47 CSL code             ("de-de"  → "german")
 *  - Bare BCP-47 language subtag      ("de"     → "german")
 *  - BibLaTeX alias                   ("ngerman"→ "german")
 *  - Common full English name         ("german" → "german", already identity)
 *  - ISO 639-2/T three-letter codes   ("ger"    → "german", "eng" → "usenglish")
 */
const LANGID_BY_CODE: Map<string, string> = (() => {
    const m = new Map<string, string>()

    // Preferred mappings for bare BCP-47 language subtags and common full names
    // that would otherwise resolve to an unexpected regional variant.
    const preferred: Record<string, string> = {
        // BCP-47 bare subtags
        en: "usenglish",
        de: "german",
        fr: "french",
        pt: "portuguese",
        zh: "chinese",
        sr: "serbian",
        no: "norwegian",
        // ISO 639-2/T codes (used by PubMed NBIB, some RIS exporters, etc.)
        eng: "usenglish",
        ger: "german",
        deu: "german",
        fra: "french",
        fre: "french",
        spa: "spanish",
        ita: "italian",
        por: "portuguese",
        por_br: "brportuguese",
        zho: "chinese",
        chi: "chinese",
        jpn: "japanese",
        kor: "korean",
        ara: "arabic",
        rus: "russian",
        pol: "polish",
        nld: "dutch",
        dut: "dutch",
        swe: "swedish",
        nor: "norwegian",
        dan: "danish",
        fin: "finnish",
        ces: "czech",
        cze: "czech",
        slk: "slovak",
        slo: "slovak",
        hrv: "croatian",
        slv: "slovene",
        bul: "bulgarian",
        ron: "romanian",
        rum: "romanian",
        hun: "hungarian",
        tur: "turkish",
        heb: "hebrew",
        ell: "greek",
        gre: "greek",
        lat: "latin",
        cat: "catalan",
        eus: "basque",
        baq: "basque",
        afr: "afrikaans",
        ukr: "ukrainian",
        vie: "vietnamese",
        tha: "thai",
        lit: "lithuanian",
        lav: "latvian",
        est: "estonian",
        isl: "icelandic",
        ice: "icelandic",
        mon: "mongolian",
        fas: "farsi",
        per: "farsi",
        srp: "serbian",
        // Common full English language names (case-insensitively applied below)
        english: "usenglish",
        german: "german",
        french: "french",
        spanish: "spanish",
        italian: "italian",
        portuguese: "portuguese",
        chinese: "chinese",
        japanese: "japanese",
        arabic: "arabic",
        russian: "russian",
        polish: "polish",
        dutch: "dutch",
        swedish: "swedish",
        norwegian: "norwegian",
        danish: "danish",
        finnish: "finnish",
        czech: "czech",
        slovak: "slovak",
        croatian: "croatian",
        slovene: "slovene",
        slovenian: "slovene",
        bulgarian: "bulgarian",
        romanian: "romanian",
        hungarian: "hungarian",
        turkish: "turkish",
        hebrew: "hebrew",
        greek: "greek",
        latin: "latin",
        catalan: "catalan",
        basque: "basque",
        afrikaans: "afrikaans",
        ukrainian: "ukrainian",
        vietnamese: "vietnamese",
        thai: "thai",
        lithuanian: "lithuanian",
        latvian: "latvian",
        estonian: "estonian",
        icelandic: "icelandic",
        mongolian: "mongolian",
        farsi: "farsi",
        persian: "farsi",
        serbian: "serbian",
    }
    for (const [code, key] of Object.entries(preferred)) {
        m.set(code, key)
    }

    for (const [key, val] of Object.entries(langidOptions)) {
        // Full BCP-47 CSL code (lower-cased), e.g. "de-de"
        const cslCode = val.csl.toLowerCase()
        if (!m.has(cslCode)) m.set(cslCode, key)
        // Bare language subtag, e.g. "de"
        const lang = cslCode.split("-")[0]
        if (!m.has(lang)) m.set(lang, key)
        // BibLaTeX alias, e.g. "ngerman"
        const bbl = val.biblatex.toLowerCase()
        if (!m.has(bbl)) m.set(bbl, key)
        // Internal key itself (identity), e.g. "german"
        if (!m.has(key.toLowerCase())) m.set(key.toLowerCase(), key)
    }
    return m
})()

/**
 * Map a raw language string (BCP-47 code, ISO 639-2 code, BibLaTeX alias, or
 * full English language name) to the internal langid option key recognised by
 * BibFieldTypes.langid (e.g. "german", "usenglish").
 *
 * Returns `undefined` when no match is found so the caller can omit the field
 * rather than storing an invalid value that would crash the exporters.
 */
export function lookupLangid(text: string): string | undefined {
    return LANGID_BY_CODE.get(text.toLowerCase().trim())
}

/**
 * Normalise a candidate BibLaTeX citation key so that it always starts with a
 * letter.  If `candidate` already starts with a letter it is used as-is;
 * otherwise a synthetic key is derived from the optional `lastName` and `year`
 * hints (producing `{lastName}{year}`).  When neither hint is available the
 * fallback `ref{candidate}` is used so the numeric part is still preserved.
 *
 * The returned key is also guaranteed to be unique within `usedKeys`.  If the
 * base key is already taken, single lower-case letters (`a`, `b`, …) are
 * appended until a free slot is found.  The chosen key is automatically added
 * to `usedKeys`.
 *
 * @param candidate - The raw key string produced by the parser (may be purely
 *   numeric, a UUID, etc.).
 * @param usedKeys  - Mutable set of keys that have already been assigned in
 *   this parse session.  Will be updated with the returned key.
 * @param lastName  - Optional family-name fragment to use when synthesising a
 *   key from scratch.
 * @param year      - Optional four-digit year string to append.
 */
export function makeEntryKey(
    candidate: string,
    usedKeys: Set<string>,
    lastName?: string,
    year?: string
): string {
    // Determine a base key that starts with a letter.
    let base: string
    if (/^[A-Za-z]/.test(candidate)) {
        base = candidate
    } else if (lastName) {
        // Build a clean surname: keep ASCII letters/digits only.
        const cleanName = lastName.replace(/[^A-Za-z0-9]/g, "")
        if (cleanName && /^[A-Za-z]/.test(cleanName)) {
            base = year ? `${cleanName}${year}` : cleanName
        } else if (year) {
            base = `ref${year}`
        } else {
            base = `ref${candidate}`
        }
    } else if (year) {
        base = `ref${year}`
    } else {
        base = `ref${candidate}`
    }

    // Ensure uniqueness.
    if (!usedKeys.has(base)) {
        usedKeys.add(base)
        return base
    }
    // Try appending a, b, c, … z, then aa, ab, … (simple single-suffix loop
    // covers all realistic bibliography sizes).
    const letters = "abcdefghijklmnopqrstuvwxyz"
    for (let i = 0; i < letters.length; i++) {
        const attempt = `${base}${letters[i]}`
        if (!usedKeys.has(attempt)) {
            usedKeys.add(attempt)
            return attempt
        }
    }
    // Ultra-rare: more than 26 duplicates — append numeric suffix.
    let n = 2
    while (true) {
        const attempt = `${base}${n}`
        if (!usedKeys.has(attempt)) {
            usedKeys.add(attempt)
            return attempt
        }
        n++
    }
}

/**
 * Given a string that starts with `{` at position `startIndex`, walks forward
 * tracking brace depth and JSON string escapes to find the matching closing
 * `}`.  Returns the substring from `startIndex` up to and including that
 * closing brace, or `null` if no balanced closing brace is found.
 *
 * This is used to extract a JSON object from a larger string that may contain
 * trailing text after the object (e.g. Zotero ODT mark names append a
 * random ID such as " RNDjURflxg9F1" after the JSON payload). The random ID
 * format is: space + "RND" + exactly 10 alphanumeric characters.
 */
export function extractJsonObject(str: string, startIndex = 0): string | null {
    let depth = 0
    let inString = false
    let escape = false

    for (let i = startIndex; i < str.length; i++) {
        const ch = str[i]

        if (escape) {
            escape = false
            continue
        }

        if (inString) {
            if (ch === "\\") {
                escape = true
            } else if (ch === '"') {
                inString = false
            }
            continue
        }

        if (ch === '"') {
            inString = true
        } else if (ch === "{") {
            depth++
        } else if (ch === "}") {
            depth--
            if (depth === 0) {
                return str.slice(startIndex, i + 1)
            }
        }
    }

    return null
}

// split at each occurence of splitToken, but only if no braces are currently open.
export function splitTeXString(
    texString: string,
    splitToken = "and"
): string[] {
    let output = []
    let tokenRe = /([^\s{}]+|\s|{|})/g
    let j = 0
    let k = 0
    let item
    while ((item = tokenRe.exec(texString)) !== null) {
        const token = item && item.length ? item[0] : false
        if (token === false) {
            break
        }
        if (k === output.length) {
            output.push("")
        }
        switch (token) {
            case "{":
                j += 1
                output[k] += token
                break
            case "}":
                j -= 1
                output[k] += token
                break
            case splitToken:
                if (0 === j) {
                    k++
                } else {
                    output[k] += token
                }
                break
            default:
                output[k] += token
        }
    }
    return output
}
