# biblatex-csl-converter
A set of JavaScript converters: biblatex => json, json => csl, and json => biblatex

Try demo [here](https://fiduswriter.github.io/biblatex-csl-converter/demo/).

## FAQ

**Q:** Why do you use a different json as internal format and not just the json format of CSL? Wouldn't that save you one conversion step?

**A:** Unfortunately, the CSL json cannot hold all the information we import from biblatex, so if we used the json of CSL internally, we would lose information that we may want to export in biblatex later on.

**Q:** Do you import all information from the imported bibtex/biblatex files?

**A:** We only keep the information found in any of the required or optional fields defined in the BibLatex documentation. Other fields are removed upon import.
