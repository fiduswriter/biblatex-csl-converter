import {parse} from "../lib/edtf/src/parser"

export function edtfParse(dateString) {
    return parse(
        // Convert to edtf draft spec format supported by edtf.js
        dateString.replace(/^y/, 'Y')
            .replace(/unknown/g, '*')
            .replace(/open/g, '')
            .replace(/u/g, 'X')
            .replace(/\?~/g, '%')
    )
}
