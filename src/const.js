/** A list of supported languages (without aliases)  in the langid field */
const langidOptions = {
    "usenglish": {
        "csl": "en-US",
        "biblatex": "usenglish"
    },
    "ukenglish": {
        "csl": "en-GB",
        "biblatex": "ukenglish"
    },
    "caenglish": {
        "csl": "en-US",
        "biblatex": "canadian"
    },
    "auenglish": {
        "csl": "en-GB",
        "biblatex": "australian"
    },
    "nzenglish": {
        "csl": "en-GB",
        "biblatex": "newzealand"
    },
    "afrikaans": {
        "csl": "af-ZA",
        "biblatex": "afrikaans"
    },
    "arabic": {
        "csl": "ar",
        "biblatex": "arabic"
    },
    "basque": {
        "csl": "eu",
        "biblatex": "basque"
    },
    "bulgarian": {
        "csl": "bg-BG",
        "biblatex": "bulgarian"
    },
    "catalan": {
        "csl": "ca-AD",
        "biblatex": "catalan"
    },
    "chinese": {
        "csl": "zh-CN",
        "biblatex": "pinyin"
    },
    "croatian": {
        "csl": "hr-HR",
        "biblatex": "croatian"
    },
    "czech": {
        "csl": "cs-CZ",
        "biblatex": "czech"
    },
    "danish": {
        "csl": "da-DK",
        "biblatex": "danish"
    },
    "dutch": {
        "csl": "nl-NL",
        "biblatex": "dutch"
    },
    "estonian": {
        "csl": "et-EE",
        "biblatex": "estonian"
    },
    "finnish": {
        "csl": "fi-FI",
        "biblatex": "finnish"
    },
    "cafrench": {
        "csl": "fr-CA",
        "biblatex": "canadien"
    },
    "acadian": {
        "csl": "fr-CA",
        "biblatex": "acadian"
    },
    "french": {
        "csl": "fr-FR",
        "biblatex": "french"
    },
    "atgerman": {
        "csl": "de-AT",
        "biblatex": "naustrian"
    },
    "german": {
        "csl": "de-DE",
        "biblatex": "ngerman"
    },
    "greek": {
        "csl": "el-GR",
        "biblatex": "greek"
    },
    "hebrew": {
        "csl": "he-IL",
        "biblatex": "hebrew"
    },
    "hungarian": {
        "csl": "hu-HU",
        "biblatex": "hungarian"
    },
    "icelandic": {
        "csl": "is-IS",
        "biblatex": "icelandic"
    },
    "italian": {
        "csl": "it-IT",
        "biblatex": "italian"
    },
    "japanese": {
        "csl": "ja-JP",
        "biblatex": "japanese"
    },
    "latvian": {
        "csl": "lv-LV",
        "biblatex": "latvian"
    },
    "lithuanian": {
        "csl": "lt-LT",
        "biblatex": "lithuanian"
    },
    "magyar": {
        "csl": "hu-HU",
        "biblatex": "magyar"
    },
    "mongolian": {
        "csl": "mn-MN",
        "biblatex": "mongolian"
    },
    "newnorwegian": {
        "csl": "nn-NO",
        "biblatex": "nynorsk"
    },
    "norwegian": {
        "csl": "nb-NO",
        "biblatex": "norsk"
    },
    "farsi": {
        "csl": "fa-IR",
        "biblatex": "farsi"
    },
    "polish": {
        "csl": "pl-PL",
        "biblatex": "polish"
    },
    "brportuguese": {
        "csl": "pt-BR",
        "biblatex": "brazilian"
    },
    "portuguese": {
        "csl": "pt-PT",
        "biblatex": "portuguese"
    },
    "romanian": {
        "csl": "ro-RO",
        "biblatex": "romanian"
    },
    "russian": {
        "csl": "ru-RU",
        "biblatex": "russian"
    },
    "serbian": {
        "csl": "sr-RS",
        "biblatex": "serbian"
    },
    "cyrillicserbian": {
        "csl": "sr-RS",
        "biblatex": "serbianc"
    },
    "slovak": {
        "csl": "sk-SK",
        "biblatex": "slovak"
    },
    "slovene": {
        "csl": "sl-SL",
        "biblatex": "slovene"
    },
    "spanish": {
        "csl": "es-ES",
        "biblatex": "spanish"
    },
    "swedish": {
        "csl": "sv-SE",
        "biblatex": "swedish"
    },
    "thai": {
        "csl": "th-TH",
        "biblatex": "thai"
    },
    "turkish": {
        "csl": "tr-TR",
        "biblatex": "turkish"
    },
    "ukrainian": {
        "csl": "uk-UA",
        "biblatex": "ukrainian"
    },
    "vietnamese": {
        "csl": "vi-VN",
        "biblatex": "vietnamese"
    },
    "latin": {
        "csl": "la",
        "biblatex": "latin"
    }
}

const pubstateOptions = {
    "inpreparation": {
        "csl": "in preparation",
        "biblatex": "inpreparation"
    },
    "submitted": {
        "csl": "submitted",
        "biblatex": "submitted"
    },
    "forthcoming": {
        "csl": "forthcoming",
        "biblatex": "forthcoming"
    },
    "inpress": {
        "csl": "in press",
        "biblatex": "inpress"
    },
    "prepublished": {
        "csl": "prepublished",
        "biblatex": "prepublished"
    }
}

const languageOptions = ['american', 'brazilian', 'catalan', 'croation',
'czech', 'danish', 'dutch', 'english', 'finnish', 'french', 'german', 'greek',
'italian', 'latin', 'norwegian', 'polish', 'portuguese', 'russian', 'slovene',
'spanish', 'swedish']


/** A list of field types of Bibligraphy DB with lookup by field name. */
export const BibFieldTypes = {
    'abstract': {
        type: 'f_long_literal',
        biblatex: 'abstract',
        csl: 'abstract'
    },
    'addendum': {
        type: 'f_literal',
        biblatex: 'addendum'
    },
    'afterword': {
        type: 'l_name',
        biblatex: 'afterword'
    },
    'annotation': {
        type: 'f_long_literal',
        biblatex: 'annotation'
    },
    'annotator': {
        type: 'l_name',
        biblatex: 'annotator'
    },
    'author': {
        type: 'l_name',
        biblatex: 'author',
        csl: 'author'
    },
    'bookauthor': {
        type: 'l_name',
        biblatex: 'bookauthor',
        csl: 'container-author'
    },
    'bookpagination': {
        type: 'f_key',
        biblatex: 'bookpagination',
        options: ['page', 'column', 'section', 'paragraph', 'verse', 'line']
    },
    'booksubtitle': {
        type: 'f_title',
        biblatex: 'booksubtitle'
    },
    'booktitle': {
        type: 'f_title',
        biblatex: 'booktitle',
        csl: 'container-title'
    },
    'booktitleaddon': {
        type: 'f_title',
        biblatex: 'booktitleaddon'
    },
    'chapter': {
        type: 'f_literal',
        biblatex: 'chapter',
        csl: 'chapter-number'
    },
    'commentator': {
        type: 'l_name',
        biblatex: 'commentator'
    },
    'date': {
        type: 'f_date',
        biblatex: 'date',
        csl: 'issued'
    },
    'doi': {
        type: 'f_verbatim',
        biblatex: 'doi',
        csl: 'DOI'
    },
    'edition': {
        type: 'f_integer',
        biblatex: 'edition',
        csl: 'edition'
    },
    'editor': {
        type: 'l_name',
        biblatex: 'editor',
        csl: 'editor'
    },
    'editora': {
        type: 'l_name',
        biblatex: 'editora'
    },
    'editorb': {
        type: 'l_name',
        biblatex: 'editorb'
    },
    'editorc': {
        type: 'l_name',
        biblatex: 'editorc'
    },
    'editortype': {
        type: 'f_key',
        biblatex: 'editortype',
        options: ['editor', 'compiler', 'founder', 'continuator', 'redactor', 'reviser', 'collaborator']
    },
    'editoratype': {
        type: 'f_key',
        biblatex: 'editoratype',
        options: ['editor', 'compiler', 'founder', 'continuator', 'redactor', 'reviser', 'collaborator']
    },
    'editorbtype': {
        type: 'f_key',
        biblatex: 'editorbtype',
        options: ['editor', 'compiler', 'founder', 'continuator', 'redactor', 'reviser', 'collaborator']
    },
    'editorctype': {
        type: 'f_key',
        biblatex: 'editorctype',
        options: ['editor', 'compiler', 'founder', 'continuator', 'redactor', 'reviser', 'collaborator']
    },
    'eid': {
        type: 'f_literal',
        biblatex: 'eid'
    },
    'entrysubtype': {
        type: 'f_literal',
        biblatex: 'entrysubtype'
    },
    'eprint': {
        type: 'f_verbatim',
        biblatex: 'eprint'
    },
    'eprintclass': {
        type: 'f_literal',
        biblatex: 'eprintclass'
    },
    'eprinttype': {
        type: 'f_literal',
        biblatex: 'eprinttype'
    },
    'eventdate': {
        type: 'f_date',
        biblatex: 'eventdate',
        csl: 'event-date'
    },
    'eventtitle': {
        type: 'f_title',
        biblatex: 'eventtitle',
        csl: 'event'
    },
    'file': {
        type: 'f_verbatim',
        biblatex: 'file'
    },
    'foreword': {
        type: 'l_name',
        biblatex: 'foreword'
    },
    'holder': {
        type: 'l_name',
        biblatex: 'holder'
    },
    'howpublished': {
        type: 'f_literal',
        biblatex: 'howpublished',
        csl: 'medium'
    },
    'indextitle': {
        type: 'f_literal',
        biblatex: 'indextitle'
    },
    'institution': {
        type: 'l_literal',
        biblatex: 'institution'
    },
    'introduction': {
        type: 'l_name',
        biblatex: 'introduction'
    },
    'isan': {
        type: 'f_literal',
        biblatex: 'isan'
    },
    'isbn': {
        type: 'f_literal',
        biblatex: 'isbn',
        csl: 'ISBN'
    },
    'ismn': {
        type: 'f_literal',
        biblatex: 'ismn'
    },
    'isrn': {
        type: 'f_literal',
        biblatex: 'isrn'
    },
    'issn': {
        type: 'f_literal',
        biblatex: 'issn',
        csl: 'ISSN'
    },
    'issue': {
        type: 'f_literal',
        biblatex: 'issue',
        csl: 'issue'
    },
    'issuesubtitle': {
        type: 'f_literal',
        biblatex: 'issuesubtitle'
    },
    'issuetitle': {
        type: 'f_literal',
        biblatex: 'issuetitle'
    },
    'iswc': {
        type: 'f_literal',
        biblatex: 'iswc'
    },
    'journalsubtitle': {
        type: 'f_literal',
        biblatex: 'journalsubtitle'
    },
    'journaltitle': {
        type: 'f_literal',
        biblatex: 'journaltitle',
        csl: 'container-title'
    },
    'keywords': {
        type: 'l_tag',
        biblatex: 'keywords'
    },
    'label': {
        type: 'f_literal',
        biblatex: 'label'
    },
    'language': {
        type: 'l_key',
        biblatex: 'language',
        options: languageOptions
    },
    'langid': {
        type: 'f_key',
        strict: true, // Does not allow costum strings
        biblatex: 'langid',
        csl: 'language',
        options: langidOptions
    },
    'library': {
        type: 'f_literal',
        biblatex: 'library'
    },
    'location': {
        type: 'l_literal',
        biblatex: 'location',
        csl: 'publisher-place'
    },
    'mainsubtitle': {
        type: 'f_title',
        biblatex: 'mainsubtitle'
    },
    'maintitle': {
        type: 'f_title',
        biblatex: 'maintitle'
    },
    'maintitleaddon': {
        type: 'f_title',
        biblatex: 'maintitleaddon'
    },
    'nameaddon': {
        type: 'f_literal',
        biblatex: 'nameaddon'
    },
    'note': {
        type: 'f_literal',
        biblatex: 'note',
        csl: 'note'
    },
    'number': {
        type: 'f_literal',
        biblatex: 'number',
        csl: 'number'
    },
    'organization': {
        type: 'l_literal',
        biblatex: 'organization'
    },
    'origdate': {
        type: 'f_date',
        biblatex: 'origdate',
        csl: 'original-date'
    },
    'origlanguage': {
        type: 'f_key',
        biblatex: 'origlanguage',
        options: languageOptions
    },
    'origlocation': {
        type: 'l_literal',
        biblatex: 'origlocation',
        csl: 'original-publisher-place'
    },
    'origpublisher': {
        type: 'l_literal',
        biblatex: 'origpublisher',
        csl: 'original-publisher'
    },
    'origtitle': {
        type: 'f_title',
        biblatex: 'origtitle',
        csl: 'original-title'
    },
    'pages': {
        type: 'l_range',
        biblatex: 'pages',
        csl: 'page'
    },
    'pagetotal': {
        type: 'f_literal',
        biblatex: 'pagetotal',
        csl: 'number-of-pages'
    },
    'pagination': {
        type: 'f_key',
        biblatex: 'pagination',
        options: ['page', 'column', 'section', 'paragraph', 'verse', 'line']
    },
    'part': {
        type: 'f_literal',
        biblatex: 'part'
    },
    'publisher': {
        type: 'l_literal',
        biblatex: 'publisher',
        csl: 'publisher'
    },
    'pubstate': {
        type: 'f_key',
        biblatex: 'pubstate',
        csl: 'status',
        options: pubstateOptions
    },
    'reprinttitle': {
        type: 'f_literal',
        biblatex: 'reprinttitle'
    },
    'series': {
        type: 'f_literal',
        biblatex: 'series',
        csl: 'collection-title'
    },
    'shortauthor': {
        type: 'l_name',
        biblatex: 'shortauthor'
    },
    'shorteditor': {
        type: 'l_name',
        biblatex: 'shorteditor'
    },
    'shorthand': {
        type: 'f_literal',
        biblatex: 'shorthand'
    },
    'shorthandintro': {
        type: 'f_literal',
        biblatex: 'shorthandintro'
    },
    'shortjournal': {
        type: 'f_literal',
        biblatex: 'shortjournal',
        csl: 'container-title-short'
    },
    'shortseries': {
        type: 'f_literal',
        biblatex: 'shortseries'
    },
    'shorttitle': {
        type: 'f_literal',
        biblatex: 'shorttitle',
        csl: 'title-short'
    },
    'subtitle': {
        type: 'f_title',
        biblatex: 'subtitle'
    },
    'title': {
        type: 'f_title',
        biblatex: 'title',
        csl: 'title'
    },
    'titleaddon': {
        type: 'f_title',
        biblatex: 'titleaddon'
    },
    'translator': {
        type: 'l_name',
        biblatex: 'translator',
        csl: 'translator'
    },
    'type': {
        type: 'f_key',
        biblatex: 'type',
        options: ['manual', 'patent', 'report', 'thesis', 'mathesis', 'phdthesis', 'candthesis', 'techreport', 'resreport', 'software', 'datacd', 'audiocd']
    },
    'url': {
        type: 'f_uri',
        biblatex: 'url',
        csl: 'URL'
    },
    'urldate': {
        type: 'f_date',
        biblatex: 'urldate',
        csl: 'accessed'
    },
    'venue': {
        type: 'f_literal',
        biblatex: 'venue',
        csl: 'event-place'
    },
    'version': {
        type: 'f_literal',
        biblatex: 'version',
        csl: 'version'
    },
    'volume': {
        type: 'f_literal',
        biblatex: 'volume',
        csl: 'volume'
    },
    'volumes': {
        type: 'f_literal',
        biblatex: 'volumes',
        csl: 'number-of-volumes'
    }
}

/** A list of all bib types and their fields. */
export const BibTypes = {
    "article": {
        "order": 1,
        "biblatex": "article",
        "csl": "article",
        "required": ["journaltitle", "title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "annotator", "commentator", "doi", "editor", "editora", "editorb", "editorc", "eid", "eprint", "eprintclass", "eprinttype", "issn", "issue", "issuesubtitle", "issuetitle", "journalsubtitle", "language", "langid", "note", "number", "origlanguage", "pages", "pagination", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "version", "volume", "annotation", "keywords"]
    },
    "article-magazine": {
        "order": 2,
        "biblatex": "article",
        "csl": "article-magazine",
        "required": ["journaltitle", "title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "annotator", "commentator", "doi", "editor", "editora", "editorb", "editorc", "eid", "eprint", "eprintclass", "eprinttype", "issn", "issue", "issuesubtitle", "issuetitle", "journalsubtitle", "language", "langid", "note", "number", "origlanguage", "pages", "pagination", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "version", "volume", "annotation", "keywords"]
    },
    "article-newspaper": {
        "order": 3,
        "biblatex": "article",
        "csl": "article-newspaper",
        "required": ["journaltitle", "title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "annotator", "commentator", "doi", "editor", "editora", "editorb", "editorc", "eid", "eprint", "eprintclass", "eprinttype", "issn", "issue", "issuesubtitle", "issuetitle", "journalsubtitle", "language", "langid", "note", "number", "origlanguage", "pages", "pagination", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "version", "volume", "annotation", "keywords"]
    },
    "article-journal": {
        "order": 4,
        "biblatex": "article",
        "csl": "article-journal",
        "required": ["journaltitle", "title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "annotator", "commentator", "doi", "editor", "editora", "editorb", "editorc", "eid", "eprint", "eprintclass", "eprinttype", "issn", "issue", "issuesubtitle", "issuetitle", "journalsubtitle", "language", "langid", "note", "number", "origlanguage", "pages", "pagination", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "version", "volume", "annotation", "keywords"]
    },
    "post-weblog": {
        "order": 5,
        "biblatex": "online",
        "csl": "post-weblog",
        "required": ["date", "title", "url"],
        "eitheror": ["editor", "author"],
        "optional": ["abstract", "addendum", "pubstate", "subtitle", "language", "langid", "urldate", "titleaddon", "version", "note", "organization", "annotation", "keywords"]
    },
    "book": {
        "order": 10,
        "biblatex": "book",
        "csl": "book",
        "required": ["title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "chapter", "commentator", "doi", "edition", "editor", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "pagetotal", "bookpagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "mvbook": {
        "order": 11,
        "biblatex": "mvbook",
        "csl": "book",
        "required": ["title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "commentator", "doi", "edition", "editor", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "note", "number", "origlanguage", "pagetotal", "bookpagination", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volumes", "annotation", "keywords"]
    },
    "inbook": {
        "order": 12,
        "biblatex": "inbook",
        "csl": "chapter",
        "required": ["title", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "bookauthor", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editor", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "bookinbook": {
        "order": 13,
        "biblatex": "bookinbook",
        "csl": "chapter",
        "required": ["title", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "bookauthor", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editor", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "suppbook": {
        "order": 14,
        "biblatex": "suppbook",
        "csl": "chapter",
        "required": ["title", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "bookauthor", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editor", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "booklet": {
        "order": 15,
        "biblatex": "booklet",
        "csl": "pamphlet",
        "required": ["title", "date"],
        "eitheror": ["editor", "author"],
        "optional": ["abstract", "titleaddon", "addendum", "pages", "pagination", "howpublished", "type", "pubstate", "chapter", "doi", "subtitle", "language", "langid", "location", "url", "urldate", "pagetotal", "bookpagination", "note", "eprint", "eprintclass", "eprinttype", "annotation", "keywords"]
    },
    "collection": {
        "order": 20,
        "biblatex": "collection",
        "csl": "dataset",
        "required": ["editor", "title", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "chapter", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "pagetotal", "bookpagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "mvcollection": {
        "order": 21,
        "biblatex": "mvcollection",
        "csl": "dataset",
        "required": ["editor", "title", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "note", "number", "origlanguage", "pagetotal", "bookpagination", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volumes", "annotation", "keywords"]
    },
    "incollection": {
        "order": 22,
        "biblatex": "incollection",
        "csl": "entry",
        "required": ["title", "editor", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "suppcollection": {
        "order": 23,
        "biblatex": "suppcollection",
        "csl": "entry",
        "required": ["title", "editor", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "post": {
        "order": 30,
        "biblatex": "online",
        "csl": "post",
        "required": ["date", "title", "url"],
        "eitheror": ["editor", "author"],
        "optional": ["abstract", "addendum", "pubstate", "subtitle", "language", "langid", "urldate", "titleaddon", "version", "note", "organization", "annotation", "keywords"]
    },
    "manual": {
        "order": 40,
        "biblatex": "manual",
        "csl": "book",
        "required": ["title", "date"],
        "eitheror": ["editor", "author"],
        "optional": ["abstract", "addendum", "chapter", "doi", "edition", "eprint", "eprintclass", "eprinttype", "isbn", "language", "langid", "location", "note", "number", "organization", "pages", "pagination", "pagetotal", "bookpagination", "publisher", "pubstate", "series", "subtitle", "titleaddon", "type", "url", "urldate", "version", "annotation", "keywords"]
    },
    "misc": {
        "order": 41,
        "biblatex": "misc",
        "csl": "entry",
        "required": ["title", "date"],
        "eitheror": ["editor", "author"],
        "optional": ["abstract", "addendum", "howpublished", "type", "pubstate", "organization", "doi", "subtitle", "language", "langid", "location", "url", "urldate", "titleaddon", "version", "note", "eprint", "eprintclass", "eprinttype", "annotation", "keywords"]
    },
    "online": {
        "order": 42,
        "biblatex": "online",
        "csl": "webpage",
        "required": ["date", "title", "url"],
        "eitheror": ["editor", "author"],
        "optional": ["abstract", "addendum", "pubstate", "subtitle", "language", "langid", "urldate", "titleaddon", "version", "note", "organization", "annotation", "keywords"]
    },
    "patent": {
        "order": 43,
        "biblatex": "patent",
        "csl": "patent",
        "required": ["title", "number", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "holder", "location", "pubstate", "doi", "subtitle", "titleaddon", "type", "url", "urldate", "version", "note", "eprint", "eprintclass", "eprinttype", "annotation", "keywords"]
    },
    "periodical": {
        "order": 50,
        "biblatex": "periodical",
        "csl": "book",
        "required": ["editor", "title", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "volume", "pubstate", "number", "series", "issn", "issue", "issuesubtitle", "issuetitle", "doi", "subtitle", "editora", "editorb", "editorc", "url", "urldate", "language", "langid", "note", "eprint", "eprintclass", "eprinttype", "annotation", "keywords"]
    },
    "suppperiodical": {
        "order": 51,
        "biblatex": "suppperiodical",
        "csl": "entry",
        "required": ["journaltitle", "title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "annotator", "commentator", "doi", "editor", "editora", "editorb", "editorc", "eid", "eprint", "eprintclass", "eprinttype", "issn", "issue", "issuesubtitle", "issuetitle", "journalsubtitle", "language", "langid", "note", "number", "origlanguage", "pages", "pagination", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "version", "volume", "annotation", "keywords"]
    },
    "proceedings": {
        "order": 60,
        "biblatex": "proceedings",
        "csl": "entry",
        "required": ["editor", "title", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "chapter", "doi", "eprint", "eprintclass", "eprinttype", "eventdate", "eventtitle", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "organization", "pages", "pagination", "pagetotal", "bookpagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "url", "urldate", "venue", "volume", "volumes", "annotation", "keywords"]
    },
    "mvproceedings": {
        "order": 61,
        "biblatex": "mvproceedings",
        "csl": "entry",
        "required": ["editor", "title", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "doi", "eprint", "eprintclass", "eprinttype", "eventdate", "eventtitle", "isbn", "language", "langid", "location", "note", "number", "organization", "pagetotal", "bookpagination", "publisher", "pubstate", "series", "subtitle", "titleaddon", "url", "urldate", "venue", "volumes", "annotation", "keywords"]
    },
    "inproceedings": {
        "order": 62,
        "biblatex": "inproceedings",
        "csl": "paper-conference",
        "required": ["title", "editor", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "booksubtitle", "booktitleaddon", "chapter", "doi", "eprint", "eprintclass", "eprinttype", "eventdate", "eventtitle", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "organization", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "url", "urldate", "venue", "volume", "volumes", "annotation", "keywords"]
    },
    "reference": {
        "order": 70,
        "biblatex": "book",
        "csl": "reference",
        "required": ["editor", "title", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "chapter", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "pagetotal", "bookpagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "mvreference": {
        "order": 71,
        "biblatex": "mvreference",
        "csl": "book",
        "required": ["editor", "title", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "note", "number", "origlanguage", "pagetotal", "bookpagination", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volumes", "annotation", "keywords"]
    },
    "inreference": {
        "order": 72,
        "biblatex": "inreference",
        "csl": "entry",
        "required": ["title", "editor", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "entry-encyclopedia": {
        "order": 73,
        "biblatex": "inreference",
        "csl": "entry-encyclopedia",
        "required": ["title", "editor", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "entry-dictionary": {
        "order": 74,
        "biblatex": "inreference",
        "csl": "entry-dictionary",
        "required": ["title", "editor", "booktitle", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "afterword", "annotator", "booksubtitle", "booktitleaddon", "chapter", "commentator", "doi", "edition", "editora", "editorb", "editorc", "eprint", "eprintclass", "eprinttype", "foreword", "introduction", "isbn", "language", "langid", "location", "mainsubtitle", "maintitle", "maintitleaddon", "note", "number", "origlanguage", "pages", "pagination", "part", "publisher", "pubstate", "series", "subtitle", "titleaddon", "translator", "url", "urldate", "volume", "volumes", "annotation", "keywords"]
    },
    "report": {
        "order": 80,
        "biblatex": "report",
        "csl": "report",
        "required": ["author", "title", "type", "institution", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "pages", "pagination", "pagetotal", "bookpagination", "pubstate", "number", "isrn", "chapter", "doi", "subtitle", "language", "langid", "location", "url", "urldate", "titleaddon", "version", "note", "eprint", "eprintclass", "eprinttype", "annotation", "keywords"]
    },
    "thesis": {
        "order": 81,
        "biblatex": "thesis",
        "csl": "thesis",
        "required": ["author", "title", "type", "institution", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "pages", "pagination", "pagetotal", "bookpagination", "pubstate", "isbn", "chapter", "doi", "subtitle", "language", "langid", "location", "url", "urldate", "titleaddon", "note", "eprint", "eprintclass", "eprinttype", "annotation", "keywords"]
    },
    "unpublished": {
        "order": 90,
        "biblatex": "unpublished",
        "csl": "manuscript",
        "required": ["title", "author", "date"],
        "eitheror": [],
        "optional": ["abstract", "addendum", "howpublished", "pubstate", "isbn", "date", "subtitle", "language", "langid", "location", "url", "urldate", "titleaddon", "note", "annotation", "keywords"]
    }
}
