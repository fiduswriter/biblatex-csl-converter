// @flow
const LATEX_COMMANDS = [ // commands that can can contain richtext.
    ['\\textbf{', 'strong'],
    ['\\mkbibbold{', 'strong'],
    ['\\mkbibitalic{', 'em'],
    ['\\mkbibemph{', 'em'],
    ['\\textit{', 'em'],
    ['\\emph{', 'em'],
    ['\\textsc{', 'smallcaps'],
    ['\\enquote{', 'enquote'],
    ['\\mkbibquote{', 'enquote'],
    ['\\textsubscript{', 'sub'],
    ['\\textsuperscript{', 'sup']
]

const LATEX_VERBATIM_COMMANDS = [ // commands that can only contain plaintext.
    ['\\url{', 'url']
]

const LATEX_SPECIAL_CHARS = {
    '&': '&',
    '%': '%',
    '$': '$',
    '#': '#',
    '_': '_',
    '{': '{',
    '}': '}',
    ',': ',',
    '~': '~',
    '^': '^',
    '\'': '\'',
    ';': '\u2004',
    '\\': '\n'
}

/*::

import type {NodeObject, TextNodeObject, MarkObject} from "../const"
*/

export class BibLatexLiteralParser {
    /*::
    string: string;
    cpMode: boolean;
    braceLevel: number;
    slen: number;
    si: number;
    json: Array<NodeObject>;
    braceClosings: Array<boolean>;
    currentMarks: Array<MarkObject>;
    inCasePreserve: number | null;
    textNode: TextNodeObject;
    */


    constructor(string /*: string */, cpMode /*: boolean */ = false) {
        this.string = string
        this.cpMode = cpMode // Whether to consider case preservation.
        this.braceLevel = 0
        this.slen = string.length
        this.si = 0 // string index
        this.json = []
        this.braceClosings = []
        this.currentMarks = []
        this.inCasePreserve = null
        this.addNewTextNode()
    }

    // If the last text node has no content, remove it.
    removeIfEmptyTextNode() {
        if (this.textNode.text.length === 0) {
            this.json.pop()
        }
    }

    checkAndAddNewTextNode() {
        if (this.textNode.text.length > 0) {
            // We have text in the last node already,
            // so we need to start a new text node.
            this.addNewTextNode()
        }
    }

    addNewTextNode() {
        const textNode /*: TextNodeObject */ = {type: 'text', text: ''}
        this.json.push(textNode)
        this.textNode = textNode
    }

    stringParser() {
        let variable, sj
        parseString: while (this.si < this.slen) {
            switch(this.string[this.si]) {
                case '\\':
                    for (let command of LATEX_COMMANDS) {
                        if (this.string.substring(this.si, this.si + command[0].length) === command[0]) {
                            this.braceLevel++
                            this.si += command[0].length
                            this.checkAndAddNewTextNode()
                            if (this.cpMode) {
                                // If immediately inside a brace that added case protection, remove case protection. See
                                // http://tex.stackexchange.com/questions/276943/biblatex-how-to-emphasize-but-not-caps-protect
                                if (
                                    this.inCasePreserve===(this.braceLevel-1) &&
                                    this.string[this.si-1] === '{' &&
                                    this.currentMarks[this.currentMarks.length-1].type === 'nocase'
                                ) {
                                    this.currentMarks.pop()
                                    this.inCasePreserve = null
                                } else {
                                    // Of not immediately inside a brace, any styling also
                                    // adds case protection.
                                    this.currentMarks.push({type:'nocase'})
                                    this.inCasePreserve = this.braceLevel
                                }
                            }
                            this.currentMarks.push({type:command[1]})
                            this.textNode.marks = this.currentMarks.slice()
                            this.braceClosings.push(true)
                            continue parseString
                        }
                    }
                    for (let command of LATEX_VERBATIM_COMMANDS) {
                        if (this.string.substring(this.si, this.si + command[0].length) === command[0]) {
                            this.checkAndAddNewTextNode()
                            this.textNode.marks = this.currentMarks.slice()
                            this.textNode.marks.push({type:command[1]})
                            this.si += command[0].length
                            let sj = this.si
                            let internalBraceLevel = 0
                            while (
                                sj < this.slen &&
                                (
                                    this.string[sj] !== '}' ||
                                    internalBraceLevel > 0
                                )
                            ) {
                                switch (this.string[sj]) {
                                    case '{':
                                        internalBraceLevel++
                                        break
                                    case '}':
                                        internalBraceLevel--
                                        break
                                }
                                sj++
                            }
                            this.textNode.text = this.string.substring(this.si,sj)
                            this.addNewTextNode()
                            this.si = sj + 1
                            continue parseString
                        }
                    }
                    if (LATEX_SPECIAL_CHARS[this.string[this.si+1]]) {
                        this.textNode.text += LATEX_SPECIAL_CHARS[this.string[this.si+1]]
                        this.si += 2
                    } else {
                        // We don't know the command and skip it.
                        this.si++
                        while(this.si<this.slen && this.string[this.si].match("[a-zA-Z0-9]")) {
                            this.si++
                        }
                        // If there is a brace at the end of the command,
                        // increase brace level but ignore brace.
                        if (this.string[this.si] === "{") {
                            this.braceLevel++
                            this.braceClosings.push(false)
                            this.si++
                        }
                    }
                    break
                case '_':
                    switch(this.string[this.si+1]) {
                        case '{':
                            this.checkAndAddNewTextNode()
                            this.braceLevel++
                            this.si += 2
                            this.currentMarks.push({type:'sub'})
                            this.textNode.marks = this.currentMarks.slice()
                            this.braceClosings.push(true)
                            break
                        case '\\':
                            // There is a command following directly. Ignore the sub symbol.
                            this.si++
                            break
                        default:
                            // We only add the next character to a sub node.
                            this.checkAndAddNewTextNode()
                            this.textNode.marks = this.currentMarks.slice()
                            this.textNode.marks.push({type:'sub'})
                            this.textNode.text = this.string[this.si+1]
                            this.addNewTextNode()
                            if (this.currentMarks.length) {
                                this.textNode.marks = this.currentMarks.slice()
                            }
                            this.si += 2
                    }
                    break
                case '`':
                    if (this.string[this.si+1] === '`') {
                        this.checkAndAddNewTextNode()
                        this.braceLevel++
                        this.si += 2
                        this.currentMarks.push({type:'enquote'})
                        this.textNode.marks = this.currentMarks.slice()
                        this.braceClosings.push(true)
                    } else {
                        this.textNode.text += this.string[this.si]
                        this.si++
                    }
                    break
                case '\'':
                    if (this.string[this.si+1] === '\'') {
                        this.braceLevel--
                        if (this.braceLevel > -1) {
                            let closeBrace = this.braceClosings.pop()
                            if (closeBrace) {
                                this.checkAndAddNewTextNode()
                                this.currentMarks.pop()
                                if (this.currentMarks.length) {
                                    this.textNode.marks = this.currentMarks.slice()
                                } else {
                                    delete this.textNode.marks
                                }
                            }
                            this.si += 2
                            //continue parseString
                        } else {
                            // A brace was closed before it was opened. Abort and return the original string.
                            return [{type: 'text', text: this.string}]
                        }
                    } else {
                        this.textNode.text += this.string[this.si]
                        this.si++
                    }
                    break
                case '^':
                    switch(this.string[this.si+1]) {
                        case '{':
                            this.checkAndAddNewTextNode()
                            this.braceLevel++
                            this.si += 2
                            this.currentMarks.push({type:'sup'})
                            this.textNode.marks = this.currentMarks.slice()
                            this.braceClosings.push(true)
                            break
                        case '\\':
                            // There is a command following directly. Ignore the sup symbol.
                            this.si++
                            break
                        default:
                            // We only add the next character to a sup node.
                            this.checkAndAddNewTextNode()
                            this.textNode.marks = this.currentMarks.slice()
                            this.textNode.marks.push({type:'sup'})
                            this.textNode.text = this.string[this.si+1]
                            this.addNewTextNode()
                            if (this.currentMarks.length) {
                                this.textNode.marks = this.currentMarks.slice()
                            }
                            this.si += 2
                    }
                    break
                case '{':
                    if (this.string[this.si+1] === '}') {
                        // bracket is closing immediately. Ignore it.
                        this.si += 2
                        continue
                    }
                    this.braceLevel++
                    if (this.inCasePreserve || !this.cpMode) {
                        // If already inside case preservation, do not add a second
                        this.braceClosings.push(false)
                    } else {
                        this.inCasePreserve = this.braceLevel
                        this.checkAndAddNewTextNode()
                        this.currentMarks.push({type:'nocase'})
                        this.textNode.marks = this.currentMarks.slice()
                        this.braceClosings.push(true)
                    }
                    this.si++
                    break
                case '}':
                    this.braceLevel--
                    if (this.braceLevel > -1) {
                        let closeBrace = this.braceClosings.pop()
                        if (closeBrace) {
                            this.checkAndAddNewTextNode()
                            let lastMark = this.currentMarks.pop()
                            if (this.inCasePreserve===(this.braceLevel+1)) {
                                this.inCasePreserve = null
                                // The last tag may have added more tags. The
                                // lowest level will be the case preserving one.
                                while(lastMark.type !== 'nocase' && this.currentMarks.length) {
                                    lastMark = this.currentMarks.pop()
                                }
                            }
                            if (this.currentMarks.length) {
                                this.textNode.marks = this.currentMarks.slice()
                            } else {
                                delete this.textNode.marks
                            }
                        }
                        this.si++
                        //continue parseString
                    } else {
                        // A brace was closed before it was opened. Abort and return the original string.
                        return [{type: 'text', text: this.string}]
                    }
                    break
                case '$':
                    // math env, just remove
                    this.si++
                    break
                case '~':
                    // a non-breakable space
                    this.textNode.text += '\u00A0'
                    this.si++
                    break
                case '\u0870':
                    // An undefined variable.
                    this.removeIfEmptyTextNode()
                    sj = this.si + 1
                    while (sj < this.slen && this.string[sj] !== '\u0870') {
                        sj++
                    }
                    variable = this.string.substring(this.si+1, sj)
                    this.json.push({type:'variable', attrs:{variable}})
                    this.addNewTextNode()
                    this.si = sj + 1
                    break
                case '\u0871':
                    // A backslash
                    this.textNode.text += '\\'
                    this.si++
                    break
                case '\r':
                    this.si++
                    break
                case '\n':
                    if (
                        ['\r','\n'].includes(this.string[this.si+1]) &&
                        this.string[this.si-1] !== '\n'
                    ) {
                        this.textNode.text += '\n\n'
                    } else if (
                        /\S/.test(this.string[this.si-1]) &&
                        /\S/.test(this.string[this.si+1])
                    ) {
                        this.textNode.text += ' '
                    }
                    this.si++
                    break
                default:
                    this.textNode.text += this.string[this.si]
                    this.si++
            }
        }

        if (this.braceLevel > 0) {
            // Too many opening braces, we return the original string.
            return [{type: 'text', text: this.string}]
        }

        this.removeIfEmptyTextNode()

        // Braces were accurate.
        return this.json
    }

    get output() {
        return this.stringParser()
    }
}
