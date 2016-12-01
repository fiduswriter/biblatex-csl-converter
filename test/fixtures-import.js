import test from "ava"

import {BibLatexParser} from "../src/import/biblatex"

const fs = require('fs');
const path = require('path');

const clean = state => {
  for (let prop of ['errors', 'warnings', 'groups']) {
    if (!state[prop] || state[prop].length == 0) { delete state[prop] }
  }
}

const verify = bibfile => {
  let input = fs.readFileSync(bibfile, 'utf8');
  let parser = new BibLatexParser(input, {rawFields: true, processUnexpected: true, processUnknown: true});
  let name = path.basename(bibfile, path.extname(bibfile));

  // this must be called before requesting warnings or errors
  let references = parser.output;
  let found = { references, errors: parser.errors, warnings: parser.warnings };
  clean(found)

  let expected = path.join(path.dirname(bibfile), name + '.json');
  expected = JSON.parse(fs.readFileSync(expected, 'utf8'));
  clean(expected)

  test(name, t => t.deepEqual(expected, found));
}

const fixtures = path.join(__dirname, 'fixtures/import');
const bibfiles = fs.readdirSync(fixtures);
for (let i in bibfiles) {
  let fixture = path.join(fixtures, bibfiles[i]);
  if (path.extname(fixture) != '.bib') { continue; }
  verify(fixture)
}
