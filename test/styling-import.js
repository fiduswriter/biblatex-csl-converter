import test from "ava"

import {BibLatexParser} from "../src/import/biblatex"

const input1 = `@ARTICLE{wilm10,
  author = {Johannes Wilm},
  title = {{Cuba}: Economic {\\textbf{changes}} and the future of socialism},
  journaltitle = {\\textit{Links} International Journal of Socialist Renewal},
  year = {2010},
  subtitle = {Interview with Cuban professor {José Bell Lara}},
  language = {english},
  url = {http://links.org.au/node/1916},
  urldate = {2010-10-31},
  location = {Sydney}
}`

const output1 = {
    "0": {
        "bib_type": "article",
        "entry_key": "wilm10",
        "raw_fields": {
            "author": "Johannes Wilm",
            "title": "{Cuba}: Economic {\\textbf{changes}} and the future of socialism",
            "journaltitle": "\\textit{Links} International Journal of Socialist Renewal",
            "year": "2010",
            "subtitle": "Interview with Cuban professor {José Bell Lara}",
            "language": "english",
            "url": "http://links.org.au/node/1916",
            "urldate": "2010-10-31",
            "location": "Sydney"
        },
        "fields": {
            "date": "2010",
            "author": [{
                "given": [{
                    "type": "text",
                    "text": "Johannes"
                }],
                "family": [{
                    "type": "text",
                    "text": "Wilm"
                }]
            }],
            "title": [{
                "type": "text",
                "text": "Cuba",
                "marks": [{
                    "type": "nocase"
                }]
            }, {
                "type": "text",
                "text": ": Economic "
            }, {
                "type": "text",
                "text": "changes",
                "marks": [{
                    "type": "strong"
                }]
            }, {
                "type": "text",
                "text": " and the future of socialism"
            }],
            "journaltitle": [{
                "type": "text",
                "text": "Links",
                "marks": [{
                    "type": "em"
                }]
            }, {
                "type": "text",
                "text": " International Journal of Socialist Renewal"
            }],
            "subtitle": [{
                "type": "text",
                "text": "Interview with Cuban professor "
            }, {
                "type": "text",
                "text": "José Bell Lara",
                "marks": [{
                    "type": "nocase"
                }]
            }],
            "language": ["english"],
            "urldate": "2010-10-31"
        }
    }
}

let parser1 = new BibLatexParser(input1)

test('can parse text with bold and italic styling', t => t.deepEqual(output1, parser1.output))

const input2 = `@MISC{wilm09,
  author = {Johannes Wilm},
  editor = {{PuenteSur}},
  title = {La Joven Revolución {Hondureña}},
  year = {2009},
  language = {spanish},
  type = {movie},
  url = {http://www.johanneswilm.org/honduras/},
  urldate = {2010-11-02}
}`

const output2 = {
    "0": {
        "bib_type": "misc",
        "entry_key": "wilm09",
        "raw_fields": {
            "author": "Johannes Wilm",
            "editor": "{PuenteSur}",
            "title": "La Joven Revolución {Hondureña}",
            "year": "2009",
            "language": "spanish",
            "type": "movie",
            "url": "http://www.johanneswilm.org/honduras/",
            "urldate": "2010-11-02"
        },
        "fields": {
            "date": "2009",
            "author": [{
                "given": [{
                    "type": "text",
                    "text": "Johannes"
                }],
                "family": [{
                    "type": "text",
                    "text": "Wilm"
                }]
            }],
            "title": [{
                "type": "text",
                "text": "La Joven Revolución Hondureña"
            }],
            "language": ["spanish"],
            "urldate": "2010-11-02"
        }
    }
}

let parser2 = new BibLatexParser(input2)

test('can ignore nocase in non-English title field', t => t.deepEqual(output2, parser2.output))

const input3 = `@book{wilm_nicaragua_2011,
	location = {Oslo, Norway \& Tucson, {AZ}},
	title = {{Nicaragua}, Back from the Dead? An Anthropological View of the {{Sandinista}} Movement in the early 21$^{st}$ Century.},
	publisher = {New Left Notes},
	author = {given=Johannes,family=Wilm,suffix=Dr.},
	date = {2011}
}`

const output3 = {
    "0": {
        "bib_type": "book",
        "entry_key": "wilm_nicaragua_2011",
        "raw_fields": {
            "location": "Oslo, Norway & Tucson, {AZ}",
            "title": "{Nicaragua}, Back from the Dead? An Anthropological View of the {{Sandinista}} Movement in the early 21$^{st}$ Century.",
            "publisher": "New Left Notes",
            "author": "given=Johannes,family=Wilm,suffix=Dr.",
            "date": "2011"
        },
        "fields": {
            "date": "2011",
            "location": [
                [{
                    "type": "text",
                    "text": "Oslo, Norway & Tucson, AZ"
                }]
            ],
            "title": [{
                "type": "text",
                "text": "Nicaragua",
                "marks": [{
                    "type": "nocase"
                }]
            }, {
                "type": "text",
                "text": ", Back from the Dead? An Anthropological View of the "
            }, {
                "type": "text",
                "text": "Sandinista",
                "marks": [{
                    "type": "nocase"
                }]
            }, {
                "type": "text",
                "text": " Movement in the early 21"
            }, {
                "type": "text",
                "text": "st",
                "marks": [{
                    "type": "sup"
                }]
            }, {
                "type": "text",
                "text": " Century."
            }],
            "publisher": [
                [{
                    "type": "text",
                    "text": "New Left Notes"
                }]
            ],
            "author": [{
                "given": [{
                    "type": "text",
                    "text": "Johannes"
                }],
                "family": [{
                    "type": "text",
                    "text": "Wilm"
                }],
                "suffix": [{
                    "type": "text",
                    "text": "Dr."
                }]
            }]
        }
    }
}

let parser3 = new BibLatexParser(input3)

test('nocase in English title field and sup styling', t => t.deepEqual(output3, parser3.output))
