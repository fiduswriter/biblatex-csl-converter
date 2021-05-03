import { TexSpecialChars } from "./const"
import { BibTypes, BibFieldTypes, NodeArray, NodeObject } from "../const"

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

export interface TagEntry {
    open: string
    close: string
    verbatim: boolean
}

export interface Tags {
    [key: string]: TagEntry
}

const TAGS: Tags = {
    strong: { open: "\\mkbibbold{", close: "}", verbatim: false },
    em: { open: "\\mkbibitalic{", close: "}", verbatim: false },
    smallcaps: { open: "\\textsc{", close: "}", verbatim: false },
    enquote: { open: "\\enquote{", close: "}", verbatim: false },
    nocase: { open: "{{", close: "}}", verbatim: false },
    sub: { open: "_{", close: "}", verbatim: false },
    sup: { open: "^{", close: "}", verbatim: false },
    math: { open: "$", close: "$", verbatim: false },
    url: { open: "\\url{", close: "}", verbatim: true },
}

import type { BibDB } from "../import/biblatex"

type ConfigObject = {
    traditionalNames?: boolean
    exportUnexpectedFields?: boolean
}

type BibObject = {
    type: string
    key: string
    values?: Record<string, unknown>
}

type WarningObject = {
    type: string
    variable: string
}

export class BibLatexExporter {
    bibDB: BibDB
    pks: Array<string>
    config: ConfigObject
    warnings: Array<WarningObject>
    bibtexStr: string
    bibtexArray: Array<BibObject>

    constructor(
        bibDB: BibDB,
        pks: Array<string> | false = false,
        config: ConfigObject = {}
    ) {
        this.bibDB = bibDB // The bibliography database to export from.
        if (pks) {
            this.pks = pks // A list of pk values of the bibliography items to be exported.
        } else {
            this.pks = Object.keys(bibDB) // If none are selected, all keys are exporter
        }
        this.config = config
        this.warnings = []
        this.bibtexArray = []
        this.bibtexStr = ""
    }

    get output(): string {
        console.warn(
            "BibLatexExporter.output will be deprecated in biblatex-csl-converter 2.x. Use BibLatexExporter.parse() instead."
        )
        return this.parse()
    }

    parse(): string {
        this.pks.forEach((pk) => {
            let bib = this.bibDB[(pk as unknown) as number]
            let bibEntry: BibObject = {
                type: BibTypes[bib["bib_type"]]["biblatex"],
                key: bib["entry_key"].length ? bib["entry_key"] : "Undefined",
            }
            let fValues: Record<string, unknown> = {}
            if (BibTypes[bib["bib_type"]]["biblatex-subtype"]) {
                fValues["entrysubtype"] =
                    BibTypes[bib["bib_type"]]["biblatex-subtype"]
            }
            const fields = this.config.exportUnexpectedFields
                ? { ...bib.fields, ...bib.unexpected_fields }
                : bib.fields
            for (let fKey in fields) {
                if (!(fKey in BibFieldTypes)) {
                    continue
                }
                let fValue = fields[fKey]
                let fType: string = BibFieldTypes[fKey]["type"]
                let key: string = BibFieldTypes[fKey]["biblatex"]
                switch (fType) {
                    case "f_date":
                        fValues[key] = fValue // EDTF 1.0 level 0/1 compliant string.
                        break
                    case "f_integer":
                        fValues[key] = this._reformText(fValue)
                        break
                    case "f_key":
                        fValues[key] = this._reformKey(fValue, fKey)
                        break
                    case "f_literal":
                    case "f_long_literal":
                        fValues[key] = this._reformText(fValue)
                        break
                    case "l_range":
                        fValues[key] = this._reformRange(fValue)
                        break
                    case "f_title":
                        fValues[key] = this._reformText(fValue)
                        break
                    case "f_uri":
                    case "f_verbatim":
                        fValues[key] = (fValue as string).replace(/{|}/g, "") // TODO: balanced braces should probably be ok here.
                        break
                    case "l_key":
                        fValues[key] = this._escapeTeX(
                            (fValue as (string | NodeArray)[])
                                .map((key: string | NodeArray) => {
                                    return this._reformKey(key, fKey)
                                })
                                .join(" and ")
                        )
                        break
                    case "l_literal":
                        fValues[key] = (fValue as NodeArray[])
                            .map((text: NodeArray) => {
                                return this._reformText(text)
                            })
                            .join(" and ")
                        break
                    case "l_name":
                        fValues[key] = this._reformName(fValue)
                        break
                    case "l_tag":
                        fValues[key] = this._escapeTeX(
                            (fValue as string[]).join(", ")
                        )
                        break
                    default:
                        console.warn(`Unrecognized type: ${fType}!`)
                }
            }
            bibEntry.values = fValues
            this.bibtexArray[this.bibtexArray.length] = bibEntry
        })

        this.bibtexStr = this._getBibtexString(this.bibtexArray)
        return this.bibtexStr
    }

    _reformKey(theValue: string | unknown, fKey: string): string {
        if (typeof theValue === "string") {
            let fieldType = BibFieldTypes[fKey]
            if (Array.isArray(fieldType["options"])) {
                return this._escapeTeX(theValue)
            } else {
                return this._escapeTeX(
                    fieldType.options?.[theValue]["biblatex"] ?? ""
                )
            }
        } else {
            return this._reformText(theValue)
        }
    }

    _reformRange(theValue: unknown): string {
        if (!Array.isArray(theValue)) {
            console.warn(`Wrong format for reformRange`, theValue)
            return ""
        }
        return theValue
            .map((range) => this._reformInterval(range))
            .filter((interval) => interval.length)
            .join(",")
    }

    _reformInterval(theValue: unknown): string {
        if (!Array.isArray(theValue)) {
            console.warn(`Wrong format for reformInterval`, theValue)
            return ""
        }
        return theValue.map((text) => this._reformText(text)).join("--")
    }

    _reformName(theValue: unknown): string {
        if (!Array.isArray(theValue)) {
            console.warn(`Wrong format for reformName`, theValue)
            return ""
        }
        let names: string[] = []
        theValue.forEach((name) => {
            if (name.literal) {
                let literal = this._reformText(name.literal)
                if (literal.length) {
                    names.push(`{${literal}}`)
                }
            } else {
                let family = name.family ? this._reformText(name.family) : ""
                let given = name.given ? this._reformText(name.given) : ""
                let suffix = name.suffix ? this._reformText(name.suffix) : false
                let prefix = name.prefix ? this._reformText(name.prefix) : false
                let useprefix = name.useprefix ? name.useprefix : false
                if (this.config.traditionalNames) {
                    if (suffix && prefix) {
                        names.push(
                            `{${prefix} ${family}}, {${suffix}}, {${given}}`
                        )
                    } else if (suffix) {
                        names.push(`{${family}}, {${suffix}}, {${given}}`)
                    } else if (prefix) {
                        names.push(`{${prefix} ${family}}, {${given}}`)
                    } else {
                        names.push(`{${family}}, {${given}}`)
                    }
                } else {
                    let nameParts = []
                    if (given.length) {
                        nameParts.push(
                            this._protectNamePart(`given={${given}}`)
                        )
                    }
                    if (family.length) {
                        nameParts.push(
                            this._protectNamePart(`family={${family}}`)
                        )
                    }
                    if (suffix) {
                        nameParts.push(
                            this._protectNamePart(`suffix={${suffix}}`)
                        )
                    }
                    if (prefix) {
                        nameParts.push(
                            this._protectNamePart(`prefix={${prefix}}`)
                        )
                        nameParts.push(`useprefix=${String(useprefix)}`)
                    }
                    names.push(nameParts.join(", "))
                }
            }
        })
        return names.join(" and ")
    }

    _protectNamePart(namePart: string): string {
        if (namePart.includes(",")) {
            return `"${namePart}"`
        } else {
            return namePart
        }
    }

    _escapeTeX(theValue: unknown): string {
        if (typeof theValue !== "string") {
            console.warn(`Wrong format for escapeTeX`, theValue)
            return ""
        }
        let len = TexSpecialChars.length
        for (let i = 0; i < len; i++) {
            theValue = (theValue as string).replace(
                TexSpecialChars[i][0],
                TexSpecialChars[i][1]
            )
        }
        return theValue as string
    }

    _reformText(theValue: unknown): string {
        let latex = "",
            lastMarks: string[] = []
        if (!Array.isArray(theValue)) {
            console.warn(`Wrong format for reformText`, theValue)
            return latex
        }
        // Add one extra empty node to theValue to close all still open tags for last node.
        theValue
            .concat({ type: "text", text: "" })
            .forEach((node: NodeObject) => {
                if (node.type === "variable") {
                    // This is an undefined variable
                    // This should usually not happen, as CSL doesn't know what to
                    // do with these. We'll put them into an unsupported tag.
                    latex += `} # ${node.attrs!.variable} # {`
                    this.warnings.push({
                        type: "undefined_variable",
                        variable: node.attrs!.variable as string,
                    })
                    return
                }
                let newMarks: string[] = []
                if (node.marks) {
                    let mathMode = false
                    node.marks.forEach((mark) => {
                        // We need to activate mathmode for the lowest level sub/sup node.
                        if (
                            (mark.type === "sup" || mark.type === "sub") &&
                            !mathMode
                        ) {
                            newMarks.push("math")
                            newMarks.push(mark.type)
                            mathMode = true
                        } else if (mark.type === "nocase") {
                            // No case has to be applied at the top level to be effective.
                            newMarks.unshift(mark.type)
                        } else {
                            newMarks.push(mark.type)
                        }
                    })
                }
                // close all tags that are not present in current text node.
                let closing = false,
                    closeTags: string[] = []
                lastMarks.forEach((mark, index) => {
                    if (mark != newMarks[index]) {
                        closing = true
                    }
                    if (closing) {
                        let closeTag = TAGS[mark].close
                        // If not inside of a nocase, add a protective brace around tag.
                        if (
                            lastMarks[0] !== "nocase" &&
                            TAGS[mark].open[0] === "\\"
                        ) {
                            closeTag += "}"
                        }
                        closeTags.push(closeTag)
                    }
                })
                // Add close tags to latex in reverse order to close innermost tags
                // first.
                closeTags.reverse()
                latex += closeTags.join("")

                // open all new tags that were not present in the last text node.
                let opening = false,
                    verbatim = false
                newMarks.forEach((mark, index) => {
                    if (mark != lastMarks[index]) {
                        opening = true
                    }
                    if (opening) {
                        // If not inside of a nocase, add a protective brace around tag.
                        if (
                            newMarks[0] !== "nocase" &&
                            TAGS[mark].open[0] === "\\"
                        ) {
                            latex += "{"
                        }
                        latex += TAGS[mark].open
                        if (TAGS[mark].verbatim) {
                            verbatim = true
                        }
                    }
                })
                if ("text" in node) {
                    if (verbatim) {
                        latex += node.text
                    } else {
                        latex += this._escapeTeX(node.text)
                    }
                }
                lastMarks = newMarks
            })
        return latex
    }

    _getBibtexString(biblist: Array<BibObject>): string {
        const len = biblist.length
        let str = ""
        for (let i = 0; i < len; i++) {
            if (0 < i) {
                str += "\n\n"
            }
            const data = biblist[i]
            str += `@${data.type}{${data.key}`
            for (let vKey in data.values) {
                let value = `{${data.values[vKey]}}`
                    .replace(/\{\} # /g, "")
                    .replace(/# \{\}/g, "")
                str += `,\n${vKey} = ${value}`
            }
            str += "\n}"
        }
        return str
    }
}
