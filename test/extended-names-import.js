import test from "ava"

import {BibLatexParser} from "../src/import/biblatex"

const input1 = `@article{hess2008gromacs,
  title={GROMACS 4: algorithms for highly efficient, load-balanced, and scalable molecular simulation},
  author={Hess, Berk and Kutzner, Carsten and {given={David}, family={Spoel}, prefix={van der}, useprefix=false} and Lindahl, Erik},
  journal={Journal of chemical theory and computation},
  volume={4},
  number={3},
  pages={435--447},
  year={2008},
  publisher={American Chemical Society}
}`

const output1 = {
    "0": {
        "bib_type": "article",
        "entry_key": "hess2008gromacs",
        "fields": {
            "date": "2008",
            "title": [{
                "type": "text",
                "text": "GROMACS 4: algorithms for highly efficient, load-balanced, and scalable molecular simulation"
            }],
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Hess"
                }],
                "given": [{
                    "type": "text",
                    "text": "Berk"
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "Kutzner"
                }],
                "given": [{
                    "type": "text",
                    "text": "Carsten"
                }]
            }, {
                "given": [{
                    "type": "text",
                    "text": "David"
                }],
                "family": [{
                    "type": "text",
                    "text": "Spoel"
                }],
                "prefix": [{
                    "type": "text",
                    "text": "van der"
                }],
                "useprefix": false
            }, {
                "family": [{
                    "type": "text",
                    "text": "Lindahl"
                }],
                "given": [{
                    "type": "text",
                    "text": "Erik"
                }]
            }],
            "journaltitle": [{
                "type": "text",
                "text": "Journal of chemical theory and computation"
            }],
            "volume": [{
                "type": "text",
                "text": "4"
            }],
            "number": [{
                "type": "text",
                "text": "3"
            }]
        }
    }
}

let parser1 = new BibLatexParser(input1)

test('can parse dropping prefix in extended names', t => t.deepEqual(output1, parser1.output))

const input2 = `@article{berendsen1995gromacs,
  title={GROMACS: a message-passing parallel molecular dynamics implementation},
  author={Berendsen, Herman JC and {given={David}, family={Spoel}, prefix={van der}, useprefix=false} and {given={Rudi}, family={Dronen}, prefix={van}, useprefix=true}},
  journal={Computer Physics Communications},
  volume={91},
  number={1},
  pages={43--56},
  year={1995},
  publisher={North-Holland}
}`

const output2 = {
    "0": {
        "bib_type": "article",
        "entry_key": "berendsen1995gromacs",
        "fields": {
            "date": "1995",
            "title": [{
                "type": "text",
                "text": "GROMACS: a message-passing parallel molecular dynamics implementation"
            }],
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Berendsen"
                }],
                "given": [{
                    "type": "text",
                    "text": "Herman JC"
                }]
            }, {
                "given": [{
                    "type": "text",
                    "text": "David"
                }],
                "family": [{
                    "type": "text",
                    "text": "Spoel"
                }],
                "prefix": [{
                    "type": "text",
                    "text": "van der"
                }],
                "useprefix": false
            }, {
                "given": [{
                    "type": "text",
                    "text": "Rudi"
                }],
                "family": [{
                    "type": "text",
                    "text": "Dronen"
                }],
                "prefix": [{
                    "type": "text",
                    "text": "van"
                }],
                "useprefix": true
            }],
            "journaltitle": [{
                "type": "text",
                "text": "Computer Physics Communications"
            }],
            "volume": [{
                "type": "text",
                "text": "91"
            }],
            "number": [{
                "type": "text",
                "text": "1"
            }]
        }
    }
}

let parser2 = new BibLatexParser(input2)

test('can parse dropping and non-dropping prefix in extended names', t => t.deepEqual(output2, parser2.output))

const input3 = `@article{doi:10.1056/NEJM197806222982503,
author = { Goldenberg ,  David M.  and  DeLand ,  Frank  and  Kim ,  Euishin  and  Bennett ,  Sidney  and  Primus ,  F. James  and  {family=Nagell, prefix=van, "given={John R.}", suffix=Jr.}  and  Estes ,  Norman  and  DeSimone ,  Philip  and  Rayburn ,  Pam },
title = {Use of Radio-Labeled Antibodies to Carcinoembryonic Antigen for the Detection and Localization of Diverse Cancers by External Photoscanning},
journal = {New England Journal of Medicine},
volume = {298},
number = {25},
pages = {1384-1388},
year = {1978},
doi = {10.1056/NEJM197806222982503},
    note ={PMID: 349387},

URL = {
        http://dx.doi.org/10.1056/NEJM197806222982503

},
eprint = {
        http://dx.doi.org/10.1056/NEJM197806222982503

}

}`

const output3 = {
    "0": {
        "bib_type": "article",
        "entry_key": "doi:10.1056/NEJM197806222982503",
        "fields": {
            "date": "1978",
            "author": [{
                "family": [{
                    "type": "text",
                    "text": "Goldenberg"
                }],
                "given": [{
                    "type": "text",
                    "text": "David M."
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "DeLand"
                }],
                "given": [{
                    "type": "text",
                    "text": "Frank"
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "Kim"
                }],
                "given": [{
                    "type": "text",
                    "text": "Euishin"
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "Bennett"
                }],
                "given": [{
                    "type": "text",
                    "text": "Sidney"
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "Primus"
                }],
                "given": [{
                    "type": "text",
                    "text": "F. James"
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "Nagell"
                }],
                "prefix": [{
                    "type": "text",
                    "text": "van"
                }],
                "given": [{
                    "type": "text",
                    "text": "John R."
                }],
                "suffix": [{
                    "type": "text",
                    "text": "Jr."
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "Estes"
                }],
                "given": [{
                    "type": "text",
                    "text": "Norman"
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "DeSimone"
                }],
                "given": [{
                    "type": "text",
                    "text": "Philip"
                }]
            }, {
                "family": [{
                    "type": "text",
                    "text": "Rayburn"
                }],
                "given": [{
                    "type": "text",
                    "text": "Pam"
                }]
            }],
            "title": [{
                "type": "text",
                "text": "Use of Radio-Labeled Antibodies to Carcinoembryonic Antigen for the Detection and Localization of Diverse Cancers by External Photoscanning"
            }],
            "journaltitle": [{
                "type": "text",
                "text": "New England Journal of Medicine"
            }],
            "volume": [{
                "type": "text",
                "text": "298"
            }],
            "number": [{
                "type": "text",
                "text": "25"
            }],
            "note": [{
                "type": "text",
                "text": "PMID: 349387"
            }]
        }
    }
}

let parser3 = new BibLatexParser(input3)

test('can parse prefix and suffix in extended names', t => t.deepEqual(output3, parser3.output))
