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

const verify = (citavifile) => {
    const input = JSON.parse(fs.readFileSync(citavifile, "utf8"))
    const name = path.basename(citavifile, path.extname(citavifile))

    const found = converter.parseCitavi(input)
    clean(found)

    const expectedPath = path.join(
        path.dirname(citavifile),
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

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/import/citavi"
)
const citavifiles = fs.readdirSync(fixtures)

for (let fixture of citavifiles) {
    // Only process source Citavi JSON files (not the -expected.json fixtures)
    if (
        path.extname(fixture).toLowerCase() !== ".json" ||
        fixture.endsWith("-expected.json")
    ) {
        continue
    }

    fixture = path.join(fixtures, fixture)
    verify(fixture)
}
