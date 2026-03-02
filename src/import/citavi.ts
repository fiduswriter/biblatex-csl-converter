/**
 * Citavi JSON format parser
 *
 * Supports the JSON format exported by Citavi (SwissAcademic.Citavi),
 * including the "WordPlaceholder" citation format used in docx exports
 * and direct project-export arrays.
 *
 * For the native XML project format (.ctv5 / .ctv6) see citavi-xml.ts.
 *
 * Field semantics are derived from the official per-type documentation at:
 * https://www1.citavi.com/sub/manual-citaviweb/en/fields_in_citavi.html
 *
 * Every Citavi reference type shares the same underlying JSON field names;
 * only the *meaning* and *display label* of each field changes per type.
 * This parser maps those semantic differences to the appropriate internal
 * BibLaTeX/CSL field names.
 */

import {
    BibTypes,
    NodeArray,
    TextNodeObject,
    EntryObject,
    NameDictObject,
    RangeArray,
} from "../const"

// ─── Citavi reference type → internal BibType mapping ───────────────────────

const CitaviTypeMap: Record<string, string> = {
    // ── Periodical articles ──────────────────────────────────────────────────
    JournalArticle: "article-journal",
    NewspaperArticle: "article-newspaper",
    SpecialIssue: "periodical",

    // ── Books and book-like items ────────────────────────────────────────────
    Book: "book",
    BookEdited: "collection",
    CollectedWorks: "collection",
    AudioBook: "book",

    // ── Contributions / chapters ─────────────────────────────────────────────
    Contribution: "incollection",
    ContributionInLegalCommentary: "incollection",

    // ── Conference materials ─────────────────────────────────────────────────
    ConferenceProceedings: "proceedings",

    // ── Reports / gray literature ────────────────────────────────────────────
    UnpublishedWork: "report",
    PressRelease: "report",
    NewsAgencyReport: "report",

    // ── Theses / manuscripts ─────────────────────────────────────────────────
    Thesis: "thesis",
    Manuscript: "unpublished",

    // ── Online resources ─────────────────────────────────────────────────────
    InternetDocument: "online",

    // ── Legal materials ──────────────────────────────────────────────────────
    LegalCommentary: "book", // treated as a reference book
    ContributionInLegalCommentary_parent: "book", // parent type alias (unused externally)
    CourtDecision: "legal_case",
    StatuteOrRegulation: "legislation",

    // ── Standards and patents ────────────────────────────────────────────────
    Standard: "standard",
    Patent: "patent",

    // ── Audio / visual ───────────────────────────────────────────────────────
    Movie: "video",
    Broadcast: "video",
    AudioOrVideoDocument: "video",
    RadioPlay: "audio",
    MusicAlbum: "audio",
    MusicTrack: "audio",

    // ── Software ─────────────────────────────────────────────────────────────
    ComputerProgram: "software",

    // ── Maps ─────────────────────────────────────────────────────────────────
    Map: "map",

    // ── Personal / interview ─────────────────────────────────────────────────
    PersonalCommunication: "personal_communication",
    InterviewMaterial: "interview",

    // ── Presentations / lectures ─────────────────────────────────────────────
    Lecture: "misc",

    // ── Archive / file ───────────────────────────────────────────────────────
    ArchiveMaterial: "misc",
    File: "misc",

    // ── Catch-all ────────────────────────────────────────────────────────────
    Unknown: "misc",
}

// ─── Per-type semantic overrides ─────────────────────────────────────────────
//
// Citavi reuses the same JSON field names for every reference type but assigns
// different display labels (and therefore meanings) per type.  For example,
// `Authors` means "Director" for a Movie but "Cartographer" for a Map.  We
// capture only the cases where the semantic mapping diverges from the default
// (Authors → author, Editors → editor, etc.) so we can map to the right
// internal role fields.
//
// Possible target roles: "author" | "editor" | "translator" |
//   "editora" (secondary contributors) | "holder" (patent assignee) |
//   "institution" (organisations acting as author-like entity)
//
// null means "ignore this field for this type"

interface RoleOverride {
    Authors?: string | null
    Editors?: string | null
    Collaborators?: string | null
    Organizations?: string | null
}

const TypeRoleOverrides: Record<string, RoleOverride> = {
    // Movie: Authors = Director, Editors = Studio/Producer, Collaborators = Lead actors
    Movie: {
        Authors: "author", // Director
        Editors: "editor", // Studio / Producer
        Collaborators: "editora", // Secondary contributors
    },

    // Broadcast: same pattern as Movie
    Broadcast: {
        Authors: "author", // Director
        Editors: "editor", // Editor (added in Citavi 6)
        Collaborators: "editora",
        Organizations: "editora", // Station
    },

    // AudioOrVideoDocument: Authors = Director, Collaborators = Editors (of the work)
    AudioOrVideoDocument: {
        Authors: "author", // Director
        Editors: "editor",
        Collaborators: "editora",
    },

    // AudioBook: Collaborators = Speaker, Editors = Director (Citavi 6)
    AudioBook: {
        Authors: "author",
        Editors: "author", // Director
        Collaborators: "editora", // Speaker
    },

    // RadioPlay: Editors = Director (Citavi 6), Organizations = Station
    RadioPlay: {
        Authors: "author",
        Editors: "author", // Director
        Collaborators: "editora",
        Organizations: "editora",
    },

    // MusicTrack: Authors = Composer, Collaborators = Artist/Performer, Editors = Director
    MusicTrack: {
        Authors: "author", // Composer → author
        Editors: "author", // Director
        Collaborators: "editora", // Artist / Performer
        Organizations: "editora", // Orchestra
    },

    // MusicAlbum: same as MusicTrack at the album level
    MusicAlbum: {
        Authors: "author",
        Editors: "author", // Director
        Collaborators: "editora",
        Organizations: "editora",
    },

    // Patent: Authors = Inventor, Editors = Assignee → holder
    Patent: {
        Authors: "author", // Inventor
        Editors: "holder", // Assignee
        Collaborators: null,
    },

    // Thesis: Collaborators = Academic advisor (→ editora), Organizations = Academic institution
    Thesis: {
        Authors: "author",
        Collaborators: "editora", // Academic advisor
        Organizations: "institution",
    },

    // Lecture / Presentation: Authors = Speaker, Collaborators = Host
    Lecture: {
        Authors: "author", // Speaker
        Collaborators: "editora", // Host
        Organizations: "editora",
    },

    // InterviewMaterial: Authors = Interviewer, Collaborators = Interviewee
    InterviewMaterial: {
        Authors: "author", // Interviewer
        Collaborators: "editora", // Interviewee
    },

    // PersonalCommunication: Authors = Sender, Collaborators = Recipient
    PersonalCommunication: {
        Authors: "author", // Sender
        Collaborators: "editora", // Recipient
    },

    // ConferenceProceedings: Editors = Publisher/Editor, no Authors
    ConferenceProceedings: {
        Authors: null,
        Editors: "editor",
        Collaborators: "editora",
        Organizations: "editora",
    },

    // SpecialIssue: Editors = Guest editor, no Authors
    SpecialIssue: {
        Authors: null,
        Editors: "editor",
        Collaborators: null,
    },

    // BookEdited / CollectedWorks: Editors = Publisher role → editor of volume
    BookEdited: {
        Authors: "author",
        Editors: "editor",
        Collaborators: "editora",
    },
    CollectedWorks: {
        Authors: "author",
        Editors: "editor",
        Collaborators: "editora",
    },

    // LegalCommentary: Authors = "Founded by" (original author), Editors = Author (current)
    LegalCommentary: {
        Authors: "bookauthor", // "Founded by" — original author of the commentary
        Editors: "author", // Current Author
        Collaborators: null,
    },

    // ContributionInLegalCommentary: Authors = Editor (of the section), no Editors
    ContributionInLegalCommentary: {
        Authors: "author", // Editor of the commented section
        Editors: null,
        Collaborators: null,
    },

    // CourtDecision: no personal authors; Organizations = Court
    CourtDecision: {
        Authors: null,
        Editors: null,
        Collaborators: null,
        Organizations: "institution",
    },

    // StatuteOrRegulation: no personal authors; Organizations = Legislature/Authority
    StatuteOrRegulation: {
        Authors: null,
        Editors: null,
        Collaborators: null,
        Organizations: "institution",
    },

    // Standard: no personal authors; Organizations = issuing body
    Standard: {
        Authors: null,
        Editors: null,
        Collaborators: null,
        Organizations: "institution",
    },

    // ArchiveMaterial: Collaborators = Recipient (Citavi 6), Organizations = Archive
    ArchiveMaterial: {
        Authors: "author",
        Collaborators: "editora", // Recipient
        Organizations: "institution", // Archive
    },

    // File: Collaborators = Addressee, Organizations = Organization
    File: {
        Authors: "author",
        Collaborators: "editora", // Addressee
        Organizations: "editora",
    },

    // InternetDocument: Editors = Publisher (role), Organizations = Organization
    InternetDocument: {
        Authors: "author",
        Editors: "editor",
        Organizations: "editora",
    },
}

// ─── Per-type semantic overrides for non-name fields ─────────────────────────
//
// Some Citavi fields carry different meanings per type.  We capture overrides
// for the structured fields that affect internal field mapping.

interface FieldOverride {
    // Which internal field should Citavi's `Number` map to?
    Number?: string | null
    // Which internal field should `NumberOfVolumes` map to?
    NumberOfVolumes?: string | null
    // Which internal field should `Volume` map to?
    Volume?: string | null
    // Which internal field should `SeriesTitle` map to?
    SeriesTitle?: string | null
    // For types where Subtitle carries a special meaning, map it here instead
    // of appending it to the title.  null = discard.
    SubtitleField?: string | null
    // TitleSupplement semantic override
    TitleSupplementField?: string | null
    // SpecificField1–7 overrides: map slot → internal field name (or null to skip)
    SpecificField1?: string | null
    SpecificField2?: string | null
    SpecificField3?: string | null
    SpecificField4?: string | null
    SpecificField5?: string | null
    SpecificField6?: string | null
    SpecificField7?: string | null
}

const TypeFieldOverrides: Record<string, FieldOverride> = {
    // JournalArticle
    // Number = issue number → issue
    // NumberOfVolumes = article number → number (eid)
    // Date2 = "Online since" (handled separately)
    // SpecificField1 = Database → note
    JournalArticle: {
        Number: "issue",
        NumberOfVolumes: "eid",
        SpecificField1: "note", // Database
    },

    // NewspaperArticle
    // Number = Edition → number
    // Periodical = Newspaper → journaltitle (handled in processPeriodical)
    NewspaperArticle: {
        Number: "number",
    },

    // SpecialIssue
    // Number = Number → number
    SpecialIssue: {
        Number: "number",
    },

    // Book – nothing special beyond defaults

    // BookEdited / CollectedWorks
    BookEdited: {
        NumberOfVolumes: "volumes",
    },
    CollectedWorks: {
        NumberOfVolumes: "volumes",
    },

    // ConferenceProceedings
    // SpecificField1 = Location of conference → venue
    // SpecificField4 = Event date → eventdate
    // SpecificField7 = Conference name → eventtitle
    ConferenceProceedings: {
        NumberOfVolumes: "volumes",
        SpecificField1: "venue",
        SpecificField4: "eventdate",
        SpecificField7: "eventtitle",
    },

    // Thesis
    // TitleSupplement = Type of thesis → type
    // Organizations = Academic institution → institution
    // SpecificField1 = Institute → note
    Thesis: {
        TitleSupplementField: "type",
        SpecificField1: "note", // Institute
    },

    // Map
    // Number = Scale → note (no direct internal field for scale)
    Map: {
        Number: "note", // Scale
    },

    // Patent
    // Number = Patent number → number
    // Volume = Bibliographic IPC → volume (IPC classification)
    // Subtitle = Type → titleaddon
    // TitleSupplement = Claims → abstract (closest match)
    // SpecificField1 = Issue country → location
    // SpecificField2 = Applicant → note
    // SpecificField3 = Application year → origdate (partial)
    // SpecificField4 = Application country → origlocation
    // SpecificField5 = Application number → eprint
    // SpecificField6 = Priority date → note2 (appended to note)
    // SpecificField7 = Patent family → note
    Patent: {
        Number: "number",
        SubtitleField: "titleaddon", // Subtitle = Type
        TitleSupplementField: "abstract", // Claims
        SpecificField1: "location", // Issue country
        SpecificField2: "note", // Applicant
        SpecificField3: "origdate", // Application year
        SpecificField4: "origlocation", // Application country
        SpecificField5: "eprint", // Application number
    },

    // Movie
    // SpecificField1 = Country → location
    // SpecificField2 = Length → pagetotal (runtime proxy)
    // Date = Release date, Date2 = Broadcast date (handled separately)
    Movie: {
        SpecificField1: "location", // Country of production
        SpecificField2: "pagetotal", // Length/runtime
    },

    // Broadcast (Radio or TV)
    // Volume = Episode
    // SeriesTitle = Series title
    Broadcast: {
        Volume: "number", // Episode number
        SeriesTitle: "series",
        SpecificField2: "pagetotal", // Length
    },

    // RadioPlay
    // NumberOfVolumes = Episode (Citavi 6)
    // SeriesTitle = Series title
    RadioPlay: {
        NumberOfVolumes: "number", // Episode
        SeriesTitle: "series",
    },

    // AudioBook
    // SpecificField2 = Length
    AudioBook: {
        SpecificField2: "pagetotal",
    },

    // AudioOrVideoDocument
    // Volume = Volume (Citavi 6)
    // SeriesTitle = Series title
    AudioOrVideoDocument: {
        SeriesTitle: "series",
    },

    // MusicTrack
    // Number = Number → number
    // ParentReference = parent album (handled in processParentReference)
    // SpecificField2 = Length
    MusicTrack: {
        Number: "number",
        SpecificField2: "pagetotal",
    },

    // Software
    // SpecificField1 = License type → note
    // SpecificField2 = License number → eprint
    // SpecificField3 = Operating system → note (appended)
    // SpecificField4 = Version → version
    // TitleSupplement = Technical details → titleaddon
    Software: {
        TitleSupplementField: "titleaddon",
        SpecificField4: "version",
    },

    // InternetDocument
    // Editors = Publisher → editor (but actually the publisher role)
    // SeriesTitle = Series title
    InternetDocument: {
        SeriesTitle: "series",
    },

    // Lecture / Presentation
    // SeriesTitle = Conference or lecture series → series
    // SpecificField2 = Length (Citavi 6)
    Lecture: {
        SeriesTitle: "series",
        SpecificField2: "pagetotal",
    },

    // Manuscript – nothing special

    // UnpublishedWork / Report
    // Number = Number → number
    // SeriesTitle = Series title → series
    UnpublishedWork: {
        Number: "number",
        SeriesTitle: "series",
    },

    // PressRelease
    PressRelease: {
        SpecificField4: "note", // Embargo
    },

    // NewsAgencyReport
    NewsAgencyReport: {
        SpecificField4: "note", // Embargo
    },

    // ArchiveMaterial
    // Number = Call number → library
    // Volume = Volume
    ArchiveMaterial: {
        Number: "library", // Call number
        SpecificField1: "note", // Archive location (Citavi 6)
    },

    // File
    // Number = Case number → number
    // NumberOfVolumes = File size → pagetotal
    // TitleSupplement = File type → titleaddon
    File: {
        Number: "number",
        NumberOfVolumes: "pagetotal",
        TitleSupplementField: "titleaddon",
    },

    // CourtDecision
    // Number = Issue number → number
    // Periodical = Source of bibliographic information → journaltitle
    // SpecificField1 = Paragraph numbers → note
    // SpecificField2 = Case number → number (override)
    // SpecificField3 = Type of decision → type
    // SpecificField4 = ECLI → eprint
    CourtDecision: {
        Number: "issue",
        SpecificField1: "note", // Paragraph numbers
        SpecificField2: "number", // Case number
        SpecificField3: "type", // Type of decision
        SpecificField4: "eprint", // ECLI
    },

    // StatuteOrRegulation
    // Number = Issue number → number
    // Subtitle = Abbreviation → shorthand
    StatuteOrRegulation: {
        Number: "number",
        SubtitleField: "shorthand", // Abbreviation
    },

    // LegalCommentary
    // SpecificField1 = Common abbreviation → shorthand
    // SeriesTitle = Series → series
    LegalCommentary: {
        SeriesTitle: "series",
        SpecificField1: "shorthand",
    },

    // Standard
    // Number = Number → number
    // Volume = ICS Notation → volume
    // SpecificField2 = Standard type → type
    Standard: {
        Number: "number",
        SpecificField2: "type",
    },

    // PersonalCommunication
    // TitleSupplement = Mode → howpublished
    PersonalCommunication: {
        TitleSupplementField: "howpublished",
    },

    // InterviewMaterial
    // TitleSupplement = Title supplement
    // (no override needed for non-default fields)

    // ContributionInLegalCommentary
    // Volume = Additions → volume
    // Date2 = Condition → note
    ContributionInLegalCommentary: {
        SpecificField2: null, // not mapped
    },
}

// ─── TypeScript interfaces for Citavi JSON ───────────────────────────────────

export interface CitaviPerson {
    FirstName?: string
    LastName?: string
    MiddleName?: string
    /** Used for institutional/corporate names when no personal name is present */
    Name?: string
    Sex?: number
    Id?: string
    [key: string]: unknown
}

export interface CitaviPublisher {
    Name?: string
    Place?: string
    [key: string]: unknown
}

export interface CitaviPeriodical {
    Name?: string
    StandardAbbreviation?: string
    UserAbbreviation1?: string
    [key: string]: unknown
}

export interface CitaviLocation {
    Address?: {
        UriString?: string
        OriginalString?: string
        LinkedResourceType?: number
        [key: string]: unknown
    }
    LocationType?: number
    [key: string]: unknown
}

export interface CitaviKeyword {
    Name?: string
    [key: string]: unknown
}

export interface CitaviReference {
    // Core identifiers
    Id?: string
    BibTeXKey?: string
    CitationKey?: string
    ReferenceType?: string

    // Titles
    Title?: string
    /** In the JSON the field is sometimes `Title1` (older exports) */
    Title1?: string
    Subtitle?: string
    TitleSupplement?: string
    ShortTitle?: string
    ParallelTitle?: string

    // People
    Authors?: CitaviPerson[]
    Editors?: CitaviPerson[]
    Translators?: CitaviPerson[]
    Collaborators?: CitaviPerson[]
    OthersInvolved?: CitaviPerson[]
    Organizations?: CitaviPerson[]

    // Publisher / place
    Publishers?: CitaviPublisher[]
    PlaceOfPublication?: string

    // Periodical info
    Periodical?: CitaviPeriodical

    // Dates
    Year?: string
    YearResolved?: string
    Date?: string
    Date2?: string
    AccessDate?: string

    // Numbering
    Volume?: string
    Number?: string
    Issue?: string
    Edition?: string
    NumberOfVolumes?: string
    SeriesTitle?: string
    OnlineAddress?: string

    // Page information
    PageRange?: string
    PageCount?: string

    // Identifiers
    Isbn?: string
    Issn?: string
    Doi?: string

    // Other fields
    Abstract?: string
    Keywords?: CitaviKeyword[]
    Language?: string
    LanguageCode?: string
    Locations?: CitaviLocation[]
    StorageMedium?: string

    // Citavi SpecificField slots (meaning varies per ReferenceType)
    SpecificField1?: string
    SpecificField2?: string
    SpecificField3?: string
    SpecificField4?: string
    SpecificField5?: string
    SpecificField6?: string
    SpecificField7?: string

    // Nested / parent reference (for Contributions, MusicTracks, etc.)
    ParentReference?: CitaviReference

    [key: string]: unknown
}

interface CitaviEntry {
    Id?: string
    ReferenceId?: string
    Reference?: CitaviReference
    [key: string]: unknown
}

/**
 * Top-level Citavi JSON payload.  Three shapes are supported:
 *   1. WordPlaceholder  – `{ Entries: [...] }`
 *   2. Project export   – `{ References: [...] }`
 *   3. Plain array      – `CitaviReference[]`
 */
export type CitaviInput =
    | {
          Entries?: CitaviEntry[]
          References?: CitaviReference[]
          [key: string]: unknown
      }
    | CitaviReference[]

interface ErrorObject {
    type: string
    field?: string
    field_name?: string
    value?: unknown
    entry?: string
}

// ─── Parser ──────────────────────────────────────────────────────────────────

export class CitaviParser {
    input: CitaviInput
    entries: EntryObject[]
    errors: ErrorObject[]
    warnings: ErrorObject[]

    /** Track processed Citavi Reference IDs to avoid duplicate imports */
    private seenIds: Set<string> = new Set()

    constructor(input: CitaviInput) {
        this.input = input
        this.entries = []
        this.errors = []
        this.warnings = []
    }

    parse(): Record<number, EntryObject> {
        const references = this.collectReferences()

        for (let i = 0; i < references.length; i++) {
            const ref = references[i]
            const id = ref.Id || String(i + 1)

            if (this.seenIds.has(id)) {
                this.warnings.push({
                    type: "duplicate_entry",
                    entry: id,
                })
                continue
            }
            this.seenIds.add(id)

            const converted = this.convertReference(ref, i + 1)
            if (converted) {
                this.entries.push(converted)
            }
        }

        const bibDB: Record<number, EntryObject> = {}
        this.entries.forEach((entry, index) => {
            bibDB[index + 1] = entry
        })
        return bibDB
    }

    // ─── Input flattening ────────────────────────────────────────────────────

    /**
     * Walk the input structure and return a flat ordered list of all
     * CitaviReference objects, with parent references appearing before their
     * children so they receive lower bibDB indices.
     */
    private collectReferences(): CitaviReference[] {
        const refs: CitaviReference[] = []

        const addRef = (ref: CitaviReference) => {
            if (!ref) return
            // Collect parent first so it gets a lower index
            if (ref.ParentReference) {
                addRef(ref.ParentReference)
            }
            refs.push(ref)
        }

        if (Array.isArray(this.input)) {
            for (const ref of this.input as CitaviReference[]) {
                addRef(ref)
            }
        } else {
            const obj = this.input as {
                Entries?: CitaviEntry[]
                References?: CitaviReference[]
            }

            if (obj.Entries && Array.isArray(obj.Entries)) {
                // WordPlaceholder format
                for (const entry of obj.Entries) {
                    if (entry.Reference) {
                        addRef(entry.Reference)
                    }
                }
            } else if (obj.References && Array.isArray(obj.References)) {
                // Project-export format
                for (const ref of obj.References) {
                    addRef(ref)
                }
            }
        }

        return refs
    }

    // ─── Reference conversion ────────────────────────────────────────────────

    private convertReference(
        ref: CitaviReference,
        index: number
    ): EntryObject | false {
        const entryId = ref.Id || String(index)

        if (!ref.ReferenceType) {
            this.warnings.push({
                type: "missing_reference_type",
                entry: entryId,
            })
        }

        const refType = ref.ReferenceType || "Unknown"

        // Warn when refType has no entry in our mapping table (falls back to misc)
        if (refType !== "Unknown" && !CitaviTypeMap[refType]) {
            this.warnings.push({
                type: "unknown_type",
                value: refType,
                entry: entryId,
            })
        }

        const bibType = CitaviTypeMap[refType] || "misc"

        // Error when the type map itself points to an unregistered internal type
        // (this would be a bug in CitaviTypeMap)
        if (!BibTypes[bibType]) {
            this.errors.push({
                type: "unknown_type",
                value: refType,
                entry: entryId,
            })
            return false
        }

        const effectiveBibType = bibType

        const fields: Record<string, unknown> = {}
        const roleOverrides = TypeRoleOverrides[refType] || {}
        const fieldOverrides = TypeFieldOverrides[refType] || {}

        // ── Titles ──────────────────────────────────────────────────────────
        this.processTitle(ref, fields, refType, fieldOverrides, entryId)

        // ── People ──────────────────────────────────────────────────────────
        this.processNames(ref, fields, roleOverrides)

        // ── Date ────────────────────────────────────────────────────────────
        this.processDate(ref, fields, refType, entryId)

        // ── Access date ─────────────────────────────────────────────────────
        if (ref.AccessDate) {
            const iso = ref.AccessDate.split("T")[0]
            if (iso) fields["urldate"] = iso
        }

        // ── Publisher / Place ───────────────────────────────────────────────
        this.processPublisher(ref, fields)

        // ── Periodical ──────────────────────────────────────────────────────
        this.processPeriodical(ref, fields)

        // ── Volume / Issue / Number / Edition / Series ───────────────────────
        this.processNumbering(ref, fields, refType, fieldOverrides)

        // ── Pages ───────────────────────────────────────────────────────────
        if (ref.PageRange) {
            const parsed = this.parsePageRange(ref.PageRange)
            if (parsed) {
                fields["pages"] = parsed
            } else {
                this.warnings.push({
                    type: "unparsed_page_range",
                    field_name: "pages",
                    value: ref.PageRange,
                    entry: entryId,
                })
            }
        }

        // ── Page total / number of pages ────────────────────────────────────
        if (ref.PageCount) {
            fields["pagetotal"] = this.convertRichText(ref.PageCount)
        }

        // ── Identifiers ─────────────────────────────────────────────────────
        this.processIdentifiers(ref, fields, entryId)

        // ── Online address / URL ─────────────────────────────────────────────
        // OnlineAddress is a dedicated top-level field (shown in table view)
        if (ref.OnlineAddress) {
            fields["url"] = ref.OnlineAddress.trim()
        } else {
            // Fall back to scanning the Locations array
            this.processLocations(ref, fields)
        }

        // ── Abstract ────────────────────────────────────────────────────────
        if (ref.Abstract) {
            fields["abstract"] = this.convertRichText(ref.Abstract)
        }

        // ── Keywords ────────────────────────────────────────────────────────
        this.processKeywords(ref, fields)

        // ── Language ────────────────────────────────────────────────────────
        this.processLanguage(ref, fields, entryId)

        // ── SpecificField slots ──────────────────────────────────────────────
        this.processSpecificFields(ref, fields, fieldOverrides, entryId)

        // ── Parent reference ─────────────────────────────────────────────────
        if (ref.ParentReference) {
            this.processParentReference(ref.ParentReference, fields)
        }

        // ── Entry key ───────────────────────────────────────────────────────
        const entryKey = this.buildEntryKey(ref, index, entryId)

        return {
            entry_key: entryKey,
            bib_type: effectiveBibType,
            fields,
        }
    }

    // ─── Field processors ────────────────────────────────────────────────────

    private processTitle(
        ref: CitaviReference,
        fields: Record<string, unknown>,
        refType: string,
        fo: FieldOverride,
        entryId: string
    ) {
        // Older Citavi JSON exports use "Title1"; newer use "Title"
        const rawTitle = ref.Title || ref.Title1
        if (!rawTitle) {
            this.warnings.push({
                type: "missing_title",
                entry: entryId,
            })
            return
        }

        const subtitle = ref.Subtitle
        const fo_subtitle = fo.SubtitleField

        // Default behaviour: append Subtitle to Title with ": "
        // Override: map Subtitle to a different field (or null = discard)
        let mainTitle = rawTitle
        if (subtitle) {
            if (fo_subtitle === undefined) {
                // Default: colon-join
                mainTitle = `${rawTitle}: ${subtitle}`
            } else if (fo_subtitle !== null) {
                // Specific field target
                fields[fo_subtitle] = this.convertRichText(subtitle)
            }
            // fo_subtitle === null → discard subtitle
        }
        fields["title"] = this.convertRichText(mainTitle)

        // Short title — Citavi prepends "Author Year – " which we strip
        if (ref.ShortTitle) {
            const cleaned = this.cleanShortTitle(ref.ShortTitle)
            if (cleaned) fields["shorttitle"] = this.convertRichText(cleaned)
        }

        // TitleSupplement
        const supp = ref.TitleSupplement
        if (supp) {
            const suppTarget = fo.TitleSupplementField
            if (suppTarget === undefined) {
                // Default: titleaddon
                fields["titleaddon"] = this.convertRichText(supp)
            } else if (suppTarget !== null) {
                fields[suppTarget] = this.convertRichText(supp)
            }
        }
    }

    private processNames(
        ref: CitaviReference,
        fields: Record<string, unknown>,
        ro: RoleOverride
    ) {
        // Helper: get role for a slot, falling back to a default
        const role = (
            slot: keyof RoleOverride,
            defaultRole: string | null
        ): string | null => {
            if (slot in ro) {
                return ro[slot] !== null && ro[slot] !== undefined
                    ? (ro[slot] as string)
                    : defaultRole
            }
            return defaultRole
        }

        const authorsRole = role("Authors", "author")
        const editorsRole = role("Editors", "editor")
        const collaboRole = role("Collaborators", "editora")
        const orgRole = role("Organizations", null)

        if (ref.Authors && ref.Authors.length > 0 && authorsRole) {
            this.addToNameField(
                fields,
                authorsRole,
                this.convertPersonList(ref.Authors)
            )
        }

        if (ref.Editors && ref.Editors.length > 0 && editorsRole) {
            this.addToNameField(
                fields,
                editorsRole,
                this.convertPersonList(ref.Editors)
            )
        }

        if (ref.Collaborators && ref.Collaborators.length > 0 && collaboRole) {
            this.addToNameField(
                fields,
                collaboRole,
                this.convertPersonList(ref.Collaborators)
            )
        }

        if (ref.Organizations && ref.Organizations.length > 0 && orgRole) {
            // Organizations are always institutional names
            this.addToNameField(
                fields,
                orgRole,
                this.convertPersonList(ref.Organizations, true)
            )
        }

        // Translators are always translators, regardless of type
        if (ref.Translators && ref.Translators.length > 0) {
            this.addToNameField(
                fields,
                "translator",
                this.convertPersonList(ref.Translators)
            )
        }
    }

    /** Append `names` to an existing name-list field, or create it. */
    private addToNameField(
        fields: Record<string, unknown>,
        fieldName: string,
        names: NameDictObject[]
    ) {
        if (names.length === 0) return
        if (fields[fieldName]) {
            // Merge into existing list
            fields[fieldName] = (fields[fieldName] as NameDictObject[]).concat(
                names
            )
        } else {
            fields[fieldName] = names
        }
    }

    private processDate(
        ref: CitaviReference,
        fields: Record<string, unknown>,
        refType: string,
        entryId: string
    ) {
        // For most types:
        //   Date  = primary date (release, publication, …)
        //   Date2 = secondary date (broadcast, online-since, revised, …)
        //
        // Special cases:
        //   Patent:  Date = Application date, Date2 = Publication date
        //     → we prefer Date2 (the publication date) as the primary date
        //   Statute: Date2 = Revised → store as origdate

        const preferDate2AsPrimary = refType === "Patent"

        const primaryRaw = preferDate2AsPrimary
            ? ref.Date2 || ref.Date
            : ref.Date || ref.Date2

        // Resolve year from YearResolved / Year when no ISO date is available
        const yearFallback = ref.YearResolved || ref.Year

        if (primaryRaw) {
            const iso = this.parseISODate(primaryRaw)
            if (iso) {
                fields["date"] = iso
            } else if (/^\d{4}$/.test(primaryRaw.trim())) {
                fields["date"] = primaryRaw.trim()
            } else if (yearFallback && /^\d{4}$/.test(yearFallback.trim())) {
                this.warnings.push({
                    type: "unparsed_date",
                    field_name: "date",
                    value: primaryRaw,
                    entry: entryId,
                })
                fields["date"] = yearFallback.trim()
            } else {
                this.warnings.push({
                    type: "unparsed_date",
                    field_name: "date",
                    value: primaryRaw,
                    entry: entryId,
                })
            }
        } else if (yearFallback && /^\d{4}$/.test(yearFallback.trim())) {
            fields["date"] = yearFallback.trim()
        }

        // Secondary date handling
        if (!preferDate2AsPrimary && ref.Date2) {
            // For StatuteOrRegulation, Date2 = Revised → origdate
            if (refType === "StatuteOrRegulation") {
                const iso = this.parseISODate(ref.Date2)
                if (iso) fields["origdate"] = iso
            }
            // For JournalArticle, Date2 = "Online since" — we can store as note or ignore
            // (no standard biblatex field for this, omit silently)
        }
    }

    private processPublisher(
        ref: CitaviReference,
        fields: Record<string, unknown>
    ) {
        // Collect publisher names from Publishers array
        if (ref.Publishers && ref.Publishers.length > 0) {
            const names = ref.Publishers.map((p) => p.Name || "").filter(
                Boolean
            )
            if (names.length > 0) {
                fields["publisher"] = this.convertRichText(names.join(" / "))
            }
            // Some Publisher objects also carry a Place
            const places = ref.Publishers.map((p) => p.Place || "").filter(
                Boolean
            )
            if (places.length > 0 && !ref.PlaceOfPublication) {
                fields["location"] = this.convertRichText(places.join(" / "))
            }
        }

        // Explicit PlaceOfPublication always wins over Places from Publishers
        if (ref.PlaceOfPublication) {
            fields["location"] = this.convertRichText(ref.PlaceOfPublication)
        }

        // For Thesis, Organizations = Academic institution → institution field
        // (handled already in processNames as "institution", but we also want
        // PlaceOfPublication → location which is "Location of institution" for Thesis)
    }

    private processPeriodical(
        ref: CitaviReference,
        fields: Record<string, unknown>
    ) {
        if (!ref.Periodical) return
        const name = ref.Periodical.Name
        if (name) {
            fields["journaltitle"] = this.convertRichText(name)
        }
        const abbr =
            ref.Periodical.StandardAbbreviation ||
            ref.Periodical.UserAbbreviation1
        if (abbr) {
            fields["shortjournal"] = this.convertRichText(abbr)
        }
    }

    private processNumbering(
        ref: CitaviReference,
        fields: Record<string, unknown>,
        _refType: string,
        fo: FieldOverride
    ) {
        // Volume
        const volTarget = fo.Volume ?? "volume"
        if (ref.Volume && volTarget) {
            fields[volTarget] = this.convertRichText(ref.Volume)
        }

        // Issue (the Citavi `Issue` field — not the same as `Number`)
        if (ref.Issue) {
            fields["issue"] = this.convertRichText(ref.Issue)
        }

        // Number (meaning varies per type; default is "number")
        const numTarget = fo.Number ?? "number"
        if (ref.Number && numTarget) {
            // Only set if not already set by Issue for journalArticle
            if (numTarget === "issue" && fields["issue"]) {
                // Already populated from the dedicated Issue field; skip
            } else {
                fields[numTarget] = this.convertRichText(ref.Number)
            }
        }

        // NumberOfVolumes (meaning varies per type; default is "volumes")
        const novTarget = fo.NumberOfVolumes ?? "volumes"
        if (ref.NumberOfVolumes && novTarget) {
            fields[novTarget] = this.convertRichText(ref.NumberOfVolumes)
        }

        // Edition
        if (ref.Edition) {
            fields["edition"] = this.convertRichText(ref.Edition)
        }

        // SeriesTitle (meaning varies per type; default is "series")
        const serTarget = fo.SeriesTitle ?? "series"
        if (ref.SeriesTitle && serTarget) {
            fields[serTarget] = this.convertRichText(ref.SeriesTitle)
        }
    }

    private processIdentifiers(
        ref: CitaviReference,
        fields: Record<string, unknown>,
        entryId: string
    ) {
        if (ref.Doi) {
            const doi = ref.Doi.trim()
            // A DOI should never contain spaces; warn if it looks malformed
            if (doi.includes(" ")) {
                this.warnings.push({
                    type: "suspect_doi",
                    field_name: "doi",
                    value: doi,
                    entry: entryId,
                })
            }
            fields["doi"] = this.convertRichText(doi)
        }
        if (ref.Isbn) {
            fields["isbn"] = this.convertRichText(ref.Isbn)
        }
        if (ref.Issn) {
            fields["issn"] = this.convertRichText(ref.Issn)
        }
    }

    private processLocations(
        ref: CitaviReference,
        fields: Record<string, unknown>
    ) {
        if (!ref.Locations || ref.Locations.length === 0) return
        for (const loc of ref.Locations) {
            const uri = loc.Address?.UriString || loc.Address?.OriginalString
            if (uri && /^https?:\/\//i.test(uri)) {
                fields["url"] = uri
                return
            }
        }
    }

    private processKeywords(
        ref: CitaviReference,
        fields: Record<string, unknown>
    ) {
        if (!ref.Keywords || ref.Keywords.length === 0) return
        const kws = ref.Keywords.map((k) => k.Name || "")
            .filter(Boolean)
            .join(", ")
        if (kws) {
            fields["keywords"] = kws
        }
    }

    private processLanguage(
        ref: CitaviReference,
        fields: Record<string, unknown>,
        entryId: string
    ) {
        // Prefer LanguageCode (BCP-47) over Language (full name string)
        const code = ref.LanguageCode || ref.Language
        if (code) {
            const trimmed = code.trim()
            if (trimmed) {
                fields["langid"] = trimmed
            } else {
                this.warnings.push({
                    type: "empty_language",
                    field_name: "langid",
                    entry: entryId,
                })
            }
        }
    }

    private processSpecificFields(
        ref: CitaviReference,
        fields: Record<string, unknown>,
        fo: FieldOverride,
        entryId: string
    ) {
        const slots: Array<[keyof CitaviReference, keyof FieldOverride]> = [
            ["SpecificField1", "SpecificField1"],
            ["SpecificField2", "SpecificField2"],
            ["SpecificField3", "SpecificField3"],
            ["SpecificField4", "SpecificField4"],
            ["SpecificField5", "SpecificField5"],
            ["SpecificField6", "SpecificField6"],
            ["SpecificField7", "SpecificField7"],
        ]

        for (const [refKey, foKey] of slots) {
            const value = ref[refKey] as string | undefined
            if (!value) continue

            const target = fo[foKey] as string | null | undefined
            if (target === null) continue // explicitly ignored
            if (target === undefined) {
                // The slot has a value but no mapping has been defined for this
                // reference type — the data would be silently lost, so warn.
                this.warnings.push({
                    type: "unmapped_specific_field",
                    field_name: String(refKey),
                    value,
                    entry: entryId,
                })
                continue
            }
            // Append rather than overwrite if the field already has content
            if (fields[target]) {
                // For note, append with semicolon
                if (target === "note") {
                    const existing = fields[target] as NodeArray
                    const firstNode = existing[0] as TextNodeObject | undefined
                    const existingText = firstNode?.text ?? ""
                    fields[target] = this.convertRichText(
                        `${existingText}; ${value}`
                    )
                }
                // For other fields, don't overwrite
            } else {
                fields[target] = this.convertRichText(value)
            }
        }

        // StorageMedium → howpublished for types that don't override it
        if (ref.StorageMedium && !fields["howpublished"]) {
            fields["howpublished"] = this.convertRichText(ref.StorageMedium)
        }
    }

    /**
     * Pull relevant fields out of a ParentReference into the child entry.
     * This handles Contribution-in-Book, MusicTrack-in-Album, etc.
     */
    private processParentReference(
        parent: CitaviReference,
        fields: Record<string, unknown>
    ) {
        const parentType = parent.ReferenceType || "Unknown"
        const parentTitle = parent.Title || parent.Title1
        const parentRoleOverrides = TypeRoleOverrides[parentType] || {}

        // ── Parent title → booktitle ─────────────────────────────────────────
        if (parentTitle && !fields["booktitle"]) {
            let pt = parentTitle
            if (parent.Subtitle) {
                // Check if parent type merges subtitle into title
                const pfo = TypeFieldOverrides[parentType] || {}
                if (pfo.SubtitleField === undefined) {
                    pt = `${pt}: ${parent.Subtitle}`
                }
            }
            fields["booktitle"] = this.convertRichText(pt)
        }

        // ── Parent editors → editor of host volume ───────────────────────────
        const parentEditorsRole = parentRoleOverrides.Editors ?? "editor"
        if (
            parent.Editors &&
            parent.Editors.length > 0 &&
            !fields["editor"] &&
            parentEditorsRole === "editor"
        ) {
            fields["editor"] = this.convertPersonList(parent.Editors)
        }

        // ── Parent authors → bookauthor (e.g. LegalCommentary parent) ────────
        const parentAuthorsRole = parentRoleOverrides.Authors ?? "author"
        if (
            parent.Authors &&
            parent.Authors.length > 0 &&
            !fields["bookauthor"] &&
            parentAuthorsRole === "author"
        ) {
            // Only set bookauthor if child already has its own author
            if (fields["author"]) {
                fields["bookauthor"] = this.convertPersonList(parent.Authors)
            }
        }

        // ── Parent periodical → journaltitle ─────────────────────────────────
        if (parent.Periodical?.Name && !fields["journaltitle"]) {
            fields["journaltitle"] = this.convertRichText(
                parent.Periodical.Name
            )
            const abbr =
                parent.Periodical.StandardAbbreviation ||
                parent.Periodical.UserAbbreviation1
            if (abbr && !fields["shortjournal"]) {
                fields["shortjournal"] = this.convertRichText(abbr)
            }
        }

        // ── Parent publisher / location ───────────────────────────────────────
        if (
            parent.Publishers &&
            parent.Publishers.length > 0 &&
            !fields["publisher"]
        ) {
            const names = parent.Publishers.map((p) => p.Name || "").filter(
                Boolean
            )
            if (names.length) {
                fields["publisher"] = this.convertRichText(names.join(" / "))
            }
        }
        if (parent.PlaceOfPublication && !fields["location"]) {
            fields["location"] = this.convertRichText(parent.PlaceOfPublication)
        }

        // ── Parent ISBN ───────────────────────────────────────────────────────
        if (parent.Isbn && !fields["isbn"]) {
            fields["isbn"] = this.convertRichText(parent.Isbn)
        }

        // ── Parent volume / number / issue propagation ────────────────────────
        const parentFO = TypeFieldOverrides[parentType] || {}
        if (parent.Volume && !fields["volume"]) {
            fields["volume"] = this.convertRichText(parent.Volume)
        }
        const parentNumTarget = parentFO.Number ?? "number"
        if (
            parent.Number &&
            !fields["number"] &&
            parentNumTarget === "number"
        ) {
            fields["number"] = this.convertRichText(parent.Number)
        }
        if (parent.Issue && !fields["issue"]) {
            fields["issue"] = this.convertRichText(parent.Issue)
        }
    }

    // ─── Name helpers ────────────────────────────────────────────────────────

    private convertPersonList(
        persons: CitaviPerson[],
        forceInstitution = false
    ): NameDictObject[] {
        return persons
            .map((p) => this.convertPerson(p, forceInstitution))
            .filter((n): n is NameDictObject => n !== null)
    }

    private convertPerson(
        person: CitaviPerson,
        forceInstitution = false
    ): NameDictObject | null {
        if (!person) return null

        // Corporate / institutional name
        if (
            forceInstitution ||
            (!person.FirstName && !person.LastName && person.Name)
        ) {
            const name = person.Name
            if (!name) {
                this.warnings.push({
                    type: "skipped_person",
                    value: person,
                })
                return null
            }
            return { literal: this.convertRichText(name) }
        }

        const nameObj: NameDictObject = {}

        if (person.LastName) {
            nameObj.family = this.convertRichText(person.LastName)
        }

        // Compose given name: FirstName + optional MiddleName
        const givenParts: string[] = []
        if (person.FirstName) givenParts.push(person.FirstName)
        if (person.MiddleName) givenParts.push(person.MiddleName)
        if (givenParts.length > 0) {
            nameObj.given = this.convertRichText(givenParts.join(" "))
        }

        if (!nameObj.family && !nameObj.given) {
            this.warnings.push({
                type: "skipped_person",
                value: person,
            })
            return null
        }

        return nameObj
    }

    // ─── Date parsing ────────────────────────────────────────────────────────

    /**
     * Parse a Citavi date string into an ISO-8601 date string.
     * Handles ISO datetime (2007-12-01T00:00:00) and plain date (2007-12-01).
     * Returns null if the input cannot be parsed.
     */
    private parseISODate(raw: string): string | null {
        if (!raw) return null
        const trimmed = raw.trim()
        // ISO datetime: take only the date portion
        const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
        if (isoMatch) return isoMatch[1]
        // Plain 4-digit year
        if (/^\d{4}$/.test(trimmed)) return trimmed
        return null
    }

    // ─── Page-range parsing ──────────────────────────────────────────────────

    /**
     * Citavi stores page ranges either as plain strings or in a small XML
     * dialect embedded in the JSON string:
     *
     *   <sp><n>2</n>...<os>2</os>...</sp>
     *   <ep><n>6</n>...<os>6</os>...</ep>
     *   <os>2-6</os>
     *
     * We extract the *last* `<os>` value, which holds the full human-readable
     * range (e.g. "2-6").  If no XML is present we use the raw string directly.
     */
    private parsePageRange(raw: string): RangeArray[] | null {
        // Collect all <os>…</os> matches and take the last one
        const osMatches = [...raw.matchAll(/<os>([^<]+)<\/os>/g)]
        const rangeStr =
            osMatches.length > 0
                ? osMatches[osMatches.length - 1][1].trim()
                : raw.trim()

        if (!rangeStr) return null
        return this.convertRange(rangeStr)
    }

    private convertRange(value: string): RangeArray[] {
        return String(value)
            .split(/[,;]/)
            .map((segment) => {
                const trimmed = segment.trim()
                const parts = trimmed.split(/[-–—]/)
                if (parts.length >= 2) {
                    return [
                        [
                            { type: "text", text: parts[0].trim() },
                            {
                                type: "text",
                                text: parts.slice(1).join("-").trim(),
                            },
                        ],
                    ] as RangeArray
                }
                return [[{ type: "text", text: trimmed }]] as RangeArray
            })
    }

    // ─── Entry-key generation ────────────────────────────────────────────────

    private buildEntryKey(
        ref: CitaviReference,
        index: number,
        entryId: string
    ): string {
        // 1. Prefer the BibTeX key that Citavi already computed
        if (ref.BibTeXKey) return ref.BibTeXKey

        // 2. Derive from first author/editor surname + year
        const year = ref.YearResolved || ref.Year || ""
        const firstPerson =
            ref.Authors?.[0] || ref.Editors?.[0] || ref.Organizations?.[0]
        if (firstPerson) {
            const surname = (
                firstPerson.LastName ||
                firstPerson.Name ||
                ""
            ).replace(/\s+/g, "")
            if (surname && year) return `${surname}.${year}`
            if (surname) return surname
        }

        // 3. Fall back to the Citavi UUID or a sequential number
        const fallback = ref.Id || String(index)
        this.warnings.push({
            type: "missing_entry_key",
            entry: entryId,
        })
        return fallback
    }

    // ─── Text utilities ──────────────────────────────────────────────────────

    /**
     * Citavi's ShortTitle field often contains an auto-generated prefix like
     * "Burton 2013 – Sweeney Todd" or "Manning (Ed.) 2016 – Food and supply…".
     * Strip everything up to and including the first en-dash / em-dash / hyphen
     * separator so we retain only the actual short title fragment.
     */
    private cleanShortTitle(raw: string): string {
        // Match: anything, then " – " or " - " (with surrounding spaces), then rest
        const sepMatch = raw.match(/^.+?(?:\s[–—]\s|\s-\s)(.+)$/)
        if (sepMatch) return sepMatch[1].trim()
        return raw.trim()
    }

    private convertRichText(text: string): NodeArray {
        if (typeof text !== "string") {
            return [{ type: "text", text: String(text) }]
        }
        return [{ type: "text", text: text.trim() }]
    }
}

// ─── Convenience function ────────────────────────────────────────────────────

export function parseCitavi(input: CitaviInput): Record<number, EntryObject> {
    return new CitaviParser(input).parse()
}
