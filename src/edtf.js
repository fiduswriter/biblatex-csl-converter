import edtf from 'edtf/src/parser'

export function edtfParse(dateString) {
    return edtf.parse(
        // Convert to edtf draft spec format supported by edtf.js
        dateString.replace(/^y/, 'Y')
            .replace(/unknown/g, '*')
            .replace(/open/g, '')
            .replace(/u/g, 'X')
            .replace(/\?~/g, '%')
    )
}

export function edtfCheck(dateString) {
    // check if date is valid edtf string (level 0 or 1).
    try {
        let dateObj = edtfParse(dateString)
        if (
            dateObj.level < 2 && (
                (dateObj.type==='Date' && dateObj.values) ||
                (dateObj.type==='Season' && dateObj.values) ||
                (dateObj.type==='Interval' && dateObj.values[0].values && dateObj.values[1].values)
            )
        ) {
            return true
        } else {
            return false
        }
    } catch(err) {
        return false
    }
}
