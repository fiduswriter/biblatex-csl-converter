// split at each occurence of splitToken, but only if no braces are currently open.
export function splitTeXString(texString, splitToken='and') {
    let output = []
    let tokenRe = /([^\s{}]+|\s|{|})/g
    let j = 0
    let k = 0
    let item
    while ((item = tokenRe.exec(texString)) !== null) {
        let token = item[0]
        if (k === output.length) {
            output.push('')
        }
        if ('{' === token) {
            j += 1
        }
        if ('}' === token){
            j -= 1
        }
        if (splitToken === token && 0 === j) {
            k += 1
        } else {
            output[k] += token
        }
    }
    return output
}
