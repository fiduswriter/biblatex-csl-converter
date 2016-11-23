const LATEX_COMMANDS = [
    ['\\textbf{', 'strong'],
    ['\\mkbibbold{', 'strong'],
    ['\\mkbibitalic{', 'em'],
    ['\\mkbibemph{', 'em'],
    ['\\textit{', 'em'],
    ['\\emph{', 'em'],
    ['\\textsc{', 'smallcaps'],
    ['\\enquote{', 'enquote']
]

const LATEX_SPECIAL_CHARS = ['&','%','$', '#','_','{','}',',','~','^','\'']


export class BibLatexLiteralParser {
    constructor(string) {
        this.string = string
        this.braceLevel = 0
        this.slen = string.length
        this.si = 0 // string index
        this.json = []
        this.braceClosings = []
        this.currentMarks = []
        this.inCasePreserve = false
        this.textNode = false
    }

    checkAndAddNewTextNode() {
        if (this.textNode.text.length > 0) {
            // We have text in the last node already,
            // so we need to start a new text node.
            this.addNewTextNode()
        }
    }

    addNewTextNode() {
        this.textNode = {type: 'text', text: ''}
        this.json.push(this.textNode)
    }

    stringParser() {
        this.addNewTextNode()

        parseString: while (this.si < this.slen) {
            switch(this.string[this.si]) {
                case '\\':
                    for (let command of LATEX_COMMANDS) {
                        if (this.string.substring(this.si, this.si + command[0].length) === command[0]) {
                            this.braceLevel++
                            this.si += command[0].length
                            this.checkAndAddNewTextNode()
                            // If immediately inside a brace that added case protection, remove case protection. See
                            // http://tex.stackexchange.com/questions/276943/biblatex-how-to-emphasize-but-not-caps-protect
                            if (
                                this.inCasePreserve===(this.braceLevel-1) &&
                                this.string[this.si-1] === '{' &&
                                this.currentMarks[this.currentMarks.length-1].type === 'nocase'
                            ) {
                                this.currentMarks.pop()
                                this.inCasePreserve = false
                            } else {
                                // Of not immediately inside a brace, any styling also
                                // adds case protection.
                                this.currentMarks.push({type:'nocase'})
                                this.inCasePreserve = this.braceLevel
                            }
                            this.currentMarks.push({type:command[1]})
                            this.textNode.marks = this.currentMarks.slice()
                            this.braceClosings.push(true)
                            continue parseString
                        }
                    }
                    if (LATEX_SPECIAL_CHARS.indexOf(this.string[this.si+1]) !== -1) {
                        this.textNode.text += this.string[this.si+1]
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
                    this.checkAndAddNewTextNode()
                    if (this.string.substring(this.si,this.si+2) === '_{') {
                        this.braceLevel++
                        this.si += 2
                        this.currentMarks.push({type:'sub'})
                        this.textNode.marks = this.currentMarks.slice()
                        this.braceClosings.push(true)
                    } else {
                        // We only add the next character to a sub node.
                        this.textNode.marks = this.currentMarks.slice()
                        this.textNode.marks.push({type:'sub'})
                        this.textNode.text = this.string[this.si+1]
                        this.addNewTextNode()
                        this.si += 2
                    }
                    break
                case '^':
                    this.checkAndAddNewTextNode()
                    if (this.string.substring(this.si,this.si+2) === '^{') {
                        this.braceLevel++
                        this.si += 2
                        this.currentMarks.push({type:'sup'})
                        this.textNode.marks = this.currentMarks.slice()
                        this.braceClosings.push(true)
                    } else {
                        // We only add the next character to a sub node.
                        this.textNode.marks = this.currentMarks.slice()
                        this.textNode.marks.push({type:'sup'})
                        this.textNode.text = this.string[this.si+1]
                        this.addNewTextNode()
                        this.si += 2
                    }
                    break
                case '{':
                    this.braceLevel++
                    if (this.inCasePreserve) {
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
                                this.inCasePreserve = false
                                // The last tag may have added more tags. The
                                // lowest level will be the case preserving one.
                                while(lastMark.type !== 'nocase' && this.currentMarks.length) {
                                    lastMark = this.currentMarks.pop()
                                }
                            }
                            if (this.currentMarks.length) {
                                this.textNode.marks = this.currentMarks.slice()
                            }
                        }
                        this.si++
                        continue parseString
                    } else {
                    // A brace was closed before it was opened. Abort and return the original string.
                    return [{type: 'text', text: this.string}]
                    }
                    break
                case '$':
                    // math env, just remove
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

        // If the very last text node has no content, remove it.
        if (this.json[this.json.length-1].text.length === 0) {
            this.json.pop()
        }
        // Braces were accurate.
        return this.json
    }

    get output() {
        let openBraces = ((this.string.match(/\{/g) || []).length),
            closeBraces = ((this.string.match(/\}/g) || []).length)
        if (openBraces === 0 && closeBraces === 0) {
            // There are no braces, return the original value
            return [{type: 'text', text: this.string}]
        } else if (openBraces != closeBraces) {
            // There are different amount of open and close braces, so we return the original string.
            return [{type: 'text', text: this.string}]
        } else {
            // There are the same amount of open and close braces, but we don't
            // know if they are in the right order.
            return this.stringParser()
        }
    }
}
