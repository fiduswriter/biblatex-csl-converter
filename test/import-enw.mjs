import converter from "../tmp/bundle.test.js"
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

const verify = (enwfile) => {
    let input = fs.readFileSync(enwfile, "utf8")
    let name = path.basename(enwfile, path.extname(enwfile))

    let found = converter.parseENW(input)
    clean(found)

    let expected = path.join(path.dirname(enwfile), name + ".json")
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
    "fixtures/import/enw"
)
const enwfiles = fs.readdirSync(fixtures)

for (let fixture of enwfiles) {
    if (path.extname(fixture).toLowerCase() !== ".enw") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}
