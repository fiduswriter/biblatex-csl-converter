import {
    BibLatexParser,
    BibLatexExporter,
    CSLExporter,
    edtfParse,
    type BibDB,
} from ".."

Object.assign(globalThis, {
    BibLatexParser,
    BibLatexExporter,
    CSLExporter,
    edtfParse,
})

type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue }

function printObject(object: JSONValue): string {
    let html = ""
    switch (typeof object) {
        case "object":
            if (object === null) {
                html += "null"
            } else if (Array.isArray(object)) {
                html += "["
                object.forEach((item, index) => {
                    html += printObject(item as JSONValue)
                    if (index + 1 < object.length) {
                        html += ", "
                    }
                })
                html += "]"
            } else {
                html += "<table>"
                Object.keys(object).forEach((key) => {
                    const valueHtml = printObject(
                        (object as Record<string, JSONValue>)[key]
                    )
                    html += `<tr><td>${key}: </td><td>${valueHtml}</td></tr>`
                })
                html += "</table>"
            }
            break
        case "boolean":
        case "number":
            html += String(object)
            break
        case "string":
            html += object
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
            break
    }
    return html
}

function importBiblatex(bibString: string): void {
    const t0 = performance.now()
    const parser = new BibLatexParser(bibString, {
        processUnexpected: true,
        processUnknown: {
            collaborator: "l_name",
        },
    })
    const { entries: bibDB, errors } = parser.parse()
    if (errors.length) {
        console.log(errors)
    }
    const bibDbEl = document.getElementById("bib-db")
    if (bibDbEl) {
        bibDbEl.innerHTML = printObject(bibDB as unknown as JSONValue)
    }
    Object.assign(globalThis, { bibDB })
    exportCSL(bibDB)
    exportBibLatex(bibDB)
    const t1 = performance.now()
    console.log(`Total: ${t1 - t0} milliseconds`)
}

function exportCSL(bibDB: BibDB): void {
    const exporter = new CSLExporter(bibDB)
    const cslDB = exporter.output
    const cslDbEl = document.getElementById("csl-db")
    if (cslDbEl) {
        cslDbEl.innerHTML = printObject(cslDB as unknown as JSONValue)
    }
}

function exportBibLatex(bibDB: BibDB): void {
    const exporter = new BibLatexExporter(bibDB)
    const biblatex = exporter.output.split("\n").join("<br>")
    const biblatexEl = document.getElementById("biblatex")
    if (biblatexEl) {
        biblatexEl.innerHTML = biblatex
    }
}

function setSpinners(): void {
    const spinner = '<div class="spinner"></div>'
    const bibDbEl = document.getElementById("bib-db")
    const cslDbEl = document.getElementById("csl-db")
    const biblatexEl = document.getElementById("biblatex")
    if (bibDbEl) bibDbEl.innerHTML = spinner
    if (cslDbEl) cslDbEl.innerHTML = spinner
    if (biblatexEl) biblatexEl.innerHTML = spinner
}

function readBibPaste(event: ClipboardEvent): void {
    setSpinners()
    const clipBoardText = event.clipboardData?.getData("text") ?? ""
    setTimeout(() => {
        importBiblatex(clipBoardText)
    }, 500)
}

function readBibFile(): void {
    setSpinners()
    // Add timeout so that spinners are shown before processing of file starts.
    setTimeout(() => {
        const fileUpload = document.getElementById(
            "file-upload"
        ) as HTMLInputElement | null
        if (fileUpload?.files?.length) {
            const fr = new FileReader()
            fr.onload = (event) => {
                importBiblatex(event.target?.result as string)
            }
            fr.readAsText(fileUpload.files[0])
        }
    }, 500)
}

document.getElementById("file-upload")?.addEventListener("change", readBibFile)
document
    .getElementById("paste-input")
    ?.addEventListener("paste", readBibPaste as EventListener, false)
