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
