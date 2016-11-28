import test from "ava"

import {BibLatexParser} from "../lib/import/biblatex"

const input = `@article{barker1_2016_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker1, Anne},
  date = {2016-07-18T20:26:06},
  entrysubtype = {newspaper},
  journaltitle = {ABC News},
  langid = {australian},
  note = {Actual: 2016-07-18T20:26:06+10:00},
  rights = {http://www.abc.net.au/conditions.htm\#UseOfContent},
  timestamp = {2015-02-24 12:14:36 +0100},
  title = {Turkey Divided between Secular and {{Islamist}} Rule},
  url = {http://www.abc.net.au/news/2016-07-18/turkey-coup-attempt-shows-division-over-wish-for-islamist-rule/7639292},
  urldate = {2016-07-24}
}`

const output = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker1_2016_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker1, Anne",
            "date": "2016-07-18T20:26:06",
            "entrysubtype": "newspaper",
            "journaltitle": "ABC News",
            "langid": "australian",
            "note": "Actual: 2016-07-18T20:26:06+10:00",
            "rights": "http://www.abc.net.au/conditions.htm#UseOfContent",
            "timestamp": "2015-02-24 12:14:36 +0100",
            "title": "Turkey Divided between Secular and {{Islamist}} Rule",
            "url": "http://www.abc.net.au/news/2016-07-18/turkey-coup-attempt-shows-division-over-wish-for-islamist-rule/7639292",
            "urldate": "2016-07-24"
        },
        "fields": {
            "date": "2016-07-18T20:26:06",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker1"
                }],
                "given": [{
                    "type": "text",
                    "text": "Anne"
                }]
            }],
            "journaltitle": [{
                "type": "text",
                "text": "ABC News"
            }],
            "note": [{
                "type": "text",
                "text": "Actual: 2016-07-18T20:26:06+10:00"
            }],
            "title": [{
                "type": "text",
                "text": "Turkey Divided between Secular and "
            }, {
                "type": "text",
                "text": "Islamist",
                "marks": [{
                    "type": "nocase"
                }]
            }, {
                "type": "text",
                "text": " Rule"
            }],
            "urldate": "2016-07-24"
        }
    }
}

let parser = new BibLatexParser(input)

test('can parse edtf date', t => t.deepEqual(output, parser.output))
