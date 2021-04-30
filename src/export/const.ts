// A much smaller list for export than for import, as biblatex does understand utf8
export const TexSpecialChars: [RegExp, string][] = [
    [/\\/g, "\\textbackslash "],
    [/\{/g, "\\{ "],
    [/\}/g, "\\} "],
    [/&/g, "{\\&}"],
    [/%/g, "{\\%}"],
    [/\$/g, "{\\$}"],
    [/#/g, "{\\#}"],
    [/_/g, "{\\_}"],
    [/~/g, "{\\textasciitilde}"],
    [/\^/g, "{\\textasciicircum}"],
    [/ and /g, " {and} "],
]
