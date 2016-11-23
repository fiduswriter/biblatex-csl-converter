import {BibLatexParser, BibLatexExporter, CSLExporter} from "../src"

let printObject = function(object) {
    let html = ''
    switch (typeof object) {
        case 'object':
            if (object instanceof Array) {
                html += '['
                object.forEach((item, index) => {
                    html += printObject(item)
                    if ((index+1)<object.length) {
                        html += ', '
                    }
                })
                html += ']'
            } else {
                html += '<table>'
                Object.keys(object).forEach((key) => {
                    let valueHtml = printObject(object[key])
                    html += `<tr><td>${key}: </td><td>${valueHtml}</td></tr>`
                })
                html += '</table>'
            }
            break
        case 'number':
            html += String(object)
            break
        case 'string':
            html += object.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            break
    }
    return html
}

let readBibFile = function() {
    document.getElementById('bib-db').innerHTML = '<div class="spinner"></div>'
    document.getElementById('csl-db').innerHTML = '<div class="spinner"></div>'
    document.getElementById('biblatex').innerHTML = '<div class="spinner"></div>'
    // Add timeout so that spinners are shown before processing of file starts.
    setTimeout(function() {
        let fileUpload = document.getElementById('file-upload')
        if(fileUpload.files.length) {
            let fr = new FileReader()
            fr.onload = function(event) {
                importBiblatex(event.target.result)
            }
            fr.readAsText(fileUpload.files[0])
        }
    }, 500)
}

let importBiblatex = function(bibString) {
    let parser = new BibLatexParser(bibString)
    let bibDB = parser.output
    document.getElementById('bib-db').innerHTML = printObject(bibDB)
    window.bibDB = bibDB
    exportCSL(bibDB)
    exportBibLatex(bibDB)
}

let exportCSL = function(bibDB) {
    let exporter = new CSLExporter(bibDB)
    let cslDB = exporter.output
    document.getElementById('csl-db').innerHTML = printObject(cslDB)
}

let exportBibLatex = function(bibDB) {
    let exporter = new BibLatexExporter(bibDB)
    let biblatex = exporter.output.split('\n').join('<br>')
    document.getElementById('biblatex').innerHTML = biblatex
}

document.getElementById('file-upload').addEventListener('change', readBibFile)
