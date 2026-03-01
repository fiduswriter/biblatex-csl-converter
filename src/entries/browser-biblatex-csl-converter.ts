import { BibLatexExporter } from "../export/biblatex"
import { BibLatexParser } from "../import/biblatex"
import { CSLExporter } from "../export/csl"

Object.assign(globalThis, { BibLatexExporter, BibLatexParser, CSLExporter })
