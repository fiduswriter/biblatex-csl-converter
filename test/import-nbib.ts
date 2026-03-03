import * as converter from "../tmp/bundle.test.js"
import { expect } from "chai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const writeFixtures = false // Set to true to save the results as expected test results.

const clean = (state) => {
    for (let prop of ["comments", "errors", "warnings"]) {
        if (!state[prop] || state[prop].length == 0) {
            delete state[prop]
        }
    }
    if (state.strings && !Object.keys(state.strings).length)
        delete state.strings
}

const verify = (nbibfile) => {
    let input = fs.readFileSync(nbibfile, "utf8")
    let name = path.basename(nbibfile, path.extname(nbibfile))

    let found = converter.parseNBIB(input)
    clean(found)

    let expected = path.join(path.dirname(nbibfile), name + ".json")
    if (writeFixtures) {
        fs.writeFileSync(expected, JSON.stringify(found, null, 4) + "\n")
    }

    if (!fs.existsSync(expected)) {
        console.log(
            `Expected file ${expected} does not exist, creating fixture`
        )
        fs.writeFileSync(expected, JSON.stringify(found, null, 4) + "\n")
        return
    }

    expected = JSON.parse(fs.readFileSync(expected, "utf8"))
    clean(expected)

    it(name, () => {
        expect(found).to.be.deep.equal(expected)
    })
}

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/import/nbib"
)
const nbibfiles = fs.readdirSync(fixtures)

for (let fixture of nbibfiles) {
    if (path.extname(fixture).toLowerCase() !== ".nbib") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}
