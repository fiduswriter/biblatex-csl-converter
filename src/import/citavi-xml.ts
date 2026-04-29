/**
 * Citavi XML project format parser (.ctv5 / .ctv6)
 *
 * The XML format stores Persons, Keywords, Publishers, Periodicals and
 * SeriesTitles in separate lookup tables and links them to references via
 * "OnetoN" relation elements whose text content is:
 *
 *   <referenceId>;<linkedId1>;<linkedId2>…
 *
 * This parser resolves all those links, reconstructs CitaviReference objects,
 * attaches parent references for Contribution-type entries, and then hands the
 * result to CitaviParser for the actual field-level conversion.
 *
 * Accepts any DOM Document object (browser Document, or one produced by a
 * library such as @xmldom/xmldom), or a plain XML string that will be parsed
 * with the global DOMParser when available (browser / Deno / Node 22+).
 *
 * Only DOM Level 2 APIs are used (getElementsByTagName, getAttribute,
 * childNodes, textContent) so the class is compatible with @xmldom/xmldom.
 */

import type { EntryObject } from "../const"
import {
    type CitaviKeyword,
    CitaviParser,
    type CitaviPeriodical,
    type CitaviPerson,
    type CitaviPublisher,
    type CitaviReference,
} from "./citavi"

interface XmlErrorObject {
    type: string
    entry?: string
    value?: unknown
}

export class CitaviXmlParser {
    private doc: Document
    errors: XmlErrorObject[]
    warnings: XmlErrorObject[]

    constructor(input: Document | string) {
        if (typeof input === "string") {
            if (typeof DOMParser === "undefined") {
                throw new Error(
                    "CitaviXmlParser: DOMParser is not available in this " +
                        "environment. Pass a pre-parsed Document instead.",
                )
            }
            this.doc = new DOMParser().parseFromString(input, "text/xml")
        } else {
            this.doc = input
        }
        this.errors = []
        this.warnings = []
    }

    parse(): Record<number, EntryObject> {
        const root = this.doc.documentElement
        if (!root || root.tagName !== "CitaviExchangeData") {
            this.errors.push({ type: "invalid_xml_root" })
            return {}
        }

        // ── Build lookup tables ──────────────────────────────────────────────
        const persons = this.buildPersonMap(root)
        const keywords = this.buildKeywordMap(root)
        const publishers = this.buildPublisherMap(root)
        const periodicals = this.buildPeriodicalMap(root)
        const seriesTitles = this.buildSeriesTitleMap(root)

        // ── Build relation maps (referenceId → [linkedId, …]) ────────────────
        const refAuthors = this.buildOneToNMap(root, "ReferenceAuthors")
        const refEditors = this.buildOneToNMap(root, "ReferenceEditors")
        const refCollaborators = this.buildOneToNMap(
            root,
            "ReferenceCollaborators",
        )
        const refOrganizations = this.buildOneToNMap(
            root,
            "ReferenceOrganizations",
        )
        const refPublishers = this.buildOneToNMap(root, "ReferencePublishers")
        const refKeywords = this.buildOneToNMap(root, "ReferenceKeywords")

        // ── ReferenceReferences: maps childId → parentId ─────────────────────
        const childToParent = this.buildChildToParentMap(root)

        // ── Parse all Reference elements into a raw map ──────────────────────
        const refsSection = this.firstChildEl(root, "References")
        const refElements = refsSection
            ? Array.from(refsSection.getElementsByTagName("Reference"))
            : []

        const rawById = new Map<string, Element>()
        for (const el of refElements) {
            const id = el.getAttribute("id")
            if (id) rawById.set(id, el)
        }

        // ── Convert each Reference element to a CitaviReference ──────────────
        // convertedById guards against infinite loops from accidental cycles in
        // the ReferenceReferences table.
        const convertedById = new Map<string, CitaviReference>()

        const convertEl = (el: Element): CitaviReference => {
            const id = el.getAttribute("id") ?? ""

            if (convertedById.has(id)) {
                return convertedById.get(id)!
            }

            const ref: CitaviReference = { Id: id }

            // Simple scalar text fields
            ref.ReferenceType = this.childText(el, "ReferenceType") ?? undefined
            ref.Title = this.childText(el, "Title") ?? undefined
            ref.Subtitle = this.childText(el, "Subtitle") ?? undefined
            ref.TitleSupplement =
                this.childText(el, "TitleSupplement") ?? undefined
            ref.ShortTitle = this.childText(el, "ShortTitle") ?? undefined
            ref.Abstract = this.childText(el, "Abstract") ?? undefined
            ref.Year = this.childText(el, "Year") ?? undefined
            // DateForSorting holds an ISO datetime; strip the time portion for
            // the YearResolved field that CitaviParser uses as a year fallback
            ref.YearResolved =
                this.childText(el, "DateForSorting")?.split("T")[0] ?? undefined
            ref.Date = this.childText(el, "Date") ?? undefined
            ref.Date2 = this.childText(el, "Date2") ?? undefined
            ref.AccessDate = this.childText(el, "AccessDate") ?? undefined
            ref.Volume = this.childText(el, "Volume") ?? undefined
            ref.Number = this.childText(el, "Number") ?? undefined
            ref.Edition = this.childText(el, "Edition") ?? undefined
            ref.NumberOfVolumes =
                this.childText(el, "NumberOfVolumes") ?? undefined
            ref.PageRange = this.childText(el, "PageRange") ?? undefined
            ref.PageCount = this.childText(el, "PageCount") ?? undefined
            ref.Isbn = this.childText(el, "ISBN") ?? undefined
            ref.Doi = this.childText(el, "DOI") ?? undefined
            ref.OnlineAddress = this.childText(el, "OnlineAddress") ?? undefined
            ref.PlaceOfPublication =
                this.childText(el, "PlaceOfPublication") ?? undefined
            ref.Language = this.childText(el, "Language") ?? undefined
            ref.LanguageCode = this.childText(el, "LanguageCode") ?? undefined
            ref.StorageMedium = this.childText(el, "StorageMedium") ?? undefined
            // XML uses CitationKey; JSON uses BibTeXKey — normalise to BibTeXKey
            ref.BibTeXKey = this.childText(el, "CitationKey") ?? undefined

            // SpecificField slots 1–7
            for (let i = 1; i <= 7; i++) {
                const key = `SpecificField${i}` as keyof CitaviReference
                const val = this.childText(el, `SpecificField${i}`)
                if (val !== null) {
                    const refRecord = ref as Record<string, unknown>
                    refRecord[key] = val
                }
            }

            // Periodical (via PeriodicalID → lookup table)
            const periodicalId = this.childText(el, "PeriodicalID")
            if (periodicalId && periodicals.has(periodicalId)) {
                ref.Periodical = periodicals.get(periodicalId)
            }

            // SeriesTitle (via SeriesTitleID → lookup table)
            const seriesId = this.childText(el, "SeriesTitleID")
            if (seriesId && seriesTitles.has(seriesId)) {
                ref.SeriesTitle = seriesTitles.get(seriesId)
            }

            // People via OnetoN relation tables
            ref.Authors = this.resolvePersons(id, refAuthors, persons)
            ref.Editors = this.resolvePersons(id, refEditors, persons)
            ref.Collaborators = this.resolvePersons(
                id,
                refCollaborators,
                persons,
            )
            ref.Organizations = this.resolvePersons(
                id,
                refOrganizations,
                persons,
            )

            // Publishers via OnetoN relation table
            const publisherIds = refPublishers.get(id) ?? []
            ref.Publishers = publisherIds
                .map((pid) => publishers.get(pid))
                .filter((p): p is CitaviPublisher => p !== undefined)

            // Keywords via OnetoN relation table
            const keywordIds = refKeywords.get(id) ?? []
            ref.Keywords = keywordIds
                .map((kid) => keywords.get(kid))
                .filter((k): k is CitaviKeyword => k !== undefined)

            // Store in map before resolving parent to guard against cycles
            convertedById.set(id, ref)

            // Parent reference (Contribution, MusicTrack, etc.)
            const parentId = childToParent.get(id)
            if (parentId) {
                const parentEl = rawById.get(parentId)
                if (parentEl) {
                    ref.ParentReference = convertEl(parentEl)
                } else {
                    this.warnings.push({
                        type: "missing_parent_reference",
                        entry: id,
                        value: parentId,
                    })
                }
            }

            return ref
        }

        // Convert all references in document order
        const references: CitaviReference[] = []
        for (const el of refElements) {
            const id = el.getAttribute("id")
            if (id) {
                references.push(convertEl(el))
            }
        }

        // Delegate to CitaviParser for all field-level conversion logic
        const inner = new CitaviParser(references)
        const result = inner.parse()

        // Bubble up errors and warnings from the inner parser
        this.errors.push(...inner.errors)
        this.warnings.push(...inner.warnings)

        return result
    }

    // ── Lookup-table builders ─────────────────────────────────────────────────

    private buildPersonMap(root: Element): Map<string, CitaviPerson> {
        const map = new Map<string, CitaviPerson>()
        const section = this.firstChildEl(root, "Persons")
        if (!section) return map
        for (const el of Array.from(section.getElementsByTagName("Person"))) {
            const id = el.getAttribute("id")
            if (!id) continue
            const person: CitaviPerson = {
                Id: id,
                FirstName: this.childText(el, "FirstName") ?? undefined,
                LastName: this.childText(el, "LastName") ?? undefined,
                MiddleName: this.childText(el, "MiddleName") ?? undefined,
            }
            // Corporate / organisation entry: no personal name parts present
            if (!person.FirstName && !person.LastName) {
                person.Name = this.childText(el, "Name") ?? undefined
            }
            map.set(id, person)
        }
        return map
    }

    private buildKeywordMap(root: Element): Map<string, CitaviKeyword> {
        const map = new Map<string, CitaviKeyword>()
        const section = this.firstChildEl(root, "Keywords")
        if (!section) return map
        for (const el of Array.from(section.getElementsByTagName("Keyword"))) {
            const id = el.getAttribute("id")
            if (!id) continue
            const name = this.childText(el, "Name")
            if (name !== null) {
                map.set(id, { Name: name })
            }
        }
        return map
    }

    private buildPublisherMap(root: Element): Map<string, CitaviPublisher> {
        const map = new Map<string, CitaviPublisher>()
        const section = this.firstChildEl(root, "Publishers")
        if (!section) return map
        for (const el of Array.from(
            section.getElementsByTagName("Publisher"),
        )) {
            const id = el.getAttribute("id")
            if (!id) continue
            map.set(id, {
                Name: this.childText(el, "Name") ?? undefined,
                Place: this.childText(el, "Place") ?? undefined,
            })
        }
        return map
    }

    private buildPeriodicalMap(root: Element): Map<string, CitaviPeriodical> {
        const map = new Map<string, CitaviPeriodical>()
        const section = this.firstChildEl(root, "Periodicals")
        if (!section) return map
        for (const el of Array.from(
            section.getElementsByTagName("Periodical"),
        )) {
            const id = el.getAttribute("id")
            if (!id) continue
            map.set(id, {
                Name: this.childText(el, "Name") ?? undefined,
                StandardAbbreviation:
                    this.childText(el, "StandardAbbreviation") ?? undefined,
                UserAbbreviation1:
                    this.childText(el, "UserAbbreviation1") ?? undefined,
            })
        }
        return map
    }

    private buildSeriesTitleMap(root: Element): Map<string, string> {
        const map = new Map<string, string>()
        const section = this.firstChildEl(root, "SeriesTitles")
        if (!section) return map
        for (const el of Array.from(
            section.getElementsByTagName("SeriesTitle"),
        )) {
            const id = el.getAttribute("id")
            const name = this.childText(el, "Name")
            if (id && name !== null) {
                map.set(id, name)
            }
        }
        return map
    }

    // ── Relation-table builders ───────────────────────────────────────────────

    /**
     * Parse a OnetoN relation section into a Map<referenceId, linkedId[]>.
     *
     * Each <OnetoN> text node has the form:
     *   <referenceId>;<linkedId1>;<linkedId2>…
     */
    private buildOneToNMap(
        root: Element,
        sectionTag: string,
    ): Map<string, string[]> {
        const map = new Map<string, string[]>()
        const section = this.firstChildEl(root, sectionTag)
        if (!section) return map
        for (const node of Array.from(section.getElementsByTagName("OnetoN"))) {
            const raw = node.textContent ?? ""
            const parts = raw.split(";")
            if (parts.length < 2) continue
            const refId = parts[0].trim()
            const linked = parts
                .slice(1)
                .map((s) => s.trim())
                .filter(Boolean)
            if (refId && linked.length > 0) {
                map.set(refId, linked)
            }
        }
        return map
    }

    /**
     * Build a Map<childReferenceId, parentReferenceId> from ReferenceReferences.
     *
     * Each <OnetoN> text node has the form:
     *   <parentId>;<childId1>;<childId2>…
     */
    private buildChildToParentMap(root: Element): Map<string, string> {
        const map = new Map<string, string>()
        const section = this.firstChildEl(root, "ReferenceReferences")
        if (!section) return map
        for (const node of Array.from(section.getElementsByTagName("OnetoN"))) {
            const raw = node.textContent ?? ""
            const parts = raw.split(";")
            if (parts.length < 2) continue
            const parentId = parts[0].trim()
            for (const childId of parts.slice(1)) {
                const trimmed = childId.trim()
                if (trimmed) map.set(trimmed, parentId)
            }
        }
        return map
    }

    // ── DOM helpers ───────────────────────────────────────────────────────────

    /**
     * Return the first *direct* child element with the given tag name, or null.
     * Uses childNodes iteration rather than getElementsByTagName so that
     * deeply-nested elements with the same tag name are not mistakenly matched.
     */
    private firstChildEl(parent: Element, tag: string): Element | null {
        for (let i = 0; i < parent.childNodes.length; i++) {
            const node = parent.childNodes[i]
            if (
                node.nodeType === 1 /* ELEMENT_NODE */ &&
                node.nodeName === tag
            ) {
                return node as Element
            }
        }
        return null
    }

    /**
     * Return the trimmed text content of the first direct child element with
     * the given tag name, or null if no such child exists.
     */
    private childText(parent: Element, tag: string): string | null {
        const child = this.firstChildEl(parent, tag)
        if (!child) return null
        return child.textContent?.trim() ?? null
    }

    private resolvePersons(
        refId: string,
        relationMap: Map<string, string[]>,
        personMap: Map<string, CitaviPerson>,
    ): CitaviPerson[] {
        const ids = relationMap.get(refId) ?? []
        return ids
            .map((pid) => personMap.get(pid))
            .filter((p): p is CitaviPerson => p !== undefined)
    }
}

// ─── Convenience function ─────────────────────────────────────────────────────

export function parseCitaviXml(
    input: Document | string,
): Record<number, EntryObject> {
    return new CitaviXmlParser(input).parse()
}
