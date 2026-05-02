import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { expect } from "chai"
import * as converter from "../src/index.ts"

const writeFixtures = false // Set to true to save the results as expected test results.

const clean = (state) => {
    for (const prop of ["comments", "errors", "warnings"]) {
        if (!state[prop] || state[prop].length === 0) {
            delete state[prop]
        }
    }
    if (state.strings && !Object.keys(state.strings).length)
        delete state.strings
}

const verify = (risfile) => {
    const input = fs.readFileSync(risfile, "utf8")
    const name = path.basename(risfile, path.extname(risfile))

    const found = converter.parseRIS(input)
    clean(found)

    let expected = path.join(path.dirname(risfile), `${name}.json`)
    if (writeFixtures) {
        fs.writeFileSync(expected, `${JSON.stringify(found, null, 4)}\n`)
    }

    if (!fs.existsSync(expected)) {
        console.log(
            `Expected file ${expected} does not exist, creating fixture`,
        )
        fs.writeFileSync(expected, `${JSON.stringify(found, null, 4)}\n`)
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
    "fixtures/import/ris",
)
const risfiles = fs.readdirSync(fixtures)

for (let fixture of risfiles) {
    const ext = path.extname(fixture).toLowerCase()
    if (ext !== ".ris" && ext !== ".end") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}
