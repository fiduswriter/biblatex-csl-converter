
## Extracting Citations from ODT and DOCX Files

Word processor documents that use citation managers embed bibliographic data as structured fields or reference marks directly in the document XML. This section documents the formats used by each major citation manager, which is useful context when building tools that extract or convert such citations.

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

LibreOffice Writer's built-in bibliography uses `<text:bibliography-mark>` for inline citations. Unlike citation manager reference marks, all bibliographic data is stored directly as attributes on the element — the ODT is fully self-contained with no external data file:

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
- No trailing random ID has been observed in DOCX field instructions. The trailing random token is an ODT-specific behaviour (see the ODT section below); the brace-balancing JSON extraction is nonetheless applied defensively in the DOCX parser.
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
<text:reference-mark-start text:name="ZOTERO_ITEM CSL_CITATION {&quot;citationID&quot;:&quot;AQwSemPs&quot;,...}"/>
(Hawking, 2010)
<text:reference-mark-end text:name="ZOTERO_ITEM CSL_CITATION {&quot;citationID&quot;:&quot;AQwSemPs&quot;,...}"/>
```

> **Trailing random ID**: Zotero appends a random alphanumeric token after the closing
> `}` of the JSON object in the mark name, separated by a space. For example:
>
> ```
> ZOTERO_ITEM CSL_CITATION {"citationID":"IQc5TguB",...,"schema":"..."} RND6KERMIacgp
> ```
>
> After XML entity-unescaping the `&quot;` sequences the full attribute value therefore
> ends with `} RND6KERMIacgp` (or a similar random string). A bare
> `name.slice(name.indexOf("{"))` produces text that is not valid JSON and causes
> `JSON.parse` to throw. The JSON object must be extracted by walking the string and
> tracking brace depth (and JSON string boundaries) to find the matching closing `}`,
> then taking only that substring. The same brace-balancing extraction is applied
> defensively to DOCX field instructions, where the trailing token has not been
> confirmed but cannot be ruled out.

> **RTF escape sequences in `formattedCitation`**: The `properties.formattedCitation`
> value inside the JSON may contain RTF Unicode escapes such as `\\uc0\\u8211{}` (RTF
> for the en-dash U+2013, where `8211` is a **decimal** code point, not hex). In JSON
> source, `\\u` is a literal backslash followed by `u` and is therefore not a JSON
> Unicode escape — `JSON.parse` handles it correctly once the trailing random ID is
> removed. These RTF sequences appear only in the display string inside `properties`
> and do not affect the importable `citationItems[].itemData` records.

The bibliography section uses a section whose name starts with `ZOTERO_BIBL` and ends with `CSL_BIBLIOGRAPHY`:

```xml
<text:section text:style-name="Sect1" text:name="ZOTERO_BIBL {\"uncited\":[],\"omitted\":[],\"custom\":[]} CSL_BIBLIOGRAPHY RNDjURflxggFg">
... rendered bibliography text ...
</text:section>
```

---

### Mendeley

#### Mendeley Cite (DOCX, current)

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

The legacy Mendeley Desktop plugin (retired September 2022) used an ADDIN field with the prefix `ADDIN CSL_CITATION` (even older versions used `ADDIN Mendeley Citation{UUID} CSL_CITATION`). The JSON includes a `mendeley` object:

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

The legacy Mendeley OpenOffice plugin stores citations as reference marks with the name pattern `CSL_CITATION {JSON}`, using the same CSL-JSON payload (with the `mendeley` object) as in DOCX:

```xml
<text:reference-mark-start text:name="CSL_CITATION {&quot;citationID&quot;:...}"/>
(Smith, 2007)
<text:reference-mark-end text:name="CSL_CITATION {&quot;citationID&quot;:...}"/>
```

The bibliography reference mark name contains `CSL_BIBLIOGRAPHY`.

---

### EndNote

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

---

### Citavi

Citavi is DOCX-only. Saving a Citavi-annotated DOCX as ODT converts all fields to static text.

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

The base64-decoded payload is proprietary Citavi JSON (using Newtonsoft-style `$type`/`$id` metadata, not CSL-JSON):

```json
{
  "$type": "SwissAcademic.Citavi.Citations.WordPlaceholder",
  "WAIVersion": 2,
  "Entries": [{
    "$type": "SwissAcademic.Citavi.Citations.WordPlaceholderEntry",
    "ReferenceId": "uuid-of-reference-in-citavi-project",
    "FormattedText": "(Burton 2013)"
  }],
  "Text": "(Burton 2013; Manning 2016)"
}
```

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

JabRef has no Word plugin and does not insert citations into DOCX files directly. It can export a standalone MS Office Bibliography XML file (namespace `http://schemas.microsoft.com/office/word/2004/10/bibliography`) which the user imports into Word's built-in source manager via "Manage Sources > Browse". Once imported, Word manages the citations itself using its native `CITATION` field — JabRef is no longer involved:

```xml
<w:instrText xml:space="preserve"> CITATION Mor01 \l 1033 </w:instrText>
```

Where `Mor01` is the citation key (stored as `<b:Tag>` in the XML). Word stores the source data in `customXml/item1.xml` within the DOCX ZIP. The resulting DOCX contains no JabRef-specific markers.

---

### Summary

| Manager | DOCX inline | DOCX bibliography | ODT inline | ODT bibliography |
|---------|-------------|-------------------|------------|-----------------|
| Zotero | `ADDIN ZOTERO_ITEM CSL_CITATION {json} RND<id>` (trailing random ID after JSON) | `ADDIN ZOTERO_BIBL {json} CSL_BIBLIOGRAPHY` | reference mark: `ZOTERO_ITEM CSL_CITATION {json} RND<id>` (trailing random ID after JSON) | reference mark: `ZOTERO_BIBL ... CSL_BIBLIOGRAPHY` |
| Mendeley Cite (current) | `w:sdt` with `w:tag="MENDELEY_CITATION_v3_{base64json}"` | `w:sdt` with `w:tag="MENDELEY_BIBLIOGRAPHY"` | not supported | not supported |
| Mendeley Desktop (legacy) | `ADDIN CSL_CITATION {json}` | `ADDIN Mendeley Bibliography CSL_BIBLIOGRAPHY` | reference mark: `CSL_CITATION {json}` | reference mark: `CSL_BIBLIOGRAPHY` |
| EndNote | `ADDIN EN.CITE <EndNote>...</EndNote>` (XML in field) | `ADDIN EN.REFLIST` | `{Author, Year #RecordNum}` plain text only | static text |
| Citavi | `w:sdt` wrapping `ADDIN CitaviPlaceholder{base64}` | `w:sdt` wrapping `ADDIN CITAVI BIBLIOGRAPHY` | not supported | not supported |
| JabRef | no plugin; export to Word's native `CITATION key` via MS Office Bibliography XML | `customXml/item1.xml` in DOCX | reference mark: `JABREF_{key} CID_{n} {id}` (wraps rendered text) | `<text:section text:name="JR_bib">` plain text |
| Word native | `CITATION key \l locale` | `BIBLIOGRAPHY` field; sources in `customXml/item1.xml` | not applicable | not applicable |
| LibreOffice native | not applicable | not applicable | `<text:bibliography-mark>` with data as attributes | `<text:bibliography>` element |
