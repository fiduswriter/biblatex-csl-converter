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
 * Verify an ODT citations fixture.
 *
 * @param {string} xmlFile - Path to the content XML fixture.
 */
const verify = (xmlFile) => {
    const contentXml = fs.readFileSync(xmlFile, "utf8")
    const name = path.basename(xmlFile, path.extname(xmlFile))

    const found = converter.parseOdtCitations(contentXml)
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
    "fixtures/import/odt-citations"
)

const allFiles = fs.readdirSync(fixturesDir)

for (let filename of allFiles) {
    if (path.extname(filename).toLowerCase() !== ".xml") continue
    // Skip expected-output JSON files
    if (filename.endsWith("-expected.json")) continue

    const xmlFile = path.join(fixturesDir, filename)
    verify(xmlFile)
}

// Static utility methods tests
describe("Static utility methods", () => {
    describe("OdtCitationsParser", () => {
        describe("referenceMarkCitation", () => {
            it("detects Zotero reference mark (check only)", () => {
                const markName =
                    'ZOTERO_ITEM CSL_CITATION {"citationID":"test"}'
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        false
                    )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("zotero")
                expect(result.entries).to.equal(undefined)
            })

            it("detects Mendeley legacy reference mark (check only)", () => {
                const markName = 'CSL_CITATION {"citationID":"test"}'
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        false
                    )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("mendeley_legacy")
                expect(result.entries).to.equal(undefined)
            })

            it("detects JabRef reference mark (check only)", () => {
                const markName = "JABREF_Smith2020 CID_1 abc123"
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        false
                    )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("jabref")
                expect(result.entries).to.equal(undefined)
            })

            it("returns false for non-citation mark", () => {
                const markName = "SOME_OTHER_MARK"
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        false
                    )
                expect(result.isCitation).to.equal(false)
            })

            it("extracts Zotero citation data", () => {
                const markName = `ZOTERO_ITEM CSL_CITATION {
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
                } RNDLQoAq6M7m4`
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        true
                    )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("zotero")
                expect(result.entries).to.not.equal(undefined)
                expect(Object.keys(result.entries!).length).to.be.greaterThan(0)
                expect(result.errors!.length).to.equal(0)
            })

            it("handles Zotero citation with random ID suffix", () => {
                const markName = `ZOTERO_ITEM CSL_CITATION {
                    "citationID": "test123",
                    "properties": {},
                    "citationItems": [{
                        "id": 2,
                        "itemData": {
                            "id": 2,
                            "type": "book",
                            "title": "Test Book",
                            "author": [{"family": "Jones", "given": "Jane"}],
                            "issued": {"date-parts": [[2021]]}
                        }
                    }]
                } RNDjURflxg9F1`
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        true
                    )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("zotero")
                expect(result.entries).to.not.equal(undefined)
                expect(Object.keys(result.entries!).length).to.equal(1)
                const entry = Object.values(result.entries!)[0]
                expect(entry.fields.title).to.deep.equal([
                    { type: "text", text: "Test Book" },
                ])
                expect(result.errors!.length).to.equal(0)
            })

            it("handles various random ID formats", () => {
                // Test with different random ID patterns (10 alphanumeric chars)
                const testCases = [
                    " RNDabcdef1234",
                    " RNDABCDEF1234",
                    " RNDaBc12XyZ89",
                    " RND0123456789",
                ]

                for (const suffix of testCases) {
                    const markName = `ZOTERO_ITEM CSL_CITATION {"citationID":"test","properties":{},"citationItems":[{"id":1,"itemData":{"id":1,"type":"article-journal","title":"Test","author":[{"family":"Smith","given":"John"}],"issued":{"date-parts":[[2020]]}}}]}${suffix}`
                    const result =
                        converter.OdtCitationsParser.referenceMarkCitation(
                            markName,
                            true
                        )
                    expect(result.isCitation).to.equal(true)
                    expect(result.format).to.equal("zotero")
                    expect(result.entries).to.not.equal(undefined)
                    expect(
                        Object.keys(result.entries!).length
                    ).to.be.greaterThan(0)
                }
            })

            it("extracts JabRef citation data", () => {
                const markName = "JABREF_Smith2020 CID_1 abc123"
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        true
                    )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("jabref")
                expect(result.entries).to.not.equal(undefined)
                expect(Object.keys(result.entries!).length).to.be.greaterThan(0)
                // JabRef marks create stub entries
                const entry = Object.values(result.entries!)[0]
                expect(entry.bib_type).to.equal("misc")
            })

            it("returns empty result for non-citation mark", () => {
                const markName = "SOME_OTHER_MARK"
                const result =
                    converter.OdtCitationsParser.referenceMarkCitation(
                        markName,
                        true
                    )
                expect(result.isCitation).to.equal(false)
                expect(result.format).to.equal(undefined)
            })
        })

        describe("referenceMarkBibliography", () => {
            it("detects Zotero bibliography mark", () => {
                const markName = "ZOTERO_BIBL CSL_BIBLIOGRAPHY RNDEk1MPyJ9IL"
                const result =
                    converter.OdtCitationsParser.referenceMarkBibliography(
                        markName
                    )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("zotero")
            })

            it("detects Zotero bibliography mark with JSON and random ID", () => {
                const markName =
                    'ZOTERO_BIBL {"uncited":[],"custom":[]} CSL_BIBLIOGRAPHY RNDjURflxg9F1'
                const result =
                    converter.OdtCitationsParser.referenceMarkBibliography(
                        markName
                    )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("zotero")
            })

            it("detects Mendeley bibliography mark", () => {
                const markName = "CSL_BIBLIOGRAPHY"
                const result =
                    converter.OdtCitationsParser.referenceMarkBibliography(
                        markName
                    )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("mendeley_legacy")
            })

            it("returns false for non-bibliography mark", () => {
                const markName = "ZOTERO_ITEM CSL_CITATION {} RNDLQoAq6M7m4"
                const result =
                    converter.OdtCitationsParser.referenceMarkBibliography(
                        markName
                    )
                expect(result.isBibliography).to.equal(false)
            })
        })

        describe("bibliographyMarkCitation", () => {
            it("detects LibreOffice native bibliography mark", () => {
                const bibMarkXml =
                    '<text:bibliography-mark text:identifier="Smith2020"/>'
                const result =
                    converter.OdtCitationsParser.bibliographyMarkCitation(
                        bibMarkXml
                    )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("libreoffice_native")
            })

            it("returns false for non-bibliography-mark element", () => {
                const xml = "<text:span>Some text</text:span>"
                const result =
                    converter.OdtCitationsParser.bibliographyMarkCitation(xml)
                expect(result.isCitation).to.equal(false)
            })
        })

        describe("sectionBibliography", () => {
            it("detects JabRef bibliography section (lowercase)", () => {
                const sectionName = "JR_bib"
                const result =
                    converter.OdtCitationsParser.sectionBibliography(
                        sectionName
                    )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("jabref")
            })

            it("detects JabRef bibliography section (uppercase)", () => {
                const sectionName = "JR_BIB"
                const result =
                    converter.OdtCitationsParser.sectionBibliography(
                        sectionName
                    )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("jabref")
            })

            it("detects JabRef bibliography section (mixed case)", () => {
                const sectionName = "Jr_BiB"
                const result =
                    converter.OdtCitationsParser.sectionBibliography(
                        sectionName
                    )
                expect(result.isBibliography).to.equal(true)
                expect(result.format).to.equal("jabref")
            })

            it("returns false for non-bibliography section", () => {
                const sectionName = "SOME_OTHER_SECTION"
                const result =
                    converter.OdtCitationsParser.sectionBibliography(
                        sectionName
                    )
                expect(result.isBibliography).to.equal(false)
                expect(result.format).to.equal(undefined)
            })

            it("returns false for similar but incorrect section name", () => {
                const sectionName = "JR_bibliography"
                const result =
                    converter.OdtCitationsParser.sectionBibliography(
                        sectionName
                    )
                expect(result.isBibliography).to.equal(false)
            })
        })

        describe("endNotePlaceholder", () => {
            it("detects EndNote placeholder pattern (check only)", () => {
                const text =
                    "According to {Smith, 2020 #291}, the research shows..."
                const result = converter.OdtCitationsParser.endNotePlaceholder(
                    text,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("endnote")
            })

            it("detects multiple EndNote placeholders (check only)", () => {
                const text = "{Smith, 2020 #291; Jones, 2019 #47}"
                const result = converter.OdtCitationsParser.endNotePlaceholder(
                    text,
                    false
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("endnote")
            })

            it("returns false for text without placeholders", () => {
                const text =
                    "Just some regular text with {braces} but no #number"
                const result = converter.OdtCitationsParser.endNotePlaceholder(
                    text,
                    false
                )
                expect(result.isCitation).to.equal(false)
            })

            it("extracts EndNote placeholder data", () => {
                const text = "Research shows {Smith, 2020 #291} that..."
                const result = converter.OdtCitationsParser.endNotePlaceholder(
                    text,
                    true
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("endnote")
                expect(result.entries).to.not.equal(undefined)
                expect(Object.keys(result.entries!).length).to.be.greaterThan(0)
                const entry = Object.values(result.entries!)[0]
                expect(entry.entry_key).to.equal("EN291")
                expect(entry.bib_type).to.equal("misc")
            })

            it("extracts multiple EndNote placeholders", () => {
                const text = "{Smith, 2020 #291; Jones, 2019 #47}"
                const result = converter.OdtCitationsParser.endNotePlaceholder(
                    text,
                    true
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("endnote")
                expect(result.entries).to.not.equal(undefined)
                expect(Object.keys(result.entries!).length).to.equal(2)
            })

            it("returns empty result for non-placeholder text", () => {
                const text = "Just regular text"
                const result = converter.OdtCitationsParser.endNotePlaceholder(
                    text,
                    true
                )
                expect(result.isCitation).to.equal(false)
                expect(result.format).to.equal(undefined)
            })
        })
    })
})
