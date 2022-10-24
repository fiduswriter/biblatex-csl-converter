// This file is licensed under the MIT, Copyright Emiliano Heyns <emiliano.heyns@iris-advies.com>
// Source: https://github.com/retorquere/bibtex-parser/blob/3577e591db26d3e159c167915067e7d2cd568de2/index.ts#L11-L110
import xRegExp from "xregexp"

type TextRange = { start: number; end: number; description?: string }

function restore(text: string, orig: string, preserve: TextRange[]) {
    for (const { start, end } of preserve) {
        text =
            text.substring(0, start) +
            orig.substring(start, end) +
            text.substring(end)
    }
    return text
}

class SentenceCaser {
    private input = ""
    private result = ""
    private sentenceStart = false
    private acronym = xRegExp("^(\\p{Lu}[.])+(?=$|[\\P{L}])")
    private quoted = xRegExp('^"[^"]+"(?=$|[\\P{L}])')
    private innerCaps = xRegExp("\\p{Ll}\\p{Lu}")
    private allCaps = xRegExp("^\\p{Lu}+$")
    private aint = xRegExp("^\\p{L}n't(?=$|[\\P{L}])") // isn't
    private word = xRegExp("^\\p{L}+(-\\p{L}+)*") // also match gallium-nitride as one word
    private and = xRegExp("^\\p{Lu}&\\p{Lu}(?=$|[\\P{L}])") // Q&A

    public convert(text: string): string {
        this.input = text
        this.result = ""
        this.sentenceStart = true
        const preserve: TextRange[] = []

        this.input = this.input.replace(/[;:]\s+A\s/g, (match) =>
            match.toLowerCase()
        )
        this.input = this.input.replace(/[–—]\s*A\s/g, (match) =>
            match.toLowerCase()
        )
        let m
        while (this.input) {
            if ((m = xRegExp.exec(this.input, this.quoted))) {
                // "Hello There"
                this.add(m[0], "", true)
            } else if ((m = xRegExp.exec(this.input, this.acronym))) {
                // U.S.
                this.add(m[0], "", true)
            } else if ((m = xRegExp.exec(this.input, this.aint))) {
                // isn't
                this.add(m[0], "", false)
            } else if ((m = xRegExp.exec(this.input, this.word))) {
                this.add(m[0], "-", false)
            } else if ((m = xRegExp.exec(this.input, this.and))) {
                this.add(m[0], "", true)
            } else {
                this.add(this.input[0], "", false)
            }
        }

        return restore(this.result, text, preserve)
    }

    private add(word: string, splitter: string, keep: boolean) {
        if (splitter) {
            word = word
                .split(splitter)
                .map((part, i) => {
                    if ((keep || this.sentenceStart) && i === 0) return part
                    if (xRegExp.exec(part, this.innerCaps)) return part
                    if (xRegExp.exec(part, this.allCaps)) return part
                    return part.toLowerCase()
                })
                .join(splitter)
        } else if (!keep) word = word.toLowerCase()

        this.result += word
        this.input = this.input.substr(word.length)
        if (!word.match(/^\s+$/)) {
            this.sentenceStart =
                Boolean(word.match(/^[.?!]$/)) ||
                (word.length === 2 && word[1] === ".") // Vitamin A. Vitamin B.
        }
    }
}
const sentenceCaser = new SentenceCaser()

export function toSentenceCase(text: string): string {
    return sentenceCaser.convert(text)
}
