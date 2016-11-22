(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _src = require('../src');

var printObject = function printObject(object) {
    var html = '';
    switch (typeof object === 'undefined' ? 'undefined' : _typeof(object)) {
        case 'object':
            if (object instanceof Array) {
                object.forEach(function (item, index) {
                    html += printObject(item);
                    if (index + 1 < object.length) {
                        html += ', ';
                    }
                });
            } else {
                html += '<table>';
                Object.keys(object).forEach(function (key) {
                    var valueHtml = printObject(object[key]);
                    html += '<tr><td>' + key + ': </td><td>' + valueHtml + '</td></tr>';
                });
                html += '</table>';
            }
            break;
        case 'number':
            html += String(object);
            break;
        case 'string':
            html += object;
            break;
    }
    return html;
};

var readBibFile = function readBibFile() {
    document.getElementById('bib-db').innerHTML = '<div class="spinner"></div>';
    document.getElementById('csl-db').innerHTML = '<div class="spinner"></div>';
    document.getElementById('biblatex').innerHTML = '<div class="spinner"></div>';
    // Add timeout so that spinners are shown before processing of file starts.
    window.setTimeout(function () {
        var fileUpload = document.getElementById('file-upload');
        if (fileUpload.files.length) {
            var fr = new window.FileReader();
            fr.onload = function (event) {
                importBiblatex(event.target.result);
            };
            fr.readAsText(fileUpload.files[0]);
        }
    }, 500);
};

var importBiblatex = function importBiblatex(bibString) {
    var parser = new _src.BibLatexParser(bibString);
    var bibDB = parser.output;
    document.getElementById('bib-db').innerHTML = printObject(bibDB);
    exportCSL(bibDB);
    exportBibLatex(bibDB);
};

var exportCSL = function exportCSL(bibDB) {
    var exporter = new _src.CSLExporter(bibDB);
    var cslDB = exporter.output;
    document.getElementById('csl-db').innerHTML = printObject(cslDB);
};

var exportBibLatex = function exportBibLatex(bibDB) {
    var exporter = new _src.BibLatexExporter(bibDB);
    var biblatex = exporter.output.split('\n').join('<br>');
    document.getElementById('biblatex').innerHTML = biblatex;
};

document.getElementById('file-upload').addEventListener('change', readBibFile);

},{"../src":10}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A list of field types of Bibligraphy DB with lookup by field name. */
var BibFieldTypes = exports.BibFieldTypes = {
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
        type: 'f_literal',
        biblatex: 'booksubtitle'
    },
    'booktitle': {
        type: 'f_literal',
        biblatex: 'booktitle',
        csl: 'container-title'
    },
    'booktitleaddon': {
        type: 'f_literal',
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
        type: 'f_literal',
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
        type: 'f_literal',
        biblatex: 'mainsubtitle'
    },
    'maintitle': {
        type: 'f_literal',
        biblatex: 'maintitle'
    },
    'maintitleaddon': {
        type: 'f_literal',
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
        type: 'f_literal',
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
        type: 'f_literal',
        biblatex: 'subtitle'
    },
    'title': {
        type: 'f_literal',
        biblatex: 'title',
        csl: 'title'
    },
    'titleaddon': {
        type: 'f_literal',
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
};

/** A list of all bib types and their fields. */
var BibTypes = exports.BibTypes = {
    'article': {
        order: 1,
        biblatex: 'article',
        csl: 'article',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-magazine': {
        order: 2,
        biblatex: 'article',
        csl: 'article-magazine',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-newspaper': {
        order: 3,
        biblatex: 'article',
        csl: 'article-newspaper',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'article-journal': {
        order: 4,
        biblatex: 'article',
        csl: 'article-journal',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'post-weblog': {
        order: 5,
        biblatex: 'online',
        csl: 'post-weblog',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'book': {
        order: 10,
        biblatex: 'book',
        csl: 'book',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvbook': {
        order: 11,
        biblatex: 'mvbook',
        csl: 'book',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'inbook': {
        order: 12,
        biblatex: 'inbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'bookinbook': {
        order: 13,
        biblatex: 'bookinbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'suppbook': {
        order: 14,
        biblatex: 'suppbook',
        csl: 'chapter',
        required: ['title', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'bookauthor', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editor', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'booklet': {
        order: 15,
        biblatex: 'booklet',
        csl: 'pamphlet',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['titleaddon', 'addendum', 'pages', 'howpublished', 'type', 'pubstate', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'pagetotal', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'collection': {
        order: 20,
        biblatex: 'collection',
        csl: 'dataset',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvcollection': {
        order: 21,
        biblatex: 'mvcollection',
        csl: 'dataset',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'incollection': {
        order: 22,
        biblatex: 'incollection',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'suppcollection': {
        order: 23,
        biblatex: 'suppcollection',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'post': {
        order: 30,
        biblatex: 'online',
        csl: 'post',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'manual': {
        order: 40,
        biblatex: 'manual',
        csl: 'book',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'chapter', 'doi', 'edition', 'eprint', 'eprintclass', 'eprinttype', 'isbn', 'language', 'location', 'note', 'number', 'organization', 'pages', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'type', 'url', 'urldate', 'version']
    },
    'misc': {
        order: 41,
        biblatex: 'misc',
        csl: 'entry',
        required: ['title', 'date'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'howpublished', 'type', 'pubstate', 'organization', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'online': {
        order: 42,
        biblatex: 'online',
        csl: 'webpage',
        required: ['date', 'title', 'url'],
        eitheror: ['editor', 'author'],
        optional: ['addendum', 'pubstate', 'subtitle', 'language', 'urldate', 'titleaddon', 'version', 'note', 'organization']
    },
    'patent': {
        order: 43,
        biblatex: 'patent',
        csl: 'patent',
        required: ['title', 'number', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'holder', 'location', 'pubstate', 'doi', 'subtitle', 'titleaddon', 'type', 'url', 'urldate', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'periodical': {
        order: 50,
        biblatex: 'periodical',
        csl: 'book',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'volume', 'pubstate', 'number', 'series', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'doi', 'subtitle', 'editora', 'editorb', 'editorc', 'url', 'urldate', 'language', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'suppperiodical': {
        order: 51,
        biblatex: 'suppperiodical',
        csl: 'entry',
        required: ['journaltitle', 'title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'annotator', 'commentator', 'doi', 'editor', 'editora', 'editorb', 'editorc', 'eid', 'eprint', 'eprintclass', 'eprinttype', 'issn', 'issue', 'issuesubtitle', 'issuetitle', 'journalsubtitle', 'language', 'note', 'number', 'origlanguage', 'pages', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'version', 'volume']
    },
    'proceedings': {
        order: 60,
        biblatex: 'proceedings',
        csl: 'entry',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'chapter', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'organization', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volume', 'volumes']
    },
    'mvproceedings': {
        order: 61,
        biblatex: 'mvproceedings',
        csl: 'entry',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'note', 'number', 'organization', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volumes']
    },
    'inproceedings': {
        order: 62,
        biblatex: 'inproceedings',
        csl: 'paper-conference',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'booksubtitle', 'booktitleaddon', 'chapter', 'doi', 'eprint', 'eprintclass', 'eprinttype', 'eventdate', 'eventtitle', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'organization', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'url', 'urldate', 'venue', 'volume', 'volumes']
    },
    'reference': {
        order: 70,
        biblatex: 'book',
        csl: 'reference',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'pagetotal', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'mvreference': {
        order: 71,
        biblatex: 'mvreference',
        csl: 'book',
        required: ['editor', 'title', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'note', 'number', 'origlanguage', 'pagetotal', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volumes']
    },
    'inreference': {
        order: 72,
        biblatex: 'inreference',
        csl: 'entry',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'entry-encyclopedia': {
        order: 73,
        biblatex: 'inreference',
        csl: 'entry-encyclopedia',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'entry-dictionary': {
        order: 74,
        biblatex: 'inreference',
        csl: 'entry-dictionary',
        required: ['title', 'editor', 'booktitle', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'afterword', 'annotator', 'booksubtitle', 'booktitleaddon', 'chapter', 'commentator', 'doi', 'edition', 'editora', 'editorb', 'editorc', 'eprint', 'eprintclass', 'eprinttype', 'foreword', 'introduction', 'isbn', 'language', 'location', 'mainsubtitle', 'maintitle', 'maintitleaddon', 'note', 'number', 'origlanguage', 'pages', 'part', 'publisher', 'pubstate', 'series', 'subtitle', 'titleaddon', 'translator', 'url', 'urldate', 'volume', 'volumes']
    },
    'report': {
        order: 80,
        biblatex: 'report',
        csl: 'report',
        required: ['author', 'title', 'type', 'institution', 'date'],
        eitheror: [],
        optional: ['addendum', 'pages', 'pagetotal', 'pubstate', 'number', 'isrn', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'version', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'thesis': {
        order: 81,
        biblatex: 'thesis',
        csl: 'thesis',
        required: ['author', 'title', 'type', 'institution', 'date'],
        eitheror: [],
        optional: ['addendum', 'pages', 'pagetotal', 'pubstate', 'isbn', 'chapter', 'doi', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'note', 'eprint', 'eprintclass', 'eprinttype']
    },
    'unpublished': {
        order: 90,
        biblatex: 'unpublished',
        csl: 'manuscript',
        required: ['title', 'author', 'date'],
        eitheror: [],
        optional: ['addendum', 'howpublished', 'pubstate', 'isbn', 'date', 'subtitle', 'language', 'location', 'url', 'urldate', 'titleaddon', 'note']
    }
};

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexExporter = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _const = require("./const");

var _const2 = require("../const");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

var BibLatexExporter = exports.BibLatexExporter = function () {
    function BibLatexExporter(bibDB, pks) {
        _classCallCheck(this, BibLatexExporter);

        this.bibDB = bibDB; // The bibliography database to export from.
        if (pks) {
            this.pks = pks; // A list of pk values of the bibliography items to be exported.
        } else {
            this.pks = Object.keys(bibDB); // If none are selected, all keys are exporter
        }
    }

    _createClass(BibLatexExporter, [{
        key: "_reformDate",
        value: function _reformDate(theValue) {
            // reform date-field

            var dateParts = theValue.slice();
            if (_typeof(dateParts[0]) === 'object') {
                // We have a range of dates
                return this._reformDate(dateParts[0]) + "/" + this._reformDate(dateParts[1]);
            } else {
                var dateStringParts = [];
                dateStringParts.push(String(dateParts.shift())); // year
                while (dateParts.length > 0) {
                    var datePart = dateParts.shift();
                    dateStringParts.push(('0' + datePart).slice(-2)); // month + day with two characters
                }
                return dateStringParts.join('-');
            }
        }
    }, {
        key: "_reformName",
        value: function _reformName(theValue) {
            var names = [],
                that = this;
            theValue.forEach(function (name) {
                if (name.literal) {
                    var literal = that._escapeTexSpecialChars(name.literal);
                    names.push("{" + literal + "}");
                } else {
                    var family = that._escapeTexSpecialChars(name.family);
                    var given = that._escapeTexSpecialChars(name.given);
                    names.push("{" + family + "} {" + given + "}");
                }
            });
            return names.join(' and ');
        }
    }, {
        key: "_escapeTexSpecialChars",
        value: function _escapeTexSpecialChars(theValue) {
            if ('string' != typeof theValue) {
                return false;
            }
            var len = _const.TexSpecialChars.length;
            for (var i = 0; i < len; i++) {
                theValue = theValue.replace(_const.TexSpecialChars[i][0], _const.TexSpecialChars[i][1]);
            }
            return theValue;
        }
    }, {
        key: "_htmlToLatex",
        value: function _htmlToLatex(theValue) {
            var el = document.createElement('div');
            el.innerHTML = theValue;
            var walker = this._htmlToLatexTreeWalker(el, "");
            return walker;
        }
    }, {
        key: "_htmlToLatexTreeWalker",
        value: function _htmlToLatexTreeWalker(el, outString) {
            if (el.nodeType === 3) {
                // Text node
                outString += this._escapeTexSpecialChars(el.nodeValue);
            } else if (el.nodeType === 1) {
                var braceEnd = "";
                if (el.matches('i')) {
                    outString += "\\emph{";
                    braceEnd = "}";
                } else if (el.matches('b')) {
                    outString += "\\textbf{";
                    braceEnd = "}";
                } else if (el.matches('sup')) {
                    outString += "$^{";
                    braceEnd = "}$";
                } else if (el.matches('sub')) {
                    outString += "$_{";
                    braceEnd = "}$";
                } else if (el.matches('span[class*="nocase"]')) {
                    outString += "{{";
                    braceEnd = "}}";
                } else if (el.matches('span[style*="small-caps"]')) {
                    outString += "\\textsc{";
                    braceEnd = "}";
                }
                for (var i = 0; i < el.childNodes.length; i++) {
                    outString = this._htmlToLatexTreeWalker(el.childNodes[i], outString);
                }
                outString += braceEnd;
            }
            return outString;
        }
    }, {
        key: "_getBibtexString",
        value: function _getBibtexString(biblist) {
            var len = biblist.length,
                str = '';
            for (var i = 0; i < len; i++) {
                if (0 < i) {
                    str += '\r\n\r\n';
                }
                var data = biblist[i];
                str += '@' + data.type + '{' + data.key;
                for (var vKey in data.values) {
                    str += ',\r\n' + vKey + ' = {' + data.values[vKey] + '}';
                }
                str += "\r\n}";
            }
            return str;
        }
    }, {
        key: "output",
        get: function get() {
            var _this = this;

            var that = this;
            this.bibtexArray = [];
            this.bibtexStr = '';

            var len = this.pks.length;

            for (var i = 0; i < len; i++) {
                var pk = this.pks[i];
                var bib = this.bibDB[pk];
                var bibEntry = {
                    'type': _const2.BibTypes[bib['bib_type']]['biblatex'],
                    'key': bib['entry_key']
                };
                var fValues = {};
                for (var fKey in bib.fields) {
                    if (!_const2.BibFieldTypes[fKey]) {
                        continue;
                    }
                    var fValue = bib.fields[fKey];
                    if ("" === fValue) continue;
                    var fType = _const2.BibFieldTypes[fKey]['type'];

                    (function () {
                        switch (fType) {
                            case 'l_name':
                                fValues[_const2.BibFieldTypes[fKey]['biblatex']] = _this._reformName(fValue);
                                break;
                            case 'f_date':
                                fValues[_const2.BibFieldTypes[fKey]['biblatex']] = _this._reformDate(fValue);
                                break;
                            case 'f_literal':
                            case 'f_key':
                                fValues[_const2.BibFieldTypes[fKey]['biblatex']] = _this._htmlToLatex(fValue);
                                break;
                            case 'l_literal':
                            case 'l_key':
                                var eValues = [];
                                fValue.forEach(function (value) {
                                    var eValue = that._htmlToLatex(value);
                                    eValues.push(eValue);
                                });
                                fValues[_const2.BibFieldTypes[fKey]['biblatex']] = eValues.join(' and ');
                                break;
                            default:
                                fValue = _this._escapeTexSpecialChars(fValue);
                                fValues[_const2.BibFieldTypes[fKey]['biblatex']] = fValue;
                        }
                    })();
                }
                bibEntry.values = fValues;
                this.bibtexArray[this.bibtexArray.length] = bibEntry;
            }
            this.bibtexStr = this._getBibtexString(this.bibtexArray);
            return this.bibtexStr;
        }
    }]);

    return BibLatexExporter;
}();

},{"../const":2,"./const":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
// A much smaller list for export than for import, as biblatex does understand utf8
var TexSpecialChars = exports.TexSpecialChars = [[/\\/g, '\\textbackslash '], [/\{/g, '\\{ '], [/\}/g, '\\} '], [/&/g, '{\\&}'], [/%/g, '{\\%}'], [/\$/g, '{\\$}'], [/#/g, '{\\#}'], [/_/g, '{\\_}'], [/~/g, '{\\textasciitilde}'], [/\^/g, '{\\textasciicircum}'], [/ and /g, ' {and} ']];

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.CSLExporter = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _const = require('../const');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Converts a BibDB to a DB of the CSL type.
 * @param bibDB The bibliography database to convert.
 */

var CSLExporter = exports.CSLExporter = function () {
    function CSLExporter(bibDB, pks) {
        _classCallCheck(this, CSLExporter);

        this.bibDB = bibDB;
        if (pks) {
            this.pks = pks; // A list of pk values of the bibliography items to be exported.
        } else {
            this.pks = Object.keys(bibDB); // If none are selected, all keys are exporter
        }
        this.cslDB = {};
    }

    _createClass(CSLExporter, [{
        key: 'getCSLEntry',

        /** Converts one BibDB entry to CSL format.
         * @function getCSLEntry
         * @param id The id identifying the bibliography entry.
         */
        value: function getCSLEntry(id) {
            var bib = this.bibDB[id],
                cslOutput = {};
            for (var fKey in bib.fields) {
                if (bib.fields[fKey] !== '' && fKey in _const.BibFieldTypes && 'csl' in _const.BibFieldTypes[fKey]) {
                    var fType = _const.BibFieldTypes[fKey]['type'];
                    if ('f_date' == fType) {
                        cslOutput[_const.BibFieldTypes[fKey]['csl']] = { 'date-parts': bib.fields[fKey] };
                    } else {
                        cslOutput[_const.BibFieldTypes[fKey]['csl']] = bib.fields[fKey];
                    }
                }
            }
            cslOutput['type'] = _const.BibTypes[bib.bib_type].csl;
            return cslOutput;
        }
    }, {
        key: '_reformDate',
        value: function _reformDate(theValue) {
            //reform date-field
            var dates = theValue.split('/'),
                datesValue = [],
                len = dates.length;
            for (var i = 0; i < len; i++) {
                var eachDate = dates[i];
                var dateParts = eachDate.split('-');
                var dateValue = [];
                var len2 = dateParts.length;
                for (var j = 0; j < len2; j++) {
                    var datePart = dateParts[j];
                    if (datePart != parseInt(datePart)) break;
                    dateValue[dateValue.length] = datePart;
                }
                datesValue[datesValue.length] = dateValue;
            }

            return {
                'date-parts': datesValue
            };
        }
    }, {
        key: '_reformName',
        value: function _reformName(theValue) {
            //reform name-field
            var names = theValue.substring(1, theValue.length - 1).split('} and {'),
                namesValue = [],
                len = names.length;
            for (var i = 0; i < len; i++) {
                var eachName = names[i];
                var nameParts = eachName.split('} {');
                var nameValue = void 0;
                if (nameParts.length > 1) {
                    nameValue = {
                        'family': nameParts[1].replace(/[{}]/g, ''),
                        'given': nameParts[0].replace(/[{}]/g, '')
                    };
                } else {
                    nameValue = {
                        'literal': nameParts[0].replace(/[{}]/g, '')
                    };
                }
                namesValue[namesValue.length] = nameValue;
            }

            return namesValue;
        }
    }, {
        key: 'output',
        get: function get() {
            for (var bibId in this.bibDB) {
                if (this.pks.indexOf(bibId) !== -1) {
                    this.cslDB[bibId] = this.getCSLEntry(bibId);
                    this.cslDB[bibId].id = bibId;
                }
            }
            return this.cslDB;
        }
    }]);

    return CSLExporter;
}();

},{"../const":2}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexParser = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _const = require("../const");

var _const2 = require("./const");

var _nameStringParser = require("./name-string-parser");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Parses files in BibTeX/BibLaTeX format
 */

/* Based on original work by Henrik Muehe (c) 2010,
 * licensed under the MIT license,
 * https://code.google.com/archive/p/bibtex-js/
 */

var BibLatexParser = exports.BibLatexParser = function () {
    function BibLatexParser(input) {
        _classCallCheck(this, BibLatexParser);

        this.input = input;
        this.pos = 0;
        this.entries = [];
        this.bibDB = {};
        this.currentKey = "";
        this.currentEntry = false;
        this.currentType = "";
        this.errors = [];
    }

    _createClass(BibLatexParser, [{
        key: "isWhitespace",
        value: function isWhitespace(s) {
            return s == ' ' || s == '\r' || s == '\t' || s == '\n';
        }
    }, {
        key: "match",
        value: function match(s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                this.pos += s.length;
            } else {
                console.warn("Token mismatch, expected " + s + ", found " + this.input.substring(this.pos));
            }
            this.skipWhitespace();
        }
    }, {
        key: "tryMatch",
        value: function tryMatch(s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                return true;
            } else {
                return false;
            }
            this.skipWhitespace();
        }
    }, {
        key: "skipWhitespace",
        value: function skipWhitespace() {
            while (this.isWhitespace(this.input[this.pos])) {
                this.pos++;
            }
            if (this.input[this.pos] == "%") {
                while (this.input[this.pos] != "\n") {
                    this.pos++;
                }
                this.skipWhitespace();
            }
        }
    }, {
        key: "skipToNext",
        value: function skipToNext() {
            while (this.input.length > this.pos && this.input[this.pos] != "@") {
                this.pos++;
            }
            if (this.input.length == this.pos) {
                return false;
            } else {
                return true;
            }
        }
    }, {
        key: "valueBraces",
        value: function valueBraces() {
            var bracecount = 0;
            this.match("{");
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '}' && this.input[this.pos - 1] != '\\') {
                    if (bracecount > 0) {
                        bracecount--;
                    } else {
                        var end = this.pos;
                        this.match("}");
                        return this.input.substring(start, end);
                    }
                } else if (this.input[this.pos] == '{' && this.input[this.pos - 1] != '\\') {
                    bracecount++;
                } else if (this.pos == this.input.length - 1) {
                    console.warn("Unterminated value");
                }
                this.pos++;
            }
        }
    }, {
        key: "valueQuotes",
        value: function valueQuotes() {
            this.match('"');
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '"' && this.input[this.pos - 1] != '\\') {
                    var end = this.pos;
                    this.match('"');
                    return this.input.substring(start, end);
                } else if (this.pos == this.input.length - 1) {
                    console.warn("Unterminated value:" + this.input.substring(start));
                }
                this.pos++;
            }
        }
    }, {
        key: "singleValue",
        value: function singleValue() {
            var start = this.pos;
            if (this.tryMatch("{")) {
                return this.valueBraces();
            } else if (this.tryMatch('"')) {
                return this.valueQuotes();
            } else {
                var k = this.key();
                if (_const2.MONTH_ABBREVS[k.toUpperCase()]) {
                    return _const2.MONTH_ABBREVS[k.toUpperCase()];
                } else if (k.match("^[0-9]+$")) {
                    return k;
                } else {
                    console.warn("Value unexpected:" + this.input.substring(start));
                }
            }
        }
    }, {
        key: "value",
        value: function value() {
            var values = [];
            values.push(this.singleValue());
            while (this.tryMatch("#")) {
                this.match("#");
                values.push(this.singleValue());
            }
            return values.join("");
        }
    }, {
        key: "key",
        value: function key() {
            var start = this.pos;
            while (true) {
                if (this.pos == this.input.length) {
                    console.warn("Runaway key");
                    return;
                }
                if (this.input[this.pos].match("[a-zA-Z0-9_:;`\\.\\\?+/-]")) {
                    this.pos++;
                } else {
                    return this.input.substring(start, this.pos).toLowerCase();
                }
            }
        }
    }, {
        key: "keyEqualsValue",
        value: function keyEqualsValue() {
            var key = this.key();
            if (this.tryMatch("=")) {
                this.match("=");
                var val = this.value();
                return [key, val];
            } else {
                console.warn("... = value expected, equals sign missing: " + this.input.substring(this.pos));
            }
        }
    }, {
        key: "keyValueList",
        value: function keyValueList() {
            var _this = this;

            var kv = this.keyEqualsValue();
            if (typeof kv === 'undefined') {
                // Entry has no fields, so we delete it.
                // It was the last one pushed, so we remove the last one
                this.entries.pop();
                return;
            }
            this.currentEntry['fields'][kv[0]] = this.scanBibtexString(kv[1]);
            // date may come either as year, year + month or as date field.
            // We therefore need to catch these hear and transform it to the
            // date field after evaluating all the fields.
            // All other date fields only come in the form of a date string.
            var date = {};
            while (this.tryMatch(",")) {
                this.match(",");
                //fixes problems with commas at the end of a list
                if (this.tryMatch("}")) {
                    break;
                }
                kv = this.keyEqualsValue();
                if (typeof kv === 'undefined') {
                    this.errors.push({ type: 'variable_error' });
                    break;
                }
                var val = this.scanBibtexString(kv[1]);
                switch (kv[0]) {
                    case 'date':
                    case 'month':
                    case 'year':
                        date[kv[0]] = val;
                        break;
                    default:
                        this.currentEntry['fields'][kv[0]] = val;
                }
            }
            if (date.date) {
                // date string has precedence.
                this.currentEntry['fields']['date'] = date.date;
            } else if (date.year && date.month) {
                this.currentEntry['fields']['date'] = date.year + "-" + date.month;
            } else if (date.year) {
                this.currentEntry['fields']['date'] = "" + date.year;
            }

            var _loop = function _loop(_fKey) {
                // Replace alias fields with their main term.
                if (_const2.BiblatexFieldAliasTypes[_fKey]) {
                    var value = _this.currentEntry['fields'][_fKey];
                    delete _this.currentEntry['fields'][_fKey];
                    _fKey = _const2.BiblatexFieldAliasTypes[_fKey];
                    _this.currentEntry['fields'][_fKey] = value;
                }
                var field = _const.BibFieldTypes[_fKey];

                if ('undefined' == typeof field) {
                    _this.errors.push({
                        type: 'unknown_field',
                        entry: _this.currentEntry['entry_key'],
                        field_name: _fKey
                    });
                    delete _this.currentEntry['fields'][_fKey];
                    return "continue";
                }
                var fType = field['type'];
                var fValue = _this.currentEntry['fields'][_fKey];
                switch (fType) {
                    case 'l_name':
                        _this.currentEntry['fields'][_fKey] = _this._reformNameList(fValue);
                        break;
                    case 'f_date':
                        var dateParts = _this._reformDate(fValue);
                        if (dateParts) {
                            _this.currentEntry['fields'][_fKey] = dateParts;
                        } else {
                            _this.errors.push({
                                type: 'unknown_date',
                                entry: _this.currentEntry['entry_key'],
                                field_name: _fKey
                            });
                            delete _this.currentEntry['fields'][_fKey];
                        }
                        break;
                    case 'f_literal':
                    case 'f_key':
                        _this.currentEntry['fields'][_fKey] = _this._reformLiteral(fValue);
                        break;
                    case 'l_literal':
                    case 'l_key':
                        var items = fValue.split(' and ');
                        _this.currentEntry['fields'][_fKey] = [];
                        items.forEach(function (item) {
                            _this.currentEntry['fields'][_fKey].push(_this._reformLiteral(item));
                        });
                        break;
                }
                fKey = _fKey;
            };

            for (var fKey in this.currentEntry['fields']) {
                var _ret = _loop(fKey);

                if (_ret === "continue") continue;
            }
        }
    }, {
        key: "_reformNameList",
        value: function _reformNameList(nameString) {
            var nameStringParser = new _nameStringParser.BibLatexNameStringParser(nameString);
            return nameStringParser.output;
        }
    }, {
        key: "_reformDate",
        value: function _reformDate(dateStr) {
            var that = this;
            if (dateStr.indexOf('/') !== -1) {
                var _ret2 = function () {
                    var dateRangeParts = dateStr.split('/');
                    var dateRangeArray = [];
                    dateRangeParts.forEach(function (dateRangePart) {
                        var reformedDate = that._reformDate(dateRangePart);
                        if (reformedDate) {
                            dateRangeArray.push(reformedDate);
                        }
                    });
                    if (dateRangeArray.length > 2) {
                        dateRangeArray = dateRangeArray.splice(0, 2);
                    } else if (dateRangeArray.length === 1) {
                        dateRangeArray = dateRangeArray[0];
                    } else if (dateRangeArray.length === 0) {
                        dateRangeArray = null;
                    }
                    return {
                        v: dateRangeArray
                    };
                }();

                if ((typeof _ret2 === "undefined" ? "undefined" : _typeof(_ret2)) === "object") return _ret2.v;
            }
            var month = true,
                day = true;
            var dateLen = dateStr.split(/[\s,\./\-]/g).length;
            if (dateLen === 1) {
                month = false;
                day = false;
            } else if (dateLen === 2) {
                day = false;
            }
            var theDate = new Date(dateStr);
            if ('Invalid Date' == theDate) {
                return null;
            }

            var dateArray = [];
            dateArray.push(theDate.getFullYear());

            if (month) {
                dateArray.push(theDate.getMonth() + 1);
            }

            if (day) {
                dateArray.push(theDate.getDate());
            }

            return dateArray;
        }
    }, {
        key: "_reformLiteral",
        value: function _reformLiteral(theValue) {
            var openBraces = (theValue.match(/\{/g) || []).length,
                closeBraces = (theValue.match(/\}/g) || []).length;
            if (openBraces === 0 && closeBraces === 0) {
                // There are no braces, return the original value
                return theValue;
            } else if (openBraces != closeBraces) {
                // There are different amount of open and close braces, so we return the original string.
                return theValue;
            } else {
                // There are the same amount of open and close braces, but we don't know if they are in the right order.
                var braceLevel = 0,
                    len = theValue.length,
                    i = 0,
                    output = '',
                    braceClosings = [],
                    inCasePreserve = false;

                var latexCommands = [['\\textbf{', '<b>', '</b>'], ['\\textit{', '<i>', '</i>'], ['\\emph{', '<i>', '</i>'], ['\\textsc{', '<span style="font-variant:small-caps;">', '</span>']];
                parseString: while (i < len) {
                    if (theValue[i] === '\\') {
                        var _iteratorNormalCompletion = true;
                        var _didIteratorError = false;
                        var _iteratorError = undefined;

                        try {

                            for (var _iterator = latexCommands[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                var s = _step.value;

                                if (theValue.substring(i, i + s[0].length) === s[0]) {
                                    braceLevel++;
                                    i += s[0].length;
                                    output += s[1];
                                    braceClosings.push(s[2]);
                                    continue parseString;
                                }
                            }
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return) {
                                    _iterator.return();
                                }
                            } finally {
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }

                        if (i + 1 < len) {
                            i += 2;
                            output += theValue[i + 1];
                            continue parseString;
                        }
                    }
                    if (theValue[i] === '_' && theValue.substring(i, i + 2) === '_{') {
                        braceLevel++;
                        i += 2;
                        output = +'<sub>';
                        braceClosings.push('</sub>');
                    }
                    if (theValue[i] === '^' && theValue.substring(i, i + 2) === '^{') {
                        braceLevel++;
                        i += 2;
                        output = +'<sup>';
                        braceClosings.push('</sup>');
                    }
                    if (theValue[i] === '{') {
                        braceLevel++;
                        if (inCasePreserve) {
                            // If already inside case preservation, do not add a second
                            braceClosings.push('');
                        } else {
                            inCasePreserve = braceLevel;
                            output += '<span class="nocase">';
                            braceClosings.push('</span>');
                        }
                        i++;
                        continue parseString;
                    }
                    if (theValue[i] === '}') {
                        if (inCasePreserve === braceLevel) {
                            inCasePreserve = false;
                        }
                        braceLevel--;
                        if (braceLevel > -1) {
                            output += braceClosings.pop();
                            i++;
                            continue parseString;
                        }
                    }
                    if (braceLevel < 0) {
                        // A brace was closed before it was opened. Abort and return the original string.
                        return theValue;
                    }
                    // math env, just remove
                    if (theValue[i] === '$') {
                        i++;
                        continue parseString;
                    }
                    if (theValue[i] === '<') {
                        output += "&lt;";
                        i++;
                        continue parseString;
                    }
                    if (theValue[i] === '>') {
                        output += "&gt;";
                        i++;
                        continue parseString;
                    }
                    output += theValue[i];
                    i++;
                }

                if (braceLevel > 0) {
                    // Too many opening braces, we return the original string.
                    return theValue;
                }
                // Braces were accurate.
                return output;
            }
        }
    }, {
        key: "bibType",
        value: function bibType() {
            var biblatexType = this.currentType;
            if (_const2.BiblatexAliasTypes[biblatexType]) {
                biblatexType = _const2.BiblatexAliasTypes[biblatexType];
            }

            var bibType = '';
            Object.keys(_const.BibTypes).forEach(function (bType) {
                if (_const.BibTypes[bType]['biblatex'] === biblatexType) {
                    bibType = bType;
                }
            });

            if (bibType === '') {
                this.errors.push({
                    type: 'unknown_type',
                    type_name: biblatexType
                });
                bibType = 'misc';
            }

            return bibType;
        }
    }, {
        key: "newEntry",
        value: function newEntry() {
            this.currentEntry = {
                'bib_type': this.bibType(),
                'entry_key': this.key(),
                'fields': {}
            };
            this.entries.push(this.currentEntry);
            this.match(",");
            this.keyValueList();
        }
    }, {
        key: "directive",
        value: function directive() {
            this.match("@");
            this.currentType = this.key();
            return "@" + this.currentType;
        }
    }, {
        key: "string",
        value: function string() {
            var kv = this.keyEqualsValue();
            _const2.MONTH_ABBREVS[kv[0].toUpperCase()] = kv[1];
        }
    }, {
        key: "preamble",
        value: function preamble() {
            this.value();
        }
    }, {
        key: "scanBibtexString",
        value: function scanBibtexString(value) {
            var len = _const2.TexSpecialChars.length;
            for (var i = 0; i < len; i++) {
                var texChar = _const2.TexSpecialChars[i];
                var texCharRegExp = new window.RegExp(texChar[0], 'g');
                value = value.replace(texCharRegExp, texChar[1]);
            }
            // Delete multiple spaces
            value = value.replace(/ +(?= )/g, '');
            return value;
        }
    }, {
        key: "bibtex",
        value: function bibtex() {
            while (this.skipToNext()) {
                var d = this.directive();
                this.match("{");
                if (d == "@string") {
                    this.string();
                } else if (d == "@preamble") {
                    this.preamble();
                } else if (d == "@comment") {
                    continue;
                } else {
                    this.newEntry();
                }
                this.match("}");
            }
        }
    }, {
        key: "createBibDB",
        value: function createBibDB() {
            var that = this;
            this.entries.forEach(function (entry, index) {
                that.bibDB[index] = entry;
            });
        }
    }, {
        key: "output",
        get: function get() {
            this.bibtex();
            this.createBibDB();
            return this.bibDB;
        }
    }]);

    return BibLatexParser;
}();

},{"../const":2,"./const":7,"./name-string-parser":8}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var MONTH_NAMES = exports.MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

var MONTH_ABBREVS = exports.MONTH_ABBREVS = {
    JAN: "January",
    FEB: "February",
    MAR: "March",
    APR: "April",
    MAY: "May",
    JUN: "June",
    JUL: "July",
    AUG: "August",
    SEP: "September",
    OCT: "October",
    NOV: "November",
    DEC: "December"
};

/** A list of all field aliases and what they refer to. */
var BiblatexFieldAliasTypes = exports.BiblatexFieldAliasTypes = {
    'address': 'location',
    'annote': 'annotation',
    'archiveprefix': 'eprinttype',
    'journal': 'journaltitle',
    'pdf': 'file',
    'primaryclass': 'eprintclass',
    'school': 'institution'
};

/** A list of all bibentry aliases and what they refer to. */
var BiblatexAliasTypes = exports.BiblatexAliasTypes = {
    'conference': 'inproceedings',
    'electronic': 'online',
    'mastersthesis': 'thesis',
    'phdthesis': 'thesis',
    'techreport': 'thesis',
    'www': 'online'
};

/** A list of special chars in Tex and their unicode equivalent. */
var TexSpecialChars = exports.TexSpecialChars = [["{---}", '—'], ["{\\\\textexclamdown}", '¡'], ["{\\\\textcent}", '¢'], ["{\\\\textsterling}", '£'], ["{\\\\textyen}", '¥'], ["{\\\\textbrokenbar}", '¦'], ["{\\\\textsection}", '§'], ["{\\\\textasciidieresis}", '¨'], ["{\\\\textcopyright}", '©'], ["{\\\\textordfeminine}", 'ª'], ["{\\\\guillemotleft}", '«'], ["{\\\\textlnot}", '¬'], ["{\\\\textregistered}", '®'], ["{\\\\textasciimacron}", '¯'], ["{\\\\textdegree}", '°'], ["{\\\\textpm}", '±'], ["{\\\\texttwosuperior}", '²'], ["{\\\\textthreesuperior}", '³'], ["{\\\\textasciiacute}", '´'], ["{\\\\textmu}", 'µ'], ["{\\\\textparagraph}", '¶'], ["{\\\\textperiodcentered}", '·'], ["{\\\\c\\\\ }", '¸'], ["{\\\\textonesuperior}", '¹'], ["{\\\\textordmasculine}", 'º'], ["{\\\\guillemotright}", '»'], ["{\\\\textonequarter}", '¼'], ["{\\\\textonehalf}", '½'], ["{\\\\textthreequarters}", '¾'], ["{\\\\textquestiondown}", '¿'], ["{\\\\AE}", 'Æ'], ["{\\\\DH}", 'Ð'], ["{\\\\texttimes}", '×'], ["{\\\\TH}", 'Þ'], ["{\\\\ss}", 'ß'], ["{\\\\ae}", 'æ'], ["{\\\\dh}", 'ð'], ["{\\\\textdiv}", '÷'], ["{\\\\th}", 'þ'], ["{\\\\i}", 'ı'], ["{\\\\NG}", 'Ŋ'], ["{\\\\ng}", 'ŋ'], ["{\\\\OE}", 'Œ'], ["{\\\\oe}", 'œ'], ["{\\\\textasciicircum}", 'ˆ'], ["{\\\\~}", '˜'], ["{\\\\textacutedbl}", '˝'], ["{\\\\textendash}", '–'], ["{\\\\textemdash}", '—'], ["{\\\\textemdash}", '―'], ["{\\\\textbardbl}", '‖'], ["{\\\\textunderscore}", '‗'], ["{\\\\textquoteleft}", '‘'], ["{\\\\textquoteright}", '’'], ["{\\\\quotesinglbase}", '‚'], ["{\\\\textquotedblleft}", '“'], ["{\\\\textquotedblright}", '”'], ["{\\\\quotedblbase}", '„'], ["{\\\\quotedblbase}", '‟'], ["{\\\\textdagger}", '†'], ["{\\\\textdaggerdbl}", '‡'], ["{\\\\textbullet}", '•'], ["{\\\\textellipsis}", '…'], ["{\\\\textperthousand}", '‰'], ["{\\\\guilsinglleft}", '‹'], ["{\\\\guilsinglright}", '›'], ["{\\\\textfractionsolidus}", '⁄'], ["{\\\\texteuro}", '€'], ["{\\\\textcelsius}", '℃'], ["{\\\\textnumero}", '№'], ["{\\\\textcircledP}", '℗'], ["{\\\\textservicemark}", '℠'], ["{\\\\texttrademark}", '™'], ["{\\\\textohm}", 'Ω'], ["{\\\\textestimated}", '℮'], ["{\\\\textleftarrow}", '←'], ["{\\\\textuparrow}", '↑'], ["{\\\\textrightarrow}", '→'], ["{\\\\textdownarrow}", '↓'], ["{\\\\infty}", '∞'], ["{\\\\~}", '∼'], ["{\\\\#}", '⋕'], ["{\\\\textlangle}", '〈'], ["{\\\\textrangle}", '〉'], ["{\\\\textvisiblespace}", '␣'], ["{\\\\textopenbullet}", '◦'], ["{\\\\%<}", '✁'], ["{\\\\`A}", 'À'], ["{\\\\'A}", 'Á'], ["{\\\\^A}", 'Â'], ["{\\\\~A}", 'Ã'], ["{\\\\\"A}", 'Ä'], ["{\\\\rA}", 'Å'], ["{\\\\cC}", 'Ç'], ["{\\\\`E}", 'È'], ["{\\\\'E}", 'É'], ["{\\\\^E}", 'Ê'], ["{\\\\\"E}", 'Ë'], ["{\\\\`I}", 'Ì'], ["{\\\\'I}", 'Í'], ["{\\\\^I}", 'Î'], ["{\\\\\"I}", 'Ï'], ["{\\\\~N}", 'Ñ'], ["{\\\\`O}", 'Ò'], ["{\\\\'O}", 'Ó'], ["{\\\\^O}", 'Ô'], ["{\\\\~O}", 'Õ'], ["{\\\\\"O}", 'Ö'], ["{\\\\`U}", 'Ù'], ["{\\\\'U}", 'Ú'], ["{\\\\^U}", 'Û'], ["{\\\\\"U}", 'Ü'], ["{\\\\'Y}", 'Ý'], ["{\\\\`a}", 'à'], ["{\\\\'a}", 'á'], ["{\\\\^a}", 'â'], ["{\\\\~a}", 'ã'], ["{\\\\\"a}", 'ä'], ["{\\\\ra}", 'å'], ["{\\\\cc}", 'ç'], ["{\\\\`e}", 'è'], ["{\\\\'e}", 'é'], ["{\\\\^e}", 'ê'], ["{\\\\\"e}", 'ë'], ["{\\\\`i}", 'ì'], ["{\\\\'i}", 'í'], ["{\\\\^i}", 'î'], ["{\\\\\"i}", 'ï'], ["{\\\\~n}", 'ñ'], ["{\\\\`o}", 'ò'], ["{\\\\'o}", 'ó'], ["{\\\\^o}", 'ô'], ["{\\\\~o}", 'õ'], ["{\\\\\"o}", 'ö'], ["{\\\\`u}", 'ù'], ["{\\\\'u}", 'ú'], ["{\\\\^u}", 'û'], ["{\\\\\"u}", 'ü'], ["{\\\\'y}", 'ý'], ["{\\\\\"y}", 'ÿ'], ["{\\\\=A}", 'Ā'], ["{\\\\=a}", 'ā'], ["{\\\\uA}", 'Ă'], ["{\\\\ua}", 'ă'], ["{\\\\kA}", 'Ą'], ["{\\\\ka}", 'ą'], ["{\\\\'C}", 'Ć'], ["{\\\\'c}", 'ć'], ["{\\\\^C}", 'Ĉ'], ["{\\\\^c}", 'ĉ'], ["{\\\\.C}", 'Ċ'], ["{\\\\.c}", 'ċ'], ["{\\\\vC}", 'Č'], ["{\\\\vc}", 'č'], ["{\\\\vD}", 'Ď'], ["{\\\\vd}", 'ď'], ["{\\\\=E}", 'Ē'], ["{\\\\=e}", 'ē'], ["{\\\\uE}", 'Ĕ'], ["{\\\\ue}", 'ĕ'], ["{\\\\.E}", 'Ė'], ["{\\\\.e}", 'ė'], ["{\\\\kE}", 'Ę'], ["{\\\\ke}", 'ę'], ["{\\\\vE}", 'Ě'], ["{\\\\ve}", 'ě'], ["{\\\\^G}", 'Ĝ'], ["{\\\\^g}", 'ĝ'], ["{\\\\uG}", 'Ğ'], ["{\\\\ug}", 'ğ'], ["{\\\\.G}", 'Ġ'], ["{\\\\.g}", 'ġ'], ["{\\\\cG}", 'Ģ'], ["{\\\\cg}", 'ģ'], ["{\\\\^H}", 'Ĥ'], ["{\\\\^h}", 'ĥ'], ["{\\\\~I}", 'Ĩ'], ["{\\\\~i}", 'ĩ'], ["{\\\\=I}", 'Ī'], ["{\\\\=i}", 'ī'], ["{\\\\uI}", 'Ĭ'], ["{\\\\ui}", 'ĭ'], ["{\\\\kI}", 'Į'], ["{\\\\ki}", 'į'], ["{\\\\.I}", 'İ'], ["{\\\\^J}", 'Ĵ'], ["{\\\\^j}", 'ĵ'], ["{\\\\cK}", 'Ķ'], ["{\\\\ck}", 'ķ'], ["{\\\\'L}", 'Ĺ'], ["{\\\\'l}", 'ĺ'], ["{\\\\cL}", 'Ļ'], ["{\\\\cl}", 'ļ'], ["{\\\\vL}", 'Ľ'], ["{\\\\vl}", 'ľ'], ["\\\\\\\\L{}", 'Ł'], ["\\\\\\\\l{}", 'ł'], ["{\\\\'N}", 'Ń'], ["{\\\\'n}", 'ń'], ["{\\\\cN}", 'Ņ'], ["{\\\\cn}", 'ņ'], ["{\\\\vN}", 'Ň'], ["{\\\\vn}", 'ň'], ["{\\\\=O}", 'Ō'], ["{\\\\=o}", 'ō'], ["{\\\\uO}", 'Ŏ'], ["{\\\\uo}", 'ŏ'], ["{\\\\HO}", 'Ő'], ["{\\\\Ho}", 'ő'], ["{\\\\'R}", 'Ŕ'], ["{\\\\'r}", 'ŕ'], ["{\\\\cR}", 'Ŗ'], ["{\\\\cr}", 'ŗ'], ["{\\\\vR}", 'Ř'], ["{\\\\vr}", 'ř'], ["{\\\\'S}", 'Ś'], ["{\\\\'s}", 'ś'], ["{\\\\^S}", 'Ŝ'], ["{\\\\^s}", 'ŝ'], ["{\\\\cS}", 'Ş'], ["{\\\\cs}", 'ş'], ["{\\\\vS}", 'Š'], ["{\\\\vs}", 'š'], ["{\\\\cT}", 'Ţ'], ["{\\\\ct}", 'ţ'], ["{\\\\vT}", 'Ť'], ["{\\\\vt}", 'ť'], ["{\\\\~U}", 'Ũ'], ["{\\\\~u}", 'ũ'], ["{\\\\=U}", 'Ū'], ["{\\\\=u}", 'ū'], ["{\\\\uU}", 'Ŭ'], ["{\\\\uu}", 'ŭ'], ["{\\\\HU}", 'Ű'], ["{\\\\Hu}", 'ű'], ["{\\\\kU}", 'Ų'], ["{\\\\ku}", 'ų'], ["{\\\\^W}", 'Ŵ'], ["{\\\\^w}", 'ŵ'], ["{\\\\^Y}", 'Ŷ'], ["{\\\\^y}", 'ŷ'], ["{\\\\\"Y}", 'Ÿ'], ["{\\\\'Z}", 'Ź'], ["{\\\\'z}", 'ź'], ["{\\\\.Z}", 'Ż'], ["{\\\\.z}", 'ż'], ["{\\\\vZ}", 'Ž'], ["{\\\\vz}", 'ž'], ["{\\\\vA}", 'Ǎ'], ["{\\\\va}", 'ǎ'], ["{\\\\vI}", 'Ǐ'], ["{\\\\vi}", 'ǐ'], ["{\\\\vO}", 'Ǒ'], ["{\\\\vo}", 'ǒ'], ["{\\\\vU}", 'Ǔ'], ["{\\\\vu}", 'ǔ'], ["{\\\\vG}", 'Ǧ'], ["{\\\\vg}", 'ǧ'], ["{\\\\vK}", 'Ǩ'], ["{\\\\vk}", 'ǩ'], ["{\\\\kO}", 'Ǫ'], ["{\\\\ko}", 'ǫ'], ["{\\\\vj}", 'ǰ'], ["{\\\\'G}", 'Ǵ'], ["{\\\\'g}", 'ǵ'], ["{\\\\.B}", 'Ḃ'], ["{\\\\.b}", 'ḃ'], ["{\\\\dB}", 'Ḅ'], ["{\\\\db}", 'ḅ'], ["{\\\\bB}", 'Ḇ'], ["{\\\\bb}", 'ḇ'], ["{\\\\.D}", 'Ḋ'], ["{\\\\.d}", 'ḋ'], ["{\\\\dD}", 'Ḍ'], ["{\\\\dd}", 'ḍ'], ["{\\\\bD}", 'Ḏ'], ["{\\\\bd}", 'ḏ'], ["{\\\\cD}", 'Ḑ'], ["{\\\\cd}", 'ḑ'], ["{\\\\.F}", 'Ḟ'], ["{\\\\.f}", 'ḟ'], ["{\\\\=G}", 'Ḡ'], ["{\\\\=g}", 'ḡ'], ["{\\\\.H}", 'Ḣ'], ["{\\\\.h}", 'ḣ'], ["{\\\\dH}", 'Ḥ'], ["{\\\\dh}", 'ḥ'], ["{\\\\\"H}", 'Ḧ'], ["{\\\\\"h}", 'ḧ'], ["{\\\\cH}", 'Ḩ'], ["{\\\\ch}", 'ḩ'], ["{\\\\'K}", 'Ḱ'], ["{\\\\'k}", 'ḱ'], ["{\\\\dK}", 'Ḳ'], ["{\\\\dk}", 'ḳ'], ["{\\\\bK}", 'Ḵ'], ["{\\\\bk}", 'ḵ'], ["{\\\\dL}", 'Ḷ'], ["{\\\\dl}", 'ḷ'], ["{\\\\bL}", 'Ḻ'], ["{\\\\bl}", 'ḻ'], ["{\\\\'M}", 'Ḿ'], ["{\\\\'m}", 'ḿ'], ["{\\\\.M}", 'Ṁ'], ["{\\\\.m}", 'ṁ'], ["{\\\\dM}", 'Ṃ'], ["{\\\\dm}", 'ṃ'], ["{\\\\.N}", 'Ṅ'], ["{\\\\.n}", 'ṅ'], ["{\\\\dN}", 'Ṇ'], ["{\\\\dn}", 'ṇ'], ["{\\\\bN}", 'Ṉ'], ["{\\\\bn}", 'ṉ'], ["{\\\\'P}", 'Ṕ'], ["{\\\\'p}", 'ṕ'], ["{\\\\.P}", 'Ṗ'], ["{\\\\.p}", 'ṗ'], ["{\\\\.R}", 'Ṙ'], ["{\\\\.r}", 'ṙ'], ["{\\\\dR}", 'Ṛ'], ["{\\\\dr}", 'ṛ'], ["{\\\\bR}", 'Ṟ'], ["{\\\\br}", 'ṟ'], ["{\\\\.S}", 'Ṡ'], ["{\\\\.s}", 'ṡ'], ["{\\\\dS}", 'Ṣ'], ["{\\\\ds}", 'ṣ'], ["{\\\\.T}", 'Ṫ'], ["{\\\\.t}", 'ṫ'], ["{\\\\dT}", 'Ṭ'], ["{\\\\dt}", 'ṭ'], ["{\\\\bT}", 'Ṯ'], ["{\\\\bt}", 'ṯ'], ["{\\\\~V}", 'Ṽ'], ["{\\\\~v}", 'ṽ'], ["{\\\\dV}", 'Ṿ'], ["{\\\\dv}", 'ṿ'], ["{\\\\`W}", 'Ẁ'], ["{\\\\`w}", 'ẁ'], ["{\\\\'W}", 'Ẃ'], ["{\\\\'w}", 'ẃ'], ["{\\\\\"W}", 'Ẅ'], ["{\\\\\"w}", 'ẅ'], ["{\\\\.W}", 'Ẇ'], ["{\\\\.w}", 'ẇ'], ["{\\\\dW}", 'Ẉ'], ["{\\\\dw}", 'ẉ'], ["{\\\\.X}", 'Ẋ'], ["{\\\\.x}", 'ẋ'], ["{\\\\\"X}", 'Ẍ'], ["{\\\\\"x}", 'ẍ'], ["{\\\\.Y}", 'Ẏ'], ["{\\\\.y}", 'ẏ'], ["{\\\\^Z}", 'Ẑ'], ["{\\\\^z}", 'ẑ'], ["{\\\\dZ}", 'Ẓ'], ["{\\\\dz}", 'ẓ'], ["{\\\\bZ}", 'Ẕ'], ["{\\\\bz}", 'ẕ'], ["{\\\\bh}", 'ẖ'], ["{\\\\\"t}", 'ẗ'], ["{\\\\dA}", 'Ạ'], ["{\\\\da}", 'ạ'], ["{\\\\dE}", 'Ẹ'], ["{\\\\de}", 'ẹ'], ["{\\\\~E}", 'Ẽ'], ["{\\\\~e}", 'ẽ'], ["{\\\\dI}", 'Ị'], ["{\\\\di}", 'ị'], ["{\\\\dO}", 'Ọ'], ["{\\\\do}", 'ọ'], ["{\\\\dU}", 'Ụ'], ["{\\\\du}", 'ụ'], ["{\\\\`Y}", 'Ỳ'], ["{\\\\`y}", 'ỳ'], ["{\\\\dY}", 'Ỵ'], ["{\\\\dy}", 'ỵ'], ["{\\\\~Y}", 'Ỹ'], ["{\\\\~y}", 'ỹ'], ["{\\\\pounds}", '£'], ["{\\\\glqq}", '„'], ["{\\\\grqq}", '“'], ["{\\\\`{A}}", 'À'], ["{\\\\'{A}}", 'Á'], ["{\\\\^{A}}", 'Â'], ["{\\\\~{A}}", 'Ã'], ["{\\\\\"{A}}", 'Ä'], ["{\\\\r{A}}", 'Å'], ["{\\\\c{C}}", 'Ç'], ["{\\\\`{E}}", 'È'], ["{\\\\'{E}}", 'É'], ["{\\\\^{E}}", 'Ê'], ["{\\\\\"{E}}", 'Ë'], ["{\\\\`{I}}", 'Ì'], ["{\\\\'{I}}", 'Í'], ["{\\\\^{I}}", 'Î'], ["{\\\\\"{I}}", 'Ï'], ["{\\\\~{N}}", 'Ñ'], ["{\\\\`{O}}", 'Ò'], ["{\\\\'{O}}", 'Ó'], ["{\\\\^{O}}", 'Ô'], ["{\\\\~{O}}", 'Õ'], ["{\\\\\"{O}}", 'Ö'], ["{\\\\`{U}}", 'Ù'], ["{\\\\'{U}}", 'Ú'], ["{\\\\^{U}}", 'Û'], ["{\\\\\"{U}}", 'Ü'], ["{\\\\'{Y}}", 'Ý'], ["{\\\\`{a}}", 'à'], ["{\\\\'{a}}", 'á'], ["{\\\\^{a}}", 'â'], ["{\\\\~{a}}", 'ã'], ["{\\\\\"{a}}", 'ä'], ["{\\\\r{a}}", 'å'], ["{\\\\c{c}}", 'ç'], ["{\\\\`{e}}", 'è'], ["{\\\\'{e}}", 'é'], ["{\\\\^{e}}", 'ê'], ["{\\\\\"{e}}", 'ë'], ["{\\\\`{i}}", 'ì'], ["{\\\\'{i}}", 'í'], ["{\\\\^{i}}", 'î'], ["{\\\\\"{i}}", 'ï'], ["{\\\\~{n}}", 'ñ'], ["{\\\\`{o}}", 'ò'], ["{\\\\'{o}}", 'ó'], ["{\\\\^{o}}", 'ô'], ["{\\\\~{o}}", 'õ'], ["{\\\\\"{o}}", 'ö'], ["{\\\\`{u}}", 'ù'], ["{\\\\'{u}}", 'ú'], ["{\\\\^{u}}", 'û'], ["{\\\\\"{u}}", 'ü'], ["{\\\\'{y}}", 'ý'], ["{\\\\\"{y}}", 'ÿ'], ["{\\\\={A}}", 'Ā'], ["{\\\\={a}}", 'ā'], ["{\\\\u{A}}", 'Ă'], ["{\\\\u{a}}", 'ă'], ["{\\\\k{A}}", 'Ą'], ["{\\\\k{a}}", 'ą'], ["{\\\\'{C}}", 'Ć'], ["{\\\\'{c}}", 'ć'], ["{\\\\^{C}}", 'Ĉ'], ["{\\\\^{c}}", 'ĉ'], ["{\\\\.{C}}", 'Ċ'], ["{\\\\.{c}}", 'ċ'], ["{\\\\v{C}}", 'Č'], ["{\\\\v{c}}", 'č'], ["{\\\\v{D}}", 'Ď'], ["{\\\\v{d}}", 'ď'], ["{\\\\={E}}", 'Ē'], ["{\\\\={e}}", 'ē'], ["{\\\\u{E}}", 'Ĕ'], ["{\\\\u{e}}", 'ĕ'], ["{\\\\.{E}}", 'Ė'], ["{\\\\.{e}}", 'ė'], ["{\\\\k{E}}", 'Ę'], ["{\\\\k{e}}", 'ę'], ["{\\\\v{E}}", 'Ě'], ["{\\\\v{e}}", 'ě'], ["{\\\\^{G}}", 'Ĝ'], ["{\\\\^{g}}", 'ĝ'], ["{\\\\u{G}}", 'Ğ'], ["{\\\\u{g}}", 'ğ'], ["{\\\\.{G}}", 'Ġ'], ["{\\\\.{g}}", 'ġ'], ["{\\\\c{G}}", 'Ģ'], ["{\\\\c{g}}", 'ģ'], ["{\\\\^{H}}", 'Ĥ'], ["{\\\\^{h}}", 'ĥ'], ["{\\\\~{I}}", 'Ĩ'], ["{\\\\~{i}}", 'ĩ'], ["{\\\\={I}}", 'Ī'], ["{\\\\={i}}", 'ī'], ["{\\\\u{I}}", 'Ĭ'], ["{\\\\u{i}}", 'ĭ'], ["{\\\\k{I}}", 'Į'], ["{\\\\k{i}}", 'į'], ["{\\\\.{I}}", 'İ'], ["{\\\\^{J}}", 'Ĵ'], ["{\\\\^{j}}", 'ĵ'], ["{\\\\c{K}}", 'Ķ'], ["{\\\\c{k}}", 'ķ'], ["{\\\\'{L}}", 'Ĺ'], ["{\\\\'{l}}", 'ĺ'], ["{\\\\c{L}}", 'Ļ'], ["{\\\\c{l}}", 'ļ'], ["{\\\\v{L}}", 'Ľ'], ["{\\\\v{l}}", 'ľ'], ["{\\\\L{}}", 'Ł'], ["{\\\\l{}}", 'ł'], ["{\\\\'{N}}", 'Ń'], ["{\\\\'{n}}", 'ń'], ["{\\\\c{N}}", 'Ņ'], ["{\\\\c{n}}", 'ņ'], ["{\\\\v{N}}", 'Ň'], ["{\\\\v{n}}", 'ň'], ["{\\\\={O}}", 'Ō'], ["{\\\\={o}}", 'ō'], ["{\\\\u{O}}", 'Ŏ'], ["{\\\\u{o}}", 'ŏ'], ["{\\\\H{O}}", 'Ő'], ["{\\\\H{o}}", 'ő'], ["{\\\\'{R}}", 'Ŕ'], ["{\\\\'{r}}", 'ŕ'], ["{\\\\c{R}}", 'Ŗ'], ["{\\\\c{r}}", 'ŗ'], ["{\\\\v{R}}", 'Ř'], ["{\\\\v{r}}", 'ř'], ["{\\\\'{S}}", 'Ś'], ["{\\\\'{s}}", 'ś'], ["{\\\\^{S}}", 'Ŝ'], ["{\\\\^{s}}", 'ŝ'], ["{\\\\c{S}}", 'Ş'], ["{\\\\c{s}}", 'ş'], ["{\\\\v{S}}", 'Š'], ["{\\\\v{s}}", 'š'], ["{\\\\c{T}}", 'Ţ'], ["{\\\\c{t}}", 'ţ'], ["{\\\\v{T}}", 'Ť'], ["{\\\\v{t}}", 'ť'], ["{\\\\~{U}}", 'Ũ'], ["{\\\\~{u}}", 'ũ'], ["{\\\\={U}}", 'Ū'], ["{\\\\={u}}", 'ū'], ["{\\\\u{U}}", 'Ŭ'], ["{\\\\u{u}}", 'ŭ'], ["{\\\\H{U}}", 'Ű'], ["{\\\\H{u}}", 'ű'], ["{\\\\k{U}}", 'Ų'], ["{\\\\k{u}}", 'ų'], ["{\\\\^{W}}", 'Ŵ'], ["{\\\\^{w}}", 'ŵ'], ["{\\\\^{Y}}", 'Ŷ'], ["{\\\\^{y}}", 'ŷ'], ["{\\\\\"{Y}}", 'Ÿ'], ["{\\\\'{Z}}", 'Ź'], ["{\\\\'{z}}", 'ź'], ["{\\\\.{Z}}", 'Ż'], ["{\\\\.{z}}", 'ż'], ["{\\\\v{Z}}", 'Ž'], ["{\\\\v{z}}", 'ž'], ["{\\\\v{A}}", 'Ǎ'], ["{\\\\v{a}}", 'ǎ'], ["{\\\\v{I}}", 'Ǐ'], ["{\\\\v{i}}", 'ǐ'], ["{\\\\v{O}}", 'Ǒ'], ["{\\\\v{o}}", 'ǒ'], ["{\\\\v{U}}", 'Ǔ'], ["{\\\\v{u}}", 'ǔ'], ["{\\\\v{G}}", 'Ǧ'], ["{\\\\v{g}}", 'ǧ'], ["{\\\\v{K}}", 'Ǩ'], ["{\\\\v{k}}", 'ǩ'], ["{\\\\k{O}}", 'Ǫ'], ["{\\\\k{o}}", 'ǫ'], ["{\\\\v{j}}", 'ǰ'], ["{\\\\'{G}}", 'Ǵ'], ["{\\\\'{g}}", 'ǵ'], ["{\\\\.{B}}", 'Ḃ'], ["{\\\\.{b}}", 'ḃ'], ["{\\\\d{B}}", 'Ḅ'], ["{\\\\d{b}}", 'ḅ'], ["{\\\\b{B}}", 'Ḇ'], ["{\\\\b{b}}", 'ḇ'], ["{\\\\.{D}}", 'Ḋ'], ["{\\\\.{d}}", 'ḋ'], ["{\\\\d{D}}", 'Ḍ'], ["{\\\\d{d}}", 'ḍ'], ["{\\\\b{D}}", 'Ḏ'], ["{\\\\b{d}}", 'ḏ'], ["{\\\\c{D}}", 'Ḑ'], ["{\\\\c{d}}", 'ḑ'], ["{\\\\.{F}}", 'Ḟ'], ["{\\\\.{f}}", 'ḟ'], ["{\\\\={G}}", 'Ḡ'], ["{\\\\={g}}", 'ḡ'], ["{\\\\.{H}}", 'Ḣ'], ["{\\\\.{h}}", 'ḣ'], ["{\\\\d{H}}", 'Ḥ'], ["{\\\\d{h}}", 'ḥ'], ["{\\\\\"{H}}", 'Ḧ'], ["{\\\\\"{h}}", 'ḧ'], ["{\\\\c{H}}", 'Ḩ'], ["{\\\\c{h}}", 'ḩ'], ["{\\\\'{K}}", 'Ḱ'], ["{\\\\'{k}}", 'ḱ'], ["{\\\\d{K}}", 'Ḳ'], ["{\\\\d{k}}", 'ḳ'], ["{\\\\b{K}}", 'Ḵ'], ["{\\\\b{k}}", 'ḵ'], ["{\\\\d{L}}", 'Ḷ'], ["{\\\\d{l}}", 'ḷ'], ["{\\\\b{L}}", 'Ḻ'], ["{\\\\b{l}}", 'ḻ'], ["{\\\\'{M}}", 'Ḿ'], ["{\\\\'{m}}", 'ḿ'], ["{\\\\.{M}}", 'Ṁ'], ["{\\\\.{m}}", 'ṁ'], ["{\\\\d{M}}", 'Ṃ'], ["{\\\\d{m}}", 'ṃ'], ["{\\\\.{N}}", 'Ṅ'], ["{\\\\.{n}}", 'ṅ'], ["{\\\\d{N}}", 'Ṇ'], ["{\\\\d{n}}", 'ṇ'], ["{\\\\b{N}}", 'Ṉ'], ["{\\\\b{n}}", 'ṉ'], ["{\\\\'{P}}", 'Ṕ'], ["{\\\\'{p}}", 'ṕ'], ["{\\\\.{P}}", 'Ṗ'], ["{\\\\.{p}}", 'ṗ'], ["{\\\\.{R}}", 'Ṙ'], ["{\\\\.{r}}", 'ṙ'], ["{\\\\d{R}}", 'Ṛ'], ["{\\\\d{r}}", 'ṛ'], ["{\\\\b{R}}", 'Ṟ'], ["{\\\\b{r}}", 'ṟ'], ["{\\\\.{S}}", 'Ṡ'], ["{\\\\.{s}}", 'ṡ'], ["{\\\\d{S}}", 'Ṣ'], ["{\\\\d{s}}", 'ṣ'], ["{\\\\.{T}}", 'Ṫ'], ["{\\\\.{t}}", 'ṫ'], ["{\\\\d{T}}", 'Ṭ'], ["{\\\\d{t}}", 'ṭ'], ["{\\\\b{T}}", 'Ṯ'], ["{\\\\b{t}}", 'ṯ'], ["{\\\\~{V}}", 'Ṽ'], ["{\\\\~{v}}", 'ṽ'], ["{\\\\d{V}}", 'Ṿ'], ["{\\\\d{v}}", 'ṿ'], ["{\\\\`{W}}", 'Ẁ'], ["{\\\\`{w}}", 'ẁ'], ["{\\\\'{W}}", 'Ẃ'], ["{\\\\'{w}}", 'ẃ'], ["{\\\\\"{W}}", 'Ẅ'], ["{\\\\\"{w}}", 'ẅ'], ["{\\\\.{W}}", 'Ẇ'], ["{\\\\.{w}}", 'ẇ'], ["{\\\\d{W}}", 'Ẉ'], ["{\\\\d{w}}", 'ẉ'], ["{\\\\.{X}}", 'Ẋ'], ["{\\\\.{x}}", 'ẋ'], ["{\\\\\"{X}}", 'Ẍ'], ["{\\\\\"{x}}", 'ẍ'], ["{\\\\.{Y}}", 'Ẏ'], ["{\\\\.{y}}", 'ẏ'], ["{\\\\^{Z}}", 'Ẑ'], ["{\\\\^{z}}", 'ẑ'], ["{\\\\d{Z}}", 'Ẓ'], ["{\\\\d{z}}", 'ẓ'], ["{\\\\b{Z}}", 'Ẕ'], ["{\\\\b{z}}", 'ẕ'], ["{\\\\b{h}}", 'ẖ'], ["{\\\\\"{t}}", 'ẗ'], ["{\\\\d{A}}", 'Ạ'], ["{\\\\d{a}}", 'ạ'], ["{\\\\d{E}}", 'Ẹ'], ["{\\\\d{e}}", 'ẹ'], ["{\\\\~{E}}", 'Ẽ'], ["{\\\\~{e}}", 'ẽ'], ["{\\\\d{I}}", 'Ị'], ["{\\\\d{i}}", 'ị'], ["{\\\\d{O}}", 'Ọ'], ["{\\\\d{o}}", 'ọ'], ["{\\\\d{U}}", 'Ụ'], ["{\\\\d{u}}", 'ụ'], ["{\\\\`{Y}}", 'Ỳ'], ["{\\\\`{y}}", 'ỳ'], ["{\\\\d{Y}}", 'Ỵ'], ["{\\\\d{y}}", 'ỵ'], ["{\\\\~{Y}}", 'Ỹ'], ["{\\\\~{y}}", 'ỹ'], ["{\\\\_}", '_'], ["{and}", 'and']];

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexNameStringParser = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _singleNameParser = require('./single-name-parser');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BibLatexNameStringParser = exports.BibLatexNameStringParser = function () {
    function BibLatexNameStringParser(nameString) {
        _classCallCheck(this, BibLatexNameStringParser);

        nameString = nameString.trim();
        this.people = [];
        if (nameString) {
            this.parsePeople(nameString);
        }
    }

    _createClass(BibLatexNameStringParser, [{
        key: 'parsePeople',
        value: function parsePeople(nameString) {
            var _this = this;

            var people = [];
            var tokenRe = /([^\s{}]+|\s|{|})/g;
            var j = 0;
            var k = 0;
            var item = void 0;
            while ((item = tokenRe.exec(nameString)) !== null) {
                var token = item[0];
                if (k === people.length) {
                    people.push('');
                }
                if ('{' === token) {
                    j += 1;
                }
                if ('}' === token) {
                    j -= 1;
                }
                if ('and' === token && 0 === j) {
                    k += 1;
                } else {
                    people[k] += token;
                }
            }
            people.forEach(function (person) {
                var nameParser = new _singleNameParser.BibLatexSingleNameParser(person);
                _this.people.push(nameParser.output);
            });
        }
    }, {
        key: 'output',
        get: function get() {
            return this.people;
        }
    }]);

    return BibLatexNameStringParser;
}();

},{"./single-name-parser":9}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BibLatexSingleNameParser = exports.BibLatexSingleNameParser = function () {
    function BibLatexSingleNameParser(nameString) {
        _classCallCheck(this, BibLatexSingleNameParser);

        this.nameString = nameString;
        this.nameDict = {};
        this._first = [];
        this._last = [];
    }

    _createClass(BibLatexSingleNameParser, [{
        key: 'splitTexString',
        value: function splitTexString(string) {
            var sep = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

            if (sep === null) {
                sep = '[\\s~]+';
            }
            var braceLevel = 0;
            var nameStart = 0;
            var result = [];
            var stringLen = string.length;
            var pos = 0;
            while (pos < stringLen) {
                var char = string.charAt(pos);
                if (char === '{') {
                    braceLevel += 1;
                } else if (char === '}') {
                    braceLevel -= 1;
                } else if (braceLevel === 0 && pos > 0) {
                    var match = string.slice(pos).match(window.RegExp('^' + sep));
                    if (match) {
                        var sepLen = match[0].length;
                        if (pos + sepLen < stringLen) {
                            result.push(string.slice(nameStart, pos));
                            nameStart = pos + sepLen;
                        }
                    }
                }
                pos++;
            }
            if (nameStart < stringLen) {
                result.push(string.slice(nameStart));
            }
            return result.map(function (string) {
                return string.replace(/^(\s|{|})+|(\s|{|})+$/g, '');
            });
        }
    }, {
        key: 'processFirstMiddle',
        value: function processFirstMiddle(parts) {
            this._first = this._first.concat(parts);
            this.nameDict['given'] = this._first.join(' ');
        }
    }, {
        key: 'processVonLast',
        value: function processVonLast(parts) {
            var lineage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

            var rSplit = this.rsplitAt(parts);
            var von = rSplit[0];
            var last = rSplit[1];
            if (von && !last) {
                last.push(von.pop());
            }
            this._last = this._last.concat(von);
            this._last = this._last.concat(last);
            this._last = this._last.concat(lineage);
            this.nameDict['family'] = this._last.join(' ');
        }
    }, {
        key: 'findFirstLowerCaseWord',
        value: function findFirstLowerCaseWord(lst) {
            // return index of first lowercase word in lst. Else return length of lst.
            for (var i = 0; i < lst.length; i++) {
                var word = lst[i];
                if (word === word.toLowerCase()) {
                    return i;
                }
            }
            return lst.length;
        }
    }, {
        key: 'splitAt',
        value: function splitAt(lst) {
            // Split the given list into two parts.
            // The second part starts with the first lowercase word.
            var pos = this.findFirstLowerCaseWord(lst);
            return [lst.slice(0, pos), lst.slice(pos)];
        }
    }, {
        key: 'rsplitAt',
        value: function rsplitAt(lst) {
            var rpos = this.findFirstLowerCaseWord(lst.slice().reverse());
            var pos = lst.length - rpos;
            return [lst.slice(0, pos), lst.slice(pos)];
        }
    }, {
        key: 'output',
        get: function get() {
            var parts = this.splitTexString(this.nameString, ',');
            if (parts.length === 3) {
                // von Last, Jr, First
                this.processVonLast(this.splitTexString(parts[0]), this.splitTexString(parts[1]));
                this.processFirstMiddle(this.splitTexString(parts[2]));
            } else if (parts.length === 2) {
                // von Last, First
                this.processVonLast(this.splitTexString(parts[0]));
                this.processFirstMiddle(this.splitTexString(parts[1]));
            } else if (parts.length === 1) {
                // First von Last
                var spacedParts = this.splitTexString(this.nameString);
                if (spacedParts.length === 1) {
                    this.nameDict['literal'] = spacedParts[0];
                } else {
                    var split = this.splitAt(spacedParts);
                    var firstMiddle = split[0];
                    var vonLast = split[1];
                    if (vonLast.length === 0 && firstMiddle.length > 1) {
                        var last = firstMiddle.pop();
                        vonLast.push(last);
                    }
                    this.processFirstMiddle(firstMiddle);
                    this.processVonLast(vonLast);
                }
            } else {
                this.nameDict['literal'] = this.nameString;
            }
            return this.nameDict;
        }
    }]);

    return BibLatexSingleNameParser;
}();

},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _biblatex = require("./import/biblatex");

Object.defineProperty(exports, "BibLatexParser", {
  enumerable: true,
  get: function get() {
    return _biblatex.BibLatexParser;
  }
});

var _biblatex2 = require("./export/biblatex");

Object.defineProperty(exports, "BibLatexExporter", {
  enumerable: true,
  get: function get() {
    return _biblatex2.BibLatexExporter;
  }
});

var _csl = require("./export/csl");

Object.defineProperty(exports, "CSLExporter", {
  enumerable: true,
  get: function get() {
    return _csl.CSLExporter;
  }
});

var _const = require("./const");

Object.defineProperty(exports, "BibFieldTypes", {
  enumerable: true,
  get: function get() {
    return _const.BibFieldTypes;
  }
});
Object.defineProperty(exports, "BibTypes", {
  enumerable: true,
  get: function get() {
    return _const.BibTypes;
  }
});

},{"./const":2,"./export/biblatex":3,"./export/csl":5,"./import/biblatex":6}]},{},[1]);
