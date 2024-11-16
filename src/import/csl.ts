import {
    BibTypes,
    BibFieldTypes,
    NodeArray,
    EntryObject,
    NameDictObject,
    RangeArray,
} from "../const"

interface CSLNameObject {
    literal?: string
    given?: string
    family?: string
    suffix?: string
    "non-dropping-particle"?: string
    "dropping-particle"?: string
}

interface CSLDateObject {
    "date-parts"?: [number[]] | [number[], number[]]
    circa?: boolean
}

export interface CSLEntry {
    id?: string
    type?: string
    [key: string]: unknown
}

interface ErrorObject {
    type: string
    field?: string
    value?: unknown
    entry?: string
}

export class CSLParser {
    input: Record<string, CSLEntry>
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]

    constructor(input: Record<string, CSLEntry>) {
        this.input = input
        this.entries = []
        this.errors = []
        this.warnings = []
    }

    parse(): Record<number, EntryObject> {
        // Convert each CSL entry to internal format
        for (const [id, entry] of Object.entries(this.input)) {
            const convertedEntry = this.convertEntry(entry, id)
            if (convertedEntry) {
                this.entries.push(convertedEntry)
            }
        }

        // Create numbered index like BibLatexParser
        const bibDB: Record<number, EntryObject> = {}
        this.entries.forEach((entry, index) => {
            bibDB[index + 1] = entry
        })

        return bibDB
    }

    private convertEntry(entry: CSLEntry, id: string): EntryObject | false {
        // Find matching BibTeX type
        const bibType = this.getBibType(entry.type || "")
        if (!bibType) {
            this.errors.push({
                type: "unknown_type",
                value: entry.type,
                entry: id,
            })
            return false
        }

        const fields: Record<string, unknown> = {}

        // Convert each field
        for (const [key, value] of Object.entries(entry)) {
            if (key === "type" || key === "id") continue

            const field = this.convertField(key, value, id)
            if (field) {
                fields[field[0]] = field[1]
            }
        }

        return {
            entry_key: id,
            bib_type: bibType,
            fields,
        }
    }

    private getBibType(cslType: string): string | false {
        // Find BibTeX type that maps to this CSL type
        return (
            Object.keys(BibTypes).find(
                (type) => BibTypes[type].csl === cslType
            ) || false
        )
    }

    private convertField(
        key: string,
        value: unknown,
        entryId: string
    ): [string, unknown] | false {
        // Find matching BibTeX field
        const bibField = Object.keys(BibFieldTypes).find((field) => {
            const csl = BibFieldTypes[field].csl
            const matches = typeof csl === "string" ? csl === key : csl?.[key]

            if (matches) {
                const bibType = this.getBibType(this.input[entryId].type || "")
                if (!bibType) return false

                const typeFields = BibTypes[bibType]
                return (
                    typeFields.required.includes(field) ||
                    typeFields.optional.includes(field) ||
                    typeFields.eitheror.includes(field)
                )
            }
            return false
        })

        if (!bibField) {
            this.warnings.push({
                type: "unknown_field",
                field: key,
                value,
                entry: entryId,
            })
            return false
        }

        // Convert the value based on field type
        const fieldType = BibFieldTypes[bibField].type
        let convertedValue: unknown

        switch (fieldType) {
            case "f_date":
                convertedValue = this.convertDate(value as CSLDateObject)
                break

            case "f_integer":
                convertedValue = this.convertInteger(value)
                break

            case "f_key":
                convertedValue = this.convertKey(value, bibField)
                break

            case "f_literal":
            case "f_long_literal":
                convertedValue = this.convertRichText(value as string)
                break

            case "l_range":
                convertedValue = this.convertRange(value as string)
                break

            case "f_title":
                convertedValue = this.convertRichText(value as string)
                break

            case "f_uri":
            case "f_verbatim":
                convertedValue = String(value)
                break

            case "l_key":
                convertedValue = this.convertKeyList(
                    value as string[],
                    bibField
                )
                break

            case "l_literal":
                convertedValue = this.convertLiteralList(value as string[])
                break

            case "l_name":
                convertedValue = this.convertNames(value as CSLNameObject[])
                break

            case "l_tag":
                convertedValue = this.convertTags(value as string[])
                break

            default:
                convertedValue = value
        }

        return [bibField, convertedValue]
    }

    private convertDate(date: CSLDateObject): string {
        if (!date["date-parts"]) return ""

        const parts = date["date-parts"][0]
        let dateStr = String(parts[0]) // Year

        if (parts[1]) {
            // Month
            dateStr += `-${String(parts[1]).padStart(2, "0")}`
            if (parts[2]) {
                // Day
                dateStr += `-${String(parts[2]).padStart(2, "0")}`
            }
        }

        if (date.circa) {
            dateStr += "~"
        }

        return dateStr
    }

    private convertNames(names: CSLNameObject[]): NameDictObject[] {
        return names.map((name) => {
            const nameObj: NameDictObject = {}

            if (name.literal) {
                nameObj.literal = this.convertRichText(name.literal)
            } else {
                if (name.family) {
                    nameObj.family = this.convertRichText(name.family)
                }
                if (name.given) {
                    nameObj.given = this.convertRichText(name.given)
                }
                if (name.suffix) {
                    nameObj.suffix = this.convertRichText(name.suffix)
                }
                if (name["non-dropping-particle"]) {
                    nameObj.prefix = this.convertRichText(
                        name["non-dropping-particle"]
                    )
                    nameObj.useprefix = true
                } else if (name["dropping-particle"]) {
                    nameObj.prefix = this.convertRichText(
                        name["dropping-particle"]
                    )
                    nameObj.useprefix = false
                }
            }

            return nameObj
        })
    }

    private convertInteger(value: unknown): NodeArray {
        const num = parseInt(String(value))
        return [
            {
                type: "text",
                text: isNaN(num) ? String(value) : String(num),
            },
        ]
    }

    private convertKey(value: unknown, fieldName: string): string {
        const stringValue = String(value).toLowerCase()
        const fieldType = BibFieldTypes[fieldName]

        if (fieldType.options) {
            if (Array.isArray(fieldType.options)) {
                // Simple list of options
                return fieldType.options.includes(stringValue)
                    ? stringValue
                    : ""
            } else {
                // Map of options (like langid)
                // Add type assertion here
                const options = fieldType.options as Record<
                    string,
                    { csl: string }
                >
                const option = Object.keys(options).find(
                    (key) => options[key].csl === stringValue
                )
                return option || ""
            }
        }
        return stringValue
    }

    private convertRange(value: string): RangeArray[] {
        return String(value)
            .split(",")
            .map((range) => {
                const parts = range.split(/[-–—]/)
                // Ensure we always return an array with exactly one element
                return [
                    parts.map((part) => ({
                        type: "text",
                        text: part.trim(),
                    })),
                ]
            })
    }

    private convertKeyList(
        values: string[],
        fieldName: string
    ): (string | NodeArray)[] {
        if (!Array.isArray(values)) {
            values = [String(values)]
        }
        return values.map((value) => this.convertKey(value, fieldName))
    }

    private convertLiteralList(values: string[]): NodeArray[] {
        if (!Array.isArray(values)) {
            values = [String(values)]
        }
        return values.map((value) => this.convertRichText(value))
    }

    private convertTags(values: string[]): string[] {
        if (!Array.isArray(values)) {
            values = [String(values)]
        }
        return values.map((value) => value.trim())
    }

    private convertRichText(text: string): NodeArray {
        if (typeof text !== "string") {
            return [{ type: "text", text: String(text) }]
        }

        // If no HTML tags present, return simple text node
        if (!text.includes("<")) {
            return [{ type: "text", text }]
        }

        const nodes: NodeArray = []
        let currentText = ""
        let currentMarks: { type: string }[] = []

        // Helper to add accumulated text as node
        const addTextNode = () => {
            if (currentText) {
                nodes.push({
                    type: "text",
                    text: currentText,
                    ...(currentMarks.length
                        ? { marks: [...currentMarks] }
                        : {}),
                })
                currentText = ""
            }
        }

        let i = 0
        while (i < text.length) {
            if (text[i] === "<") {
                const closeTag = text[i + 1] === "/"
                const tagEnd = text.indexOf(">", i)
                if (tagEnd === -1) {
                    currentText += text[i]
                    i++
                    continue
                }

                let tag = text.substring(closeTag ? i + 2 : i + 1, tagEnd)

                // Handle style attribute for small-caps
                if (tag.startsWith('span style="font-variant:small-caps;"')) {
                    tag = "smallcaps"
                } else if (tag.startsWith('span class="nocase"')) {
                    tag = "nocase"
                } else if (tag === "span") {
                    // Skip closing span tags
                    i = tagEnd + 1
                    continue
                }

                // Map HTML tags to internal mark types
                const markType = {
                    b: "strong",
                    i: "em",
                    sub: "sub",
                    sup: "sup",
                    smallcaps: "smallcaps",
                    nocase: "nocase",
                }[tag]

                if (markType) {
                    addTextNode()
                    if (closeTag) {
                        currentMarks = currentMarks.filter(
                            (mark) => mark.type !== markType
                        )
                    } else {
                        currentMarks.push({ type: markType })
                    }
                    i = tagEnd + 1
                    continue
                }
            }

            currentText += text[i]
            i++
        }

        addTextNode()
        return nodes
    }
}

export function parseCSL(
    input: Record<string, CSLEntry>
): Record<number, EntryObject> {
    return new CSLParser(input).parse()
}
