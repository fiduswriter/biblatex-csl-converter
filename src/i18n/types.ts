/**
 * Type definitions for the i18n module.
 *
 * Kept in a separate file so that `locales.ts` (which is auto-generated) can
 * import the `Locale` interface without creating a circular dependency with
 * `index.ts` (which in turn imports the locale objects from `locales.ts`).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Human-readable labels for every supported BibLaTeX / CSL field key. */
export type FieldTitles = Record<string, string>

/**
 * Help / hint text for selected fields.  Only fields that benefit from extra
 * explanation have an entry here (date format, name-prefix convention, …).
 */
export type FieldHelp = Record<string, string>

/** Human-readable labels for every supported reference-type key. */
export type TypeTitles = Record<string, string>

/**
 * Per-reference-type overrides for field labels.
 *
 * Outer key = reference-type key (e.g. `"video"`).
 * Inner key = field key (e.g. `"author"`).
 * Value = label to use instead of the generic one in `fieldTitles`.
 */
export type FieldTitlesByType = Record<string, Record<string, string>>

/**
 * Human-readable labels for every value valid in the BibLaTeX `langid` field,
 * including BibTeX-level aliases (e.g. `pinyin`, `american`, `english`).
 */
export type LangidOptions = Record<string, string>

/**
 * Human-readable labels for option values used in fields other than `langid`:
 * `editortype`, `pagination`, `pubstate`, and the `type` sub-field.
 */
export type OtherOptions = Record<string, string>

/** A complete locale object — one per language JSON file. */
export interface Locale {
    fieldTitles: FieldTitles
    fieldHelp: FieldHelp
    typeTitles: TypeTitles
    fieldTitlesByType: FieldTitlesByType
    langidOptions: LangidOptions
    otherOptions: OtherOptions
}
