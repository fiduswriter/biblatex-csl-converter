"use strict";

const converter = require("../tmp/bundle.test.js");
const expect = require("chai").expect;

const fs = require("fs");
const path = require("path");

const clean = (state) => {
    for (let prop of ["comments", "errors", "warnings"]) {
        if (!state[prop] || state[prop].length == 0) {
            delete state[prop];
        }
    }
    if (state.strings && !Object.keys(state.strings).length)
        delete state.strings;

    if (state.jabref) {
        if (!state.jabref.groups || state.jabref.groups.length == 0)
            delete state.jabref.groups;
        if (!state.jabref.meta || Object.keys(state.jabref.meta).length == 0)
            delete state.jabref.meta;
        if (Object.keys(state.jabref).length == 0) delete state.jabref;
    } else {
        delete state.jabref;
    }
};

const verify = (bibfile, processComments) => {
    let input = fs.readFileSync(bibfile, "utf8");
    let name = path.basename(bibfile, path.extname(bibfile));

    let found = converter.parse(input, {
        processComments,
        processUnexpected: true,
        processUnknown: true,
    });
    clean(found);

    let expected = path.join(path.dirname(bibfile), name + ".json");
    // Uncomment the following line to save the results as expected test results.
    // fs.writeFileSync(expected, JSON.stringify(found, null, 2))
    expected = JSON.parse(fs.readFileSync(expected, "utf8"));
    clean(expected);

    it(name, () => {
        expect(found).to.be.deep.equal(expected);
    });
};

const verifyAsync = (bibfile, processComments) => {
    let input = fs.readFileSync(bibfile, "utf8");
    let name = path.basename(bibfile, path.extname(bibfile));

    return converter
        .parseAsync(input, {
            processComments,
            processUnexpected: true,
            processUnknown: true,
            async: true,
        })
        .then((found) => {
            clean(found);

            let expected = path.join(path.dirname(bibfile), name + ".json");
            expected = JSON.parse(fs.readFileSync(expected, "utf8"));
            clean(expected);

            it(`async: ${name}`, () => {
                expect(found).to.be.deep.equal(expected);
            });
        });
};

const fixtures = path.join(__dirname, "fixtures/import");
const bibfiles = fs.readdirSync(fixtures);
const promised = [];
for (let fixture of bibfiles) {
    if (path.extname(fixture) != ".bib") {
        continue;
    }

    fixture = path.join(fixtures, fixture);
    const processComments = fixture.indexOf("comment") >= 0;

    verify(fixture, processComments);
    promised.push(verifyAsync(fixture, processComments));
}

Promise.all(promised);
