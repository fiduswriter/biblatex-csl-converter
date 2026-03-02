/**
 * Given a string that starts with `{` at position `startIndex`, walks forward
 * tracking brace depth and JSON string escapes to find the matching closing
 * `}`.  Returns the substring from `startIndex` up to and including that
 * closing brace, or `null` if no balanced closing brace is found.
 *
 * This is used to extract a JSON object from a larger string that may contain
 * trailing text after the object (e.g. Zotero ODT/DOCX mark names append a
 * random ID such as " RND6KERMIacgp" after the JSON payload).
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
