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
