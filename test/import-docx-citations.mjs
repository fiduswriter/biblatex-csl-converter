import converter from "../tmp/bundle.test.js"
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
