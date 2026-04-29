import { BibLatexExporter } from "../export/biblatex"
import { CSLExporter } from "../export/csl"
import { BibLatexParser } from "../import/biblatex"

Object.assign(globalThis, { BibLatexExporter, BibLatexParser, CSLExporter })
