import {
    BibLatexParser,
    BibLatexExporter,
    CSLExporter,
    CSLParser,
    EndNoteParser,
    RISParser,
    ENWParser,
    CitaviParser,
    edtfParse,
    locales,
    getLocale,
    getFieldTitle,
    getTypeTitle,
    getFieldHelp,
    getLangidTitle,
    getOtherOptionTitle,
    type BibDB,
} from ".."

// ─── Expose everything on globalThis for inline browser scripts ──────────────

Object.assign(globalThis, {
    BibLatexParser,
    BibLatexExporter,
    CSLExporter,
    CSLParser,
    EndNoteParser,
    RISParser,
    ENWParser,
    CitaviParser,
    edtfParse,
    locales,
    getLocale,
    getFieldTitle,
    getTypeTitle,
    getFieldHelp,
    getLangidTitle,
    getOtherOptionTitle,
})

// ─── Types ───────────────────────────────────────────────────────────────────

type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue }

// ─── Sample BibLaTeX data ─────────────────────────────────────────────────────

const SAMPLE_BIBLATEX = `% Sample bibliography — covers five common entry types.
% Load it with the "Try a sample" button to explore the converter.

@article{einstein1905,
  author       = {Einstein, Albert},
  title        = {Zur Elektrodynamik bewegter {Körper}},
  journaltitle = {Annalen der Physik},
  year         = {1905},
  volume       = {322},
  number       = {10},
  pages        = {891--921},
  doi          = {10.1002/andp.19053221004},
  langid       = {german},
}

@book{knuth1997,
  author    = {Knuth, Donald E.},
  title     = {The Art of Computer Programming},
  subtitle  = {Fundamental Algorithms},
  volume    = {1},
  edition   = {3},
  publisher = {Addison-Wesley},
  location  = {Reading, MA},
  year      = {1997},
  isbn      = {978-0-201-89683-1},
}

@inproceedings{turing1950,
  author    = {Turing, Alan M.},
  title     = {Computing Machinery and Intelligence},
  booktitle = {Mind},
  year      = {1950},
  volume    = {59},
  number    = {236},
  pages     = {433--460},
  doi       = {10.1093/mind/LIX.236.433},
}

@thesis{curie1903,
  author      = {Curie, Marie},
  title       = {Recherches sur les substances radioactives},
  type        = {phdthesis},
  institution = {Université de Paris},
  location    = {Paris},
  year        = {1903},
  langid      = {french},
}

@online{berners-lee1992,
  author  = {Berners-Lee, Tim},
  title   = {A Proposal for {HTML}},
  url     = {https://www.w3.org/History/19921103-hypertext/hypertext/WWW/MarkUp/MarkUp.html},
  urldate = {2024-01-15},
  year    = {1992},
}
`

// ─── State ───────────────────────────────────────────────────────────────────

let currentBibDB: BibDB = {}
let currentLang = "en"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEl<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function printObject(object: JSONValue): string {
    let html = ""
    switch (typeof object) {
        case "object":
            if (object === null) {
                html += '<span class="val-null">null</span>'
            } else if (Array.isArray(object)) {
                html += '<span class="bracket">[</span>'
                object.forEach((item, index) => {
                    html += printObject(item as JSONValue)
                    if (index + 1 < object.length) html += ", "
                })
                html += '<span class="bracket">]</span>'
            } else {
                html += '<table class="obj-table">'
                Object.keys(object).forEach((key) => {
                    const valueHtml = printObject(
                        (object as Record<string, JSONValue>)[key]
                    )
                    html += `<tr><td class="obj-key">${escapeHtml(
                        key
                    )}</td><td>${valueHtml}</td></tr>`
                })
                html += "</table>"
            }
            break
        case "boolean":
        case "number":
            html += `<span class="val-prim">${String(object)}</span>`
            break
        case "string":
            html += `<span class="val-str">${escapeHtml(object)}</span>`
            break
    }
    return html
}

// ─── Localised BibDB renderer ────────────────────────────────────────────────

function renderBibDB(bibDB: BibDB): string {
    const locale = getLocale(currentLang)
    let html = ""

    for (const [, entry] of Object.entries(bibDB)) {
        const typeKey = entry.bib_type as string
        const typLabel = getTypeTitle(locale, typeKey)
        const entryKey = (entry.entry_key as string) ?? ""

        html += `<details class="entry-block" open>`
        html += `<summary><span class="entry-key">${escapeHtml(
            entryKey
        )}</span>`
        html += ` <span class="entry-type-badge">${escapeHtml(typLabel)}</span>`
        html += `</summary>`
        html += `<table class="field-table">`

        const fields = entry.fields as Record<string, unknown>
        for (const [fieldKey, value] of Object.entries(fields)) {
            const fieldLabel = getFieldTitle(locale, typeKey, fieldKey)
            const help = getFieldHelp(locale, fieldKey)
            html += `<tr>`
            html += `<td class="field-label">`
            html += escapeHtml(fieldLabel)
            if (help) {
                html += ` <span class="field-help" title="${escapeHtml(
                    help.replace(/<[^>]*>/g, "")
                )}">?</span>`
            }
            html += `</td>`
            html += `<td>${printObject(value as JSONValue)}</td>`
            html += `</tr>`
        }

        html += `</table></details>`
    }
    return html || '<p class="empty-msg">No entries found.</p>'
}

// ─── Import drivers ──────────────────────────────────────────────────────────

function importBibLatex(input: string): BibDB {
    const parser = new BibLatexParser(input, {
        processUnexpected: true,
        processUnknown: { collaborator: "l_name" },
    })
    const { entries: bibDB, errors, warnings } = parser.parse()
    if (errors.length) console.warn("BibLaTeX errors:", errors)
    if (warnings.length) console.warn("BibLaTeX warnings:", warnings)
    return bibDB
}

function importCSL(input: string): BibDB {
    // CSLParser accepts Record<string, CSLEntry>; JSON.parse gives us that shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.parse(input) as any
    const parser = new CSLParser(json)
    const bibDB = parser.parse()
    if (parser.errors.length) console.warn("CSL errors:", parser.errors)
    return bibDB
}

function importRIS(input: string): BibDB {
    const parser = new RISParser(input)
    const bibDB = parser.parse()
    if (parser.errors.length) console.warn("RIS errors:", parser.errors)
    return bibDB
}

function importENW(input: string): BibDB {
    const parser = new ENWParser(input)
    const bibDB = parser.parse()
    if (parser.errors.length) console.warn("ENW errors:", parser.errors)
    return bibDB
}

function importEndNote(input: string): BibDB {
    // EndNote XML: parse with DOMParser then hand the JS object to EndNoteParser
    const domParser = new DOMParser()
    const doc = domParser.parseFromString(input, "text/xml")
    // Convert DOM to plain JS object array via a small helper
    function nodeToObj(node: Element): Record<string, unknown> {
        const obj: Record<string, unknown> = {}
        for (const child of Array.from(node.children)) {
            const tag = child.tagName
            const existing = obj[tag]
            const childVal =
                child.children.length > 0
                    ? nodeToObj(child)
                    : child.textContent ?? ""
            if (existing === undefined) {
                obj[tag] = childVal
            } else if (Array.isArray(existing)) {
                const arr = existing as unknown[]
                arr.push(childVal)
            } else {
                obj[tag] = [existing, childVal]
            }
        }
        return obj
    }

    const records = Array.from(
        doc.querySelectorAll(
            "records > record, Xml > References > Reference, record"
        )
    ).map((el) => nodeToObj(el as Element))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = new EndNoteParser(records as any)
    const bibDB = parser.parse()
    if (parser.errors.length) console.warn("EndNote errors:", parser.errors)
    return bibDB
}

function importCitavi(input: string): BibDB {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.parse(input) as any
    const parser = new CitaviParser(json)
    const bibDB = parser.parse()
    if (parser.errors.length) console.warn("Citavi errors:", parser.errors)
    return bibDB
}

function runImport(format: string, input: string): BibDB {
    switch (format) {
        case "biblatex":
            return importBibLatex(input)
        case "csl":
            return importCSL(input)
        case "ris":
            return importRIS(input)
        case "enw":
            return importENW(input)
        case "endnote":
            return importEndNote(input)
        case "citavi":
            return importCitavi(input)
        default:
            return importBibLatex(input)
    }
}

// ─── Export drivers ──────────────────────────────────────────────────────────

function renderCSLPanel(bibDB: BibDB): void {
    const el = getEl("csl-db")
    if (!el) return
    try {
        const exporter = new CSLExporter(bibDB)
        const cslDB = exporter.parse()
        el.innerHTML = printObject(cslDB as unknown as JSONValue)
    } catch (e) {
        el.innerHTML = `<span class="error-msg">CSL export failed: ${escapeHtml(
            String(e)
        )}</span>`
    }
}

function renderBibLatexPanel(bibDB: BibDB): void {
    const el = getEl("biblatex")
    if (!el) return
    try {
        const exporter = new BibLatexExporter(bibDB)
        el.innerHTML = `<pre class="bib-pre">${escapeHtml(
            exporter.parse()
        )}</pre>`
    } catch (e) {
        el.innerHTML = `<span class="error-msg">BibLaTeX export failed: ${escapeHtml(
            String(e)
        )}</span>`
    }
}

// ─── Main processing pipeline ─────────────────────────────────────────────────

function processInput(format: string, input: string): void {
    const t0 = performance.now()

    // bibDB panel
    const bibDbEl = getEl("bib-db")
    if (bibDbEl) bibDbEl.innerHTML = '<div class="spinner"></div>'

    const cslDbEl = getEl("csl-db")
    if (cslDbEl) cslDbEl.innerHTML = '<div class="spinner"></div>'

    const biblatexEl = getEl("biblatex")
    if (biblatexEl) biblatexEl.innerHTML = '<div class="spinner"></div>'

    // Use setTimeout so spinners render before heavy work
    setTimeout(() => {
        try {
            currentBibDB = runImport(format, input)
        } catch (e) {
            const msg = `<span class="error-msg">Import failed: ${escapeHtml(
                String(e)
            )}</span>`
            if (bibDbEl) bibDbEl.innerHTML = msg
            if (cslDbEl) cslDbEl.innerHTML = ""
            if (biblatexEl) biblatexEl.innerHTML = ""
            return
        }

        if (bibDbEl) bibDbEl.innerHTML = renderBibDB(currentBibDB)
        renderCSLPanel(currentBibDB)
        renderBibLatexPanel(currentBibDB)

        const t1 = performance.now()
        const statsEl = getEl("stats")
        if (statsEl) {
            const count = Object.keys(currentBibDB).length
            statsEl.textContent = `${count} entr${
                count === 1 ? "y" : "ies"
            } — processed in ${(t1 - t0).toFixed(1)} ms`
        }

        console.log(`Total: ${(t1 - t0).toFixed(1)} ms`)
    }, 50)
}

// Re-render the bibDB panel when the language changes (exports stay the same)
function rerenderBibDB(): void {
    const bibDbEl = getEl("bib-db")
    if (!bibDbEl || Object.keys(currentBibDB).length === 0) return
    bibDbEl.innerHTML = renderBibDB(currentBibDB)
}

// ─── UI event wiring ─────────────────────────────────────────────────────────

function getSelectedFormat(): string {
    const sel = getEl<HTMLSelectElement>("format-select")
    return sel?.value ?? "biblatex"
}

function readFile(): void {
    const fileUpload = getEl<HTMLInputElement>("file-upload")
    if (!fileUpload?.files?.length) return
    const format = getSelectedFormat()
    const fr = new FileReader()
    fr.onload = (event) => {
        processInput(format, event.target?.result as string)
    }
    fr.readAsText(fileUpload.files[0])
}

function readPaste(event: ClipboardEvent): void {
    const clipBoardText = event.clipboardData?.getData("text") ?? ""
    const format = getSelectedFormat()
    processInput(format, clipBoardText)
}

function loadSample(): void {
    // Switch to BibLaTeX format in case another was selected
    const formatSelect = getEl<HTMLSelectElement>("format-select")
    if (formatSelect) formatSelect.value = "biblatex"

    // Show the sample text in the paste area so the user can inspect it
    const pasteInput = getEl("paste-input")
    if (pasteInput) pasteInput.textContent = SAMPLE_BIBLATEX

    processInput("biblatex", SAMPLE_BIBLATEX)
}

// Wire up after DOM ready
document.addEventListener("DOMContentLoaded", () => {
    getEl("file-upload")?.addEventListener("change", readFile)
    getEl("paste-input")?.addEventListener("paste", readPaste as EventListener)
    getEl("sample-btn")?.addEventListener("click", loadSample)

    getEl("lang-select")?.addEventListener("change", (e) => {
        currentLang = (e.target as HTMLSelectElement).value
        rerenderBibDB()
    })

    // Update file-input accept attribute when format changes
    getEl("format-select")?.addEventListener("change", () => {
        const fmt = getSelectedFormat()
        const fileUpload = getEl<HTMLInputElement>("file-upload")
        if (!fileUpload) return
        const acceptMap: Record<string, string> = {
            biblatex: ".bib",
            csl: ".json",
            ris: ".ris",
            enw: ".enw",
            endnote: ".xml",
            citavi: ".json",
        }
        fileUpload.accept = acceptMap[fmt] ?? ""
    })
})
