import {
    type BibDB,
    BibLatexExporter,
    BibLatexParser,
    CitaviParser,
    CitaviXmlParser,
    CSLExporter,
    CSLParser,
    DocxCitationsParser,
    ENWParser,
    EndNoteParser,
    edtfParse,
    getFieldHelp,
    getFieldTitle,
    getLangidTitle,
    getLocale,
    getOtherOptionTitle,
    getTypeTitle,
    type ImportFormat,
    locales,
    NBIBParser,
    OdtCitationsParser,
    RISParser,
    sniffFormat,
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
    NBIBParser,
    CitaviParser,
    CitaviXmlParser,
    DocxCitationsParser,
    OdtCitationsParser,
    sniffFormat,
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
                        (object as Record<string, JSONValue>)[key],
                    )
                    html += `<tr><td class="obj-key">${escapeHtml(
                        key,
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
        html += `<summary><span class="entry-key">${escapeHtml(entryKey)}</span>`
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
                    help.replace(/<[^>]*>/g, ""),
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
    const { entries, errors, warnings } = parser.parse()
    if (errors.length) console.warn("RIS errors:", errors)
    if (warnings.length) console.warn("RIS warnings:", warnings)
    return entries
}

function importNBIB(input: string): BibDB {
    const parser = new NBIBParser(input)
    const { entries, errors, warnings } = parser.parse()
    if (errors.length) console.warn("NBIB errors:", errors)
    if (warnings.length) console.warn("NBIB warnings:", warnings)
    return entries
}

function importENW(input: string): BibDB {
    const parser = new ENWParser(input)
    const { entries, errors, warnings } = parser.parse()
    if (errors.length) console.warn("ENW errors:", errors)
    if (warnings.length) console.warn("ENW warnings:", warnings)
    return entries
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
                    : (child.textContent ?? "")
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
            "records > record, Xml > References > Reference, record",
        ),
    ).map((el) => nodeToObj(el as Element))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = new EndNoteParser(records as any)
    const { entries, errors, warnings } = parser.parse()
    if (errors.length) console.warn("EndNote errors:", errors)
    if (warnings.length) console.warn("EndNote warnings:", warnings)
    return entries
}

function importCitavi(input: string): BibDB {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = JSON.parse(input) as any
    const parser = new CitaviParser(json)
    const bibDB = parser.parse()
    if (parser.errors.length) console.warn("Citavi errors:", parser.errors)
    return bibDB
}

// Human-readable label for each format identifier (used in the stats bar).
const FORMAT_LABELS: Record<string, string> = {
    biblatex: "BibLaTeX / BibTeX",
    csl: "CSL JSON",
    csl_json: "CSL JSON",
    ris: "RIS",
    nbib: "PubMed NBIB",
    enw: "EndNote Web (.enw)",
    endnote: "EndNote XML",
    endnote_xml: "EndNote XML",
    citavi: "Citavi JSON",
    citavi_json: "Citavi JSON",
    citavi_xml: "Citavi XML",
    odt_citations: "ODT citations",
    docx_citations: "DOCX citations",
}

function runImport(format: string, input: string): BibDB {
    switch (format) {
        case "biblatex":
            return importBibLatex(input)
        case "csl":
        case "csl_json":
            return importCSL(input)
        case "ris":
            return importRIS(input)
        case "nbib":
            return importNBIB(input)
        case "enw":
            return importENW(input)
        case "endnote":
        case "endnote_xml":
            return importEndNote(input)
        case "citavi":
        case "citavi_json":
            return importCitavi(input)
        case "citavi_xml":
            return importCitaviXml(input)
        case "odt_citations":
            return importOdtCitations(input)
        default:
            return importBibLatex(input)
    }
}

function importCitaviXml(input: string): BibDB {
    const parser = new CitaviXmlParser(input)
    const bibDB = parser.parse()
    if (parser.errors.length) console.warn("Citavi XML errors:", parser.errors)
    if (parser.warnings.length)
        console.warn("Citavi XML warnings:", parser.warnings)
    return bibDB
}

function importOdtCitations(input: string): BibDB {
    const parser = new OdtCitationsParser(input)
    const result = parser.parse()
    if (result.errors.length) console.warn("ODT errors:", result.errors)
    if (result.warnings.length) console.warn("ODT warnings:", result.warnings)
    return result.entries
}

/**
 * Sniff the format of `input` and run the appropriate importer.
 * Returns the BibDB and the detected format label string (for display).
 * Throws if the format cannot be identified.
 */
function sniffAndImport(input: string): {
    bibDB: BibDB
    detectedLabel: string
} {
    const sniffed = sniffFormat(input)
    if (sniffed === null) {
        throw new Error(
            "Could not detect the bibliography format. " +
                "Please select a format manually from the drop-down.",
        )
    }
    // odt_citations and docx_citations require an extracted XML string, not the
    // raw bytes of a zip archive — those formats must come through readFile.
    if (sniffed === "odt_citations" || sniffed === "docx_citations") {
        throw new Error(
            `Detected ${FORMAT_LABELS[sniffed]} format. ` +
                "This format must be loaded by uploading the file (.odt / .docx) — " +
                "pasting the raw XML is not supported in the demo.",
        )
    }
    const bibDB = runImport(sniffed, input)
    const detectedLabel = FORMAT_LABELS[sniffed] ?? sniffed
    return { bibDB, detectedLabel }
}

// ─── Document file import (DOCX / ODT) ───────────────────────────────────────

/**
 * Reads a binary File as an ArrayBuffer and processes it as a DOCX or ODT
 * archive using JSZip (loaded from CDN).  Extracts the relevant XML parts and
 * delegates to DocxCitationsParser / OdtCitationsParser exposed on globalThis
 * by the demo bundle.
 */
async function importDocumentFile(
    file: File,
    format: "docx" | "odt",
): Promise<BibDB> {
    // JSZip is loaded via CDN script tag — access it through globalThis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JSZip = (globalThis as any).JSZip as {
        loadAsync(data: ArrayBuffer): Promise<{
            files: Record<string, { async(type: "string"): Promise<string> }>
        }>
    }
    if (!JSZip) {
        throw new Error(
            "JSZip is not loaded. Make sure the CDN script tag is present.",
        )
    }

    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    if (format === "docx") {
        // Primary XML: word/document.xml
        const docXmlFile = zip.files["word/document.xml"]
        if (!docXmlFile) {
            throw new Error("Not a valid DOCX file: missing word/document.xml")
        }
        const documentXml = await docXmlFile.async("string")

        // Optional: customXml/item1.xml for Word-native / JabRef sources
        let sourcesXml: string | undefined
        const sourcesFile = zip.files["customXml/item1.xml"]
        if (sourcesFile) {
            sourcesXml = await sourcesFile.async("string")
        }

        const parser = new DocxCitationsParser(documentXml, {
            sourcesXml,
        })
        const result = parser.parse()
        if (result.errors.length) console.warn("DOCX errors:", result.errors)
        if (result.warnings.length)
            console.warn("DOCX warnings:", result.warnings)
        return result.entries
    } else {
        // ODT: content.xml holds all the bibliography marks
        const contentXmlFile = zip.files["content.xml"]
        if (!contentXmlFile) {
            throw new Error("Not a valid ODT file: missing content.xml")
        }
        const contentXml = await contentXmlFile.async("string")

        const parser = new OdtCitationsParser(contentXml)
        const result = parser.parse()
        if (result.errors.length) console.warn("ODT errors:", result.errors)
        if (result.warnings.length)
            console.warn("ODT warnings:", result.warnings)
        return result.entries
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
            String(e),
        )}</span>`
    }
}

function renderBibLatexPanel(bibDB: BibDB): void {
    const el = getEl("biblatex")
    if (!el) return
    try {
        const exporter = new BibLatexExporter(bibDB)
        el.innerHTML = `<pre class="bib-pre">${escapeHtml(exporter.parse())}</pre>`
    } catch (e) {
        el.innerHTML = `<span class="error-msg">BibLaTeX export failed: ${escapeHtml(
            String(e),
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
        let detectedLabel: string | null = null
        try {
            if (format === "auto") {
                const result = sniffAndImport(input)
                currentBibDB = result.bibDB
                detectedLabel = result.detectedLabel
            } else {
                currentBibDB = runImport(format, input)
            }
        } catch (e) {
            const msg = `<span class="error-msg">Import failed: ${escapeHtml(
                String(e),
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
            const formatNote = detectedLabel
                ? ` — detected as <strong>${escapeHtml(detectedLabel)}</strong>`
                : ""
            statsEl.innerHTML = `${count} entr${
                count === 1 ? "y" : "ies"
            } — processed in ${(t1 - t0).toFixed(1)} ms${formatNote}`
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

/** Map a sniffed ImportFormat to the demo's legacy format key where they differ. */
function sniffedToLegacyFormat(sniffed: ImportFormat): string {
    switch (sniffed) {
        case "csl_json":
            return "csl"
        case "endnote_xml":
            return "endnote"
        case "citavi_json":
            return "citavi"
        default:
            return sniffed
    }
}

function readFile(): void {
    const fileUpload = getEl<HTMLInputElement>("file-upload")
    if (!fileUpload?.files?.length) return
    const format = getSelectedFormat()
    const file = fileUpload.files[0]

    // For document formats (zip archives) we always need the binary path.
    const isDocFormat = format === "docx" || format === "odt"

    // In auto mode, sniff the file name extension to decide whether it's a
    // binary document archive (DOCX/ODT) or a text format we can read and sniff.
    const isAutoDoc = format === "auto" && /\.(docx|odt)$/i.test(file.name)

    if (isDocFormat || isAutoDoc) {
        let docFormat: "docx" | "odt"
        if (isAutoDoc) {
            docFormat = /\.odt$/i.test(file.name) ? "odt" : "docx"
        } else {
            docFormat = format as "docx" | "odt"
        }

        // Show spinners immediately before async work begins
        const bibDbEl = getEl("bib-db")
        const cslDbEl = getEl("csl-db")
        const biblatexEl = getEl("biblatex")
        if (bibDbEl) bibDbEl.innerHTML = '<div class="spinner"></div>'
        if (cslDbEl) cslDbEl.innerHTML = '<div class="spinner"></div>'
        if (biblatexEl) biblatexEl.innerHTML = '<div class="spinner"></div>'

        const t0 = performance.now()
        importDocumentFile(file, docFormat)
            .then((bibDB) => {
                currentBibDB = bibDB
                if (bibDbEl) bibDbEl.innerHTML = renderBibDB(currentBibDB)
                renderCSLPanel(currentBibDB)
                renderBibLatexPanel(currentBibDB)

                const t1 = performance.now()
                const statsEl = getEl("stats")
                if (statsEl) {
                    const count = Object.keys(currentBibDB).length
                    const formatNote = isAutoDoc
                        ? ` — detected as <strong>${escapeHtml(
                              FORMAT_LABELS[`${docFormat}_citations`] ??
                                  docFormat,
                          )}</strong>`
                        : ""
                    statsEl.innerHTML = `${count} entr${
                        count === 1 ? "y" : "ies"
                    } — processed in ${(t1 - t0).toFixed(1)} ms${formatNote}`
                }
            })
            .catch((e) => {
                const msg = `<span class="error-msg">Import failed: ${escapeHtml(
                    String(e),
                )}</span>`
                if (bibDbEl) bibDbEl.innerHTML = msg
                if (cslDbEl) cslDbEl.innerHTML = ""
                if (biblatexEl) biblatexEl.innerHTML = ""
            })
        return
    }

    const fr = new FileReader()
    fr.onload = (event) => {
        const text = event.target?.result as string
        if (format === "auto") {
            // Sniff the text content and, if recognised, sync the select back
            // to the detected format so the user sees what was found.
            const sniffed = sniffFormat(text)
            if (sniffed !== null) {
                const legacy = sniffedToLegacyFormat(sniffed)
                const sel = getEl<HTMLSelectElement>("format-select")
                if (sel) {
                    // Only update if the option actually exists in the select.
                    const exists = Array.from(sel.options).some(
                        (o) => o.value === legacy,
                    )
                    if (exists) sel.value = legacy
                }
            }
        }
        processInput(format, text)
    }
    fr.readAsText(file)
}

function readPaste(event: ClipboardEvent): void {
    const clipBoardText = event.clipboardData?.getData("text") ?? ""
    const format = getSelectedFormat()
    if (format === "auto") {
        // Sniff first so we can sync the select to the detected format.
        const sniffed = sniffFormat(clipBoardText)
        if (sniffed !== null) {
            const legacy = sniffedToLegacyFormat(sniffed)
            const sel = getEl<HTMLSelectElement>("format-select")
            if (sel) {
                const exists = Array.from(sel.options).some(
                    (o) => o.value === legacy,
                )
                if (exists) sel.value = legacy
            }
        }
    }
    processInput(format, clipBoardText)
}

function loadSample(): void {
    // Show the sample text in the paste area so the user can inspect it
    const pasteInput = getEl("paste-input")
    if (pasteInput) pasteInput.textContent = SAMPLE_BIBLATEX

    // Leave the format selector wherever it is — auto-detect will handle it.
    // If the user had manually selected something other than auto, honour that.
    const format = getSelectedFormat()
    processInput(format, SAMPLE_BIBLATEX)
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
    const acceptMap: Record<string, string> = {
        auto: ".bib,.json,.ris,.enw,.xml,.nbib,.ctv5,.ctv6,.docx,.odt",
        biblatex: ".bib",
        csl: ".json",
        ris: ".ris",
        enw: ".enw",
        endnote: ".xml",
        citavi: ".json",
        nbib: ".nbib",
        docx: ".docx",
        odt: ".odt",
    }
    function updateFileAccept() {
        const fmt = getSelectedFormat()
        const fileUpload = getEl<HTMLInputElement>("file-upload")
        if (!fileUpload) return
        fileUpload.accept = acceptMap[fmt] ?? ""
    }
    getEl("format-select")?.addEventListener("change", updateFileAccept)
    updateFileAccept()
})
