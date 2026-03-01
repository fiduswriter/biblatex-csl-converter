#!/usr/bin/env node --experimental-strip-types
/**
 * scripts/build-i18n.ts
 *
 * Reads every locale JSON file from src/i18n/locales/ and writes a single
 * i18n/index.js that inlines all locale data as plain JS object literals.
 *
 * This means downstream consumers of i18n/index.js require no JSON-import
 * support and no bundler configuration — it is a self-contained CJS module.
 *
 * Usage:
 *   node --experimental-strip-types scripts/build-i18n.ts
 */

import {readFileSync, writeFileSync, mkdirSync, readdirSync} from "fs"
import {join, basename, dirname} from "path"
import {fileURLToPath} from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")
const localesDir = join(rootDir, "src", "i18n", "locales")
const outDir = join(rootDir, "i18n")
const outFile = join(outDir, "index.js")

// ---------------------------------------------------------------------------
// Read locale files
// ---------------------------------------------------------------------------

interface LocaleEntry {
    tag: string
    id: string
    data: Record<string, unknown>
}

const localeFiles = readdirSync(localesDir)
    .filter((f: string) => f.endsWith(".json"))
    .sort()

if (localeFiles.length === 0) {
    console.error(`No JSON files found in ${localesDir}`)
    process.exit(1)
}

/**
 * Derive a safe JS identifier from an IETF language tag.
 * e.g. "pt-BR" → "ptBR", "en" → "en"
 */
function tagToIdentifier(tag: string): string {
    return tag.replace(/-([a-zA-Z])/g, (_, c: string) => c.toUpperCase())
}

const locales: LocaleEntry[] = localeFiles.map((file: string) => {
    const tag = basename(file, ".json")
    const id = tagToIdentifier(tag)
    const data = JSON.parse(readFileSync(join(localesDir, file), "utf8")) as Record<string, unknown>
    return {tag, id, data}
})

// ---------------------------------------------------------------------------
// Code generation helpers
// ---------------------------------------------------------------------------

/**
 * Serialise a plain JSON value to a JS literal. We intentionally avoid
 * JSON.stringify so we get readable output with keys quoted only when they
 * contain non-identifier characters (e.g. "article-journal").
 */
function serializeValue(value: unknown, indent: string): string {
    if (typeof value === "string") {
        // Escape backslashes and double-quotes, keep everything else as-is.
        const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        return `"${escaped}"`
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return "[]"
        const inner = value
            .map((v: unknown) => `${indent}    ${serializeValue(v, indent + "    ")}`)
            .join(",\n")
        return `[\n${inner},\n${indent}]`
    }
    if (value !== null && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
        if (entries.length === 0) return "{}"
        const inner = entries
            .map(([k, v]) => {
                // Use a quoted key if the key contains non-identifier chars.
                const needsQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
                const keyStr = needsQuotes ? `"${k}"` : k
                return `${indent}    ${keyStr}: ${serializeValue(v, indent + "    ")}`
            })
            .join(",\n")
        return `{\n${inner},\n${indent}}`
    }
    // number, boolean, null
    return String(value)
}

/** Render a single locale const declaration. */
function renderLocaleConst({id, tag, data}: LocaleEntry): string {
    return `// Locale: ${tag}\nconst ${id} = ${serializeValue(data, "")}\n`
}

// ---------------------------------------------------------------------------
// Build the locales registry object literal
// ---------------------------------------------------------------------------

function renderRegistry(entries: LocaleEntry[]): string {
    const lines = entries
        .map(({tag, id}) => {
            const needsQuotes = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(tag)
            const keyStr = needsQuotes ? `"${tag}"` : tag
            return `    ${keyStr}: ${id}`
        })
        .join(",\n")
    return `const locales = Object.freeze({\n${lines},\n})\n`
}

// ---------------------------------------------------------------------------
// Helper functions — mirrors src/i18n/index.ts, without TypeScript types,
// emitted verbatim into the generated output file.
// ---------------------------------------------------------------------------

const helperFunctions = `
/**
 * Return the Locale for lang, falling back to English when not available.
 *
 * Lookup order:
 * 1. Exact tag  (e.g. "pt-BR")
 * 2. Base subtag (e.g. "pt" from "pt-BR")
 * 3. English fallback
 *
 * @param {string} lang
 * @returns {object}
 */
function getLocale(lang) {
    if (Object.prototype.hasOwnProperty.call(locales, lang)) {
        return locales[lang]
    }
    const base = lang.split("-")[0]
    if (base !== lang && Object.prototype.hasOwnProperty.call(locales, base)) {
        return locales[base]
    }
    return locales["en"]
}

/**
 * Return the human-readable label for fieldKey in the context of typeKey.
 * Checks locale.fieldTitlesByType[typeKey][fieldKey] first, then falls back
 * to locale.fieldTitles[fieldKey], and finally to the raw key itself.
 *
 * @param {object} locale
 * @param {string} typeKey
 * @param {string} fieldKey
 * @returns {string}
 */
function getFieldTitle(locale, typeKey, fieldKey) {
    const byType = locale.fieldTitlesByType[typeKey]
    if (byType && Object.prototype.hasOwnProperty.call(byType, fieldKey)) {
        return byType[fieldKey]
    }
    if (Object.prototype.hasOwnProperty.call(locale.fieldTitles, fieldKey)) {
        return locale.fieldTitles[fieldKey]
    }
    return fieldKey
}

/**
 * Return the human-readable label for typeKey in locale, falling back to the
 * raw key if not found.
 *
 * @param {object} locale
 * @param {string} typeKey
 * @returns {string}
 */
function getTypeTitle(locale, typeKey) {
    return Object.prototype.hasOwnProperty.call(locale.typeTitles, typeKey)
        ? locale.typeTitles[typeKey]
        : typeKey
}

/**
 * Return the help/hint text for fieldKey in locale, or undefined when no help
 * text is defined for that field.
 *
 * @param {object} locale
 * @param {string} fieldKey
 * @returns {string|undefined}
 */
function getFieldHelp(locale, fieldKey) {
    return Object.prototype.hasOwnProperty.call(locale.fieldHelp, fieldKey)
        ? locale.fieldHelp[fieldKey]
        : undefined
}

/**
 * Return the human-readable label for a langid field value in locale, falling
 * back to the raw key if not found.
 *
 * @param {object} locale
 * @param {string} langidKey
 * @returns {string}
 */
function getLangidTitle(locale, langidKey) {
    return Object.prototype.hasOwnProperty.call(locale.langidOptions, langidKey)
        ? locale.langidOptions[langidKey]
        : langidKey
}

/**
 * Return the human-readable label for a non-language option value in locale
 * (editortype, pagination, pubstate, or type sub-field value), falling back
 * to the raw key if not found.
 *
 * @param {object} locale
 * @param {string} optionKey
 * @returns {string}
 */
function getOtherOptionTitle(locale, optionKey) {
    return Object.prototype.hasOwnProperty.call(locale.otherOptions, optionKey)
        ? locale.otherOptions[optionKey]
        : optionKey
}
`

// ---------------------------------------------------------------------------
// Assemble output
// ---------------------------------------------------------------------------

const banner = `/**
 * i18n/index.js — AUTO-GENERATED, DO NOT EDIT BY HAND.
 *
 * Generated by: scripts/build-i18n.ts
 * Source files: src/i18n/locales/*.json
 *
 * To regenerate:
 *   npm run compile_i18n
 *
 * This file inlines all locale data as plain JavaScript object literals so
 * that no JSON-import support is required by consumers of this module.
 */

"use strict"

`

const exports_ = `
module.exports = {
    locales,
    getLocale,
    getFieldTitle,
    getTypeTitle,
    getFieldHelp,
    getLangidTitle,
    getOtherOptionTitle,
}
`

const output = [
    banner,
    locales.map(renderLocaleConst).join("\n"),
    "\n",
    renderRegistry(locales),
    helperFunctions,
    exports_,
].join("")

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

mkdirSync(outDir, {recursive: true})
writeFileSync(outFile, output, "utf8")

console.log(
    `i18n/index.js written (${locales.length} locale${locales.length === 1 ? "" : "s"}: ${locales.map((l) => l.tag).join(", ")})`,
)