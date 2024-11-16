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

    if (state.jabref) {
        if (!state.jabref.groups || state.jabref.groups.length == 0)
            delete state.jabref.groups
        if (!state.jabref.meta || Object.keys(state.jabref.meta).length == 0)
            delete state.jabref.meta
        if (Object.keys(state.jabref).length == 0) delete state.jabref
    } else {
        delete state.jabref
    }
}

const verify = (bibfile, processComments) => {
    let input = fs.readFileSync(bibfile, "utf8")
    let name = path.basename(bibfile, path.extname(bibfile))

    let found = converter.parse(input, {
        processComments,
        processUnexpected: true,
        processUnknown: true,
    })
    clean(found)

    let expected = path.join(path.dirname(bibfile), name + ".json")
    if (writeFixtures) {
        fs.writeFileSync(expected, JSON.stringify(found, null, 4) + "\n")
    }
    expected = JSON.parse(fs.readFileSync(expected, "utf8"))
    clean(expected)

    it(name, () => {
        expect(found).to.be.deep.equal(expected)
    })
}

const verifyAsync = (bibfile, processComments) => {
    let input = fs.readFileSync(bibfile, "utf8")
    let name = path.basename(bibfile, path.extname(bibfile))

    return converter
        .parseAsync(input, {
            processComments,
            processUnexpected: true,
            processUnknown: true,
            async: true,
        })
        .then((found) => {
            clean(found)

            let expected = path.join(path.dirname(bibfile), name + ".json")
            expected = JSON.parse(fs.readFileSync(expected, "utf8"))
            clean(expected)

            it(`async: ${name}`, () => {
                expect(found).to.be.deep.equal(expected)
            })
        })
}

const verifyIncludeLocation = (bibfile) => {
    let name = path.basename(bibfile, path.extname(bibfile))
    it(`include location: ${name}`, () => {
        let input = fs.readFileSync(bibfile, "utf8")

        let found = converter.parse(input, { includeLocation: true })
        clean(found)
        expect(found.entries["1"].location).to.be.deep.equal({
            start: 1,
            end: 1094,
        })
        expect(found.entries["2"].location).to.be.deep.equal({
            start: 1097,
            end: 1952,
        })
        expect(found.entries["3"].location).to.be.deep.equal({
            start: 1955,
            end: 3659,
        })
    })
}

const verifyIncludeRawText = (bibfile) => {
    let name = path.basename(bibfile, path.extname(bibfile))
    it(`include raw_text: ${name}`, () => {
        let input = fs.readFileSync(bibfile, "utf8")

        let found = converter.parse(input, { includeRawText: true })
        clean(found)
        expect(found.entries["1"].raw_text).to.match(
            /^@article\{Sen\.2016\.BV,\n abstract = \{We construct the quantum.+year = \{2016\}\n\}$/s
        )
        expect(found.entries["2"].raw_text).to.match(
            /^@article\{Smolin\.2013\.Classical,\n.+year = \{2013\}\n\}$/s
        )
        expect(found.entries["3"].raw_text).to.match(
            /^@article\{Ronnow\.2014\.Defining,\n.+year = \{2014\}\n\}$/s
        )
    })
}

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/import/bib"
)
const bibfiles = fs.readdirSync(fixtures)
const promised = []
for (let fixture of bibfiles) {
    if (path.extname(fixture) != ".bib") {
        continue
    }

    fixture = path.join(fixtures, fixture)
    const processComments = fixture.indexOf("comment") >= 0

    verify(fixture, processComments)
    promised.push(verifyAsync(fixture, processComments))
}

verifyIncludeLocation(
    path.join(fixtures, "arXiv identifiers in BibLaTeX export #460.bibtex.bib")
)
verifyIncludeRawText(
    path.join(fixtures, "arXiv identifiers in BibLaTeX export #460.bibtex.bib")
)

Promise.all(promised)
