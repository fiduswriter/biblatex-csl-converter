
## Extracting Citations from ODT and DOCX Files

Word processor documents that use citation managers embed bibliographic data as structured fields or reference marks directly in the document XML. This section documents the formats used by each major citation manager, which is useful context when building tools that extract or convert such citations.

This document covers two aspects of citation data:
1. **Bibliographic data**: The full metadata for each reference (author, title, year, etc.)
2. **Citation item metadata**: Per-citation modifiers such as page numbers (locators), prefixes, suffixes, and author suppression flags

**Observe:** This is work in progress and we do not have access to many of these formats, so it is based on what users are saying about these formats in forums. Some of it may therefore be wrong.

We hope that this document will also be useful to other projects with similar goals. Please help to improve it by submitting corrections or adding missing information.

### Background: DOCX field codes

DOCX files are ZIP archives. Citations are stored inside `word/document.xml` using Word field codes. A field consists of:
- `<w:fldChar w:fldCharType="begin"/>` — opens the field
- One or more `<w:instrText>` elements holding the field instruction
- `<w:fldChar w:fldCharType="separate"/>` — separates instruction from rendered text
- `<w:t>` elements containing the rendered display text
- `<w:fldChar w:fldCharType="end"/>` — closes the field

**Important for parsers:** To reconstruct the full field instruction, all `<w:instrText>` elements between the `begin` and `separate` markers must be concatenated — regardless of run boundaries or intervening `<w:rPr>` formatting. Word splits field instruction text into multiple runs whenever the character formatting changes. For example, a special character like `∼` (rendered in Cambria Math font) in a title embedded in an `ADDIN EN.CITE` payload will cause the `instrText` to be split across three runs:

```xml
<w:r><w:instrText>...&lt;title&gt;Article title (</w:instrText></w:r>
<w:r><w:rPr><w:rFonts w:ascii="Cambria Math"/></w:rPr><w:instrText>∼</w:instrText></w:r>
<w:r><w:instrText>660 BC)&lt;/title&gt;...</w:instrText></w:r>
```

A parser must collect all `<w:instrText>` content within a field (from `begin` to `separate`) before attempting to parse it.

### Background: ODT reference marks

ODT files are also ZIP archives. The document content is in `content.xml`. Citations are stored as named **reference marks** spanning a range:

```xml
<text:reference-mark-start text:name="..."/>
displayed citation text
<text:reference-mark-end text:name="..."/>
```

The `text:name` attribute carries the citation metadata. Both the start and end tags must use the exact same name. Note that ODT reference marks are not preserved when converting an ODT to DOCX through LibreOffice.

---

### Native bibliography support

Both DOCX and ODT have built-in bibliography features that do not require any citation manager plugin. JabRef's Word integration uses the DOCX native format. These formats may also appear in documents that were never touched by a citation manager.

**Citation item metadata**: Word's native `CITATION` field has limited support for citation-specific metadata. The field instruction may include switches:
- **`\l`**: Locale identifier (e.g., `\l 1033` for en-US)
- **`\s`**: Suppress author names (exact usage unknown)
- **`\y`**: Suppress year (exact usage unknown)
- **`\n`**: Suppress title (exact usage unknown)

Locators (page numbers), prefixes, and suffixes are **not supported** in Word's native citation system. These must be added manually to the document text outside the citation field.

Research is needed to confirm the exact behavior of the `\s`, `\y`, and `\n` switches and whether other switches exist for citation customization.

#### DOCX native bibliography

Word's built-in bibliography uses the `CITATION` field for inline citations:

```xml
<w:instrText xml:space="preserve"> CITATION Smith2020 \l 1033 </w:instrText>
```

The citation key (`Smith2020`) corresponds to the `<b:Tag>` in the source data. The `\l 1033` switch specifies the locale (1033 = en-US).

The bibliography list uses a `BIBLIOGRAPHY` field:

```xml
<w:instrText xml:space="preserve"> BIBLIOGRAPHY </w:instrText>
```

All source data is stored in `customXml/item1.xml` inside the DOCX ZIP, using the MS Office Bibliography XML schema (namespace `http://schemas.microsoft.com/office/word/2004/10/bibliography`):

```xml
<b:Sources xmlns:b="http://schemas.microsoft.com/office/word/2004/10/bibliography">
  <b:Source>
    <b:Tag>Smith2020</b:Tag>
    <b:SourceType>Book</b:SourceType>
    <b:Author>
      <b:Author>
        <b:NameList>
          <b:Person><b:Last>Smith</b:Last><b:First>John</b:First></b:Person>
        </b:NameList>
      </b:Author>
    </b:Author>
    <b:Title>Introduction to Testing</b:Title>
    <b:Year>2020</b:Year>
    <b:City>New York</b:City>
    <b:Publisher>Test Press</b:Publisher>
  </b:Source>
</b:Sources>
```

#### ODT native bibliography

LibreOffice Writer's built-in bibliography uses `<text:bibliography-mark>` for inline citations. Unlike citation manager reference marks, all bibliographic data is stored directly as attributes on the element — the ODT is fully self-contained with no external data file.

**Citation item metadata**: LibreOffice's native bibliography system does **not support** locators (page numbers), prefixes, suffixes, or author suppression at the citation level. The `<text:bibliography-mark>` element only stores bibliographic metadata. Any page numbers or other citation-specific text must be added manually to the surrounding document text.

```xml
<text:bibliography-mark
    text:bibliography-type="article"
    text:identifier="Jones2019"
    text:author="Jones, Alice"
    text:title="Research Methods"
    text:journal="Science Journal"
    text:year="2019"
    text:volume="12"
    text:number="3"
    text:pages="45-67">Jones2019</text:bibliography-mark>
```

The element's text content is the displayed citation label. The `text:bibliography-type` attribute is required; all others are optional. Supported types (from the ODF 1.2 spec): `article`, `book`, `booklet`, `conference`, `inbook`, `incollection`, `inproceedings`, `journal`, `manual`, `mastersthesis`, `misc`, `phdthesis`, `proceedings`, `techreport`, `unpublished`, `www`, `email`, `custom1`–`custom5`.

The bibliography section uses a `<text:bibliography>` element containing a `<text:bibliography-source>` (formatting templates) and a `<text:index-body>` (rendered output):

```xml
<text:bibliography text:name="Bibliography1">
  <text:bibliography-source>
    <text:bibliography-entry-template
        text:bibliography-type="article"
        text:style-name="Bibliography 1">
      <text:index-entry-bibliography text:bibliography-data-field="author"/>
      <text:index-entry-span>: </text:index-entry-span>
      <text:index-entry-bibliography text:bibliography-data-field="title"/>
      <text:index-entry-span>. </text:index-entry-span>
      <text:index-entry-bibliography text:bibliography-data-field="journal"/>
      <text:index-entry-span>, </text:index-entry-span>
      <text:index-entry-bibliography text:bibliography-data-field="year"/>
    </text:bibliography-entry-template>
  </text:bibliography-source>
  <text:index-body>
    <text:index-title>
      <text:p text:style-name="Bibliography Heading">Bibliography</text:p>
    </text:index-title>
    <text:p text:style-name="Bibliography 1">Jones, Alice: Research Methods. Science Journal, 2019</text:p>
  </text:index-body>
</text:bibliography>
```

The `text:index-body` is regenerated by LibreOffice when the bibliography is updated; the source of truth is the attributes on each `text:bibliography-mark` element in the document body.

---

### Zotero

Zotero uses CSL-JSON format for storing citation data. Each citation contains a `citationItems` array where each item can include the following **citation-specific metadata** in addition to the bibliographic `itemData`:

- **`locator`**: Page number or other pinpoint location (e.g., `"123"`, `"45-67"`)
- **`label`**: Type of locator (e.g., `"page"`, `"chapter"`, `"section"`, `"figure"`). Valid labels are defined in the CSL specification (see Appendix II - Locators).
- **`prefix`**: Text to appear before the citation (e.g., `"see "`, `"cf. "`)
- **`suffix`**: Text to appear after the citation (e.g., `" (arguing that X is Y)"`)
- **`suppress-author`**: Boolean; if `true`, author names are omitted from the citation output
- **`author-only`**: Boolean; if `true`, only the author name is rendered (used in some demanding styles)

These fields are part of the CSL cite-item specification and appear alongside `id` and `itemData` in each object within the `citationItems` array.

**Example with citation metadata:**

```json
{
  "citationID": "abc123",
  "properties": {"noteIndex": 0},
  "citationItems": [{
    "id": "ITEM-1",
    "locator": "123",
    "label": "page",
    "prefix": "See ",
    "suffix": " for more details",
    "suppress-author": false,
    "itemData": {
      "id": "ITEM-1",
      "type": "book",
      "title": "Example Book",
      "author": [{"family": "Smith", "given": "John"}],
      "issued": {"date-parts": [[2020]]}
    }
  }]
}
```

#### Zotero (DOCX)

Inline citations use a field instruction beginning with `ADDIN ZOTERO_ITEM CSL_CITATION` followed immediately (no space) by the CSL-JSON object. The `w:fldChar begin` and `w:instrText` share a single `<w:r>` run, as do `w:fldChar end` and any immediately following text or the next field's `w:fldChar begin`. Field boundaries therefore do **not** align with paragraph boundaries — a field can end in a different paragraph from where it began, and multiple fields can start and end within the same paragraph.

The following is the complete body of a real Zotero DOCX with three citations in one paragraph and two more in a second paragraph, followed by the bibliography:

```xml
<w:body>
<w:p>
  <w:r>
    <w:t xml:space="preserve">Hers is an example file.</w:t>
  </w:r>
  <!-- citation field 1: begin+instrText in one run -->
  <w:r>
    <w:fldChar w:fldCharType="begin"/>
    <w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION{"citationID":"3knmy8ihjs2","schema":"https://raw.githubusercontent.com/citation-style-language/schema/master/schemas/input/csl-citation.json","properties":{"plainCitation":"[1], [2], [3]"},"citationItems":[{"id":"KKN4UIC2","itemData":{"id":"KKN4UIC2","type":"article-journal","language":"spanish","author":[{"family":"Pantoja","given":"Ary"}],"accessed":{"date-parts":[["2011",6,4]]},"issued":{"date-parts":[["2007",11,21]]},"container-title":"El Nuevo Diario","title":"CPC fuera de la ley","URL":"http://impreso.elnuevodiario.com.ni/2007/11/21/nacionales","custom":{"userID":0}},"uris":["http://zotero.org/users/8727/items/KKN4UIC2"]},{"id":"42QSNSR9","itemData":{"id":"42QSNSR9","type":"webpage","language":"english","author":[{"literal":"Organisation for Economic Co-operation and Development"}],"accessed":{"date-parts":[["2008",1,15]]},"issued":{"literal":"200X"},"title":"Nicaragua","URL":"http://www.oecd.org/dataoecd/38/34/1888464.gif","custom":{"userID":0}},"uris":["http://zotero.org/users/8727/items/42QSNSR9"]},{"id":"PFEHEXUN","itemData":{"id":"PFEHEXUN","type":"chapter","language":"english","author":[{"family":"Ortega Saavedra","given":"José Daniel"}],"editor":[{"family":"Marcus","given":"Bruce"}],"translator":[{"literal":"Intercontinental Press"}],"issued":{"date-parts":[["1979"]]},"container-title":"Sandinistas Speak","publisher":"Pathfinder Press","publisher-place":"New York","title":"Nothing Will Hold Back Our Struggle for Liberation","custom":{"userID":0}},"uris":["http://zotero.org/users/8727/items/PFEHEXUN"]}]} </w:instrText>
  </w:r>
  <w:r>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r>
    <w:t xml:space="preserve">[1], [2], [3]</w:t>
  </w:r>
  <w:r/>
  <w:r/>
</w:p>
<w:p>
  <!-- field 1 end + surrounding text + field 2 begin+instrText, all in the same paragraph -->
  <w:r>
    <w:fldChar w:fldCharType="end"/>
    <w:t xml:space="preserve">But let me try what happens if things are on the same line</w:t>
  </w:r>
  <!-- citation field 2 -->
  <w:r>
    <w:fldChar w:fldCharType="begin"/>
    <w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION{"citationID":"ovaj28idbqm","schema":"https://raw.githubusercontent.com/citation-style-language/schema/master/schemas/input/csl-citation.json","properties":{"plainCitation":"[1], [2]"},"citationItems":[{"id":"MF8IX2G2","itemData":{"id":"MF8IX2G2","type":"article-journal","language":"spanish","author":[{"family":"Rodríguez","given":"Heberto"}],"accessed":{"date-parts":[["2011",6,4]]},"issued":{"date-parts":[["2007",1,11]]},"container-title":"El Nuevo Diario","title":"Ya somos ALBA","URL":"http://archivo.elnuevodiario.com.ni/2007/01/11/nacionales/38486","custom":{"userID":0}},"uris":["http://zotero.org/users/8727/items/MF8IX2G2"]},{"id":"JDBRBTK4","itemData":{"id":"JDBRBTK4","type":"post-weblog","author":[{"family":"Hirst","given":"Joel D."}],"issued":{"date-parts":[["2010"]]},"title":"A Guide to ALBA","URL":"http://www.americasquarterly.org/hirst/article","custom":{"userID":0}},"uris":["http://zotero.org/users/8727/items/JDBRBTK4"]}]} </w:instrText>
  </w:r>
  <w:r>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r/>
  <w:r>
    <w:t xml:space="preserve">[4], [5]</w:t>
  </w:r>
  <!-- field 2 end + surrounding text + field 3 begin+instrText in the same run / paragraph -->
  <w:r>
    <w:fldChar w:fldCharType="end"/>
    <w:t xml:space="preserve">. Can I not cite here also</w:t>
  </w:r>
  <!-- citation field 3 -->
  <w:r>
    <w:fldChar w:fldCharType="begin"/>
    <w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION{"citationID":"nyuey7a8rq","schema":"https://raw.githubusercontent.com/citation-style-language/schema/master/schemas/input/csl-citation.json","properties":{"plainCitation":"[3]"},"citationItems":[{"id":"DIK88XBT","itemData":{"id":"DIK88XBT","type":"post-weblog","author":[{"family":"Capelán","given":"Jorge"}],"issued":{"date-parts":[["2010",5,30]]},"container-title":"Tortilla con Sal","title":"Nicaragua y el ALBA","URL":"http://tortillaconsal.com/tortilla/es/node/6078","custom":{"userID":0}},"uris":["http://zotero.org/users/8727/items/DIK88XBT"]}]} </w:instrText>
  </w:r>
  <w:r>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r/>
  <w:r>
    <w:t xml:space="preserve">[6]</w:t>
  </w:r>
  <w:r>
    <w:fldChar w:fldCharType="end"/>
  </w:r>
  <w:r>
    <w:t xml:space="preserve">? </w:t>
  </w:r>
</w:p>
<!-- bibliography in multiple paragraphs (Word + Zotero 5.0.96.3) -->
<w:p>
  <w:pPr>
    <w:pStyle w:val="Bibliography"/>
  </w:pPr>
  <w:r>
    <w:fldChar w:fldCharType="begin"/>
    <w:instrText xml:space="preserve"> ADDIN ZOTERO_BIBL CSL_BIBLIOGRAPHY </w:instrText>
  </w:r>
  <w:r>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r>
    <w:t xml:space="preserve"> [1]A. Pantoja, "CPC fuera de la ley," El Nuevo Diario, Nov. 2007, ...</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:pStyle w:val="Bibliography"/>
  </w:pPr>
  <w:r>
    <w:t xml:space="preserve"> [2]Organisation for Economic Co-operation and Development, "Nicaragua." ...</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:pStyle w:val="Bibliography"/>
  </w:pPr>
  <w:r>
    <w:t xml:space="preserve"> [3]J. D. Ortega Saavedra, "Nothing Will Hold Back Our Struggle for Liberation," ...</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:pStyle w:val="Bibliography"/>
  </w:pPr>
  <w:r>
    <w:t xml:space="preserve"> [4]H. Rodríguez, "Ya somos ALBA," El Nuevo Diario, Jan. 2007, ...</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:pStyle w:val="Bibliography"/>
  </w:pPr>
  <w:r>
    <w:t xml:space="preserve"> [5]J. D. Hirst, "A Guide to ALBA." ...</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr>
    <w:pStyle w:val="Bibliography"/>
  </w:pPr>
  <w:r>
    <w:t xml:space="preserve"> [6]J. Capelán, "Nicaragua y el ALBA," Tortilla con Sal. ...</w:t>
  </w:r>
</w:p>
<w:p>
  <w:pPr/>
  <w:r>
    <w:fldChar w:fldCharType="end"/>
  </w:r>
</w:p>
</w:body>
```

In ONLYOFFICE 9.3.0.140, the bibliography appears in a single paragraph instead, like this:

```xml
<!-- bibliography in single paragraph (ONLYOFFICE 9.3.0.140) -->
<w:p>
  <w:r/>
  <w:r>
    <w:fldChar w:fldCharType="begin"/>
    <w:instrText xml:space="preserve"> ADDIN ZOTERO_BIBL CSL_BIBLIOGRAPHY </w:instrText>
  </w:r>
  <w:r>
    <w:fldChar w:fldCharType="separate"/>
  </w:r>
  <w:r/>
  <w:r>
    <w:t xml:space="preserve"> [1]A. Pantoja, "CPC fuera de la ley," El Nuevo Diario, Nov. 2007, ...</w:t>
    <w:br/>
    <w:t xml:space="preserve"> [2]Organisation for Economic Co-operation and Development, "Nicaragua." ...</w:t>
    <w:br/>
    <w:t xml:space="preserve"> [3]J. D. Ortega Saavedra, "Nothing Will Hold Back Our Struggle for Liberation," ...</w:t>
    <w:br/>
    <w:t xml:space="preserve"> [4]H. Rodríguez, "Ya somos ALBA," El Nuevo Diario, Jan. 2007, ...</w:t>
    <w:br/>
    <w:t xml:space="preserve"> [5]J. D. Hirst, "A Guide to ALBA." ...</w:t>
    <w:br/>
    <w:t xml:space="preserve"> [6]J. Capelán, "Nicaragua y el ALBA," Tortilla con Sal. ...</w:t>
    <w:br/>
  </w:r>
  <w:r>
    <w:fldChar w:fldCharType="end"/>
  </w:r>
</w:p>
```

Indentation at the beginning of the line is handled throuhg the bibliography paragraph style in Word, whereas in ONLYOFFICE, it is handled by adding spaces.

Key observations from the real-world DOCX:

- The JSON object follows `CSL_CITATION` **directly** with no separating space.
- `w:fldChar begin` and `w:instrText` share a single `<w:r>`. Similarly, `w:fldChar end` may share a `<w:r>` with the text that immediately follows the citation, or with nothing.
- Field boundaries do **not** align with paragraph boundaries. The `w:fldChar end` for a field that began in one paragraph can appear at the start of the next paragraph. Multiple fields can start and end within the same paragraph.
- `citationItems[].id` is a **string**, not an integer.
- `citationItems[].uris` is present alongside `itemData`.
- `properties` contains only `plainCitation` (no `formattedCitation`, no `noteIndex`) in this example; other fields may or may not appear depending on Zotero version and citation style.
- `itemData` may include a `language` field (plain language name such as `"spanish"` or `"english"`, not a BCP-47 tag) and a `custom` object — both should be treated gracefully and are not required for import.
- Author entries may use `literal` instead of `family`/`given` for institutional authors.
- **No trailing random ID in DOCX**: Zotero does not append a trailing random ID in DOCX field instructions. The JSON object ends immediately after the closing `}`.
- The bibliography field (`ADDIN ZOTERO_BIBL CSL_BIBLIOGRAPHY`) is in its own separate paragraph. Its `begin` and `instrText` share a single `<w:r>`. The rendered entries appear as multiple `<w:t>` + `<w:br/>` nodes inside a single `<w:r>` between `separate` and `end`.

> **RTF escape sequences in `formattedCitation`**: When `properties.formattedCitation`
> is present it may contain RTF Unicode escapes such as `\\uc0\\u8211{}` (RTF for the
> en-dash U+2013, where `8211` is a **decimal** code point). These appear only in the
> display string inside `properties` and do not affect the importable
> `citationItems[].itemData` records, so they do not need to be decoded during import.

> **Note on the bibliography instruction**: In this real-world file the instruction is
> simply `ADDIN ZOTERO_BIBL CSL_BIBLIOGRAPHY` with no JSON between the two tokens.
> Earlier Zotero versions or different export options may include a JSON object between
> them (e.g. `ADDIN ZOTERO_BIBL {"uncited":[],"custom":[]} CSL_BIBLIOGRAPHY`). Parsers
> should handle both forms.

> **Zotero metadata in `docProps/custom.xml`**: In addition to the field codes in the
> document body, Zotero DOCX files contain a metadata entry in `docProps/custom.xml`.
> This file stores custom document properties that Zotero uses to persist session and
> style information across document editing sessions. A typical entry looks like:
>
> ```xml
<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="ZOTERO_PREF_1"><vt:lpwstr>&lt;data data-version="3" zotero-version="5.0.96.3"&gt;&lt;session id="RYC4roRa"/&gt;&lt;style id="http://www.zotero.org/styles/apa" locale="en-US" hasBibliography="1" bibliographyStyleHasBeenSet="1"/&gt;&lt;prefs&gt;&lt;pref name="fieldType" value="Field"/&gt;&lt;/prefs&gt;&lt;/data&gt;</vt:lpwstr></property>
```
>
> Note that the inner `<data>` element is **serialized XML** stored as text inside the
> `<vt:lpwstr>` element. The angle brackets are escaped as `&lt;` and `&gt;`. To parse
> the metadata, you must first extract the text content of `<vt:lpwstr>`, then decode
> the XML entities, and finally parse the resulting XML string.
> ```
>
> The `<data>` element (after unescaping from `<vt:lpwstr>`) contains:
>
> - `data-version` — the internal Zotero data format version (currently `3`).
> - `zotero-version` — the Zotero version that created the document (e.g. `5.0.96.3`).
> - `<session id="..."/>` — a unique session identifier generated when the document was
>   first linked to a Zotero library.
> - `<style id="..."/>` — the CSL style URI used for formatting citations and the
>   bibliography. The `locale` attribute specifies the citation locale (e.g. `en-US`).
>   The `hasBibliography` attribute indicates whether the style includes a bibliography,
>   and `bibliographyStyleHasBeenSet` tracks whether the user has confirmed the style
>   choice.
> - `<prefs>` — a list of preference key-value pairs. The `fieldType` preference
>   indicates whether Zotero uses Word field codes (`Field`) or bookmarks (`Bookmark`)
>   to store citations in this document.
>
> Multiple `ZOTERO_PREF_N` properties may exist (numbered `ZOTERO_PREF_1`,
> `ZOTERO_PREF_2`, etc.) when the serialized XML exceeds the character limit (255) for a
> single property value. In this case, the XML string is split across multiple
> properties that must be concatenated in order before parsing. The `fmtid` attribute
> is the standard Windows FMTID for custom properties
> (`{D5CDD505-2E9C-101B-9397-08002B2CF9AE}`), and `pid` is the property index within
> that format.
>
> **Note**: ONLYOFFICE 9.3.0.140 omits the `docProps/custom.xml` file entirely when
> saving Zotero DOCX files. Parsers should not rely on the presence of this metadata.

#### Zotero (ODT)

In ODT, Zotero uses the same CSL-JSON structure as in DOCX, with the same **citation item metadata** support (`locator`, `label`, `prefix`, `suffix`, `suppress-author`, `author-only`). The JSON is embedded in reference mark names instead of field instructions.

In ODT files, Zotero stores session and style metadata in `meta.xml` using
`<meta:user-defined>` elements. Like the DOCX format, the inner XML is serialized
(escaped) and may be split across multiple properties due to character limits:

```xml
<meta:user-defined meta:name="ZOTERO_PREF_1">&lt;data data-version=&quot;3&quot; zotero-version=&quot;8.0.2&quot;&gt;&lt;session id=&quot;sqSj43VZ&quot;/&gt;&lt;style id=&quot;http://www.zotero.org/styles/chicago-author-date&quot; locale=&quot;en-US&quot; hasBibliography=&quot;1&quot; bibliographyStyleHasBeenSet=&quot;1&quot;/&gt;&lt;prefs&gt;&lt;pref name=&quot;fieldType&quot; value=&quot;ReferenceMark&quot;/&gt;&lt;pr</meta:user-defined><meta:user-defined meta:name="ZOTERO_PREF_2">ef name=&quot;automaticJournalAbbreviations&quot; value=&quot;true&quot;/&gt;&lt;/prefs&gt;&lt;/data&gt;</meta:user-defined>
```

> **Split across properties**: The `<data>` element may be split across multiple
> `ZOTERO_PREF_N` properties when the serialized XML exceeds the character limit (378?) for
> a single property value. In the example above, `ZOTERO_PREF_1` ends mid-tag
> (`...&lt;pr`) and `ZOTERO_PREF_2` continues (`ef name=...`). Parsers must concatenate
> all `ZOTERO_PREF_N` values in order before decoding entities and parsing the XML.
>
> The structure of the `<data>` element (after unescaping) is identical to the DOCX
> format: `data-version`, `zotero-version`, `<session>`, `<style>`, and `<prefs>`.

The reference mark name contains the full CSL-JSON payload (with `"` encoded as `&quot;`), prefixed with `ZOTERO_ITEM CSL_CITATION`:

```xml
<text:reference-mark-start text:name="ZOTERO_ITEM CSL_CITATION {&quot;citationID&quot;:&quot;AQwSemPs&quot;,...} RNDjURflxg9F1"/>
(Hawking, 2010)
<text:reference-mark-end text:name="ZOTERO_ITEM CSL_CITATION {&quot;citationID&quot;:&quot;AQwSemPs&quot;,...} RNDjURflxg9F1"/>
```

> **Trailing random ID**: Zotero appends a random alphanumeric token after the closing
> `}` of the JSON object in the mark name. The token consists of:
> - A single space
> - The literal string `"RND"`
> - Exactly 10 alphanumeric characters (uppercase and lowercase letters plus digits)
>
> For example:
>
> ```
> ZOTERO_ITEM CSL_CITATION {"citationID":"IQc5TguB",...,"schema":"..."} RND6KERMIacgp
> ```
>
> After XML entity-unescaping the `&quot;` sequences, the full attribute value therefore
> ends with `} RND6KERMIacgp` (or a similar random string). A bare
> `name.slice(name.indexOf("{"))` produces text that is not valid JSON and causes
> `JSON.parse` to throw. The JSON object must be extracted by walking the string and
> tracking brace depth (and JSON string boundaries) to find the matching closing `}`,
> then taking only that substring. The same brace-balancing extraction is applied
> defensively to DOCX field instructions, where the trailing token has not been
> confirmed but cannot be ruled out.
>
> The random ID differs across citation and
> bibliography marks in the same document.

> **RTF escape sequences in `formattedCitation`**: The `properties.formattedCitation`
> value inside the JSON may contain RTF Unicode escapes such as `\\uc0\\u8211{}` (RTF
> for the en-dash U+2013, where `8211` is a **decimal** code point, not hex). In JSON
> source, `\\u` is a literal backslash followed by `u` and is therefore not a JSON
> Unicode escape — `JSON.parse` handles it correctly once the trailing random ID is
> removed. These RTF sequences appear only in the display string inside `properties`
> and do not affect the importable `citationItems[].itemData` records.

The bibliography section uses a section whose name starts with `ZOTERO_BIBL` and ends with `CSL_BIBLIOGRAPHY` + a random ID:

```xml
<text:section text:style-name="Sect1" text:name="ZOTERO_BIBL {\"uncited\":[],\"omitted\":[],\"custom\":[]} CSL_BIBLIOGRAPHY RNDjURflxg9F1">
... rendered bibliography text ...
</text:section>
```

---

### Mendeley

#### Mendeley Cite (DOCX, current)

Mendeley Cite uses a CSL-JSON-based structure similar to Zotero. The `citationItems` array supports the following **citation-specific metadata**:

- **`suppress-author`**: Boolean; suppresses author names in citation output
- **`author-only`**: Boolean; renders only author names
- **`composite`**: Boolean; Mendeley-specific field (purpose unknown)

The same CSL standard fields (`locator`, `label`, `prefix`, `suffix`) are expected to be supported since Mendeley follows the CSL cite-item specification, though examples in the wild may not always include them.

**Example from Mendeley Cite v3:**

The current Mendeley Cite add-in (post-2022) uses a `<w:sdt>` (Structured Document Tag) with no ADDIN field code inside. The citation data is stored entirely in the `w:tag` attribute as `MENDELEY_CITATION_v3_` followed by a base64-encoded JSON string. The `w:sdtContent` contains only the rendered citation text:

```xml
<w:sdt>
  <w:sdtPr>
    <w:tag w:val="MENDELEY_CITATION_v3_eyJjaXRhdGlvbklEIjoiTUVOREVMRVlfQ0lUQVRJT05fMWRlMThjMTMtMGM4ZC00YTNiLTllNzAtOTY0MDdhZmRjNzFlIiwi..."/>
    <w:id w:val="-1410928299"/>
    <w:placeholder>
      <w:docPart w:val="DefaultPlaceholder_-1854013440"/>
    </w:placeholder>
  </w:sdtPr>
  <w:sdtContent>
    <w:p>
      <w:r><w:t>(Ezquerro et al., 2024)</w:t></w:r>
    </w:p>
  </w:sdtContent>
</w:sdt>
```

The base64-decoded payload is a CSL-JSON-based structure with Mendeley-specific additions:

```json
{
  "citationID": "MENDELEY_CITATION_1de18c13-0c8d-4a3b-9e70-96407afdc71e",
  "properties": {"noteIndex": 0},
  "isEdited": false,
  "manualOverride": {
    "isManuallyOverridden": false,
    "citeprocText": "(Ezquerro et al., 2024)",
    "manualOverrideText": ""
  },
  "citationItems": [{
    "id": "e219b34e-d397-37b4-818e-80ca578eae74",
    "locator": "45",           // page number or other locator (when present)
    "label": "page",           // locator type (when present)
    "prefix": "see ",          // prefix text (when present)
    "suffix": "",              // suffix text (when present)
    "itemData": {
      "type": "article-journal",
      "id": "e219b34e-d397-37b4-818e-80ca578eae74",
      "title": "Large dinosaur egg accumulations...",
      "author": [{"family": "Ezquerro", "given": "L.", "parse-names": false, "dropping-particle": "", "non-dropping-particle": ""}],
      "container-title": "Geoscience Frontiers",
      "DOI": "10.1016/j.gsf.2024.101872",
      "issued": {"date-parts": [[2024, 9, 1]]}
    },
    "isTemporary": false,
    "suppress-author": false,
    "composite": false,
    "author-only": false
  }]
}
```

Key differences from the legacy format: the `citationID` starts with `MENDELEY_CITATION_` (followed by a UUID), there is no `mendeley` sub-object, and the per-item `itemData` may include a full `abstract` field.

The bibliography is a `<w:sdt>` with `w:tag w:val="MENDELEY_BIBLIOGRAPHY"` — no encoded data, just a fixed marker string. The rendered bibliography text is in `w:sdtContent`:

```xml
<w:sdt>
  <w:sdtPr>
    <w:tag w:val="MENDELEY_BIBLIOGRAPHY"/>
    <w:id w:val="-770855039"/>
    <w:placeholder>
      <w:docPart w:val="DefaultPlaceholder_-1854013440"/>
    </w:placeholder>
  </w:sdtPr>
  <w:sdtContent>
    ... rendered bibliography text ...
  </w:sdtContent>
</w:sdt>
```

Mendeley Cite (current) is Word-only and does not support ODT.

#### Mendeley Desktop (DOCX, legacy)

The legacy Mendeley Desktop plugin (retired September 2022) used an ADDIN field with the prefix `ADDIN CSL_CITATION` (even older versions used `ADDIN Mendeley Citation{UUID} CSL_CITATION`). The JSON includes a `mendeley` object and follows the CSL-JSON specification, supporting the same **citation item metadata** as Zotero (`locator`, `label`, `prefix`, `suffix`, `suppress-author`, `author-only`):

```xml
<w:instrText xml:space="preserve"> ADDIN CSL_CITATION {
  "citationID": "12rsus7rlj",
  "citationItems": [{
    "id": "ITEM-1",
    "itemData": {
      "type": "article-journal",
      "title": "My paper",
      "author": [{"family": "Smith", "given": "John"}],
      "issued": {"date-parts": [["2007"]]}
    },
    "uris": ["https://www.mendeley.com/documents/?uuid=..."]
  }],
  "mendeley": {
    "formattedCitation": "(Smith, 2007)",
    "plainTextFormattedCitation": "(Smith, 2007)",
    "previouslyFormattedCitation": "(Smith, 2007)"
  },
  "properties": {"noteIndex": 0},
  "schema": "https://github.com/citation-style-language/schema/raw/master/csl-citation.json"
} </w:instrText>
```

The bibliography field uses: `ADDIN Mendeley Bibliography CSL_BIBLIOGRAPHY`

#### Mendeley Desktop (ODT, legacy)

The legacy Mendeley OpenOffice plugin stores citations as reference marks with the name pattern `CSL_CITATION {JSON}`, using the same CSL-JSON payload (with the `mendeley` object) as in DOCX, with the same **citation item metadata** support:

```xml
<text:reference-mark-start text:name="CSL_CITATION {&quot;citationID&quot;:...}"/>
(Smith, 2007)
<text:reference-mark-end text:name="CSL_CITATION {&quot;citationID&quot;:...}"/>
```

The bibliography reference mark name contains `CSL_BIBLIOGRAPHY`.

---

### EndNote

EndNote stores citation-specific metadata within the `<Cite>` element of its XML payload. The following **citation metadata fields** are available:

- **`<Prefix>`**: Text to appear before the citation (e.g., `"e.g. "`, `"see "`)
- **`<Suffix>`**: Text to appear after the citation (e.g., `" for more details"` or: `": 11"` for page numbers)

If a citation is to be shown with the author outside of the parenthesis, an attribute `AuthorYear="1"` is added to the `<Cite>` element.

Note: EndNote does not appear to have explicit fields for locator type (label) or author suppression in the citation markup. The `<DisplayText>` element contains the rendered citation, while `<Author>`, `<Year>`, and `<RecNum>` provide key identification data.

**Example with citation metadata:**

```xml
<EndNote>
  <Cite>
    <Author>Smith</Author>
    <Year>2020</Year>
    <RecNum>42</RecNum>
    <Prefix>see </Prefix>
    <Suffix> for details</Suffix>
    <Pages>123-125</Pages>
    <DisplayText>(Smith 2020, 123-125)</DisplayText>
    <record>...</record>
  </Cite>
</EndNote>
```

#### EndNote (DOCX)

EndNote uses `ADDIN EN.CITE` with a nested `<EndNote><Cite>...</Cite></EndNote>` XML payload. This payload appears in one of two forms in the same file:

**Inline form** — the XML is entity-escaped directly in `w:instrText`:

```xml
<w:r><w:fldChar w:fldCharType="begin"/></w:r>
<w:r>
  <w:instrText xml:space="preserve"> ADDIN EN.CITE &lt;EndNote&gt;&lt;Cite&gt;&lt;Author&gt;Bronk Ramsey&lt;/Author&gt;&lt;Year&gt;2009&lt;/Year&gt;&lt;RecNum&gt;19&lt;/RecNum&gt;&lt;DisplayText&gt;(Bronk Ramsey 2009a)&lt;/DisplayText&gt;&lt;record&gt;&lt;rec-number&gt;19&lt;/rec-number&gt;&lt;ref-type name="Journal Article"&gt;17&lt;/ref-type&gt;&lt;contributors&gt;&lt;authors&gt;&lt;author&gt;Bronk Ramsey, Christopher&lt;/author&gt;&lt;/authors&gt;&lt;/contributors&gt;&lt;titles&gt;&lt;title&gt;Bayesian Analysis of Radiocarbon Dates&lt;/title&gt;&lt;secondary-title&gt;Radiocarbon&lt;/secondary-title&gt;&lt;/titles&gt;&lt;pages&gt;337-360&lt;/pages&gt;&lt;volume&gt;51&lt;/volume&gt;&lt;number&gt;1&lt;/number&gt;&lt;dates&gt;&lt;year&gt;2009&lt;/year&gt;&lt;/dates&gt;&lt;/record&gt;&lt;/Cite&gt;&lt;/EndNote&gt;</w:instrText>
</w:r>
<w:r><w:fldChar w:fldCharType="separate"/></w:r>
<w:r><w:t>(Bronk Ramsey 2009a)</w:t></w:r>
<w:r><w:fldChar w:fldCharType="end"/></w:r>
```

**fldData form** — the XML payload is base64-encoded in `<w:fldData>` on the `begin` marker, and the field is actually a nested pair: an outer `ADDIN EN.CITE` field containing an inner `ADDIN EN.CITE.DATA` field. Both `begin` markers carry identical `w:fldData`. The `end` after `EN.CITE.DATA` closes the inner field; the outer `EN.CITE` field continues with a `separate` marker, rendered text, and a second `end`:

```xml
<w:r>
  <w:fldChar w:fldCharType="begin">
    <w:fldData xml:space="preserve">PEVuZE5vdGU+PENpdGU+...</w:fldData>
  </w:fldChar>
</w:r>
<w:r><w:instrText xml:space="preserve"> ADDIN EN.CITE </w:instrText></w:r>
<w:r>
  <w:fldChar w:fldCharType="begin">
    <w:fldData xml:space="preserve">PEVuZE5vdGU+PENpdGU+...</w:fldData>
  </w:fldChar>
</w:r>
<w:r><w:instrText xml:space="preserve"> ADDIN EN.CITE.DATA </w:instrText></w:r>
<w:r><w:fldChar w:fldCharType="end"/></w:r>
... (separator, rendered text, and outer end follow) ...
```

The base64 decodes to the same `<EndNote><Cite>...</Cite></EndNote>` structure. All three forms can appear in the same document. A parser should look for either `ADDIN EN.CITE` or `ADDIN EN.CITE.DATA` in `w:instrText` and read the base64 payload from the `w:fldData` of the preceding `begin` marker.

The decoded XML structure (shown unescaped for readability):

```xml
<EndNote>
  <Cite>
    <Author>Bronk Ramsey</Author>
    <Year>2009</Year>
    <RecNum>19</RecNum>
    <Prefix>e.g. in the case of human remains: </Prefix>
    <DisplayText>(Bronk Ramsey 2009a)</DisplayText>
    <record>
      <rec-number>19</rec-number>
      <foreign-keys>
        <key app="EN" db-id="z2asfrdsndpezaeta27x5ff5d022r5x9x9x0" timestamp="1483621777" guid="2c101334-654a-4888-9294-c124110af7c0">19</key>
      </foreign-keys>
      <ref-type name="Journal Article">17</ref-type>
      <contributors>
        <authors><author>Bronk Ramsey, Christopher</author></authors>
      </contributors>
      <titles>
        <title>Bayesian Analysis of Radiocarbon Dates</title>
        <secondary-title>Radiocarbon</secondary-title>
      </titles>
      <periodical><full-title>Radiocarbon</full-title></periodical>
      <pages>337-360</pages>
      <volume>51</volume>
      <number>1</number>
      <dates>
        <year>2009</year>
        <pub-dates><date>2009/001/001</date></pub-dates>
      </dates>
      <publisher>Cambridge University Press</publisher>
      <urls>
        <related-urls><url>https://...</url></related-urls>
      </urls>
      <electronic-resource-num>10.1017/S0033822200033865</electronic-resource-num>
    </record>
  </Cite>
</EndNote>
```

Key fields: `<RecNum>` is the record number in the local EndNote library; `<foreign-keys>` carries the library database ID and a GUID; `<Prefix>` is optional citation prefix text. Multiple simultaneous citations use multiple `<Cite>` elements inside the single `<EndNote>` root.

**Important: `<pages>` is a reference field, not a citation locator.** The `<pages>` element inside `<record>` stores the page range of the published article (e.g. `<pages>337-360</pages>`). It must **not** be confused with the `<Pages>` element that can appear as a direct child of `<Cite>` (outside `<record>`), which *is* a per-citation locator. A parser must restrict its locator search to the portion of the `<Cite>` element that precedes the `<record>` block.

**`<pub-dates>` is unreliable free-text.** EndNote allows users to type arbitrary text in the publication-date field, so the content of `<pub-dates><date>` cannot be relied upon to conform to any fixed format. Real-world examples include:

| `<date>` content | Normalised to | Notes |
|---|---|---|
| `2009` | `2009` | Bare four-digit year |
| `4` | `YYYY-04` | Bare integer 1–12 — Mendeley-style month number, combined with `<year>` |
| `April 2005` | `2005-04` | Month name + year (any order) |
| `Apr 2005` | `2005-04` | Abbreviated month name |
| `2005 April` | `2005-04` | Year-first variant |
| `Apr. 2005` | `2005-04` | Abbreviated month name with period |
| `01 Jan. 2020` | `2020-01-01` | DD Mon. YYYY |
| `August 02` | `YYYY-08-02` | Month + day, no year — day combined with `<year>` |
| `2012/07/01/` | `2012-07-01` | YYYY/MM/DD/ with trailing slash |
| `2021/10/01/` | `2021-10-01` | same |
| `2012/06/01` | `2012-06-01` | YYYY/MM/DD without trailing slash |
| `2009/001/001` | *(discarded)* | EndNote pseudo-date — month token `001` is out of range; fall back to `<year>` |
| `10/31/print` | *(discarded)* | Non-numeric third token — no usable year; fall back to `<year>` |
| `Mar` | `Mar` (verbatim) | Bare month name with no `<year>` available — kept as-is |
| `15-17 June 2021` | `15-17 June 2021` (verbatim) | Complex range that cannot be normalised — kept as-is |

A robust parser should:
1. Try to normalise the `<pub-dates><date>` text to an ISO 8601 / EDTF string using best-effort heuristics (see table above).
2. Silently discard the `<pub-dates>` value and fall back to the plain `<year>` element only when the text contains no recoverable date information at all — specifically the `YYYY/NNN/NNN` pseudo-date format (invalid month/day ranges) and similar non-date constructs.
3. For anything else that cannot be fully normalised, keep the value verbatim so that human-readable date information is not silently lost.

The authoritative year is always in `<dates><year>` and should be used as the fallback source of truth.

The bibliography uses `ADDIN EN.REFLIST`. It is a multi-paragraph field: the `begin`, `instrText`, and `separate` markers are all in the **first** bibliography paragraph, each entry then occupies its own `<w:p>` with `<w:pStyle w:val="EndNoteBibliography"/>`, and the `end` marker appears in the last bibliography paragraph:

```xml
<w:p>
  <w:pPr><w:pStyle w:val="EndNoteBibliography"/></w:pPr>
  <w:r><w:fldChar w:fldCharType="begin"/></w:r>
  <w:r><w:instrText xml:space="preserve"> ADDIN EN.REFLIST </w:instrText></w:r>
  <w:r><w:fldChar w:fldCharType="separate"/></w:r>
  <w:r><w:t>Aerts-Bijma AT, Paul D, ... (2020) ...</w:t></w:r>
</w:p>
<w:p>
  <w:pPr><w:pStyle w:val="EndNoteBibliography"/></w:pPr>
  <w:r><w:t>Augstein M (2015) ...</w:t></w:r>
</w:p>
... one <w:p> per bibliography entry ...
<w:p>
  <w:pPr><w:pStyle w:val="EndNoteBibliography"/></w:pPr>
  <w:r><w:t>Last entry ...</w:t></w:r>
  <w:r><w:fldChar w:fldCharType="end"/></w:r>
</w:p>
```

#### EndNote (ODT)

EndNote does not integrate with ODT using live field codes. Instead, it uses a "Format Paper" workflow with temporary plain-text citation placeholders:

```
{Smith, 2023 #291}
```

The format is `{Author, Year #RecordNumber}`. The document is processed by EndNote's "Format Paper" function, which replaces these text strings with formatted citations and appends a static bibliography. No live reference marks are created. 

**Citation item metadata**: The plain-text placeholder format does not support locators, prefixes, suffixes, or other citation-specific metadata. These must be added manually to the document text after formatting is complete. See [https://endnotee.w.uib.no/endnote-og-andre-tekstbehandlere/](https://endnotee.w.uib.no/endnote-og-andre-tekstbehandlere/)

---

### Citavi

Citavi is DOCX-only. Saving a Citavi-annotated DOCX as ODT converts all fields to static text.

**Citation item metadata**: Citavi's proprietary JSON format includes **page range information and prefix text** within each entry in the `Entries` array. Based on analysis of the [thomjur/docx-citavi-parser](https://github.com/thomjur/docx-citavi-parser) project and real-world examples (including confirmed output from Citavi 6.14.0.0), the structure is:

**Prefix (`Entries[].Prefix`)**:
- String containing text to appear before the citation (e.g., `"Vgl. "` for German "cf.", `"See "`)
- **Only present when a prefix is set**; omitted entirely when no prefix is used
- Appears at the entry level, same level as `PageRange` and `Reference`
- Citavi formats the prefix according to citation style rules (e.g. auto-capitalising the first word in a footnote)

**Suffix (`Entries[].Suffix`)**:
- String containing text to appear after the citation (e.g., `"etc."`)
- **Only present when a suffix is set**; omitted entirely when no suffix is used
- Appears at the entry level alongside `Prefix`, `PageRange`, and `Reference`
- Not observed in any real-world examples yet; existence confirmed by the Citavi manual

**PageRange at Entry Level (`Entries[].PageRange`)**:
- Object containing citation-specific page range data, stored at the same level as `Reference` and `Prefix` within each entry
- `OriginalString`: The formatted page range as a string (e.g., `"100-105"`, `"69"`) — **at the PageRange level**; absent when no pages are set
- `StartPage` and `EndPage` objects, each containing:
  - `OriginalString`: The page number as a string (e.g., `"100"`, `"105"`) — **only present when pages are set**
  - `PrettyString`: Formatted/display version of the page number (e.g., `"100"`, `"xvii"`)
  - `Number`: Numeric value of the page (e.g., `100`) — **only present when page is fully numeric**
  - `IsFullyNumeric`: Boolean indicating if the page number is purely numeric
  - `NumberingType`: Integer enum controlling what the locator numbers represent and thus what prefix the citation style uses (e.g. `p.`, `Col.`, `Nr.`, `§`). The Citavi manual names five types — pages (default), columns, section numbers, margin numbers, and other — but **does not state which integer corresponds to which type**. Based on the assumption that they are listed in order starting from 0, the likely mapping is:
    - `0` = Pages (default) — confirmed observed value
    - `1` = Columns (`Col.`) — integer value inferred, not confirmed
    - `2` = Section numbers (`Nr.` or `§`) — integer value inferred, not confirmed
    - `3` = Margin numbers — integer value inferred, not confirmed
    - `4` = Other — allows manually entered complex ranges with multiple prefixes (e.g. `§14 Col. 12`); integer value inferred, not confirmed; `OriginalString` likely carries the full custom locator text
  - `NumeralSystem`: Integer enum for the numeral system. The Citavi manual mentions Arabic and Roman numerals but **does not state which integer corresponds to which**. Based on the assumption that Arabic (the default) is `0`:
    - `0` = Arabic numerals (default, e.g. `14`) — confirmed observed value
    - `1` = Roman numerals (e.g. `xiv`) — integer value inferred, not confirmed
- `NumberingType` and `NumeralSystem` at the PageRange level mirror the page-level values and apply to the range as a whole
- **When pages are empty**: PageRange object exists but StartPage/EndPage lack `OriginalString`, `Number`, and `PrettyString`
- **When only a single page is cited**: `StartPage` is fully populated; `EndPage` exists but is empty (no `OriginalString`, `PrettyString`, or `Number`, and `IsFullyNumeric` is `false`) — the same empty-sub-object pattern as when no pages are set at all. The `PageRange.OriginalString` contains just the single page number (e.g. `"306"`).

**PageRange at Reference Level (`Reference.PageRange`)**:
- In the bibliographic `Reference` object, `PageRange` may be stored as a **serialized XML string** instead of a JSON object
- **XML format for page range**: `"<sp>\r\n  <n>593</n>\r\n  <in>true</in>\r\n  <os>593</os>\r\n  <ps>593</ps>\r\n</sp>\r\n<ep>\r\n  <n>596</n>\r\n  <in>true</in>\r\n  <os>596</os>\r\n  <ps>596</ps>\r\n</ep>\r\n<os>593-596</os>"`
- **XML format for single page**: `"<sp>\r\n  <n>69</n>\r\n  <in>true</in>\r\n  <os>69</os>\r\n  <ps>69</ps>\r\n</sp>\r\n<os>69</os>"` (no `<ep>` element)
- XML elements: `<sp>` (start page), `<ep>` (end page, omitted for single pages), `<n>` (number), `<in>` (is numeric?), `<os>` (original string), `<ps>` (parsed string?)
- The top-level `<os>` contains the formatted range string (e.g., `"593-596"` or `"69"`)
- This represents the page range for the reference itself, not citation-specific locators
- **This format is confirmed to still be used in Citavi 6.14.0.0** — the open question about whether it was legacy-only is resolved; parsers must handle it in all versions

**FormattedText**:
- Object containing pre-rendered citation text with formatting metadata
- `Count`: Number of text units in the citation
- `TextUnits`: Array of formatted text segments, each with:
  - `Text`: The actual text content (e.g., `"[1]"`, `"Vgl. "`, `"Bitzios"`)
  - `FontStyle`: Object with formatting properties:
    - `{"Neutral": true}`: Normal/roman text
    - `{"Italic": true}`: Italicized text (e.g., for author names in some styles)
    - Other properties like `Bold`, `Underline`, etc. may exist
  - `ReadingOrder`: Integer (1 = left-to-right; purpose unclear)
- **Multi-unit structure**: Citations with prefixes or complex formatting are split into multiple TextUnits. For example, a citation with prefix `"Vgl. "` and italicized author name has three units: the prefix (Neutral), the author name (Italic), and the rest of the citation (Neutral).
- The FormattedText preserves rich formatting that may be lost in the plain `Text` field

**`Reference` object additional fields** (beyond those shared with the standalone Citavi JSON import):
- **`Reference.SourceOfBibliographicInformation`**: String recording where the bibliographic metadata was originally imported from (e.g. `"CrossRef"`, `"PubMed"`). Absent when not known or not imported from an external source.
- **`Reference.Periodical.Issn`**: Print ISSN of the journal (e.g. `"1865-7362"`). Complement to `Eissn` (electronic ISSN). Either or both may be present.
- **`Reference.BibTeXKey`** and **`Reference.CitationKey`**: Both optional — absent in some real-world examples even in 6.14.0.0.

Additional top-level and entry-level fields:
- **`Tag`**: Duplicates the `w:tag` attribute value (e.g., `"CitaviPlaceholder#3162ebc6-3d3c-4cee-8909-ce083d4b7d58"`)
- **`Text`**: Plain-text rendered citation (e.g., `"[1]"` or `"Vgl. Bitzios u. a.: Dissonance..., hier S. 100-105."`)
- **`Entries[].Id`**: UUID identifying the placeholder entry instance
- **`Entries[].ReferenceId`**: UUID linking to the Reference object
- **`Entries[].RangeLength`**: Integer (purpose unknown; possibly character count or citation span)
- **`Entries[].UseNumberingTypeOfParentDocument`**: Boolean — when `true`, the `NumberingType` for the locator is inherited from the document's default rather than set per-citation
- **`Entries[].UseStandardPrefix`**: Boolean — when `true`, the citation style's own default prefix is used rather than any custom `Prefix` string set on this entry; when `false` (and `Prefix` is absent), no prefix is added. **Can be absent entirely** (observed in real files); absence appears equivalent to `false`.
- **`Entries[].AssociateWithKnowledgeItemId`**: UUID string linking this citation entry to a Citavi knowledge item (quotation, thought, or summary). Present when the citation was inserted from the Citavi knowledge panel rather than directly from the reference list. Absent when the citation has no associated knowledge item.
- **`Entries[].QuotationType`**: Integer indicating what type of knowledge item the citation is associated with (e.g. direct quotation, paraphrase, summary). Observed value: `1`. Full enum mapping not yet known. Absent when `AssociateWithKnowledgeItemId` is absent.
- **`Entries[].BibliographyEntry`**: String controlling whether and where this reference appears in the bibliography. Known values:
  - absent / default: reference appears in both in-text citation and bibliography (normal behaviour)
  - `"/bibonly"`: reference appears only in the bibliography, not as an in-text citation
  - `"/nobib"`: reference appears only as an in-text citation, not in the bibliography
  - Not yet observed in real-world examples; confirmed by Citavi manual
- **`Entries[].RuleSet`**: String or enum controlling which rule set (formatting variant) the citation style uses for this entry. The citation style determines whether a reference goes in-text or in a footnote; this field lets the author override that for a single citation (e.g. to use the "bibliography" rule set for one in-text citation). Not yet observed in real-world examples; confirmed by Citavi manual.
- **`Entries[].FormatOption`**: Integer (1, 2, or 3) selecting among the citation style's optional formatting variants for this entry. Commonly used to suppress or force "ibid."-style short forms when the same source is cited consecutively. Not yet observed in real-world examples; confirmed by Citavi manual.
- **`Entries[].InsertAs`**: String or enum overriding where the citation is physically inserted (in-text vs. footnote), independently of what the citation style normally dictates. Not yet observed in real-world examples; confirmed by Citavi manual.

**Confirmed support**:
- ✅ **Prefix text**: Stored in `Entries[].Prefix` field
- ✅ **Suffix text**: Stored in `Entries[].Suffix` field (confirmed by manual; not yet seen in real examples)
- ✅ **Page ranges**: Stored in `Entries[].PageRange` with full metadata (start, end, numbering type, numeral system)
- ✅ **Locator types beyond pages**: `NumberingType` covers columns, section/margin numbers, and free-form locators (exact integer values beyond `0` inferred from manual, not confirmed)
- ✅ **Roman numerals**: `NumeralSystem` can switch the numeral display from Arabic to Roman (exact integer value inferred from manual, not confirmed)
- ✅ **Bibliography-only / no-bibliography**: `BibliographyEntry` field with `/bibonly` or `/nobib` values
- ✅ **Rule set override**: `RuleSet` field per entry
- ✅ **Format options**: `FormatOption` field (values 1, 2, 3) per entry
- ✅ **Insert-as override**: `InsertAs` field per entry

**Unknown/undocumented**:
- Whether **author suppression** or other CSL-style cite modifiers (e.g. `suppress-author`) are available
- The meaning and purpose of `RangeLength` (observed values: 8, 15, 18, 27, 42 in real files; no clear pattern)
- The exact integer values for `NumberingType` (beyond `0`) and `NumeralSystem` (beyond `0`) — the mappings in this document are inferred from the order the manual lists the options, not from observed data
- The exact serialised form for `RuleSet`, `FormatOption`, and `InsertAs` (confirmed to exist by manual but not yet observed in real files)
- The full `QuotationType` enum mapping (only value `1` observed so far)
- How `FormattedText.TextUnits` FontStyle properties beyond `Neutral` and `Italic` work (e.g. `Bold`, `Underline`)

#### Citavi (DOCX)

Citavi wraps its citations in a `<w:sdt>` (Structured Document Tag / content control) around a standard ADDIN field. The content control's `w:tag` attribute always starts with `CitaviPlaceholder#` followed by a UUID. The `w:instrText` contains `ADDIN CitaviPlaceholder` followed by a base64-encoded proprietary JSON payload:

```xml
<w:sdt>
  <w:sdtPr>
    <w:alias w:val="To edit, see citavi.com/edit"/>
    <w:tag w:val="CitaviPlaceholder#550e8400-e29b-41d4-a716-446655440000"/>
  </w:sdtPr>
  <w:sdtContent>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText>ADDIN CitaviPlaceholder{BASE64_ENCODED_JSON_HERE}</w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>(Burton 2013; Manning 2016)</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:sdtContent>
</w:sdt>
```

The base64-decoded payload is proprietary Citavi JSON (using Newtonsoft-style `$type`/`$id` metadata, not CSL-JSON). The payload embeds complete bibliographic data for each cited reference within the `Reference` field of each entry:

```json
{
  "$type": "SwissAcademic.Citavi.Citations.WordPlaceholder",
  "WAIVersion": "6.11.0.0",
  "Entries": [{
    "$type": "SwissAcademic.Citavi.Citations.WordPlaceholderEntry",
    "Id": "0f5b7961-055d-429a-a819-ed58891d9627",
    "ReferenceId": "b213355e-df97-4b43-9e69-8a185817ce57",
    "RangeLength": 255,
    "UseNumberingTypeOfParentDocument": false,
    "UseStandardPrefix": false,
    "Prefix": "Vgl. ",
    "PageRange": {
      "$type": "SwissAcademic.PageRange",
      "OriginalString": "100-105",
      "NumberingType": 0,
      "NumeralSystem": 0,
      "StartPage": {
        "$type": "SwissAcademic.PageNumber",
        "OriginalString": "100",
        "PrettyString": "100",
        "Number": 100,
        "IsFullyNumeric": true,
        "NumberingType": 0,
        "NumeralSystem": 0
      },
      "EndPage": {
        "$type": "SwissAcademic.PageNumber",
        "OriginalString": "105",
        "PrettyString": "105",
        "Number": 105,
        "IsFullyNumeric": true,
        "NumberingType": 0,
        "NumeralSystem": 0
      }
    },
    "Reference": {
      "$type": "SwissAcademic.Citavi.Reference",
      "Authors": [{"FirstName": "Michail", "LastName": "Bitzios", ...}],
      "Title": "Dissonance in the food traceability regulatory environment and food fraud",
      "Year": "[In press]",
      "ReferenceType": "Contribution",
      ...
    }
  }],
  "FormattedText": {
    "$id": "23",
    "Count": 3,
    "TextUnits": [
      {
        "FontStyle": {"Neutral": true},
        "ReadingOrder": 1,
        "Text": "Vgl. "
      },
      {
        "FontStyle": {"Italic": true},
        "ReadingOrder": 1,
        "Text": "Bitzios"
      },
      {
        "FontStyle": {"Neutral": true},
        "ReadingOrder": 1,
        "Text": " u. a.: Dissonance..., hier S. 100-105."
      }
    ]
  },
  "Tag": "CitaviPlaceholder#8db84158-666e-4120-9634-26973d6d5ad3",
  "Text": "Vgl. Bitzios u. a.: Dissonance..., hier S. 100-105.",
  "WAIVersion": "6.3.0.0"
}
```

Note that both JSON object and XML-serialized PageRange formats may be encountered depending on Citavi version. The `Reference.PageRange` (XML serialization in the reference metadata) represents the pages for the full reference item, while `Entries[].PageRange` (JSON object at entry level) represents citation-specific page locators.

**Important**: The `Prefix` field demonstrates that Citavi **does support citation prefixes**. The prefix text appears both in the structured `Prefix` field and as the first TextUnit in `FormattedText`. The `FormattedText.TextUnits` array shows how the citation is rendered with formatting (e.g., author names in italic), with the prefix as a separate text unit at the beginning.

All bibliographic information needed to generate citations is embedded directly in each citation field, so no external Citavi project file is required for extraction.

An older citation format uses `ADDIN CITAVI.PLACEHOLDER` with a UUID and data payload directly in `w:instrText` (without base64 encoding in `w:tag`):

```xml
<w:instrText>ADDIN CITAVI.PLACEHOLDER {UUID} {data}</w:instrText>
```

The bibliography uses `ADDIN CITAVI BIBLIOGRAPHY` or `ADDIN CITAVI.BIBLIOGRAPHY` (both spellings occur) in a `w:sdt`, with any bibliography data following the field instruction:

```xml
<w:sdt>
  <w:sdtContent>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText>ADDIN CITAVI BIBLIOGRAPHY ...</w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>... rendered bibliography ...</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:sdtContent>
</w:sdt>
```

---

### JabRef

JabRef has a LibreOffice/OpenOffice plugin for ODT integration. For Word/DOCX it has no plugin — it can only export source data into Word's own bibliography system.

**Citation item metadata**: JabRef's ODT integration does not store structured citation metadata. The reference mark name contains only the citation key, sequence number, and random ID. All citation formatting (including any page numbers, prefixes, or suffixes) is pre-rendered into the text content wrapped by the reference marks. Once inserted, locators and other metadata cannot be extracted or modified programmatically.

#### JabRef (ODT)

JabRef inserts citations as named reference marks wrapping the fully rendered citation text. The reference mark name has the format `JABREF_{citationKey} CID_{sequenceNumber} {randomId}`:

```xml
<text:reference-mark-start text:name="JABREF_Hooper_2012 CID_1 du6kcoxv"/>
L. Hooper et al., "Effects of chocolate, cocoa, and flavan-3-ols...", The American Journal of Clinical Nutrition 95.3 (2012), 740–51.
<text:reference-mark-end text:name="JABREF_Hooper_2012 CID_1 du6kcoxv"/>
```

The content inside the marks is the formatted citation text (rendered by JabRef using configurable `.jstyle` layout files), not raw bibliographic data. The citation key portion of the name uses underscores in place of spaces.

The bibliography is placed in a named `<text:section>` with `text:name="JR_bib"`, containing plain text paragraphs — no reference marks or structured data:

```xml
<text:section text:style-name="Sect1" text:name="JR_bib">
  <text:h text:style-name="Heading_20_2" text:outline-level="2">References</text:h>
  <text:p text:style-name="P2">1. Hooper L, Kay C, ... The American Journal of Clinical Nutrition 2012;95(3):740–751.</text:p>
  <text:p text:style-name="P2">2. Di Renzo GC, ... The Journal of Maternal-Fetal &amp; Neonatal Medicine 2012;25(10):1860–1867.</text:p>
</text:section>
```

#### JabRef (DOCX)

JabRef has no Word plugin and does not insert citations into DOCX files directly. It can export a standalone MS Office Bibliography XML file (namespace `http://schemas.microsoft.com/office/word/2004/10/bibliography`) which the user imports into Word's built-in source manager via "Manage Sources > Browse". Once imported, Word manages the citations itself using its native `CITATION` field — JabRef is no longer involved.

**Citation item metadata**: Since JabRef uses Word's native bibliography system, see the "DOCX native bibliography" section above for citation metadata capabilities.

```xml
<w:instrText xml:space="preserve"> CITATION Mor01 \l 1033 </w:instrText>
```

Where `Mor01` is the citation key (stored as `<b:Tag>` in the XML). Word stores the source data in `customXml/item1.xml` within the DOCX ZIP. The resulting DOCX contains no JabRef-specific markers.

---

### Summary

| Manager | DOCX inline | DOCX bibliography | ODT inline | ODT bibliography | Citation metadata support |
|---------|-------------|-------------------|------------|-----------------|---------------------------|
| Zotero | `ADDIN ZOTERO_ITEM CSL_CITATION {json} RND<id>` (trailing random ID after JSON) | `ADDIN ZOTERO_BIBL {json} CSL_BIBLIOGRAPHY` | reference mark: `ZOTERO_ITEM CSL_CITATION {json} RND<id>` (trailing random ID after JSON) | `<text:section text:name="ZOTERO_BIBL {json} CSL_BIBLIOGRAPHY RND<id>">` | **Full CSL support**: `locator`, `label`, `prefix`, `suffix`, `suppress-author`, `author-only` |
| Mendeley Cite (current) | `w:sdt` with `w:tag="MENDELEY_CITATION_v3_{base64json}"` | `w:sdt` with `w:tag="MENDELEY_BIBLIOGRAPHY"` | not supported | not supported | **CSL-based**: `suppress-author`, `author-only`, `composite`; likely supports `locator`, `label`, `prefix`, `suffix` |
| Mendeley Desktop (legacy) | `ADDIN CSL_CITATION {json}` | `ADDIN Mendeley Bibliography CSL_BIBLIOGRAPHY` | reference mark: `CSL_CITATION {json}` | reference mark: `CSL_BIBLIOGRAPHY` | **Full CSL support**: same as Zotero |
| EndNote | `ADDIN EN.CITE <EndNote>...</EndNote>` (XML in field) | `ADDIN EN.REFLIST` | `{Author, Year #RecordNum}` plain text only | static text | **Limited**: `<Prefix>`, `<Suffix>`, `<Pages>`; no label or author suppression |
| Citavi | `w:sdt` wrapping `ADDIN CitaviPlaceholder{base64}` | `w:sdt` wrapping `ADDIN CITAVI BIBLIOGRAPHY` | not supported | not supported | **Partial**: `Prefix` for prefix text; `PageRange` with `StartPage`/`EndPage` (page numbers with `Number`, `OriginalString`, `PrettyString`, numbering type, numeral system); `FormattedText` for rich rendering; suffix/author-suppression unknown |
| JabRef | no plugin; export to Word's native `CITATION key` via MS Office Bibliography XML | `customXml/item1.xml` in DOCX | reference mark: `JABREF_{key} CID_{n} {id}` (wraps rendered text) | `<text:section text:name="JR_bib">` plain text | **None**: pre-rendered text only |
| Word native | `CITATION key \l locale` | `BIBLIOGRAPHY` field; sources in `customXml/item1.xml` | not applicable | not applicable | **Very limited**: locale switch `\l`; author/year/title suppression switches unknown |
| LibreOffice native | not applicable | not applicable | `<text:bibliography-mark>` with data as attributes | `<text:bibliography>` element | **None**: no citation-level metadata |

---

## References and Further Reading

### CSL Specification

For detailed information about CSL cite-item properties and their usage:

- **CSL 1.0.2 Specification - Cite-Items**: [https://docs.citationstyles.org/en/stable/specification.html#cite-items](https://docs.citationstyles.org/en/stable/specification.html#cite-items)
  - Defines `locator`, `label`, `prefix`, `suffix`, `suppress-author`, `author-only`, and other cite-item fields
  - Lists valid locator types in Appendix II - Locators
  
- **citeproc-js Documentation - CSL-JSON**: [https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html](https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html)
  - Practical guide to CSL-JSON citation and cite-item structure
  - Explains the distinction between items, citations, and cite-items

### Citation Manager Documentation

- **Zotero Word Processor Integration**: [https://www.zotero.org/support/word_processor_integration](https://www.zotero.org/support/word_processor_integration)
- **Mendeley Support**: [https://www.mendeley.com/guides](https://www.mendeley.com/guides)
- **EndNote Support**: [https://endnote.com/support/](https://endnote.com/support/)
- **Citavi Support**: [https://www.citavi.com/en/support](https://www.citavi.com/en/support)
- **JabRef OpenOffice/LibreOffice Integration**: [https://docs.jabref.org/cite/openofficeintegration](https://docs.jabref.org/cite/openofficeintegration)

### Related Projects and Tools

- **thomjur/docx-citavi-parser**: [https://github.com/thomjur/docx-citavi-parser](https://github.com/thomjur/docx-citavi-parser)
  - Go-based parser for extracting Citavi citations from DOCX files
  - Source of information about Citavi's `PageRange` metadata structure
  - Demonstrates practical extraction of citation keys and page numbers from Citavi's proprietary format

### Contributing

If you discover additional information about citation metadata storage in any of these formats, particularly:
- Word native citation field switches (`\s`, `\y`, `\n` and others)
- Citavi citation item metadata structure
- Other undocumented features

Please submit an issue or pull request to help improve this documentation.
