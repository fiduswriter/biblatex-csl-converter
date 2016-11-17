import {BibLatexParser, BibLatexExporter, CSLExporter} from "../src"

let readBibFile = function() {
    let fileUpload = document.getElementById('file-upload')
    if(fileUpload.files.length) {
        let fr = new FileReader()
        fr.onload = function(event)
        {
            importBiblatex(event.target.result)
        }
        fr.readAsText(fileUpload.files[0])
    }
}

let importBiblatex = function(bibString) {
        let parser = new BibLatexParser(bibString)
        window.bibDB = parser.output
        let bibDBOutput = document.getElementById('bib-db')
        bibDBOutput.innerHTML = JSON.stringify(window.bibDB)
}

document.getElementById('file-upload').addEventListener('change', readBibFile)
