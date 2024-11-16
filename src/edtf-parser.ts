// Class to do a simple check for level 0 and 1 while waiting for a compatible
// edtf.js version and figuring out if the license is OK.
// It has an interface that is similar to the part of edtf.js we use so that we
// can quickly switch back.

// Notice: this allows open ended date ranges and it uses 1-12 rather than 0-11 for months.

type SimpleDateArray = Array<string | number>

type DateArray = readonly (string | number | SimpleDateArray)[]

interface EDTFOutputObject {
    type: string
    valid: boolean
    values: DateArray
    cleanedString: string
    uncertain: boolean
    approximate: boolean
}

class SimpleEDTFParser {
    string: string
    type: string
    valid: boolean
    values: SimpleDateArray
    uncertain: boolean
    approximate: boolean
    parts: SimpleEDTFParser[]

    constructor(string: unknown) {
        if (!(typeof string === "string")) {
            console.warn(`Wrong format for EDTFParser`, string)
            string = ""
        }
        this.string = string as string
        this.type = "None" // default
        this.valid = true // default
        this.values = []
        this.uncertain = false
        this.approximate = false
        this.parts = []
    }

    init(): EDTFOutputObject {
        this.checkCertainty()
        this.splitInterval()
        return {
            type: this.type,
            valid: this.valid,
            values:
                this.type === "Interval" ? this.getPartValues() : this.values,
            cleanedString: this.cleanString(),
            uncertain: this.uncertain,
            approximate: this.approximate,
        }
    }

    getPartValues(): DateArray {
        if (this.parts.length === 0) {
            const emptyPart: DateArray = []
            return emptyPart
        } else if (this.parts.length === 1) {
            const datePart = this.parts[0].values
            return datePart
        } else {
            const datePartInterval = [
                this.parts[0].values,
                this.parts[1].values,
            ]
            return datePartInterval
        }
    }

    cleanString() {
        let cleanedString = ""
        if (this.parts.length) {
            cleanedString = this.parts
                .map((datePart) => datePart.cleanString())
                .join("/")
        } else if (this.values) {
            cleanedString = this.values.reduce((dateString, value, index) => {
                if (index === 0) {
                    if (typeof value === "number" && value > 0) {
                        return String(value).padStart(4, "0")
                    } else {
                        return String(value)
                    }
                } else if (index < 3) {
                    return `${dateString}-${String(value).padStart(2, "0")}`
                } else if (index === 3) {
                    return `${dateString}T${String(value).padStart(2, "0")}`
                } else if (index < 6) {
                    return `${dateString}:${String(value).padStart(2, "0")}`
                } else {
                    return `${dateString}${value}`
                }
            }, "") as string
        }
        if (this.uncertain) {
            cleanedString += "?"
        }
        if (this.approximate) {
            cleanedString += "~"
        }
        return cleanedString
    }

    checkCertainty() {
        if (this.string.slice(-1) === "~") {
            this.approximate = true
            this.string = this.string.slice(0, -1)
        }
        if (this.string.slice(-1) === "?") {
            this.uncertain = true
            this.string = this.string.slice(0, -1)
        }
    }

    splitInterval() {
        const normalizedString = this.string.replace(/--/, "/")
        let parts = normalizedString.split("/")
        if (parts.length > 2) {
            this.valid = false
        } else if (parts.length === 2) {
            this.type = "Interval"
            let valid = false
            parts.forEach((part) => {
                let parser = new SimpleEDTFParser(part)
                parser.init()
                if (parser.valid || parser.type === "Open") {
                    this.parts.push(parser)
                    if (parser.valid) {
                        valid = true
                    }
                } else {
                    this.valid = false
                }
            })
            if (!valid) {
                // From open to open is invalid
                this.valid = false
            }
        } else {
            this.splitDateParts()
        }
    }

    splitDateParts() {
        if (["", ".."].includes(this.string)) {
            // Empty string. Invalid by itself but could be valied as part of a range
            this.valid = false
            this.values = []
            this.type = "Open"
            return
        }

        let parts = this.string.replace(/^y/, "").split(/(?!^)-/)

        if (parts.length > 3) {
            this.valid = false
            return
        }
        let certain = true
        let year = parts[0]

        let yearChecker = /^-?[0-9]*u{0,4}$/ // 1994, 19uu, -234, 187u, 0, 1984?~, 1uuu, uuuu, etc.
        if (!yearChecker.test(year)) {
            this.valid = false
            return
        }
        if (year.slice(-1) === "u") {
            certain = false
            this.type = "Interval"
            let from = new SimpleEDTFParser(year.replace(/u/g, "0"))
            from.init()
            let to = new SimpleEDTFParser(year.replace(/u/g, "9"))
            to.init()
            this.parts = [from, to]
            if (!from.valid || !to.valid) {
                this.valid = false
            }
        } else {
            this.values = [parseInt(year)]
            this.type = "Date"
        }

        if (parts.length < 2) {
            return
        }

        // Month / Season

        let month = parts[1]
        if (!certain && month !== "uu") {
            // End of year uncertain but month specified. Invalid
            this.valid = false
            return
        }
        let monthChecker = /^([0-2][0-9]|[1-9])|uu$/ // uu or 1, 2, 3, ..., 01, 02, 03, ..., 11, 12
        let monthInt = parseInt(month.replace("uu", "01"))
        if (
            !monthChecker.test(month) ||
            monthInt < 1 ||
            (monthInt > 12 && monthInt < 21) ||
            monthInt > 24
        ) {
            this.valid = false
            return
        }
        if (month === "uu") {
            certain = false
        }

        if (certain) {
            this.values.push(monthInt)
        }

        if (parts.length < 3) {
            if (monthInt > 12) {
                this.type = "Season"
            }
            return
        }
        if (monthInt > 12) {
            // Season + day - invalid
            this.valid = false
            return
        }

        // Day

        let dayTime = parts[2].split("T"),
            day = dayTime[0]
        if (!certain && day !== "uu") {
            // Month uncertain but day specified. Invalid
            this.valid = false
            return
        }
        let dayChecker = /^[0-3][0-9]$|uu/ // uu or 01, 02, 03, ..., 11, 12
        let dayInt = parseInt(day.replace("uu", "01"))
        if (!dayChecker.test(month) || dayInt < 1 || dayInt > 31) {
            this.valid = false
            return
        }
        if (day === "uu") {
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

        if (dayTime.length < 2) {
            return
        }

        // Time

        if (!certain) {
            // Day uncertain but time specified
            this.valid = false
            return
        }

        let timeParts = dayTime[1]
            .slice(0, 8)
            .split(":")
            .map((part) => parseInt(part))

        if (
            timeParts.length !== 3 ||
            timeParts[0] < 0 ||
            timeParts[0] > 23 ||
            timeParts[1] < 0 ||
            timeParts[1] > 59 ||
            timeParts[2] < 0 ||
            timeParts[2] > 59
        ) {
            // Invalid time
            this.valid = false
            return
        }

        this.values = this.values.concat(timeParts)

        if (dayTime[1].length === 8) {
            // No timezone
            return
        }
        let timeZone = dayTime[1].slice(8)

        if (timeZone === "Z") {
            // Zulu
            this.values.push("Z")
            return
        }

        let tzChecker = RegExp("^[+-][0-1][0-9]:[0-1][0-9]$"),
            tzParts = timeZone.split(":").map((part) => parseInt(part))

        if (
            !tzChecker.test(timeZone) ||
            tzParts[0] < -11 ||
            tzParts[0] > 14 ||
            tzParts[1] < 0 ||
            tzParts[1] > 59
        ) {
            this.valid = false
            return
        } else {
            this.values.push(timeZone)
        }
        return
    }
}

export function edtfParse(dateString: string): EDTFOutputObject {
    let parser = new SimpleEDTFParser(dateString)
    return parser.init()
}
