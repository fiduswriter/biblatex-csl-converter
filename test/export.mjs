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

    let expectedBib = path.join(path.dirname(jsonfile), name + ".outbib")
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
    "fixtures"
)
const jsonfiles = fs.readdirSync(fixtures)

for (let fixture of jsonfiles) {
    if (path.extname(fixture) != ".json") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}
