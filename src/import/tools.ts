// split at each occurence of splitToken, but only if no braces are currently open.
export function splitTeXString(
    texString: string,
    splitToken = "and"
): Array<string> {
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
