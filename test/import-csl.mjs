import converter from "../tmp/bundle.test.js"
import { expect } from "chai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const writeFixtures = false // Set to true to save the results as expected test results.

const verify = (cslfile) => {
    let input = JSON.parse(fs.readFileSync(cslfile, "utf8"))
    let name = path.basename(cslfile, path.extname(cslfile))

    let found = converter.parseCSL(input)
    //clean(found)

    let expected = path.join(path.dirname(cslfile), name + ".json")
    if (writeFixtures) {
        fs.writeFileSync(expected, JSON.stringify(found, null, 4) + "\n")
    }
    expected = JSON.parse(fs.readFileSync(expected, "utf8"))
    //clean(expected)

    it(name, () => {
        expect(found).to.be.deep.equal(expected)
    })
}

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/import/csl"
)
const cslfiles = fs.readdirSync(fixtures)
for (let fixture of cslfiles) {
    if (path.extname(fixture) != ".csl") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}
