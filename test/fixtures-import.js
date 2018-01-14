"use strict";

const converter = require('../tmp/bundle.test.js')
const expect = require('chai').expect;

const fs = require('fs')
const path = require('path')

const clean = state => {
  for (let prop of ['errors', 'warnings', 'groups']) {
    if (!state[prop] || state[prop].length == 0) { delete state[prop] }
  }
}

const verify = bibfile => {
  let input = fs.readFileSync(bibfile, 'utf8')
  let parser = new converter.BibLatexParser(input, {processUnexpected: true, processUnknown: true})
  let name = path.basename(bibfile, path.extname(bibfile))

  // this must be called before requesting warnings or errors
  let references = parser.output
  let found = { references, groups: parser.groups, errors: parser.errors, warnings: parser.warnings }
  clean(found)

  let expected = path.join(path.dirname(bibfile), name + '.json')
// Uncomment the following line to save the results as expected test results.
//  fs.writeFileSync(expected, JSON.stringify(found, null, 2))
  expected = JSON.parse(fs.readFileSync(expected, 'utf8'))
  clean(expected)

  it(name, () => {expect(found).to.be.deep.equal(expected)})
}

const fixtures = path.join(__dirname, 'fixtures/import')
const bibfiles = fs.readdirSync(fixtures)
for (let i in bibfiles) {
  let fixture = path.join(fixtures, bibfiles[i])
  if (path.extname(fixture) != '.bib') { continue }
  verify(fixture)
}
