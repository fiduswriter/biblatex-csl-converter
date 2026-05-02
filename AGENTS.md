# AGENTS.md - AI Agent Guide for biblatex-csl-converter

## Project Overview

`biblatex-csl-converter` is a JavaScript/TypeScript library that provides conversion capabilities between different bibliography formats. It serves as a critical component in the Fidus Writer ecosystem for handling citation management.

### Core Functionality

The library handles conversions between:
- **BibLaTeX/BibTeX** ↔ **Internal JSON format**
- **Internal JSON format** ↔ **CSL (Citation Style Language)**
- **CSL JSON** → **Internal JSON format**
- **EndNote XML** → **Internal JSON format**
- **RIS** → **Internal JSON format**
- **ENW (EndNote Web)** → **Internal JSON format**
- **Citavi JSON** → **Internal JSON format**

The internal JSON format preserves all information from BibLaTeX imports, which CSL JSON cannot fully represent, enabling round-trip conversions without data loss.

The library also ships a full **i18n module** (`src/i18n/`) with human-readable translations of field names, entry-type names, option values, and help text in seven languages.

## Architecture

### Source Structure

```
src/
├── index.ts              # Main entry point — exports all public APIs
├── const.ts              # Shared constants, types, and BibLaTeX type definitions
├── edtf-parser.ts        # EDTF (Extended Date/Time Format) parser
├── unescape-csl.ts       # CSL text unescaping utilities
├── i18n/                 # Internationalisation module
│   ├── index.ts          # Public API: getLocale(), getFieldTitle(), getTypeTitle(), …
│   ├── types.ts          # TypeScript interfaces: Locale, FieldTitles, TypeTitles, …
│   ├── locales.ts        # Auto-generated barrel file (do not edit by hand)
│   └── locales/          # JSON source files, one per language
│       ├── bg.json       # Bulgarian
│       ├── de.json       # German
│       ├── en.json       # English
│       ├── es.json       # Spanish
│       ├── fr.json       # French
│       ├── it.json       # Italian
│       └── pt-BR.json    # Brazilian Portuguese
├── import/               # Parsers for various bibliography formats
│   ├── biblatex.ts       # BibLaTeX/BibTeX parser
│   ├── citavi.ts         # Citavi JSON parser
│   ├── csl.ts            # CSL JSON parser
│   ├── endnote.ts        # EndNote XML parser
│   ├── enw.ts            # EndNote Web (.enw) parser
│   ├── ris.ts            # RIS format parser
│   ├── const.ts          # Import-specific constants
│   ├── tools.ts          # Shared parsing utilities
│   ├── name-parser.ts    # Author/name parsing
│   ├── literal-parser.ts # Literal field parsing
│   └── group-parser.ts   # JabRef group parsing
├── export/               # Exporters to various formats
│   ├── biblatex.ts       # BibLaTeX exporter
│   ├── const.ts          # Export-specific constants
│   └── csl/              # CSL export module
│       ├── index.ts      # Main CSL exporter
│       └── sentence-caser.ts # Sentence case conversion
└── entries/              # Rollup entry-point shims for browser/demo bundles
    ├── browser-biblatex-csl-converter.ts  # Full library IIFE entry
    ├── browser-export-biblatex.ts         # BibLaTeX exporter IIFE entry
    ├── browser-export-csl.ts              # CSL exporter IIFE entry
    ├── browser-import-bibtex.ts           # BibLaTeX parser IIFE entry
    ├── browser-import-csl.ts              # CSL parser IIFE entry
    └── demo.ts                            # Demo page entry (GitHub Pages bundle)

scripts/
└── build-i18n.ts         # Node script: generates src/i18n/locales.ts from JSON locale files
```

### Key Types and Interfaces

- **`BibDB`**: The internal bibliography database format (`Record<number, EntryObject>`)
- **`EntryObject`**: A single bibliography entry with `fields`, `bib_type`, and `entry_key`
- **`CSLEntry`**: CSL-formatted entry
- **`NodeArray`**: Internal representation of rich text (array of text/markup nodes)
- **`NameDictObject`**: Structured author/editor name representation
- **`Locale`**: i18n locale object with `fieldTitles`, `typeTitles`, `fieldHelp`, `fieldTitlesByType`, `langidOptions`, `otherOptions`

## Development Workflow

### Prerequisites
- Node.js >= 22
- npm

### Common Commands

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Format code (auto-fix)
npm run format

# Run tests
npm test

# Compile all outputs
npm run compile

# Compile only the demo bundle
npm run compile_demo

# Regenerate src/i18n/locales.ts from the JSON locale files
npm run compile_i18n

# Prepare for publishing (lint + compile)
npm run prepare
```

### Build Outputs

The project produces multiple build outputs:
- **`lib/index.js`**: CommonJS module
- **`lib/index.mjs`**: ES module
- **`lib/index.d.ts`**: TypeScript declarations
- **`browser/*.js`**: Browser-ready IIFE bundles
- **`demo/demo.js`**: Demo page bundle (compiled output, not tracked in git)

## Testing

### Test Structure
- Tests are located in `/test` directory
- Test fixtures are in `/test/fixtures/` with subdirectories for import/export:
  - `test/fixtures/import/bib/` — BibLaTeX/BibTeX fixtures
  - `test/fixtures/import/csl/` — CSL JSON fixtures
  - `test/fixtures/import/ris/` — RIS fixtures
  - `test/fixtures/import/enw/` — ENW fixtures
  - `test/fixtures/import/endnote/` — EndNote XML fixtures
  - `test/fixtures/import/citavi/` — Citavi JSON fixtures
  - `test/fixtures/export/` — BibLaTeX/CSL export fixtures
- Uses Mocha test framework with Chai assertions
- Each test compares parser output against expected JSON fixtures

### Running Tests
```bash
npm test  # Runs linting, compiles test bundle, and executes tests with coverage
```

### Test Pattern
Tests typically:
1. Read input files from fixtures
2. Parse using the appropriate converter
3. Compare output against expected JSON fixtures
4. Clean metadata (errors, warnings, comments) before comparison

## API Reference

For comprehensive API documentation, see **[API.md](API.md)**.

### Quick Reference

**Core Parsers:**
- `BibLatexParser` — Parse BibLaTeX/BibTeX files
- `CSLParser` — Parse CSL JSON
- `RISParser`, `ENWParser`, `NBIBParser` — Parse various bibliography formats
- `EndNoteParser`, `CitaviParser` — Parse EndNote and Citavi data

**Core Exporters:**
- `BibLatexExporter` — Export to BibLaTeX
- `CSLExporter` — Export to CSL JSON

**Document Citation Parsers:**
- `DocxCitationsParser` — Extract citations from DOCX files (Zotero, Mendeley, EndNote, Citavi, Word native, JabRef)
- `OdtCitationsParser` — Extract citations from ODT files (Zotero, Mendeley, JabRef, LibreOffice native, EndNote)

Both document citation parsers provide:
- **Instance methods** for full-document parsing
- **Static methods** for element-level checking and extraction with a `retrieve` parameter

**i18n Module:**
- `getLocale()`, `getFieldTitle()`, `getTypeTitle()` — Get translated labels
- Available languages: `bg`, `de`, `en`, `es`, `fr`, `it`, `pt-BR`

See [API.md](API.md) for detailed usage examples and type definitions.

## Demo Page (`demo/`)

The demo is a single-page browser application at `demo/index.html` backed by the
compiled bundle `demo/demo.js` (built by `npm run compile_demo`).

### Features

- **Format selector** — switch input format among BibLaTeX, CSL JSON, RIS, ENW,
  EndNote XML, and Citavi JSON. The file-input `accept` attribute updates automatically.
- **File upload or paste** — load a bibliography by choosing a file or pasting text
  directly into the paste area.
- **Language selector** — choose from all seven supported UI languages. Changing the
  language re-renders the BibDB panel instantly (no re-import required) using
  `getLocale()` / `getFieldTitle()` / `getTypeTitle()`.
- **Three-column output**:
  - *BibDB* — the internal JSON representation, displayed as collapsible entry blocks
    with translated field labels and tooltip help badges.
  - *CSL JSON export* — the result of running `CSLExporter` on the parsed BibDB.
  - *BibLaTeX re-export* — the result of running `BibLatexExporter`, demonstrating
    round-trip fidelity.
- **Stats bar** — entry count and processing time after each import.
- **Locale showcase** — a permanent grid at the bottom of the page that renders the
  "Journal article / Author(s)" label in all seven languages, demonstrating the i18n
  data without requiring a file import.

### Entry-Point (`src/entries/demo.ts`)

The demo entry-point assigns the following names onto `globalThis` so that the inline
`<script>` in `index.html` can call them directly:

| Parsers & Exporters | i18n helpers |
|---------------------|--------------|
| `BibLatexParser` | `locales` |
| `BibLatexExporter` | `getLocale` |
| `CSLExporter` | `getFieldTitle` |
| `CSLParser` | `getTypeTitle` |
| `EndNoteParser` | `getFieldHelp` |
| `RISParser` | `getLangidTitle` |
| `ENWParser` | `getOtherOptionTitle` |
| `CitaviParser` | |
| `edtfParse` | |

## Important Concepts

### Internal JSON Format

The internal format uses a structured representation:
- **Rich text fields**: Stored as `NodeArray` — arrays of text nodes with markup
  information
- **Names**: Stored as `NameDictObject` with separate family, given, prefix, suffix
  fields
- **Dates**: Stored as EDTF-compliant strings
- **Entry types**: Mapped to internal type names via `BibTypes`

### Field Processing Options (BibLatexParser)

- **`processUnexpected`**: Handle fields that are known but not expected for the entry
  type
- **`processUnknown`**: Handle entirely unknown field names (pass `true` or a
  `Record<string, string>` mapping unknown keys to known field types)
- **`includeLocation`**: Add source location information to entries
- **`includeRawText`**: Include raw source text for each entry

### Type Mappings

The `const.ts` file contains mappings between:
- BibLaTeX entry types ↔ Internal types ↔ CSL types
- BibLaTeX field names ↔ Internal field names ↔ CSL fields
- Language identifiers (langid) ↔ CSL language codes

## Code Patterns and Conventions

### TypeScript Usage
- Strict mode enabled
- All public APIs have explicit type exports
- Interface-based type definitions for complex objects

### Parser Pattern
All parsers follow the same pattern:
1. Constructor accepts the format-specific input and optional configuration
2. `parse()` returns `Record<number, EntryObject>` (i.e. `BibDB`)
3. `errors` and `warnings` arrays are populated during parsing
4. `BibLatexParser` additionally offers `parseAsync()` for large files

### Error Handling
- Errors are collected rather than thrown during parsing
- Always check `parser.errors` and `parser.warnings` after calling `parse()`
- Error objects include `type`, `field`, `value`, and `entry` properties

### Text Processing
- Rich text uses a node-based `NodeArray` representation
- Markup (bold, italic, smallcaps, superscript, etc.) is stored as marks on text nodes
- Special LaTeX characters are escaped/unescaped during conversion

## Common Tasks

### Adding Support for a New Field
1. Add the field definition to `BibFieldTypes` in `const.ts`
2. Update the relevant import parsers to handle the field
3. Update the relevant export parsers to output the field
4. Add translation keys to each locale JSON in `src/i18n/locales/`
5. Run `npm run compile_i18n`
6. Add test fixtures for the new field

### Adding a New Entry Type
1. Add the type definition to `BibTypes` in `const.ts`
2. Map required/optional fields for the type
3. Update CSL type mappings if applicable
4. Add translation keys to each locale JSON in `src/i18n/locales/`
5. Run `npm run compile_i18n`
6. Add test fixtures for the new type

### Adding a New Locale
1. Create `src/i18n/locales/<tag>.json` following the structure of `en.json`
2. Export the new object from `src/i18n/index.ts` and add it to the `locales` registry
3. Run `npm run compile_i18n`
4. Add the new language to the `<select id="lang-select">` in `demo/index.html`

### Modifying Text Processing
- Text parsing logic is in `import/literal-parser.ts`
- Name parsing logic is in `import/name-parser.ts`
- Markup tag mappings are defined in the exporter `TAGS` constants

## Dependencies

### Runtime
- **xregexp**: Extended regular expression support for complex parsing

### Development
- **Rollup**: Module bundling with plugins for TypeScript, Babel, etc.
- **TypeScript**: Type checking and compilation
- **Mocha/Chai**: Testing framework
- **c8**: Code coverage
- **ESLint/Prettier**: Code quality and formatting

## Browser Usage

Pre-built browser bundles are available in the `browser/` directory:
- `biblatex-csl-converter.js` — Full library
- `import-bibtex.js` — BibLaTeX import only
- `export-biblatex.js` — BibLaTeX export only
- `import-csl.js` — CSL import only
- `export-csl.js` — CSL export only

Each bundle is produced by Rollup using the corresponding TypeScript entry-point shim
in `src/entries/`. These shims import from the library and assign exports onto
`globalThis` so they are accessible as browser globals.

## Build Scripts vs. Entry-Point Shims

It is important to distinguish two very different kinds of files involved in the build:

- **`scripts/*.ts`** — Node.js scripts run directly via
  `node --experimental-strip-types scripts/<name>.ts`. These perform code-generation
  or other one-off tasks at build time. Node 22+ is required.
- **`src/entries/*.ts`** — TypeScript source modules consumed *by Rollup* as bundle
  entry points. They are never run by Node directly; Rollup compiles them into the
  browser IIFE bundles in `browser/` and the `demo/demo.js` demo bundle.
- **`rollup.config*.mjs`** — Rollup configuration files (ESM `.mjs`) at the project
  root, invoked by the `rollup -c` CLI. These are also never run by Node directly.
- **`demo/index.html`** — The static HTML page for the GitHub Pages demo. The compiled
  `demo/demo.js` (output of `compile_demo`) is gitignored and built by CI before
  being published to GitHub Pages via the `test.yml` workflow.

## Notes for AI Agents

1. **Preserve Data Integrity**: The internal JSON format exists to prevent data loss
   during round-trip conversions. Always use it as an intermediate format.

2. **Check Errors**: After any parsing operation, check the `errors` and `warnings`
   arrays to understand any issues with the input.

3. **Type Safety**: Leverage TypeScript types — they provide important information
   about field structures and expected values.

4. **Test Fixtures**: When adding features, create corresponding test fixtures in
   `/test/fixtures/`.

5. **Configuration Options**: Many parsers accept configuration objects. Check the
   `ConfigObject` interfaces for available options.

6. **Async vs Sync**: `BibLatexParser` supports both synchronous (`parse()`) and
   asynchronous (`parseAsync()`) operation. Use async for large files to avoid
   blocking the main thread.

7. **Markup Handling**: The `NodeArray` format preserves text formatting. When working
   with text fields, handle the node structure appropriately.

8. **i18n Regeneration**: `src/i18n/locales.ts` is auto-generated. Always run
   `npm run compile_i18n` after editing any file under `src/i18n/locales/`. Never
   commit manual edits to `locales.ts`.

9. **Demo Entry-Point**: `src/entries/demo.ts` exposes all parsers, exporters, and i18n
   helpers on `globalThis`. If you add a new public API that should be demonstrable in
   the demo, add it to both the `import` block and the `Object.assign(globalThis, …)`
   call in that file, then run `npm run compile_demo`.

10. **Citavi XML vs JSON**: The `CitaviParser` consumes Citavi's **JSON** export format
    (not XML). The `EndNoteParser` consumes a plain JS object tree derived from
    EndNote's **XML** format — callers are responsible for converting the XML DOM to
    a plain object array before passing it to the parser (see `demo.ts` for a reference
    implementation using `DOMParser`).