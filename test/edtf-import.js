import test from "ava"

import {BibLatexParser} from "../src/import/biblatex"

const input1 = `@article{barker1_2016_turkey,
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

const output1 = {
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

let parser1 = new BibLatexParser(input1)

test('can parse date with time', t => t.deepEqual(output1, parser1.output))

const input2 = `@article{barker2_2016_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker2, Anne},
  date = {2016-07-18T20:26:06+10:00},
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

const output2 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker2_2016_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker2, Anne",
            "date": "2016-07-18T20:26:06+10:00",
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
            "date": "2016-07-18T20:26:06+10:00",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker2"
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

let parser2 = new BibLatexParser(input2)

test('can parse date with time and timezone', t => t.deepEqual(output2, parser2.output))

const input3 = `@article{barker3_2016_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker3, Anne},
  date = {2016-07-18T20:26:06Z},
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

const output3 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker3_2016_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker3, Anne",
            "date": "2016-07-18T20:26:06Z",
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
            "date": "2016-07-18T20:26:06Z",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker3"
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

let parser3 = new BibLatexParser(input3)

test('can parse date with time and timezone=Z', t => t.deepEqual(output3, parser3.output))

const input4 = `@article{barker4_-876_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker4, Anne},
  date = {-0876},
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

const output4 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker4_-876_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker4, Anne",
            "date": "-0876",
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
            "date": "-0876",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker4"
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

let parser4 = new BibLatexParser(input4)

test('can parse negative year', t => t.deepEqual(output4, parser4.output))

const input5 = `@article{barker5_1723_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker5, Anne},
  date = {1723~},
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

const output5 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker5_1723_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker5, Anne",
            "date": "1723~",
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
            "date": "1723~",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker5"
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

let parser5 = new BibLatexParser(input5)

test('can parse approximate year', t => t.deepEqual(output5, parser5.output))


const input6 = `@article{barker6_1723_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker6, Anne},
  date = {1723?},
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

const output6 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker6_1723_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker6, Anne",
            "date": "1723?",
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
            "date": "1723?",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker6"
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

let parser6 = new BibLatexParser(input6)

test('can parse uncertain year', t => t.deepEqual(output6, parser6.output))

const input7 = `@article{barker7_1723_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker7, Anne},
  date = {1723?~},
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

const output7 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker7_1723_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker7, Anne",
            "date": "1723?~",
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
            "date": "1723?~",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker7"
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

let parser7 = new BibLatexParser(input7)

test('can parse uncertain and approximate year', t => t.deepEqual(output7, parser7.output))

const input8 = `@article{barker8_1988_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker8, Anne},
  date = {1988/1992},
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

const output8 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker8_1988_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker8, Anne",
            "date": "1988/1992",
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
            "date": "1988/1992",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker8"
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

let parser8 = new BibLatexParser(input8)

test('can parse year-to-year interval', t => t.deepEqual(output8, parser8.output))

const input9 = `@article{barker9_2004_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker9, Anne},
  date = {2004-22},
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

const output9 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker9_2004_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker9, Anne",
            "date": "2004-22",
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
            "date": "2004-22",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker9"
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

let parser9 = new BibLatexParser(input9)

test('can parse year + season', t => t.deepEqual(output9, parser9.output))

const input10 = `@article{barker10_199u_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker10, Anne},
  date = {199u},
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

const output10 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker10_199u_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker10, Anne",
            "date": "199u",
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
            "date": "199u",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker10"
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

let parser10 = new BibLatexParser(input10)

test('can parse year with unknown last digit', t => t.deepEqual(output10, parser10.output))

const input11 = `@article{barker11_19uu_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker11, Anne},
  date = {19uu},
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

const output11 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker11_19uu_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker11, Anne",
            "date": "19uu",
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
            "date": "19uu",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker11"
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

let parser11 = new BibLatexParser(input11)

test('can parse year with unknown two last digits', t => t.deepEqual(output11, parser11.output))

const input12 = `@article{barker12_1999_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker12, Anne},
  date = {1999-uu},
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

const output12 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker12_1999_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker12, Anne",
            "date": "1999-uu",
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
            "date": "1999-uu",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker12"
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

let parser12 = new BibLatexParser(input12)

test('can parse year with unknown month', t => t.deepEqual(output12, parser12.output))

const input13 = `@article{barker13_1999_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker13, Anne},
  date = {1999-01-uu},
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

const output13 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker13_1999_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker13, Anne",
            "date": "1999-01-uu",
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
            "date": "1999-01-uu",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker13"
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

let parser13 = new BibLatexParser(input13)

test('can parse year and month with unknown day', t => t.deepEqual(output13, parser13.output))

const input14 = `@article{barker14_1999_turkey,
  abstract = {Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.},
  author = {Barker14, Anne},
  date = {1999-uu-uu},
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

const output14 = {
    "0": {
        "bib_type": "article",
        "entry_key": "barker14_1999_turkey",
        "raw_fields": {
            "abstract": "Religious fundamentalism is a powerful force in Turkey where the military has a long history of intervening in politics to ensure the nation remains secular.",
            "author": "Barker14, Anne",
            "date": "1999-uu-uu",
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
            "date": "1999-uu-uu",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Barker14"
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

let parser14 = new BibLatexParser(input14)

test('can parse year with unknown month and unknown day', t => t.deepEqual(output14, parser14.output))
