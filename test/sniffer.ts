import * as converter from "../tmp/bundle.test.js"
import { expect } from "chai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixtures = path.join(__dirname, "fixtures/import")

describe("sniffFormat", () => {
    // ── BibTeX / BibLaTeX ────────────────────────────────────────────────────
    describe("biblatex", () => {
        it("detects a plain @article entry", () => {
            const input = `@article{Adams2001,
  author = {Adams, Nancy K},
  title  = {Test},
  year   = {2001}
}`
            expect(converter.sniffFormat(input)).to.equal("biblatex")
        })

        it("detects @book", () => {
            expect(converter.sniffFormat("@book{key, title={T}}")).to.equal(
                "biblatex"
            )
        })

        it("detects an entry with parenthesis delimiter", () => {
            expect(converter.sniffFormat("@article(key, title={T})")).to.equal(
                "biblatex"
            )
        })

        it("detects a file that starts with @comment before an entry", () => {
            const input = `@comment{this is a comment}

@article{Smith2020,
  author = {Smith, John},
  year   = {2020}
}`
            expect(converter.sniffFormat(input)).to.equal("biblatex")
        })

        it("detects a file that consists only of @string directives", () => {
            expect(
                converter.sniffFormat(
                    "@string{journalA = {Journal of Stuff}}\n@string{pub = {Publisher}}"
                )
            ).to.equal("biblatex")
        })

        it("detects a real fixture file", () => {
            const file = path.join(
                fixtures,
                "bib",
                "Better BibLaTeX.001.biblatex.bib"
            )
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("biblatex")
        })

        it("detects a BibTeX (non-BibLaTeX) fixture file", () => {
            const file = path.join(fixtures, "bib", "Better BibTeX.001.bib")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("biblatex")
        })
    })

    // ── RIS ──────────────────────────────────────────────────────────────────
    describe("ris", () => {
        it("detects a minimal RIS record", () => {
            const input = `TY  - JOUR
TI  - Some Title
AU  - Smith, John
ER  - `
            expect(converter.sniffFormat(input)).to.equal("ris")
        })

        it("detects a real fixture file", () => {
            const file = path.join(fixtures, "ris", "library.ris")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("ris")
        })

        it("detects leading whitespace before TY line", () => {
            const input = `  TY  - BOOK
TI  - My Book
ER  - `
            // trimStart is applied so leading whitespace on the whole input is
            // fine, but the RIS tag must be at the start of the (trimmed) head.
            expect(converter.sniffFormat(input)).to.equal("ris")
        })
    })

    // ── ENW (EndNote tagged) ─────────────────────────────────────────────────
    describe("enw", () => {
        it("detects a minimal ENW record", () => {
            const input = `%0 Journal Article
%A Smith, John
%T My Paper
%D 2023`
            expect(converter.sniffFormat(input)).to.equal("enw")
        })

        it("detects a real fixture file", () => {
            const file = path.join(fixtures, "enw", "endnote.enw")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("enw")
        })
    })

    // ── NBIB / PubMed MEDLINE ────────────────────────────────────────────────
    describe("nbib", () => {
        it("detects a minimal NBIB record with PMID", () => {
            const input = `PMID- 12345678
OWN - NLM
TI  - Fish Gastroenterology.
FAU - Smith, John A`
            expect(converter.sniffFormat(input)).to.equal("nbib")
        })

        it("detects a real fixture file", () => {
            const file = path.join(fixtures, "nbib", "pubmed.nbib")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("nbib")
        })

        it("is not confused with RIS (which uses two-space padding differently)", () => {
            // RIS tags are exactly two letters; NBIB tags are 2-4 letters.
            // A file starting with "TY  - " is RIS, not NBIB, and should not
            // match the NBIB path.
            const ris = `TY  - JOUR\nTI  - A\nER  - `
            expect(converter.sniffFormat(ris)).to.equal("ris")
        })
    })

    // ── EndNote XML ──────────────────────────────────────────────────────────
    describe("endnote_xml", () => {
        it("detects the canonical <xml><records> wrapper", () => {
            const input = `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <records>
    <record>
      <ref-type name="Journal Article">17</ref-type>
    </record>
  </records>
</xml>`
            expect(converter.sniffFormat(input)).to.equal("endnote_xml")
        })

        it("detects a real fixture file", () => {
            const file = path.join(fixtures, "endnote", "library.xml")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("endnote_xml")
        })

        it("detects a Mendeley-style EndNote XML fixture", () => {
            const file = path.join(fixtures, "endnote", "mendeley.xml")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("endnote_xml")
        })

        it("detects via source-app name attribute", () => {
            const input = `<?xml version="1.0"?>
<xml>
  <records>
    <record>
      <source-app name="EndNote" version="20.0">EndNote</source-app>
    </record>
  </records>
</xml>`
            expect(converter.sniffFormat(input)).to.equal("endnote_xml")
        })
    })

    // ── Citavi XML ───────────────────────────────────────────────────────────
    describe("citavi_xml", () => {
        it("detects the CitaviExchangeData root element", () => {
            const input = `<?xml version="1.0" encoding="utf-8"?>
<CitaviExchangeData Version="5.4.0.2">
  <References>
  </References>
</CitaviExchangeData>`
            expect(converter.sniffFormat(input)).to.equal("citavi_xml")
        })

        it("detects a real .ctv5 fixture file", () => {
            const file = path.join(fixtures, "citavi", "project.ctv5")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("citavi_xml")
        })

        it("detects a real .ctv6 fixture file", () => {
            const file = path.join(fixtures, "citavi", "library.ctv6")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("citavi_xml")
        })

        it("is not confused with EndNote XML", () => {
            const endnote = `<?xml version="1.0"?><xml><records><record><ref-type name="Journal Article">17</ref-type></record></records></xml>`
            expect(converter.sniffFormat(endnote)).to.equal("endnote_xml")
        })
    })

    // ── CSL JSON ─────────────────────────────────────────────────────────────
    describe("csl_json", () => {
        it("detects a keyed-object CSL input", () => {
            const input = JSON.stringify({
                "1": {
                    id: "1",
                    type: "article-journal",
                    title: "My Article",
                },
            })
            expect(converter.sniffFormat(input)).to.equal("csl_json")
        })

        it("detects an array CSL input", () => {
            const input = JSON.stringify([
                { id: "1", type: "book", title: "My Book" },
                { id: "2", type: "article-journal", title: "My Article" },
            ])
            expect(converter.sniffFormat(input)).to.equal("csl_json")
        })

        it("detects a real fixture file", () => {
            const file = path.join(fixtures, "csl", "Better BibTeX.001.csl")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("csl_json")
        })
    })

    // ── Citavi JSON ──────────────────────────────────────────────────────────
    describe("citavi_json", () => {
        it("detects a WordPlaceholder payload via $type", () => {
            const input = JSON.stringify({
                $id: "1",
                $type: "SwissAcademic.Citavi.Citations.WordPlaceholder, SwissAcademic.Citavi",
                Entries: [],
            })
            expect(converter.sniffFormat(input)).to.equal("citavi_json")
        })

        it("detects a project export with top-level References array", () => {
            const input = JSON.stringify({
                References: [
                    {
                        Id: "abc",
                        ReferenceType: "JournalArticle",
                        Title: "Test",
                    },
                ],
            })
            expect(converter.sniffFormat(input)).to.equal("citavi_json")
        })

        it("detects a plain array of Citavi reference objects", () => {
            const input = JSON.stringify([
                {
                    Id: "abc",
                    ReferenceType: "Book",
                    Title: "My Book",
                    BibTeXKey: "Smith2020",
                },
            ])
            expect(converter.sniffFormat(input)).to.equal("citavi_json")
        })

        it("detects the docx-citations fixture", () => {
            const file = path.join(fixtures, "citavi", "docx-citations.json")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("citavi_json")
        })

        it("is not confused with CSL JSON", () => {
            const csl = JSON.stringify({
                "1": { id: "1", type: "article-journal" },
            })
            expect(converter.sniffFormat(csl)).to.equal("csl_json")
        })
    })

    // ── ODT Citations XML ────────────────────────────────────────────────────
    describe("odt_citations", () => {
        it("detects LibreOffice-native bibliography marks", () => {
            const input = `<?xml version="1.0"?>
<office:document-content
    xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body>
    <text:bibliography-mark text:bibliography-type="article"
        text:identifier="Smith2020" text:author="Smith, John"/>
  </office:body>
</office:document-content>`
            expect(converter.sniffFormat(input)).to.equal("odt_citations")
        })

        it("detects a Zotero ODT fixture", () => {
            const file = path.join(fixtures, "odt-citations", "zotero.xml")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("odt_citations")
        })

        it("detects a LibreOffice native ODT fixture", () => {
            const file = path.join(
                fixtures,
                "odt-citations",
                "libreoffice-native.xml"
            )
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("odt_citations")
        })

        it("detects a JabRef / EndNote ODT fixture", () => {
            const file = path.join(
                fixtures,
                "odt-citations",
                "jabref-endnote.xml"
            )
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("odt_citations")
        })
    })

    // ── DOCX Citations XML ───────────────────────────────────────────────────
    describe("docx_citations", () => {
        it("detects a document with the WordprocessingML namespace", () => {
            const input = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p/>
  </w:body>
</w:document>`
            expect(converter.sniffFormat(input)).to.equal("docx_citations")
        })

        it("detects a Zotero DOCX fixture", () => {
            const file = path.join(fixtures, "docx-citations", "zotero.xml")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("docx_citations")
        })

        it("detects a Word-native DOCX fixture", () => {
            const file = path.join(
                fixtures,
                "docx-citations",
                "word-native.xml"
            )
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("docx_citations")
        })

        it("detects an EndNote DOCX fixture", () => {
            const file = path.join(fixtures, "docx-citations", "endnote.xml")
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("docx_citations")
        })

        it("detects a Mendeley v3 DOCX fixture", () => {
            const file = path.join(
                fixtures,
                "docx-citations",
                "mendeley-v3.xml"
            )
            const input = fs.readFileSync(file, "utf8")
            expect(converter.sniffFormat(input)).to.equal("docx_citations")
        })
    })

    // ── Edge cases ───────────────────────────────────────────────────────────
    describe("edge cases", () => {
        it("returns null for an empty string", () => {
            expect(converter.sniffFormat("")).to.equal(null)
        })

        it("returns null for a whitespace-only string", () => {
            expect(converter.sniffFormat("   \n\t  ")).to.equal(null)
        })

        it("returns null for random text", () => {
            expect(
                converter.sniffFormat("This is just a paragraph of plain text.")
            ).to.equal(null)
        })

        it("returns null for a bare JSON number", () => {
            expect(converter.sniffFormat("42")).to.equal(null)
        })

        it("returns null for an empty JSON object", () => {
            expect(converter.sniffFormat("{}")).to.equal(null)
        })

        it("returns null for an empty JSON array", () => {
            expect(converter.sniffFormat("[]")).to.equal(null)
        })

        it("handles a BOM-prefixed XML file", () => {
            const input =
                '\uFEFF<?xml version="1.0"?><xml><records><record><ref-type name="Journal Article">17</ref-type></record></records></xml>'
            expect(converter.sniffFormat(input)).to.equal("endnote_xml")
        })

        it("handles a BibLaTeX file with leading blank lines", () => {
            const input = `\n\n\n@article{key, title={T}}`
            expect(converter.sniffFormat(input)).to.equal("biblatex")
        })
    })
})
