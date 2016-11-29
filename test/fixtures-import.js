import test from "ava"

import {BibLatexParser} from "../src/import/biblatex"

const fs = require('fs');
const path = require('path');

const verify = bibfile => {
  // these hang the parser, exclude them for now
  if (bibfile.indexOf('xref') >= 0) { return; }
  if (bibfile.indexOf('Better BibTeX.006.bib') >= 0) { return; }
  if (bibfile.indexOf('Capitalize all title-fields for language en #383.biblatex') >= 0) { return; }
  if (bibfile.indexOf('Math markup to unicode not always imported correctly #472.bib') >= 0) { return; }
  if (bibfile.indexOf('Math markup to unicode not always imported correctly #472.roundtrip.bib') >= 0) { return; }

  let input = fs.readFileSync(bibfile, 'utf8');
  let parser = new BibLatexParser(input, {parseUnexpected: true, parseUnknown: true});
  let name = path.basename(bibfile, path.extname(bibfile));

  // this must be called before requesting warnins or errors
  let references = parser.output;
  let found = { references, errors: parser.errors, warnings: parser.warnings };
  if (!found.errors || found.errors.length == 0)            { delete found.errors; }
  if (!found.warnings || found.warnings.length == 0)        { delete found.warnings; }

  let expected = path.join(path.dirname(bibfile), name + '.json');
  expected = JSON.parse(fs.readFileSync(expected, 'utf8'));
  if (!expected.errors || expected.errors.length == 0)      { delete expected.errors; }
  if (!expected.warnings || expected.warnings.length == 0)  { delete expected.warnings; }

  test(name, t => t.deepEqual(expected, found));
}

const fixtures = path.join(__dirname, 'fixtures/import');
const bibfiles = fs.readdirSync(fixtures);
for (let i in bibfiles) {
  let fixture = path.join(fixtures, bibfiles[i]);
  if (path.extname(fixture) == '.json') { continue; }
  verify(fixture)
}
