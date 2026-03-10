import * as converter from "../tmp/bundle.test.js"
import { expect } from "chai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const writeFixtures = false // Set to true to regenerate expected test results.

const clean = (state) => {
    for (let prop of ["comments", "errors", "warnings"]) {
        if (!state[prop] || state[prop].length == 0) {
            delete state[prop]
        }
    }
    if (state.strings && !Object.keys(state.strings).length)
        delete state.strings
}

/**
 * Verify a DOCX citations fixture.
 *
 * @param {string} xmlFile   - Path to the document XML fixture.
 * @param {string} [sourcesFile] - Optional path to a companion sources XML
 *   file (the customXml/item1.xml equivalent).  When present it is passed to
 *   the parser as `options.sourcesXml`.
 */
const verify = (xmlFile, sourcesFile) => {
    const documentXml = fs.readFileSync(xmlFile, "utf8")
    const name = path.basename(xmlFile, path.extname(xmlFile))

    const options = {}
    if (sourcesFile && fs.existsSync(sourcesFile)) {
        options.sourcesXml = fs.readFileSync(sourcesFile, "utf8")
    }

    const found = converter.parseDocxCitations(documentXml, options)
    clean(found)

    const expectedPath = path.join(
        path.dirname(xmlFile),
        name + "-expected.json"
    )

    if (writeFixtures) {
        fs.writeFileSync(expectedPath, JSON.stringify(found, null, 4) + "\n")
    }

    if (!fs.existsSync(expectedPath)) {
        console.log(
            `Expected file ${expectedPath} does not exist, creating fixture`
        )
        fs.writeFileSync(expectedPath, JSON.stringify(found, null, 4) + "\n")
        return
    }

    const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"))
    clean(expected)

    it(name, () => {
        expect(found).to.be.deep.equal(expected)
    })
}

const fixturesDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/import/docx-citations"
)

const allFiles = fs.readdirSync(fixturesDir)

for (let filename of allFiles) {
    if (path.extname(filename).toLowerCase() !== ".xml") continue
    // Skip companion sources files — they are loaded alongside their primary fixture
    if (filename.endsWith("-sources.xml")) continue
    // Skip expected-output JSON files
    if (filename.endsWith("-expected.json")) continue

    const xmlFile = path.join(fixturesDir, filename)
    const base = path.basename(filename, ".xml")
    const sourcesFile = path.join(fixturesDir, base + "-sources.xml")

    verify(xmlFile, sourcesFile)
}

// Static utility methods tests
describe("Static utility methods", () => {
    describe("DocxCitationsParser", () => {
        describe("sdtCitation", () => {
            it("detects Mendeley v3 citation SDT (check only)", () => {
                const sdtXml = `<w:sdt>
                    <w:sdtPr>
                        <w:tag w:val="MENDELEY_CITATION_v3_eyJjaXRhdGlvbklE"/>
                    </w:sdtPr>
                </w:sdt>`
                const result = converter.DocxCitationsParser.sdtCitation(
                    sdtXml,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("mendeley_v3")
                expect(result.entries).to.equal(undefined)
            })

            it("detects Citavi citation SDT (check only)", () => {
                const sdtXml = `<w:sdt>
                    <w:sdtPr>
                        <w:tag w:val="CitaviPlaceholder#12345"/>
                    </w:sdtPr>
                </w:sdt>`
                const result = converter.DocxCitationsParser.sdtCitation(
                    sdtXml,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("citavi")
                expect(result.entries).to.equal(undefined)
            })

            it("returns false for non-citation SDT", () => {
                const sdtXml = `<w:sdt>
                    <w:sdtPr>
                        <w:tag w:val="SOME_OTHER_TAG"/>
                    </w:sdtPr>
                </w:sdt>`
                const result = converter.DocxCitationsParser.sdtCitation(
                    sdtXml,
                    false
                )
                expect(result.isCitation).to.equal(false)
                expect(result.format).to.equal(undefined)
            })
        })

        describe("sdtBibliography", () => {
            it("detects Mendeley bibliography SDT", () => {
                const sdtXml = `<w:sdt>
                    <w:sdtPr>
                        <w:tag w:val="MENDELEY_BIBLIOGRAPHY_v3_abc"/>
                    </w:sdtPr>
                </w:sdt>`
                const result = converter.DocxCitationsParser.sdtBibliography(
                    sdtXml,
                    false
                )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("mendeley_v3")
            })

            it("returns false for non-bibliography SDT", () => {
                const sdtXml = `<w:sdt>
                    <w:sdtPr>
                        <w:tag w:val="MENDELEY_CITATION_v3_abc"/>
                    </w:sdtPr>
                </w:sdt>`
                const result = converter.DocxCitationsParser.sdtBibliography(
                    sdtXml,
                    false
                )
                expect(result.isBibliography).to.equal(false)
            })
        })

        describe("fieldCitation", () => {
            it("detects Zotero field citation (check only)", () => {
                const instr = "ADDIN ZOTERO_ITEM CSL_CITATION {}"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("zotero")
                expect(result.entries).to.equal(undefined)
            })

            it("detects Mendeley legacy field citation (check only)", () => {
                const instr = "ADDIN CSL_CITATION {}"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("mendeley_legacy")
            })

            it("detects EndNote field citation (check only)", () => {
                const instr = "ADDIN EN.CITE <EndNote></EndNote>"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("endnote")
            })

            it("detects Word native citation (check only)", () => {
                const instr = "CITATION Smith2020 \\l 1033"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("word_native")
            })

            it("returns false for non-citation field", () => {
                const instr = "REF _Ref123456 \\h"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    false
                )
                expect(result.isCitation).to.equal(false)
            })

            it("extracts Zotero citation data", () => {
                const instr = ` ADDIN ZOTERO_ITEM CSL_CITATION {
                    "citationID": "test",
                    "properties": {},
                    "citationItems": [{
                        "id": 1,
                        "itemData": {
                            "id": 1,
                            "type": "article-journal",
                            "title": "Test Article",
                            "author": [{"family": "Smith", "given": "John"}],
                            "issued": {"date-parts": [[2020]]}
                        }
                    }]
                } `
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    true
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("zotero")
                expect(result.entries).to.not.equal(undefined)
                expect(Object.keys(result.entries!).length).to.be.greaterThan(0)
                expect(result.errors!.length).to.equal(0)
            })

            it("returns empty result for non-citation field", () => {
                const instr = "REF _Ref123456 \\h"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    true
                )
                expect(result.isCitation).to.equal(false)
                expect(result.format).to.equal(undefined)
            })
        })

        describe("fieldBibliography", () => {
            it("detects Zotero bibliography field", () => {
                const instr = "ADDIN ZOTERO_BIBL {} CSL_BIBLIOGRAPHY"
                const result = converter.DocxCitationsParser.fieldBibliography(
                    instr,
                    false
                )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("zotero")
            })

            it("detects EndNote bibliography field", () => {
                const instr = "ADDIN EN.REFLIST"
                const result = converter.DocxCitationsParser.fieldBibliography(
                    instr,
                    false
                )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("endnote")
            })

            it("detects Word native bibliography field", () => {
                const instr = "BIBLIOGRAPHY \\l 1033"
                const result = converter.DocxCitationsParser.fieldBibliography(
                    instr,
                    false
                )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("word_native")
            })

            it("returns false for non-bibliography field", () => {
                const instr = "ADDIN ZOTERO_ITEM CSL_CITATION {}"
                const result = converter.DocxCitationsParser.fieldBibliography(
                    instr,
                    false
                )
                expect(result.isBibliography).to.equal(false)
            })
        })
    })
})
