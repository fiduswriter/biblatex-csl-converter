# API Documentation

## Table of Contents

- [Core Parsers](#core-parsers)
  - [BibLatexParser](#biblatexparser)
  - [CSLParser](#cslparser)
  - [RISParser](#risparser)
  - [ENWParser](#enwparser)
  - [EndNoteParser](#endnoteparser)
  - [CitaviParser](#citaviparser)
  - [NBIBParser](#nbibparser)
- [Core Exporters](#core-exporters)
  - [BibLatexExporter](#biblatexexporter)
  - [CSLExporter](#cslexporter)
- [Document Citation Parsers](#document-citation-parsers)
  - [DocxCitationsParser](#docxcitationsparser)
  - [OdtCitationsParser](#odtcitationsparser)
- [Internationalization](#internationalization)
- [Utilities](#utilities)

---

## Core Parsers

### BibLatexParser

Parses BibLaTeX/BibTeX bibliography files into the internal JSON format.

#### Constructor

```typescript
new BibLatexParser(input: string, options?: BibLatexParserOptions)
```

**Options:**

- `processUnexpected` (boolean): Handle fields that are known but not expected for the entry type
- `processUnknown` (boolean | Record<string, string>): Handle unknown field names
  - `true`: Process all unknown fields
  - Object mapping: Map unknown field names to known field types
- `includeLocation` (boolean): Add source location information to entries
- `includeRawText` (boolean): Include raw source text for each entry

#### Methods

```typescript
parse(): BiblatexParseResult
```

Synchronously parse the input. Returns:
- `entries`: BibDB (Record<number, EntryObject>)
- `errors`: ErrorObject[]
- `warnings`: ErrorObject[]

```typescript
parseAsync(): Promise<BiblatexParseResult>
```

Asynchronously parse the input (recommended for large files).

#### Example

```typescript
import { BibLatexParser } from 'biblatex-csl-converter'

const parser = new BibLatexParser(biblatexString, {
  processUnexpected: true,
  processUnknown: { collaborator: 'l_name' }
})

const { entries, errors, warnings } = parser.parse()
// or: const result = await parser.parseAsync()
```

---

### CSLParser

Parses CSL JSON into the internal JSON format.

#### Constructor

```typescript
new CSLParser(input: Record<string, CSLEntry>)
```

#### Methods

```typescript
parse(): BibDB
```

Returns a BibDB object (Record<number, EntryObject>).

#### Example

```typescript
import { CSLParser } from 'biblatex-csl-converter'

const cslData = {
  "item1": { type: "article-journal", title: "Example", ... },
  "item2": { type: "book", title: "Another", ... }
}

const parser = new CSLParser(cslData)
const bibDB = parser.parse()
```

---

### RISParser

Parses RIS format bibliography files.

#### Constructor

```typescript
new RISParser(input: string)
```

#### Methods

```typescript
parse(): BibDB
```

#### Example

```typescript
import { RISParser } from 'biblatex-csl-converter'

const parser = new RISParser(risString)
const bibDB = parser.parse()
```

---

### ENWParser

Parses EndNote Web (.enw) format files.

#### Constructor

```typescript
new ENWParser(input: string)
```

#### Methods

```typescript
parse(): BibDB
```

---

### EndNoteParser

Parses EndNote XML records (plain JS objects converted from XML DOM).

#### Constructor

```typescript
new EndNoteParser(records: EndNoteRecord[])
```

#### Methods

```typescript
parse(): { entries: BibDB, errors: ErrorObject[], warnings: ErrorObject[] }
```

---

### CitaviParser

Parses Citavi JSON export format.

#### Constructor

```typescript
new CitaviParser(input: CitaviInput)
```

`CitaviInput` can be:
- `CitaviReference[]` (array of references)
- `{ References: CitaviReference[] }` (project export)
- `{ Entries: Array<{ Reference: CitaviReference }> }` (WordPlaceholder)

#### Methods

```typescript
parse(): BibDB
```

---

### NBIBParser

Parses NBIB (MEDLINE/PubMed) format files.

#### Constructor

```typescript
new NBIBParser(input: string)
```

#### Methods

```typescript
parse(): BibDB
```

---

## Core Exporters

### BibLatexExporter

Exports the internal JSON format to BibLaTeX.

#### Constructor

```typescript
new BibLatexExporter(
  bibDB: BibDB,
  pks?: number[],
  options?: BibLatexExportOptions
)
```

**Parameters:**

- `bibDB`: The bibliography database (Record<number, EntryObject>)
- `pks`: Optional array of entry IDs to export (exports all if omitted)
- `options`:
  - `traditionalNames` (boolean): Use traditional name formatting

#### Methods

```typescript
parse(): string
```

Returns the BibLaTeX string.

#### Example

```typescript
import { BibLatexExporter } from 'biblatex-csl-converter'

const exporter = new BibLatexExporter(bibDB, [1, 2, 3], {
  traditionalNames: false
})

const biblatexString = exporter.parse()
```

---

### CSLExporter

Exports the internal JSON format to CSL JSON.

#### Constructor

```typescript
new CSLExporter(
  bibDB: BibDB,
  pks?: number[],
  options?: CSLExportOptions
)
```

**Options:**

- `escapeText` (boolean): Escape special characters in text fields
- `useEntryKeys` (boolean): Use entry keys as CSL IDs

#### Methods

```typescript
parse(): CSLOutput
```

Returns an array of CSL entries.

#### Example

```typescript
import { CSLExporter } from 'biblatex-csl-converter'

const exporter = new CSLExporter(bibDB, undefined, {
  escapeText: true,
  useEntryKeys: false
})

const cslData = exporter.parse()
```

---

## Document Citation Parsers

### DocxCitationsParser

Extracts bibliographic citations from DOCX document XML. Supports Zotero, Mendeley, EndNote, Citavi, Word native, and JabRef citations.

#### Constructor

```typescript
new DocxCitationsParser(
  documentXml: string,
  options?: DocxCitationsParserOptions
)
```

**Options:**

- `sourcesXml` (string): Contents of `customXml/item1.xml` for Word native/JabRef citations

#### Instance Methods

```typescript
parse(): DocxCitationsParseResult
```

Returns:
- `entries`: BibDB
- `errors`: ErrorObject[]
- `warnings`: ErrorObject[]

#### Static Methods for Element-Level Processing

These methods allow checking and extracting citations from individual document elements without parsing the entire document.

##### `DocxCitationsParser.sdtCitation()`

Check or extract citation data from a Structured Document Tag (SDT) block.

```typescript
static sdtCitation(
  sdtXml: string,
  retrieve?: boolean,
  entries?: EntryObject[],
  errors?: ErrorObject[],
  warnings?: ErrorObject[],
  seenKeys?: Set<string>
): CitationResult
```

**Parameters:**

- `sdtXml`: XML string of a `<w:sdt>...</w:sdt>` block
- `retrieve`: If `true` (default), extract and return full citation data; if `false`, only check presence
- `entries`: Optional array to accumulate entries across multiple calls (default: `[]`)
- `errors`: Optional array to accumulate errors across multiple calls (default: `[]`)
- `warnings`: Optional array to accumulate warnings across multiple calls (default: `[]`)
- `seenKeys`: Optional set to track processed citation keys for deduplication (default: `new Set()`)

**Note:** The optional arrays/set parameters are typically used when processing multiple elements and need to maintain state across calls. For single-element checks or when using the full document parser, these can be omitted.

**Returns:** `CitationResult`
- `isCitation` (boolean): Whether the element contains citation data
- `format` (string?): Detected format (e.g., "mendeley_v3", "citavi")
- `entries` (BibDB?): Extracted entries (only if `retrieve=true`)
- `errors` (ErrorObject[]?): Parsing errors (only if `retrieve=true`)
- `warnings` (ErrorObject[]?): Parsing warnings (only if `retrieve=true`)

**Supported formats:**
- `mendeley_v3`: Mendeley Cite v3 (current)
- `citavi`: Citavi citations

**Examples:**

```typescript
// Example 1: Quick check without extraction
const sdtXml = `<w:sdt>
  <w:sdtPr>
    <w:tag w:val="MENDELEY_CITATION_v3_eyJjaXRhdGlvbklE..."/>
  </w:sdtPr>
</w:sdt>`

const check = DocxCitationsParser.sdtCitation(sdtXml, false)
if (check.isCitation) {
  console.log(`Found ${check.format} citation`)
  // No entries extracted yet - fast check
}

// Example 2: Extract full citation data
const result = DocxCitationsParser.sdtCitation(sdtXml, true)
if (result.isCitation && result.entries) {
  console.log(`Extracted ${Object.keys(result.entries).length} entries`)
  for (const entry of Object.values(result.entries)) {
    console.log(`${entry.entry_key}: ${entry.bib_type}`)
  }
}

// Example 3: Citavi with project JSON
const citaviXml = `<w:sdt>
  <w:sdtPr>
    <w:tag w:val="CitaviPlaceholder#abc123"/>
  </w:sdtPr>
</w:sdt>`

// Example: Check Citavi SDT citation
const citaviResult = DocxCitationsParser.sdtCitation(
  citaviXml,
  true
)
```

##### `DocxCitationsParser.sdtBibliography()`

Check or extract bibliography rendering region from an SDT block.

```typescript
static sdtBibliography(
  sdtXml: string,
  retrieve?: boolean
): BibliographyResult
```

**Note:** Bibliography regions contain no importable source data; `retrieve=true` returns empty entries.

##### `DocxCitationsParser.fieldCitation()`

Check or extract citation data from a field instruction.

```typescript
static fieldCitation(
  instrText: string,
  retrieve?: boolean,
  fldData?: string,
  options?: DocxCitationsParserOptions,
  entries?: EntryObject[],
  errors?: ErrorObject[],
  warnings?: ErrorObject[],
  seenKeys?: Set<string>,
  extractWordNative?: boolean
): CitationResult
```

**Parameters:**

- `instrText`: Concatenated instruction text from `<w:instrText>` elements between field begin and separate
- `retrieve`: If `true` (default), extract full citation data; if `false`, only check presence
- `fldData`: Optional base64-encoded field data (used by EndNote)
- `options`: Parser options
  - `sourcesXml`: Contents of `customXml/item1.xml` (required for Word native/JabRef citations)
- `entries`: Optional array to accumulate entries across multiple calls (default: `[]`)
- `errors`: Optional array to accumulate errors across multiple calls (default: `[]`)
- `warnings`: Optional array to accumulate warnings across multiple calls (default: `[]`)
- `seenKeys`: Optional set to track processed citation keys for deduplication (default: `new Set()`)
- `extractWordNative`: Whether to immediately extract Word-native citations (default: `true`). Set to `false` when using the full document parser, which defers extraction to `parseSourcesXml()`

**Note:** The optional arrays/set parameters are useful for batch processing. The `extractWordNative` parameter controls whether Word-native citations are extracted immediately or deferred for later batch processing.

**Supported formats:**
- `zotero`: Zotero field codes (`ADDIN ZOTERO_ITEM CSL_CITATION`)
- `mendeley_legacy`: Mendeley Desktop legacy (`ADDIN CSL_CITATION`)
- `endnote`: EndNote field codes (`ADDIN EN.CITE`)
- `citavi`: Citavi field codes (older versions, `ADDIN CitaviPlaceholder`)
- `word_native`: Word native/JabRef (`CITATION key`)

**Examples:**

```typescript
// Example 1: Quick format detection
const instrText = 'ADDIN ZOTERO_ITEM CSL_CITATION {...}'
const check = DocxCitationsParser.fieldCitation(instrText, false)
console.log(check.format) // "zotero"

// Example 2: Extract Zotero citation
const zoteroInstr = `ADDIN ZOTERO_ITEM CSL_CITATION {
  "citationID": "abc123",
  "properties": {},
  "citationItems": [{
    "id": 1,
    "itemData": {
      "id": 1,
      "type": "article-journal",
      "title": "Example Article",
      "author": [{"family": "Smith", "given": "John"}],
      "issued": {"date-parts": [[2020]]}
    }
  }]
}`

const result = DocxCitationsParser.fieldCitation(zoteroInstr, true)
if (result.entries) {
  const entry = Object.values(result.entries)[0]
  console.log(entry.fields.title) // [{type: "text", text: "Example Article"}]
}

// Example 3: EndNote with field data
const endnoteInstr = 'ADDIN EN.CITE'
const fldData = 'PD94bWw...' // Base64-encoded EndNote XML
const endnoteResult = DocxCitationsParser.fieldCitation(
  endnoteInstr,
  true,
  fldData
)

// Example 4: Word native citation
const wordInstr = 'CITATION Smith2020 \\l 1033'
const sourcesXml = await readFile('customXml/item1.xml', 'utf-8')
const wordResult = DocxCitationsParser.fieldCitation(
  wordInstr,
  true,
  undefined,
  { sourcesXml }
)
```

##### `DocxCitationsParser.fieldBibliography()`

Check or extract bibliography rendering region from a field instruction.

```typescript
static fieldBibliography(
  instrText: string,
  retrieve?: boolean
): BibliographyResult
```

#### Full Document Example

```typescript
import { DocxCitationsParser } from 'biblatex-csl-converter'

// Full document parsing with all options
const parser = new DocxCitationsParser(documentXml, {
  sourcesXml   // from customXml/item1.xml
})

const { entries, errors, warnings } = parser.parse()
```

---

### OdtCitationsParser

Extracts bibliographic citations from ODT document XML (content.xml). Supports Zotero, Mendeley, JabRef, LibreOffice native, and EndNote citations.

#### Constructor

```typescript
new OdtCitationsParser(contentXml: string)
```

#### Instance Methods

```typescript
parse(): OdtCitationsParseResult
```

Returns:
- `entries`: BibDB
- `errors`: ErrorObject[]
- `warnings`: ErrorObject[]

#### Static Methods for Element-Level Processing

##### `OdtCitationsParser.referenceMarkCitation()`

Check or extract citation data from a reference mark name.

```typescript
static referenceMarkCitation(
  markName: string,
  retrieve?: boolean,
  entries?: EntryObject[],
  errors?: ErrorObject[],
  warnings?: ErrorObject[],
  seenKeys?: Set<string>
): CitationResult
```

**Parameters:**

- `markName`: The `text:name` attribute value from `<text:reference-mark-start>`
- `retrieve`: If `true` (default), extract full citation data; if `false`, only check presence
- `entries`: Optional array to accumulate entries across multiple calls (default: `[]`)
- `errors`: Optional array to accumulate errors across multiple calls (default: `[]`)
- `warnings`: Optional array to accumulate warnings across multiple calls (default: `[]`)
- `seenKeys`: Optional set to track processed citation keys for deduplication (default: `new Set()`)

**Note:** The optional arrays/set parameters allow accumulating results when processing multiple reference marks. For single-element processing, these can be omitted.

**Supported formats:**
- `zotero`: Zotero reference marks (`ZOTERO_ITEM CSL_CITATION {...}`)
- `mendeley_legacy`: Mendeley Desktop legacy (`CSL_CITATION {...}`)
- `jabref`: JabRef reference marks (`JABREF_key CID_n id`)

**Examples:**

```typescript
// Example 1: Quick check
const markName = 'ZOTERO_ITEM CSL_CITATION {"citationID":"abc"}'
const check = OdtCitationsParser.referenceMarkCitation(markName, false)
if (check.isCitation) {
  console.log(`Found ${check.format} citation`) // "zotero"
}

// Example 2: Extract Zotero citation
const zoteroMark = `ZOTERO_ITEM CSL_CITATION {
  "citationID": "test",
  "properties": {},
  "citationItems": [{
    "id": 1,
    "itemData": {
      "id": 1,
      "type": "book",
      "title": "Example Book",
      "author": [{"family": "Doe", "given": "Jane"}],
      "issued": {"date-parts": [[2021]]}
    }
  }]
}`

const result = OdtCitationsParser.referenceMarkCitation(zoteroMark, true)
if (result.entries) {
  const entry = Object.values(result.entries)[0]
  console.log(entry.bib_type) // "book"
  console.log(entry.fields.author) // [{family: [...], given: [...]}]
}

// Example 3: JabRef stub entry
const jabrefMark = 'JABREF_Smith2020 CID_1 randomId'
const jabrefResult = OdtCitationsParser.referenceMarkCitation(jabrefMark, true)
// Creates a stub entry with key "Smith2020" and type "misc"
```

##### `OdtCitationsParser.referenceMarkBibliography()`

Check or extract bibliography rendering region from a reference mark name.

```typescript
static referenceMarkBibliography(
  markName: string
): BibliographyResult
```

**Note:** Bibliography marks are rendering regions with no importable data. This method does not accept the optional state parameters as it never extracts entries.

##### `OdtCitationsParser.sectionBibliography()`

Check or extract bibliography rendering region from a text:section element.

```typescript
static sectionBibliography(
  sectionName: string
): BibliographyResult
```

**Parameters:**

- `sectionName`: The `text:name` attribute value from a `<text:section>` element

**Returns:** `BibliographyResult` indicating whether it's a bibliography and the format

**Supported Formats:**

- **JabRef**: Sections with `text:name="JR_bib"` or `"JR_BIB"` (case-insensitive)

**Note:** Section bibliographies are rendering regions with no importable source data.

**Examples:**

```typescript
// JabRef bibliography section (lowercase)
const jabrefLower = OdtCitationsParser.sectionBibliography('JR_bib')
console.log(jabrefLower.isBibliography) // true
console.log(jabrefLower.format) // "jabref"

// JabRef bibliography section (uppercase)
const jabrefUpper = OdtCitationsParser.sectionBibliography('JR_BIB')
console.log(jabrefUpper.isBibliography) // true
console.log(jabrefUpper.format) // "jabref"

// Non-bibliography section
const other = OdtCitationsParser.sectionBibliography('SOME_OTHER_SECTION')
console.log(other.isBibliography) // false
```

##### `OdtCitationsParser.bibliographyMarkCitation()`

Check or extract citation data from a LibreOffice native bibliography-mark element.

```typescript
static bibliographyMarkCitation(
  bibMarkXml: string,
  retrieve?: boolean
): CitationResult
```

**Parameters:**

- `bibMarkXml`: XML string of a `<text:bibliography-mark>` element
- `retrieve`: If `true` (default), extract full citation data; if `false`, only check presence

**Note:** This handles LibreOffice's native bibliographic citations. This method does not accept the optional state parameters as it uses its own internal parser.
**Format:** `libreoffice_native`

##### `OdtCitationsParser.endNotePlaceholder()`

Check or extract citation data from EndNote placeholder text.

```typescript
static endNotePlaceholder(
  text: string,
  retrieve?: boolean
): CitationResult
```

**Parameters:**

- `text`: Plain text or XML fragment containing EndNote placeholders like `{Author, Year #RecNum}`
- `retrieve`: If `true` (default), extract full citation data; if `false`, only check presence

**Format:** `endnote`

**Placeholder Pattern:** `{Author, Year #RecordNumber}`
- Author names can include commas (e.g., "Bronk Ramsey")
- Multiple citations separated by semicolons: `{Smith, 2020 #291; Jones, 2019 #47}`
- Creates stub entries with key format `ENnnn` where nnn is the record number

**Examples:**

```typescript
// Example 1: Quick check
const text = 'According to {Smith, 2020 #291}, the research...'
const check = OdtCitationsParser.endNotePlaceholder(text, false)
console.log(check.isCitation) // true
console.log(check.format) // "endnote"

// Example 2: Extract single placeholder
const result = OdtCitationsParser.endNotePlaceholder(text, true)
if (result.entries) {
  const entry = Object.values(result.entries)[0]
  console.log(entry.entry_key) // "EN291"
  console.log(entry.bib_type) // "misc"
  console.log(entry.fields.author) // [{family: [{type: "text", text: "Smith"}]}]
  console.log(entry.fields.date) // "2020"
}

// Example 3: Multiple placeholders
const multiText = '{Smith, 2020 #291; Jones, 2019 #47; Doe, 2021 #105}'
const multiResult = OdtCitationsParser.endNotePlaceholder(multiText, true)
console.log(Object.keys(multiResult.entries!).length) // 3
console.log(Object.keys(multiResult.entries!)) // ["1", "2", "3"]

// Example 4: Author with comma
const complexText = '{Bronk Ramsey, 2009 #19}'
const complexResult = OdtCitationsParser.endNotePlaceholder(complexText, true)
// Creates entry with literal name "Bronk Ramsey"
```

#### Full Document Example

```typescript
import { OdtCitationsParser } from 'biblatex-csl-converter'

const parser = new OdtCitationsParser(contentXml)
const { entries, errors, warnings } = parser.parse()
```

---

## Internationalization

The library includes translations for field names, entry types, and option values in seven languages: `bg`, `de`, `en`, `es`, `fr`, `it`, `pt-BR`.

### Functions

#### `getLocale()`

```typescript
getLocale(lang: string): Locale
```

Get a locale object by IETF language tag. Falls back to English if the language is not found.

#### `getFieldTitle()`

```typescript
getFieldTitle(locale: Locale, typeKey: string, fieldKey: string): string
```

Get the human-readable title for a field. Checks per-type overrides first (e.g., "Director(s)" for `author` in `video` entries), then falls back to the generic field title.

#### `getTypeTitle()`

```typescript
getTypeTitle(locale: Locale, typeKey: string): string
```

Get the human-readable title for an entry type.

#### `getFieldHelp()`

```typescript
getFieldHelp(locale: Locale, fieldKey: string): string | undefined
```

Get optional help text for a field (e.g., date format hints).

#### `getLangidTitle()`

```typescript
getLangidTitle(locale: Locale, langidKey: string): string
```

Get the human-readable title for a `langid` field value.

#### `getOtherOptionTitle()`

```typescript
getOtherOptionTitle(locale: Locale, optionKey: string): string
```

Get the human-readable title for option values (editortype, pagination, pubstate, type sub-fields).

### Example

```typescript
import { getLocale, getFieldTitle, getTypeTitle } from 'biblatex-csl-converter'

const locale = getLocale('de')
const authorLabel = getFieldTitle(locale, 'article-journal', 'author')
// => "Autor(en)"

const typeLabel = getTypeTitle(locale, 'article-journal')
// => "Zeitschriftenartikel"
```

### Available Locales

Access all locales via the `locales` export:

```typescript
import { locales } from 'biblatex-csl-converter'

for (const [lang, locale] of Object.entries(locales)) {
  console.log(lang, locale.typeTitles['article-journal'])
}
```

---

## Utilities

### `sniffFormat()`

Auto-detect the format of a bibliography file.

```typescript
sniffFormat(input: string): ImportFormat
```

Returns one of: `"biblatex"`, `"csl"`, `"ris"`, `"enw"`, `"nbib"`, or `null`.

### `edtfParse()`

Parse EDTF (Extended Date/Time Format) strings.

```typescript
edtfParse(dateString: string): EDTFParseResult
```

### `unescapeCSL()`

Unescape CSL text (reverse HTML entity encoding and handle special CSL markup).

```typescript
unescapeCSL(text: string): string
```

---

## Type Definitions

### Core Types

#### `EntryObject`

```typescript
interface EntryObject {
  entry_key: string
  bib_type: string
  fields: Record<string, unknown>
  incomplete?: boolean
  unexpected_fields?: Record<string, unknown>
  unknown_fields?: Record<string, unknown>
}
```

#### `BibDB`

```typescript
type BibDB = Record<number, EntryObject>
```

### Result Types

#### `CitationResult`

```typescript
interface CitationResult {
  isCitation: boolean
  format?: string
  entries?: BibDB
  errors?: ErrorObject[]
  warnings?: ErrorObject[]
}
```

#### `BibliographyResult`

```typescript
interface BibliographyResult {
  isBibliography: boolean
  format?: string
  entries?: BibDB
  errors?: ErrorObject[]
  warnings?: ErrorObject[]
}
```

#### `ErrorObject`

```typescript
interface ErrorObject {
  type: string
  field?: string
  value?: unknown
  entry?: string
}
```

---

## Best Practices

### Error Handling

Always check the `errors` and `warnings` arrays after parsing:

```typescript
const { entries, errors, warnings } = parser.parse()

if (errors.length > 0) {
  console.error('Parse errors:', errors)
}

if (warnings.length > 0) {
  console.warn('Parse warnings:', warnings)
}
```

### Large Files

For large BibLaTeX files, use async parsing:

```typescript
const parser = new BibLatexParser(largeFile)
const result = await parser.parseAsync()
```

### Element-Level Citation Processing

When processing documents incrementally or with streaming, use the optional parameters to accumulate state:

```typescript
async function* processDocxStream(elementStream) {
  // Maintain state across multiple calls
  const entries: EntryObject[] = []
  const errors: ErrorObject[] = []
  const warnings: ErrorObject[] = []
  const seenKeys = new Set<string>()
  
  for await (const element of elementStream) {
    const check = DocxCitationsParser.sdtCitation(element.xml, false)
    
    if (check.isCitation) {
      // Pass state arrays to accumulate results and deduplicate
      DocxCitationsParser.sdtCitation(
        element.xml,
        true,
        entries,
        errors,
        warnings,
        seenKeys
      )
    }
  }
  
  // Return accumulated results
  return { entries, errors, warnings }
}
```

### Deduplication Across Static Calls

When processing multiple citations, pass shared arrays and a `seenKeys` set to automatically deduplicate:

```typescript
// Shared state for accumulating results
const entries: EntryObject[] = []
const errors: ErrorObject[] = []
const warnings: ErrorObject[] = []
const seenKeys = new Set<string>()

// Process multiple elements
for (const element of elements) {
  DocxCitationsParser.fieldCitation(
    element.instrText,
    true,
    element.fldData,
    { sourcesXml },
    entries,      // Accumulate entries
    errors,       // Accumulate errors
    warnings,     // Accumulate warnings
    seenKeys,     // Track seen keys for deduplication
    false         // Don't extract Word-native yet
  )
}

// Convert accumulated entries to BibDB
const bibDB: Record<number, EntryObject> = {}
entries.forEach((entry, i) => {
  bibDB[i + 1] = entry
})

console.log(`Extracted ${entries.length} unique entries`)
```

---

## Migration Guide

### From Previous API (v2.x → v3.x)

The document citation static methods have been unified:

**Before:**

```typescript
// Separate check and extract methods
const check = DocxCitationsParser.isSdtCitation(xml)
if (check.isCitation) {
  const data = DocxCitationsParser.extractSdtCitation(xml, options)
}
```

**After:**

```typescript
// Single method with retrieve parameter
const result = DocxCitationsParser.sdtCitation(xml, true, options)
if (result.isCitation) {
  // result.entries available
}

// Or check only:
const check = DocxCitationsParser.sdtCitation(xml, false)
```

**Type renames:**

- `CitationCheckResult` → `CitationResult`
- `BibliographyCheckResult` → `BibliographyResult`
- `CitationExtractResult` → removed (merged into `CitationResult`)

The static methods now call internal extraction logic directly instead of creating temporary XML documents, improving performance.