// @flow

// If one runs the csl converter with escapeText = true, the output from
// citeproc (bibliography and citation entries ) will need to be unescaped
// using this function.

export function unescapeCSL(theValue /*: string */) /*: string */ {
    return theValue
        .replace(/&#38;amp;/g, '&amp;')
        .replace(/&#38;lt;/g, '&lt;')
        .replace(/&#38;gt;/g, '&gt;')
        .replace(/&#38;apos;/g, '&apos;')
        .replace(/&#38;quot;/g, '&quot;')
}
