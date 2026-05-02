import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect } from "chai"
import * as converter from "../src/index.ts"

const writeFixtures = false // Set to true to save the results as expected test results.

const verify = (cslfile) => {
    const input = JSON.parse(fs.readFileSync(cslfile, "utf8"))
    const name = path.basename(cslfile, path.extname(cslfile))

    const found = converter.parseCSL(input)
    //clean(found)

    let expected = path.join(path.dirname(cslfile), `${name}.json`)
    if (writeFixtures) {
        fs.writeFileSync(expected, `${JSON.stringify(found, null, 4)}\n`)
    }
    expected = JSON.parse(fs.readFileSync(expected, "utf8"))
    //clean(expected)

    it(name, () => {
        expect(found).to.be.deep.equal(expected)
    })
}

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/import/csl",
)
const cslfiles = fs.readdirSync(fixtures)
for (let fixture of cslfiles) {
    if (path.extname(fixture) !== ".csl") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}
