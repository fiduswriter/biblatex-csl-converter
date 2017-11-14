# biblatex-csl-converter [![Build Status](https://travis-ci.org/fiduswriter/biblatex-csl-converter.svg?branch=master)](https://travis-ci.org/fiduswriter/biblatex-csl-converter)
A set of JavaScript converters: biblatex => json, json => csl, and json => biblatex

Try demo [here](https://fiduswriter.github.io/biblatex-csl-converter/).

## FAQ

**Q:** Why do you use a different json as internal format and not just the json format of CSL? Wouldn't that save you one conversion step?

**A:** Unfortunately, the CSL json cannot hold all the information we import from biblatex, so if we used the json of CSL internally, we would loose information that we may want to export in biblatex later on.

**Q:** Do you import all information from the imported bibtex/biblatex files?

**A:** We only keep the information found in any of the required or optional fields defined in the BibLatex documentation. Other fields are removed upon import.

**Q:** How do I see if there are errors when parsing the BiBTeX/BibLatex file?

**A:** There is an array of errors that were encountered while parsing the file that can be found at ```parser.errors``` after you get the ```parser.output```. There is also ```parser.warnings``` for less serious issues.

**Q:** I need access to the raw/non-processed contents of certain fields. What do I do?

**A:** The fields in their almost raw form can be found under ```entry.raw_fields[FIELD_NAME]```.

**Q:** What if I need to process fields that don't follow the biblatex definition?

**A:** You can initialize the parser with a config object like this: ```new BibLatexParser(inputString,
{processUnexpected: true, processUnknown: {collaborator: 'l_name'}})```. The ```processUnexpected``` setting will enable
parsing of fields that are known, but shouldn't be in the bibliography entry due to its type. The ```processUnknown``` will allow parsing of fields that are entirely unknown. You can either set it to `true`, or you can set it to an object containing descriptions for the field types these unknown fields should be processed as. If a field is not specified, it will be processed as a literal field (`f_literal`). These fields will be available under ```entry.unexpected_fields[FIELD_NAME]``` and ```entry.unknown_fields[FIELD_NAME]``` respectively.

**Q:** I use variables in my biblatex files. Will your converter read them?

**A:** Yes, but in order for the converter to be able to create a string, the variables need to be defined. Undefined variables can also be handled by the biblatex importer/exporter, but when exporting to CSL, they just print out the variable name in an an HTML tag that is not supported by citeproc (and an error is thrown).

**Q:** I want to run the demo locally?

**A:** [http-server](https://www.npmjs.com/package/http-server) is handy. Do a gloabel install of  http-server with `npm install http-server -g` and run `http-server docs`.
