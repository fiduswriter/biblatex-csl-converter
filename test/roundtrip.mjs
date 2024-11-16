import converter from "../tmp/bundle.test.js"
import { expect } from "chai"

const roundTripTest = (biblatex) => {
    // Parse BibLaTeX to internal format
    const parsed = converter.parse(biblatex)
    // Convert to CSL
    const cslExporter = new converter.CSLExporter(parsed.entries, null, {
        useEntryKeys: true,
    })
    const csl = cslExporter.parse()
    // Convert back to internal format
    const backToParsed = converter.parseCSL(csl)
    // Convert both to BibLaTeX for comparison
    const bibExporter1 = new converter.BibLatexExporter(parsed.entries)
    const bib1 = bibExporter1.parse()

    const bibExporter2 = new converter.BibLatexExporter(backToParsed)

    const bib2 = bibExporter2.parse()

    return [bib1, bib2]
}

describe("Round-trip conversion tests", () => {
    it("should preserve basic entry data", () => {
        const biblatex = `@article{test,
            author = {John Doe},
            title = {{{Test Article}}},
            journal = {{{Test Journal}}},
            year = {2020}
        }`

        const [bib1, bib2] = roundTripTest(biblatex)
        expect(bib2).to.equal(bib1)
    })

    it("should preserve rich text formatting", () => {
        const biblatex = `@article{test,
            author = {John Doe},
            title = {{\\textit{Formatted} \\textbf{Title}}},
            journal = {{Test Journal}},
            year = {2020}
        }`

        const [bib1, bib2] = roundTripTest(biblatex)
        expect(bib2).to.equal(bib1)
    })

    it("should preserve date range entry data", () => {
        const biblatex = `@book{bookentry,
            author = {John Doe},
            title = {{{Test Article}}},
            publisher = {{{New World Publishers}}},
            year = {2014-2020}
        }`

        const [bib1, bib2] = roundTripTest(biblatex)
        expect(bib2).to.equal(bib1)
    })
    // Add more round-trip tests as needed
})
