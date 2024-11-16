import converter from "../tmp/bundle.test.js"
import { expect } from "chai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const writeFixtures = false // Set to true to save the results as expected test results.

const verify = (jsonfile) => {
    let input = JSON.parse(fs.readFileSync(jsonfile, "utf8"))
    let name = path.basename(jsonfile, path.extname(jsonfile))

    // CSL
    const cslGetter = new converter.CSLExporter(input.entries)
    const foundCSL = cslGetter.parse()

    let expectedCSL = path.join(path.dirname(jsonfile), name + ".csl")
    if (writeFixtures) {
        fs.writeFileSync(expectedCSL, JSON.stringify(foundCSL, null, 4) + "\n")
    }
    expectedCSL = JSON.parse(fs.readFileSync(expectedCSL, "utf8"))

    it(name, () => {
        expect(foundCSL).to.be.deep.equal(expectedCSL)
    })

    // Biblatex
    const bibGetter = new converter.BibLatexExporter(input.entries)
    const foundBib = bibGetter.parse()

    let expectedBib = path.join(path.dirname(jsonfile), name + ".bib")
    if (writeFixtures) {
        fs.writeFileSync(expectedBib, foundBib)
    }
    expectedBib = fs.readFileSync(expectedBib, "utf8")

    it(name, () => {
        expect(foundBib).to.be.deep.equal(expectedBib)
    })
}

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/export"
)
const jsonfiles = fs.readdirSync(fixtures)

for (let fixture of jsonfiles) {
    if (path.extname(fixture) != ".json") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}

const verifyEscape = (jsonfile) => {
    let name = path.basename(jsonfile, path.extname(jsonfile))
    it(`verify escape: ${name}`, () => {
        let input = JSON.parse(fs.readFileSync(jsonfile, "utf8"))
        const exporter = new converter.CSLExporter(input.entries, null, {
            escapeText: true,
        })
        const escapedOutput = exporter.parse()
        const escapedTitle = escapedOutput["1"].title
        expect(escapedTitle).to.equal("A title with &lt;i&gt;style&lt;/i&gt;!")
        const citeprocedTitle = escapedTitle.replace(/&/g, "&#38;")
        expect(citeprocedTitle).to.equal(
            "A title with &#38;lt;i&#38;gt;style&#38;lt;/i&#38;gt;!"
        )
        const unciteprocedTitle = converter.unescapeCSL(citeprocedTitle)
        expect(unciteprocedTitle).to.equal(
            "A title with &lt;i&gt;style&lt;/i&gt;!"
        )
        const unescapedTitle = unciteprocedTitle
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
        expect(unescapedTitle).to.equal("A title with <i>style</i>!")
    })
}

verifyEscape(path.join(fixtures, "escape.json"))
