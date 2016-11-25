/** A list of field types of Bibligraphy DB with lookup by field name. */
export const BibFieldTypes = {
    'abstract': {
        type: 'f_literal',
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
        type: 'f_literal',
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
    'authortype': {
        type: 'f_key',
        biblatex: 'authortype'
    },
    'bookauthor': {
        type: 'l_name',
        biblatex: 'bookauthor',
        csl: 'container-author'
    },
    'bookpagination': {
        type: 'f_key',
        biblatex: 'bookpagination',
        localization: 'pagination'
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
        biblatex: 'editortype'
    },
    'editoratype': {
        type: 'f_key',
        biblatex: 'editoratype'
    },
    'editorbtype': {
        type: 'f_key',
        biblatex: 'editorbtype'
    },
    'editorctype': {
        type: 'f_key',
        biblatex: 'editorctype'
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
        type: 'l_literal',
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
        csl: 'language'
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
        biblatex: 'origlanguage'
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
        type: 'f_range',
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
        localization: 'pagination'
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
        localization: 'publication_state'
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
        localization: 'types'
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
    'article': {
        order: 1,
        biblatex: 'article',
        csl: 'article',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-magazine': {
        order: 2,
        biblatex: 'article',
        csl: 'article-magazine',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-newspaper': {
        order: 3,
        biblatex: 'article',
        csl: 'article-newspaper',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-journal': {
        order: 4,
        biblatex: 'article',
        csl: 'article-journal',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'post-weblog': {
        order: 5,
        biblatex: 'online',
        csl: 'post-weblog',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['keywords', 'addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'book': {
        order: 10,
        biblatex: 'book',
        csl: 'book',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvbook': {
        order: 11,
        biblatex: 'mvbook',
        csl: 'book',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'inbook': {
        order: 12,
        biblatex: 'inbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'bookinbook': {
        order: 13,
        biblatex: 'bookinbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'suppbook': {
        order: 14,
        biblatex: 'suppbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'booklet': {
        order: 15,
        biblatex: 'booklet',
        csl: 'pamphlet',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['keywords', 'titleaddon', 'addendum', 'pages', 'howpublished', 'type', 'pubstate', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'pagetotal', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'collection': {
        order: 20,
        biblatex: 'collection',
        csl: 'dataset',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvcollection': {
        order: 21,
        biblatex: 'mvcollection',
        csl: 'dataset',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'incollection': {
        order: 22,
        biblatex: 'incollection',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'suppcollection': {
        order: 23,
        biblatex: 'suppcollection',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'post': {
        order: 30,
        biblatex: 'online',
        csl: 'post',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['keywords', 'addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'manual': {
        order: 40,
        biblatex: 'manual',
        csl: 'book',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['keywords', 'addendum', 'chapter', 'doi', 'edition', 'eprint', 'eprintclass', 'eprinttype', 'isbn', 'language', 'location', 'note', 'number', 'organization', 'pages', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'type', 'url', 'urldate', 'version']
    },
    'misc': {
        order: 41,
        biblatex: 'misc',
        csl: 'entry',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['keywords', 'addendum', 'howpublished', 'type', 'pubstate', 'organization', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'online': {
        order: 42,
        biblatex: 'online',
        csl: 'webpage',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['keywords', 'addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'patent': {
        order: 43,
        biblatex: 'patent',
        csl: 'patent',
        required: ['title', 'number', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'holder', 'location', 'pubstate', 'doi', 'subtitle', 'titleaddon', 'type', 'url', 'urldate', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'periodical': {
        order: 50,
        biblatex: 'periodical',
        csl: 'book',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'volume', 'pubstate', 'number', 'series', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'doi', 'subtitle', 'editora', 'editorb', 'editorc', 'url', 'urldate', 'language', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'suppperiodical': {
        order: 51,
        biblatex: 'suppperiodical',
        csl: 'entry',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'proceedings': {
        order: 60,
        biblatex: 'proceedings',
        csl: 'entry',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'chapter', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'organization', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volume', 'volumes']
    },
    'mvproceedings': {
        order: 61,
        biblatex: 'mvproceedings',
        csl: 'entry',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'note', 'number', 'organization', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volumes']
    },
    'inproceedings': {
        order: 62,
        biblatex: 'inproceedings',
        csl: 'paper-conference',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'booksubtitle', 'booktitleaddon', 'chapter', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'organization', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volume', 'volumes']
    },
    'reference': {
        order: 70,
        biblatex: 'book',
        csl: 'reference',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvreference': {
        order: 71,
        biblatex: 'mvreference',
        csl: 'book',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'inreference': {
        order: 72,
        biblatex: 'inreference',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'entry-encyclopedia': {
        order: 73,
        biblatex: 'inreference',
        csl: 'entry-encyclopedia',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'entry-dictionary': {
        order: 74,
        biblatex: 'inreference',
        csl: 'entry-dictionary',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'report': {
        order: 80,
        biblatex: 'report',
        csl: 'report',
        required: ['author', 'title', 'type', 'institution', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'pages', 'pagetotal', 'pubstate', 'number', 'isrn', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'thesis': {
        order: 81,
        biblatex: 'thesis',
        csl: 'thesis',
        required: ['author', 'title', 'type', 'institution', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'pages', 'pagetotal', 'pubstate', 'isbn', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'unpublished': {
        order: 90,
        biblatex: 'unpublished',
        csl: 'manuscript',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['keywords', 'addendum', 'howpublished', 'pubstate', 'isbn', 'date', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'note']
    }
}
