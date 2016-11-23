export class BibLatexLiteralParser {
    constructor(string) {
        this.string = string
    }

    get output() {
        let theValue = this.string
        let openBraces = ((theValue.match(/\{/g) || []).length),
            closeBraces = ((theValue.match(/\}/g) || []).length)
        if (openBraces === 0 && closeBraces === 0) {
            // There are no braces, return the original value
            return [{type: 'text', text: theValue}]
        } else if (openBraces != closeBraces) {
            // There are different amount of open and close braces, so we return the original string.
            return [{type: 'text', text: theValue}]
        } else {
            // There are the same amount of open and close braces, but we don't
            // know if they are in the right order.
            let braceLevel = 0
            let len = theValue.length
            let i = 0
            let output = []
            let braceClosings = []
            let currentMarks = []
            let inCasePreserve = false
            let textNode = {type: 'text', text: ''}
            output.push(textNode)
            const latexCommands = [
                ['\\textbf{', 'strong'],
                ['\\mkbibbold{', 'strong'],
                ['\\mkbibitalic{', 'em'],
                ['\\mkbibemph{', 'em'],
                ['\\textit{', 'em'],
                ['\\emph{', 'em'],
                ['\\textsc{', 'smallcaps'],
                ['\\enquote{', 'enquote']
            ]
            parseString: while (i < len) {
                if (theValue[i] === '\\') {

                    for (let s of latexCommands) {
                        if (theValue.substring(i, i + s[0].length) === s[0]) {
                            braceLevel++
                            i += s[0].length
                            if (textNode.text.length > 0) {
                                // We have text in the last node already,
                                // so we need to start a new text node.
                                textNode = {type: 'text', text: ''}
                                output.push(textNode)
                            }
                            // If immediately inside a brace that added case protection, remove case protection. See
                            // http://tex.stackexchange.com/questions/276943/biblatex-how-to-emphasize-but-not-caps-protect
                            if (
                                inCasePreserve===(braceLevel-1) &&
                                theValue[i-1] === '{' &&
                                currentMarks[currentMarks.length-1].type === 'nocase'
                            ) {
                                currentMarks.pop()
                                inCasePreserve = false
                            } else {
                                // Of not immediately inside a brace, any styling also
                                // adds case protection.
                                currentMarks.push({type:'nocase'})
                                inCasePreserve = braceLevel
                            }
                            currentMarks.push({type:s[1]})
                            textNode.marks = currentMarks.slice()
                            braceClosings.push(true)
                            continue parseString
                        }
                    }

                    if (i + 1 < len) {
                        textNode.text += theValue[i+1]
                        i+=2
                        continue parseString
                    }

                }
                if (theValue[i] === '_') {
                    if (textNode.text.length > 0) {
                        // We have text in the last node already,
                        // so we need to start a new text node.
                        textNode = {type: 'text', text: ''}
                        output.push(textNode)
                    }
                    if (theValue.substring(i,i+2) === '_{') {
                        braceLevel++
                        i+=2
                        currentMarks.push({type:'sub'})
                        textNode.marks = currentMarks.slice()
                        braceClosings.push(true)
                    } else {
                        // We only add the next character to a sub node.
                        textNode.marks = currentMarks.slice()
                        textNode.marks.push({type:'sub'})
                        textNode.text = theValue[i+1]
                        textNode = {type: 'text', text: ''}
                        output.push(textNode)
                        i+=2
                    }
                }
                if (theValue[i] === '^') {
                    if (textNode.text.length > 0) {
                        // We have text in the last node already,
                        // so we need to start a new text node.
                        textNode = {type: 'text', text: ''}
                        output.push(textNode)
                    }
                    if (theValue.substring(i,i+2) === '^{') {
                        braceLevel++
                        i+=2
                        currentMarks.push({type:'sup'})
                        textNode.marks = currentMarks.slice()
                        braceClosings.push(true)
                    } else {
                        // We only add the next character to a sub node.
                        textNode.marks = currentMarks.slice()
                        textNode.marks.push({type:'sup'})
                        textNode.text = theValue[i+1]
                        textNode = {type: 'text', text: ''}
                        output.push(textNode)
                        i+=2
                    }
                }
                if (theValue[i] === '{') {
                    braceLevel++
                    if (inCasePreserve) {
                        // If already inside case preservation, do not add a second
                        braceClosings.push(false)
                    } else {
                        inCasePreserve = braceLevel
                        if (textNode.text.length > 0) {
                            // We have text in the last node already,
                            // so we need to start a new text node.
                            textNode = {type: 'text', text: ''}
                            output.push(textNode)
                        }
                        currentMarks.push({type:'nocase'})
                        textNode.marks = currentMarks.slice()
                        braceClosings.push(true)
                    }
                    i++
                    continue parseString
                }
                if (theValue[i] === '}') {
                    braceLevel--
                    if (braceLevel > -1) {
                        let closeBrace = braceClosings.pop()
                        if (closeBrace) {
                            if (textNode.text.length > 0 && theValue.length > i+1) {
                                // We have text in the last node already,
                                // so we need to start a new text node.
                                textNode = {type: 'text', text: ''}
                                output.push(textNode)
                            }
                            let lastMark = currentMarks.pop()
                            if (inCasePreserve===(braceLevel+1)) {
                                inCasePreserve = false
                                // The last tag may have added more tags. The
                                // lowest level will be the case preserving one.
                                while(lastMark.type !== 'nocase' && currentMarks.length) {
                                    lastMark = currentMarks.pop()
                                }
                            }
                            if (currentMarks.length) {
                                textNode.marks = currentMarks.slice()
                            }
                        }
                        i++
                        continue parseString
                    }
                }
                if (braceLevel < 0) {
                    // A brace was closed before it was opened. Abort and return the original string.
                    return theValue
                }
                // math env, just remove
                if (theValue[i] === '$') {
                    i++
                    continue parseString
                }
                textNode.text += theValue[i]
                i++
            }

            if (braceLevel > 0) {
                // Too many opening braces, we return the original string.
                return [{type: 'text', text: theValue}]
            }

            // If the very last text node has no content, remove it.
            if (output[output.length-1].text.length === 0) {
                output.pop()
            }
            // Braces were accurate.
            return output
        }
    }
}
