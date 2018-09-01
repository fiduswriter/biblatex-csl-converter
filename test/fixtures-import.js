"use strict";

const converter = require('../tmp/bundle.test.js')
const expect = require('chai').expect;

const fs = require('fs')
const path = require('path')

const clean = state => {
  for (let prop of ['errors', 'warnings']) {
    if (!state[prop] || state[prop].length == 0) { delete state[prop] }
  }

  if (!state.jabref.groups || state.jabref.groups.length == 0) delete state.jabref.groups
  if (Object.keys(state.jabref.meta).length == 0) delete state.jabref.meta
  if (Object.keys(state.jabref).length == 0) delete state.jabref
}

const verify = bibfile => {
  let input = fs.readFileSync(bibfile, 'utf8')
  let parser = new converter.BibLatexParser(input, {processUnexpected: true, processUnknown: true})
  let name = path.basename(bibfile, path.extname(bibfile))

  let found = parser.parse()
  clean(found)

  let expected = path.join(path.dirname(bibfile), name + '.json')
// Uncomment the following line to save the results as expected test results.
//  fs.writeFileSync(clean(expected), JSON.stringify(found, null, 2))
  expected = JSON.parse(fs.readFileSync(expected, 'utf8'))
  clean(expected)

  it(name, () => {expect(found).to.be.deep.equal(expected)})
}

const verifyAsync = bibfile => {
  let input = fs.readFileSync(bibfile, 'utf8')
  let parser = new converter.BibLatexParser(input, {processUnexpected: true, processUnknown: true, async: true})
  let name = path.basename(bibfile, path.extname(bibfile))

  return parser.parse().then((found) => {
    clean(found)

    let expected = path.join(path.dirname(bibfile), name + '.json')
    expected = JSON.parse(fs.readFileSync(expected, 'utf8'))
    clean(expected)

    it(`async: ${name}`, () => {expect(found).to.be.deep.equal(expected)})
  })
}

const fixtures = path.join(__dirname, 'fixtures/import')
const bibfiles = fs.readdirSync(fixtures)
const promised = []
for (let fixture of bibfiles) {
  if (path.extname(fixture) != '.bib') { continue }

  verify(path.join(fixtures, fixture))
  promised.push(verifyAsync(path.join(fixtures, fixture)))
}

Promise.all(promised)
