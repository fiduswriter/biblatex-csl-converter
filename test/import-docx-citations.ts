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

        describe("retrieveMetadata", () => {
            // Zotero CSL JSON with all three author-rendering modes and a
            // full set of locator/prefix/suffix fields on the first item.
            const zoteroInstr =
                " ADDIN ZOTERO_ITEM CSL_CITATION " +
                JSON.stringify({
                    citationID: "ztero-meta-test",
                    properties: { noteIndex: 0 },
                    citationItems: [
                        {
                            id: "z-ref-1",
                            locator: "123",
                            label: "page",
                            prefix: "see ",
                            suffix: " for more",
                            "suppress-author": false,
                            itemData: {
                                id: "z-ref-1",
                                type: "article-journal",
                                title: "Zotero Article",
                                author: [{ family: "Adams", given: "Anne" }],
                                issued: { "date-parts": [[2018]] },
                            },
                        },
                        {
                            id: "z-ref-2",
                            "suppress-author": true,
                            itemData: {
                                id: "z-ref-2",
                                type: "book",
                                title: "Zotero Book",
                                author: [{ family: "Baker", given: "Ben" }],
                                issued: { "date-parts": [[2019]] },
                            },
                        },
                        {
                            id: "z-ref-3",
                            "author-only": true,
                            itemData: {
                                id: "z-ref-3",
                                type: "book",
                                title: "Third Work",
                                author: [{ family: "Clark", given: "Carla" }],
                                issued: { "date-parts": [[2020]] },
                            },
                        },
                    ],
                }) +
                " "

            it("metadata is absent when retrieveMetadata is false (default)", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true
                )
                expect(result.isCitation).to.equal(true)
                expect(result.metadata).to.equal(undefined)
            })

            it("metadata is absent when retrieve is false even if retrieveMetadata is true", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    false, // retrieve=false → no data extraction at all
                    true // retrieveMetadata=true
                )
                expect(result.isCitation).to.equal(true)
                expect(result.entries).to.equal(undefined)
                expect(result.metadata).to.equal(undefined)
            })

            it("Zotero: returns one metadata object per citation item", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true, // retrieve=true → data extraction
                    true // retrieveMetadata
                )
                expect(result.isCitation).to.equal(true)
                expect(result.metadata).to.be.an("array").with.lengthOf(3)
            })

            it("Zotero: metadata entry_key matches the corresponding entry", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true,
                    true
                )
                const entryKeys = Object.values(result.entries!).map(
                    (e) => e.entry_key
                )
                const metaKeys = result.metadata!.map((m) => m.entry_key)
                // Every metadata entry_key must correspond to a parsed entry
                for (const key of metaKeys) {
                    expect(entryKeys).to.include(key)
                }
                // All three items must have distinct keys
                expect(new Set(metaKeys).size).to.equal(3)
            })

            it("Zotero: locator and label are extracted for the first item", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true,
                    true
                )
                const meta0 = result.metadata![0]
                expect(meta0.locator).to.equal("123")
                expect(meta0.label).to.equal("page")
            })

            it("Zotero: prefix and suffix are extracted for the first item", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true,
                    true
                )
                const meta0 = result.metadata![0]
                expect(meta0.prefix).to.equal("see ")
                expect(meta0.suffix).to.equal(" for more")
            })

            it("Zotero: suppressAuthor is true for the second item", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true,
                    true
                )
                const meta1 = result.metadata![1]
                expect(meta1.suppressAuthor).to.equal(true)
                expect(meta1.authorOnly).to.equal(undefined)
                expect(meta1.authorYear).to.equal(undefined)
            })

            it("Zotero: authorOnly is true for the third item", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true,
                    true
                )
                const meta2 = result.metadata![2]
                expect(meta2.authorOnly).to.equal(true)
                expect(meta2.suppressAuthor).to.equal(undefined)
                expect(meta2.authorYear).to.equal(undefined)
            })

            it("Zotero: items without optional fields have no extra keys in metadata", () => {
                const result = converter.DocxCitationsParser.fieldCitation(
                    zoteroInstr,
                    true,
                    true
                )
                // Second item has only suppress-author set; no locator/label/prefix/suffix
                const meta1 = result.metadata![1]
                expect(meta1.locator).to.equal(undefined)
                expect(meta1.label).to.equal(undefined)
                expect(meta1.prefix).to.equal(undefined)
                expect(meta1.suffix).to.equal(undefined)
            })

            it("EndNote: locator, prefix, suffix and authorYear are extracted", () => {
                // AuthorYear="1" → author outside parens: "Williams (2020, p. 45-50)"
                const instr =
                    " ADDIN EN.CITE " +
                    "<EndNote>" +
                    '<Cite AuthorYear="1">' +
                    "<Author>Williams</Author>" +
                    "<Year>2020</Year>" +
                    "<RecNum>99</RecNum>" +
                    "<Pages>45-50</Pages>" +
                    "<Prefix>cf. </Prefix>" +
                    "<Suffix> note 3</Suffix>" +
                    "<DisplayText>(Williams 2020)</DisplayText>" +
                    "<record>" +
                    "<rec-number>99</rec-number>" +
                    '<ref-type name="Journal Article">17</ref-type>' +
                    "<contributors><authors><author>Williams, William T.</author></authors></contributors>" +
                    "<titles><title>A Test Paper</title></titles>" +
                    "<dates><year>2020</year></dates>" +
                    "</record>" +
                    "</Cite>" +
                    "</EndNote>"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    true,
                    true
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("endnote")
                expect(result.metadata).to.be.an("array").with.lengthOf(1)

                const meta = result.metadata![0]
                // entry_key is the rec-number string
                expect(meta.entry_key).to.equal("99")
                // Pages → locator
                expect(meta.locator).to.equal("45-50")
                // Prefix/suffix are trimmed by stripStyleTags
                expect(meta.prefix).to.equal("cf.")
                expect(meta.suffix).to.equal("note 3")
                // AuthorYear="1" → authorYear flag, NOT suppressAuthor
                expect(meta.authorYear).to.equal(true)
                expect(meta.suppressAuthor).to.equal(undefined)
                expect(meta.authorOnly).to.equal(undefined)
            })

            it("EndNote: citation without AuthorYear has no authorYear flag", () => {
                const instr =
                    " ADDIN EN.CITE " +
                    "<EndNote>" +
                    "<Cite>" +
                    "<Author>Jones</Author>" +
                    "<Year>2015</Year>" +
                    "<RecNum>7</RecNum>" +
                    "<DisplayText>(Jones 2015)</DisplayText>" +
                    "<record>" +
                    "<rec-number>7</rec-number>" +
                    '<ref-type name="Book">6</ref-type>' +
                    "<contributors><authors><author>Jones, A.</author></authors></contributors>" +
                    "<titles><title>Some Book</title></titles>" +
                    "<dates><year>2015</year></dates>" +
                    "</record>" +
                    "</Cite>" +
                    "</EndNote>"
                const result = converter.DocxCitationsParser.fieldCitation(
                    instr,
                    true,
                    true
                )
                expect(result.metadata).to.be.an("array").with.lengthOf(1)
                const meta = result.metadata![0]
                expect(meta.authorYear).to.equal(undefined)
                expect(meta.suppressAuthor).to.equal(undefined)
                expect(meta.locator).to.equal(undefined)
                expect(meta.prefix).to.equal(undefined)
            })

            it("Mendeley v3 SDT: locator, prefix, suffix and suppressAuthor are extracted", () => {
                // Base64 of a Mendeley v3 payload with two citation items:
                //   item 1: locator "42-43", label "page", prefix "see ", suffix " for details"
                //   item 2: suppress-author true
                const payload = JSON.stringify({
                    citationID: "MENDELEY_CITATION_test-v3",
                    properties: { noteIndex: 0 },
                    citationItems: [
                        {
                            id: "m-ref-1",
                            locator: "42-43",
                            label: "page",
                            prefix: "see ",
                            suffix: " for details",
                            "suppress-author": false,
                            "author-only": false,
                            itemData: {
                                type: "article-journal",
                                id: "m-ref-1",
                                title: "Mendeley Article",
                                author: [{ family: "Brown", given: "Alice" }],
                                issued: { "date-parts": [[2021]] },
                            },
                        },
                        {
                            id: "m-ref-2",
                            "suppress-author": true,
                            itemData: {
                                type: "book",
                                id: "m-ref-2",
                                title: "Mendeley Book",
                                author: [{ family: "Green", given: "Bob" }],
                                issued: { "date-parts": [[2019]] },
                            },
                        },
                    ],
                })
                const b64 = btoa(payload)
                const sdtXml =
                    `<w:sdt><w:sdtPr>` +
                    `<w:tag w:val="MENDELEY_CITATION_v3_${b64}"/>` +
                    `</w:sdtPr><w:sdtContent><w:p><w:r>` +
                    `<w:t>(Brown, 2021)</w:t></w:r></w:p></w:sdtContent></w:sdt>`

                const result = converter.DocxCitationsParser.sdtCitation(
                    sdtXml,
                    true,
                    true // retrieveMetadata
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("mendeley_v3")
                expect(result.metadata).to.be.an("array").with.lengthOf(2)

                const meta0 = result.metadata![0]
                expect(meta0.locator).to.equal("42-43")
                expect(meta0.label).to.equal("page")
                expect(meta0.prefix).to.equal("see ")
                expect(meta0.suffix).to.equal(" for details")
                expect(meta0.suppressAuthor).to.equal(undefined)

                const meta1 = result.metadata![1]
                expect(meta1.suppressAuthor).to.equal(true)
                expect(meta1.locator).to.equal(undefined)
            })

            it("Citavi SDT: prefix and page locator are extracted per entry", () => {
                // Two Citavi entries:
                //   entry 1: Prefix "see ", PageRange.OriginalString "100-105"
                //   entry 2: no prefix, PageRange.OriginalString "42"
                const citaviPayload = JSON.stringify({
                    $type: "SwissAcademic.Citavi.Citations.WordPlaceholder",
                    WAIVersion: "6.11.0.0",
                    Entries: [
                        {
                            $type: "SwissAcademic.Citavi.Citations.WordPlaceholderEntry",
                            Id: "aaaa-0001",
                            ReferenceId: "bbbb-0001",
                            RangeLength: 3,
                            UseNumberingTypeOfParentDocument: false,
                            UseStandardPrefix: false,
                            Prefix: "see ",
                            PageRange: {
                                $type: "SwissAcademic.PageRange",
                                OriginalString: "100-105",
                                NumberingType: 0,
                                NumeralSystem: 0,
                                StartPage: {
                                    $type: "SwissAcademic.PageNumber",
                                    OriginalString: "100",
                                    PrettyString: "100",
                                    Number: 100,
                                    IsFullyNumeric: true,
                                    NumberingType: 0,
                                    NumeralSystem: 0,
                                },
                                EndPage: {
                                    $type: "SwissAcademic.PageNumber",
                                    OriginalString: "105",
                                    PrettyString: "105",
                                    Number: 105,
                                    IsFullyNumeric: true,
                                    NumberingType: 0,
                                    NumeralSystem: 0,
                                },
                            },
                            Reference: {
                                $type: "SwissAcademic.Citavi.Reference",
                                Authors: [
                                    { FirstName: "John", LastName: "Doe" },
                                ],
                                Title: "Citavi Test Article",
                                Year: "2022",
                                ReferenceType: "JournalArticle",
                            },
                        },
                        {
                            $type: "SwissAcademic.Citavi.Citations.WordPlaceholderEntry",
                            Id: "aaaa-0002",
                            ReferenceId: "bbbb-0002",
                            RangeLength: 3,
                            UseNumberingTypeOfParentDocument: false,
                            UseStandardPrefix: false,
                            PageRange: {
                                $type: "SwissAcademic.PageRange",
                                OriginalString: "42",
                                NumberingType: 0,
                                NumeralSystem: 0,
                                StartPage: {
                                    $type: "SwissAcademic.PageNumber",
                                    OriginalString: "42",
                                    PrettyString: "42",
                                    Number: 42,
                                    IsFullyNumeric: true,
                                    NumberingType: 0,
                                    NumeralSystem: 0,
                                },
                            },
                            Reference: {
                                $type: "SwissAcademic.Citavi.Reference",
                                Authors: [
                                    { FirstName: "Jane", LastName: "Smith" },
                                ],
                                Title: "Another Citavi Work",
                                Year: "2021",
                                ReferenceType: "Book",
                            },
                        },
                    ],
                    Text: "[1, 2]",
                })
                const b64 = btoa(citaviPayload)
                const sdtXml =
                    `<w:sdt><w:sdtPr>` +
                    `<w:tag w:val="CitaviPlaceholder#aaaa-0001"/>` +
                    `</w:sdtPr><w:sdtContent><w:r>` +
                    `<w:fldChar w:fldCharType="begin"/></w:r><w:r>` +
                    `<w:instrText>ADDIN CitaviPlaceholder${b64}</w:instrText>` +
                    `</w:r></w:sdtContent></w:sdt>`

                const result = converter.DocxCitationsParser.sdtCitation(
                    sdtXml,
                    true,
                    true // retrieveMetadata
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("citavi")
                expect(result.metadata).to.be.an("array").with.lengthOf(2)

                const meta0 = result.metadata![0]
                expect(meta0.prefix).to.equal("see ")
                expect(meta0.locator).to.equal("100-105")
                // Citavi has no author-suppression support
                expect(meta0.suppressAuthor).to.equal(undefined)
                expect(meta0.authorYear).to.equal(undefined)

                const meta1 = result.metadata![1]
                expect(meta1.locator).to.equal("42")
                expect(meta1.prefix).to.equal(undefined)
            })

            it("Citavi SDT: extracts payload when instrText is split across multiple runs", () => {
                // Real-world Word documents split long field codes across multiple
                // <w:r><w:instrText> elements. The first run starts with
                // "ADDIN CitaviPlaceholder" and subsequent runs continue the Base64.
                const citaviPayload = JSON.stringify({
                    $type: "SwissAcademic.Citavi.Citations.WordPlaceholder",
                    WAIVersion: "6.14.0.0",
                    Entries: [
                        {
                            $type: "SwissAcademic.Citavi.Citations.WordPlaceholderEntry",
                            Id: "aaaa-split-0001",
                            ReferenceId: "bbbb-split-0001",
                            RangeLength: 12,
                            UseNumberingTypeOfParentDocument: false,
                            UseStandardPrefix: false,
                            PageRange: {
                                $type: "SwissAcademic.PageRange",
                                OriginalString: "99",
                                NumberingType: 0,
                                NumeralSystem: 0,
                                StartPage: {
                                    $type: "SwissAcademic.PageNumber",
                                    OriginalString: "99",
                                    PrettyString: "99",
                                    Number: 99,
                                    IsFullyNumeric: true,
                                    NumberingType: 0,
                                    NumeralSystem: 0,
                                },
                            },
                            Reference: {
                                $type: "SwissAcademic.Citavi.Reference",
                                Authors: [
                                    { FirstName: "Peter", LastName: "Hofer" },
                                ],
                                Title: "Improving Urban Operations by Integration",
                                Year: "2022",
                                ReferenceType: "InternetDocument",
                            },
                        },
                    ],
                    Text: "(Hofer 2022)",
                })
                const fullB64 = btoa(citaviPayload)
                // Real-world Word documents wrap the Base64 in curly braces:
                //   ADDIN CitaviPlaceholder{<base64>}
                // and split the content across multiple <w:instrText> runs.
                // Split so that the opening { is in the first run and the
                // closing } is in the last run, mirroring the observed format.
                const splitAt = Math.floor(fullB64.length / 2)
                const part1 = fullB64.slice(0, splitAt)
                const part2 = fullB64.slice(splitAt)

                const sdtXml =
                    `<w:sdt><w:sdtPr>` +
                    `<w:alias w:val="To edit, see citavi.com/edit"/>` +
                    `<w:tag w:val="CitaviPlaceholder#6cab9f3a-1cf8-4da4-a08d-4c9f9a797540"/>` +
                    `<w:id w:val="1945261596"/>` +
                    `</w:sdtPr><w:sdtContent>` +
                    `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
                    `<w:r><w:instrText>ADDIN CitaviPlaceholder{${part1}</w:instrText></w:r>` +
                    `<w:r><w:instrText>${part2}}</w:instrText></w:r>` +
                    `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
                    `<w:r><w:t>(Hofer 2022)</w:t></w:r>` +
                    `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
                    `</w:sdtContent></w:sdt>`

                const result = converter.DocxCitationsParser.sdtCitation(
                    sdtXml,
                    true,
                    true // retrieveMetadata
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("citavi")
                expect(result.warnings).to.be.an("array").with.lengthOf(0)
                expect(result.metadata).to.be.an("array").with.lengthOf(1)

                const meta0 = result.metadata![0]
                expect(meta0.locator).to.equal("99")
                expect(meta0.prefix).to.equal(undefined)
                expect(meta0.suppressAuthor).to.equal(undefined)
            })

            it("Citavi SDT: extracts payload when instrText is split across multiple runs (no curly braces)", () => {
                // Some versions of Citavi omit the curly-brace wrapper and emit
                // the Base64 directly: ADDIN CitaviPlaceholder<base64>
                const citaviPayload = JSON.stringify({
                    $type: "SwissAcademic.Citavi.Citations.WordPlaceholder",
                    WAIVersion: "6.11.0.0",
                    Entries: [
                        {
                            $type: "SwissAcademic.Citavi.Citations.WordPlaceholderEntry",
                            Id: "aaaa-nobrace-0001",
                            ReferenceId: "bbbb-nobrace-0001",
                            RangeLength: 3,
                            UseNumberingTypeOfParentDocument: false,
                            UseStandardPrefix: false,
                            Reference: {
                                $type: "SwissAcademic.Citavi.Reference",
                                Authors: [
                                    { FirstName: "Jane", LastName: "Smith" },
                                ],
                                Title: "No-Brace Test Work",
                                Year: "2021",
                                ReferenceType: "Book",
                            },
                        },
                    ],
                    Text: "(Smith 2021)",
                })
                const fullB64 = btoa(citaviPayload)
                const splitAt = Math.floor(fullB64.length / 2)
                const part1 = fullB64.slice(0, splitAt)
                const part2 = fullB64.slice(splitAt)

                const sdtXml =
                    `<w:sdt><w:sdtPr>` +
                    `<w:tag w:val="CitaviPlaceholder#no-brace-test"/>` +
                    `</w:sdtPr><w:sdtContent>` +
                    `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
                    `<w:r><w:instrText>ADDIN CitaviPlaceholder${part1}</w:instrText></w:r>` +
                    `<w:r><w:instrText>${part2}</w:instrText></w:r>` +
                    `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
                    `<w:r><w:t>(Smith 2021)</w:t></w:r>` +
                    `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
                    `</w:sdtContent></w:sdt>`

                const result = converter.DocxCitationsParser.sdtCitation(
                    sdtXml,
                    true,
                    true
                )
                expect(result.isCitation).to.equal(true)
                expect(result.format).to.equal("citavi")
                expect(result.warnings).to.be.an("array").with.lengthOf(0)
                expect(result.metadata).to.be.an("array").with.lengthOf(1)
            })
        })
    })
})
