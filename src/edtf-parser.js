//import edtf from 'edtf'

// Class to do a simple check for level 0 and 1 while waiting for a compatible
// edtf.js version and figuring out if the license is OK.
// It has an interface that is similar to the part of edtf.js we use so that we
// can quickly switch back.

class SimpleEDTFParser {
    constructor(string) {
        this.string = string
        this.type = 'None' // default
        this.valid = true // default
        this.values = false
        this.uncertain = false
        this.approximate = false
    }

    init() {
        this.checkCertainty()
        this.splitInterval()
        return {
            type: this.type,
            valid: this.valid,
            values: this.values
        }
    }

    checkCertainty() {
        if (this.string.slice(-1)==='~') {
            this.approximate = true
            this.string = this.string.slice(0, -1)
        }
        if (this.string.slice(-1)==='?') {
            this.uncertain = true
            this.string = this.string.slice(0, -1)
        }
    }

    splitInterval() {
        let parts = this.string.split('/')
        if (parts.length > 2) {
            this.valid = false
        } else if (parts.length === 2) {
            this.type = 'Interval'
            let from = new SimpleEDTFParser(parts[0])
            let to = new SimpleEDTFParser(parts[1])
            this.values = [from.init(), to.init()]
            if (!from.valid || !to.valid) {
                this.valid = false
            }
        } else {
            this.splitDateParts()
        }

    }

    splitDateParts() {
        let parts = this.string.replace(/^y/, '').split(/(?!^)-/)

        if (parts.length > 3) {
            this.valid = false
            return
        }
        let certain = true
        let year = parts[0]
        let yearChecker = new RegExp('^-?[0-9]*u{0,2}$|^0$') // 1994, 19uu, -234, 187u, 0, 1984?~, etc.
        if (!yearChecker.test(year)) {
            this.valid = false
            return
        }
        if (year.slice(-1) === 'u') {
            certain = false
            this.type = 'Interval'
            let from = new SimpleEDTFParser(year.replace(/u/g,'0'))
            let to = new SimpleEDTFParser(year.replace(/u/g,'9'))
            this.values = [from.init(), to.init()]
            if (!from.valid || !to.valid) {
                this.valid = false
            }
        } else {
            this.values = [parseInt(year)]
            this.type = 'Date'
        }

        if (parts.length < 2) {
            return
        }

        // Month / Season

        let month = parts[1]
        if (!certain && month !== 'uu') {
            // End of year uncertain but month specified. Invalid
            this.valid = false
            return
        }
        let monthChecker = new RegExp('^[0-2][0-9]|uu$') // uu or 01, 02, 03, ..., 11, 12
        let monthInt = parseInt(month.replace('uu','01'))
        if(
            !monthChecker.test(month) ||
            monthInt < 1 ||
            (monthInt > 12 && monthInt < 21) ||
            monthInt > 24
        ) {
            this.valid = false
            return
        }
        if (month === 'uu') {
            certain = false
        }

        if (certain) {
            this.values.push(monthInt - 1)
        }

        if (parts.length < 3) {
            if (monthInt > 12) {
                this.type = 'Season'
            }
            return
        }
        if (monthInt > 12) {
            // Season + day - invalid
            this.valid = false
            return
        }

        // Day

        let day = parts[2].split('T')[0] // forget about time
        if (!certain && day !== 'uu') {
            // Month uncertain but day specified. Invalid
            this.valid = false
            return
        }
        let dayChecker = new RegExp('^[0-3][0-9]$|uu') // uu or 01, 02, 03, ..., 11, 12
        let dayInt = parseInt(day.replace('uu','01'))
        if(
            !dayChecker.test(month) ||
            dayInt < 1 ||
            dayInt > 31
        ) {
            this.valid = false
            return
        }
        if (day === 'uu') {
            certain = false
        }

        if (certain) {

            let testDate = new Date(`${year}/${month}/${day}`)

            if (
                testDate.getFullYear() !== parseInt(year) ||
                testDate.getMonth() + 1 !== monthInt ||
                testDate.getDate() !== dayInt
            ) {
                this.valid = false
                return
            }

            this.values.push(dayInt)
        }

    }

}


export function edtfParse(dateString) {

    let parser = new SimpleEDTFParser(dateString)
    return parser.init()
    /*return edtf.parse(
        // Convert to edtf draft spec format supported by edtf.js
        dateString.replace(/^y/, 'Y')
            .replace(/unknown/g, '*')
            .replace(/open/g, '')
            .replace(/u/g, 'X')
            .replace(/\?~/g, '%')
    )*/
}

export function edtfCheck(dateString) {
    // check if date is valid edtf string (level 0 or 1).
    let parser = new SimpleEDTFParser(dateString)
    let dateObj = parser.init()
    return dateObj.valid

    /*try {
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
    }*/
}
