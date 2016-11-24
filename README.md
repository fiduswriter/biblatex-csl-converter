# biblatex-csl-converter
A set of JavaScript converters: biblatex => json, json => csl, and json => biblatex

Try demo [here](https://fiduswriter.github.io/biblatex-csl-converter/demo/).

## FAQ

**Q:** Why do you use a different json as itnernal format and not just the json format of CSL? Wouldn't that save you one conversion step?

**A:** Unfortunately, the CSL json cannot hold all the information we import from biblatex, so if we used the json of CSL internally, we would lose information that we may want to export in biblatex later on.

**Q:** Do you import all information from the imported bibtex/biblatex files?

**A:** We only keep the information found in any of the required or optional fields defined in the BibLatex documentation. Other fields are removed upon import.

**Q:** How do I see if there are errors when parsing the BiBTeX/BibLatex file?

**A:** There is an array of errors that were encountered while parsing the file that can be found at ```parser.errors``` after you get the ```parser.output```.

**Q:** I need access to the raw/non-processed contents of certain fields. What do I do?

**A:** The fields in their almost raw form can be found under ```entry.raw_fields[FIELD_NAME]```.

**Q:** What if I need to process fields that don't follow the biblatex definition?

**A:** You can initialize the parser with a config object like this: ```new BibLatexParser(inputString, {parseUnexpected: true, parseUnknown: {collaborator: 'l_name'}})```. The ```parseUnexpected``` setting will enable parsing of fields that are known, but shouldn't be in the bibliography entry due to its type. The ```parseUnknown``` will allow parsing of fields that are entirely unknown. You can either set it to `true`, or you can set it to an object containing descriptions for the field types these unknown fields should be processed as. If a field is not specified, it will be processed as a literal field (`f_literal`). These fields will be available under ```entry.unexpected_fields[FIELD_NAME]``` and ```entry.unknown_fields[FIELD_NAME]``` respectively.
