import * as converter from "../tmp/bundle.test.js"
import { expect } from "chai"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const writeFixtures = false // Set to true to save the results as expected test results.

const clean = (state) => {
    for (let prop of ["comments", "errors", "warnings"]) {
        if (!state[prop] || state[prop].length == 0) {
            delete state[prop]
        }
    }
    if (state.strings && !Object.keys(state.strings).length)
        delete state.strings
}

// Parse XML text content handling styled elements
const parseXMLText = (xml) => {
    // Remove style tags and extract text content
    let text = xml
        .replace(/<style[^>]*>/g, "")
        .replace(/<\/style>/g, "")
        .replace(/<[^>]+>/g, "") // Remove other XML tags
        .trim()
    return text
}

const parseRecord = (xml) => {
    const record = {}

    // Parse ref-type — handle both regular and self-closing forms:
    //   <ref-type name="Journal Article">17</ref-type>  (standard EndNote)
    //   <ref-type name="Journal Article"/>              (Mendeley)
    const refTypeMatch = xml.match(
        /<ref-type\s+name="([^"]+)"[^>]*\/>|<ref-type\s+name="([^"]+)"[^>]*>([^<]*)<\/ref-type>/
    )
    if (refTypeMatch) {
        // Group 1 = self-closing form, groups 2+3 = regular form
        const name = refTypeMatch[1] || refTypeMatch[2]
        const text = refTypeMatch[3] || ""
        record["ref-type"] = { name, "#text": text }
    }

    // Parse rec-number
    const recNumberMatch = xml.match(/<rec-number>([^<]+)<\/rec-number>/)
    if (recNumberMatch) {
        record["rec-number"] = recNumberMatch[1]
    }

    // Parse foreign-keys
    const foreignKeysMatch = xml.match(
        /<foreign-keys>([\s\S]*?)<\/foreign-keys>/
    )
    if (foreignKeysMatch) {
        const keyMatches = foreignKeysMatch[1].match(
            /<key[^>]*app="EN"[^>]*>([^<]+)<\/key>/
        )
        if (keyMatches) {
            record["foreign-keys"] = {
                key: { "#text": keyMatches[1], app: "EN" },
            }
        }
    }

    // Parse titles
    const titles = {}
    const titlesMatch = xml.match(/<titles>([\s\S]*?)<\/titles>/)
    if (titlesMatch) {
        const titlesContent = titlesMatch[1]
        const titleMatch = titlesContent.match(/<title>([\s\S]*?)<\/title>/)
        if (titleMatch) {
            titles.title = parseXMLText(titleMatch[1])
        }
        const secondaryTitleMatch = titlesContent.match(
            /<secondary-title>([\s\S]*?)<\/secondary-title>/
        )
        if (secondaryTitleMatch) {
            titles["secondary-title"] = parseXMLText(secondaryTitleMatch[1])
        }
        const tertiaryTitleMatch = titlesContent.match(
            /<tertiary-title>([\s\S]*?)<\/tertiary-title>/
        )
        if (tertiaryTitleMatch) {
            titles["tertiary-title"] = parseXMLText(tertiaryTitleMatch[1])
        }
        const shortTitleMatch = titlesContent.match(
            /<short-title>([\s\S]*?)<\/short-title>/
        )
        if (shortTitleMatch) {
            titles["short-title"] = parseXMLText(shortTitleMatch[1])
        }
        const altTitleMatch = titlesContent.match(
            /<alt-title>([\s\S]*?)<\/alt-title>/
        )
        if (altTitleMatch) {
            titles["alt-title"] = parseXMLText(altTitleMatch[1])
        }
        const translatedTitleMatch = titlesContent.match(
            /<translated-title>([\s\S]*?)<\/translated-title>/
        )
        if (translatedTitleMatch) {
            titles["translated-title"] = parseXMLText(translatedTitleMatch[1])
        }
    }
    if (Object.keys(titles).length > 0) {
        record.titles = titles
    }

    // Parse contributors with all author types
    const contributors = {}
    const contributorsMatch = xml.match(
        /<contributors>([\s\S]*?)<\/contributors>/
    )
    if (contributorsMatch) {
        const contributorsContent = contributorsMatch[1]

        // Parse authors
        const authorsMatch = contributorsContent.match(
            /<authors>([\s\S]*?)<\/authors>/
        )
        if (authorsMatch) {
            const authorMatches = authorsMatch[1].match(
                /<author[^>]*>([\s\S]*?)<\/author>/g
            )
            if (authorMatches) {
                contributors.authors = {
                    author: authorMatches.map((a) => {
                        const content = a.replace(
                            /<author[^>]*>([\s\S]*?)<\/author>/,
                            "$1"
                        )
                        const textContent = parseXMLText(content)
                        // Extract author attributes
                        const corpNameMatch = a.match(/corp-name="([^"]*)"/)
                        const firstNameMatch = a.match(/first-name="([^"]*)"/)
                        const lastNameMatch = a.match(/last-name="([^"]*)"/)
                        const initialsMatch = a.match(/initials="([^"]*)"/)
                        const suffixMatch = a.match(/suffix="([^"]*)"/)

                        const authorObj = { "#text": textContent }
                        if (corpNameMatch)
                            authorObj["corp-name"] = corpNameMatch[1]
                        if (firstNameMatch)
                            authorObj["first-name"] = firstNameMatch[1]
                        if (lastNameMatch)
                            authorObj["last-name"] = lastNameMatch[1]
                        if (initialsMatch) authorObj.initials = initialsMatch[1]
                        if (suffixMatch) authorObj.suffix = suffixMatch[1]

                        return authorObj
                    }),
                }
            }
        }

        // Parse secondary-authors
        const secondaryAuthorsMatch = contributorsContent.match(
            /<secondary-authors>([\s\S]*?)<\/secondary-authors>/
        )
        if (secondaryAuthorsMatch) {
            const authorMatches = secondaryAuthorsMatch[1].match(
                /<author[^>]*>([\s\S]*?)<\/author>/g
            )
            if (authorMatches) {
                contributors["secondary-authors"] = {
                    author: authorMatches.map((a) => {
                        const content = a.replace(
                            /<author[^>]*>([\s\S]*?)<\/author>/,
                            "$1"
                        )
                        return { "#text": parseXMLText(content) }
                    }),
                }
            }
        }

        // Parse tertiary-authors
        const tertiaryAuthorsMatch = contributorsContent.match(
            /<tertiary-authors>([\s\S]*?)<\/tertiary-authors>/
        )
        if (tertiaryAuthorsMatch) {
            const authorMatches = tertiaryAuthorsMatch[1].match(
                /<author[^>]*>([\s\S]*?)<\/author>/g
            )
            if (authorMatches) {
                contributors["tertiary-authors"] = {
                    author: authorMatches.map((a) => {
                        const content = a.replace(
                            /<author[^>]*>([\s\S]*?)<\/author>/,
                            "$1"
                        )
                        return { "#text": parseXMLText(content) }
                    }),
                }
            }
        }

        // Parse subsidiary-authors
        const subsidiaryAuthorsMatch = contributorsContent.match(
            /<subsidiary-authors>([\s\S]*?)<\/subsidiary-authors>/
        )
        if (subsidiaryAuthorsMatch) {
            const authorMatches = subsidiaryAuthorsMatch[1].match(
                /<author[^>]*>([\s\S]*?)<\/author>/g
            )
            if (authorMatches) {
                contributors["subsidiary-authors"] = {
                    author: authorMatches.map((a) => {
                        const content = a.replace(
                            /<author[^>]*>([\s\S]*?)<\/author>/,
                            "$1"
                        )
                        return { "#text": parseXMLText(content) }
                    }),
                }
            }
        }

        // Parse translated-authors
        const translatedAuthorsMatch = contributorsContent.match(
            /<translated-authors>([\s\S]*?)<\/translated-authors>/
        )
        if (translatedAuthorsMatch) {
            const authorMatches = translatedAuthorsMatch[1].match(
                /<author[^>]*>([\s\S]*?)<\/author>/g
            )
            if (authorMatches) {
                contributors["translated-authors"] = {
                    author: authorMatches.map((a) => {
                        const content = a.replace(
                            /<author[^>]*>([\s\S]*?)<\/author>/,
                            "$1"
                        )
                        return { "#text": parseXMLText(content) }
                    }),
                }
            }
        }
    }
    if (Object.keys(contributors).length > 0) {
        record.contributors = contributors
    }

    // Parse periodical
    const periodicalMatch = xml.match(/<periodical>([\s\S]*?)<\/periodical>/)
    if (periodicalMatch) {
        const periodicalContent = periodicalMatch[1]
        const periodical = {}
        const fullTitleMatch = periodicalContent.match(
            /<full-title>([\s\S]*?)<\/full-title>/
        )
        if (fullTitleMatch) {
            periodical["full-title"] = parseXMLText(fullTitleMatch[1])
        }
        const abbr1Match = periodicalContent.match(
            /<abbr-1>([\s\S]*?)<\/abbr-1>/
        )
        if (abbr1Match) {
            periodical["abbr-1"] = parseXMLText(abbr1Match[1])
        }
        if (Object.keys(periodical).length > 0) {
            record.periodical = periodical
        }
    }

    // Parse pages
    const pagesMatch = xml.match(/<pages([^>]*)>([\s\S]*?)<\/pages>/)
    if (pagesMatch) {
        const startAttrMatch = pagesMatch[1].match(/start="([^"]*)"/)
        const endAttrMatch = pagesMatch[1].match(/end="([^"]*)"/)
        const pagesObj = { "#text": parseXMLText(pagesMatch[2]) }
        if (startAttrMatch) pagesObj.start = startAttrMatch[1]
        if (endAttrMatch) pagesObj.end = endAttrMatch[1]
        record.pages = pagesObj
    }

    // Parse volume
    const volumeMatch = xml.match(/<volume>([\s\S]*?)<\/volume>/)
    if (volumeMatch) {
        record.volume = parseXMLText(volumeMatch[1])
    }

    // Parse number
    const numberMatch = xml.match(/<number>([\s\S]*?)<\/number>/)
    if (numberMatch) {
        record.number = parseXMLText(numberMatch[1])
    }

    // Parse issue
    const issueMatch = xml.match(/<issue>([\s\S]*?)<\/issue>/)
    if (issueMatch) {
        record.issue = parseXMLText(issueMatch[1])
    }

    // Parse secondary-volume
    const secondaryVolumeMatch = xml.match(
        /<secondary-volume>([\s\S]*?)<\/secondary-volume>/
    )
    if (secondaryVolumeMatch) {
        record["secondary-volume"] = parseXMLText(secondaryVolumeMatch[1])
    }

    // Parse secondary-issue
    const secondaryIssueMatch = xml.match(
        /<secondary-issue>([\s\S]*?)<\/secondary-issue>/
    )
    if (secondaryIssueMatch) {
        record["secondary-issue"] = parseXMLText(secondaryIssueMatch[1])
    }

    // Parse num-vols
    const numVolsMatch = xml.match(/<num-vols>([\s\S]*?)<\/num-vols>/)
    if (numVolsMatch) {
        record["num-vols"] = parseXMLText(numVolsMatch[1])
    }

    // Parse edition
    const editionMatch = xml.match(/<edition>([\s\S]*?)<\/edition>/)
    if (editionMatch) {
        record.edition = parseXMLText(editionMatch[1])
    }

    // Parse section
    const sectionMatch = xml.match(/<section>([\s\S]*?)<\/section>/)
    if (sectionMatch) {
        record.section = parseXMLText(sectionMatch[1])
    }

    // Parse dates
    const dates = {}
    const datesMatch = xml.match(/<dates>([\s\S]*?)<\/dates>/)
    if (datesMatch) {
        const datesContent = datesMatch[1]

        // Parse year element
        const yearMatch = datesContent.match(/<year([^>]*)>([\s\S]*?)<\/year>/)
        if (yearMatch) {
            const yearObj = { "#text": parseXMLText(yearMatch[2]) }
            const yearAttrMatch = yearMatch[1].match(/year="([^"]*)"/)
            const monthAttrMatch = yearMatch[1].match(/month="([^"]*)"/)
            const dayAttrMatch = yearMatch[1].match(/day="([^"]*)"/)
            if (yearAttrMatch) yearObj.year = yearAttrMatch[1]
            if (monthAttrMatch) yearObj.month = monthAttrMatch[1]
            if (dayAttrMatch) yearObj.day = dayAttrMatch[1]
            dates.year = yearObj
        }

        // Parse pub-dates
        const pubDatesMatch = datesContent.match(
            /<pub-dates>([\s\S]*?)<\/pub-dates>/
        )
        if (pubDatesMatch) {
            const dateMatches = pubDatesMatch[1].match(
                /<date([^>]*)>([\s\S]*?)<\/date>/g
            )
            if (dateMatches) {
                dates["pub-dates"] = {
                    date: dateMatches.map((d) => {
                        const dateContent = d.replace(
                            /<date([^>]*)>([\s\S]*?)<\/date>/,
                            "$2"
                        )
                        const attrs = d.replace(
                            /<date([^>]*)>([\s\S]*?)<\/date>/,
                            "$1"
                        )
                        const dateObj = { "#text": parseXMLText(dateContent) }
                        const yearAttrMatch = attrs.match(/year="([^"]*)"/)
                        const monthAttrMatch = attrs.match(/month="([^"]*)"/)
                        const dayAttrMatch = attrs.match(/day="([^"]*)"/)
                        if (yearAttrMatch) dateObj.year = yearAttrMatch[1]
                        if (monthAttrMatch) dateObj.month = monthAttrMatch[1]
                        if (dayAttrMatch) dateObj.day = dayAttrMatch[1]
                        return dateObj
                    }),
                }
            }
        }
    }
    if (Object.keys(dates).length > 0) {
        record.dates = dates
    }

    // Parse publisher
    const publisherMatch = xml.match(/<publisher>([\s\S]*?)<\/publisher>/)
    if (publisherMatch) {
        record.publisher = parseXMLText(publisherMatch[1])
    }

    // Parse pub-location
    const pubLocationMatch = xml.match(
        /<pub-location>([\s\S]*?)<\/pub-location>/
    )
    if (pubLocationMatch) {
        record["pub-location"] = parseXMLText(pubLocationMatch[1])
    }

    // Parse orig-pub
    const origPubMatch = xml.match(/<orig-pub>([\s\S]*?)<\/orig-pub>/)
    if (origPubMatch) {
        record["orig-pub"] = parseXMLText(origPubMatch[1])
    }

    // Parse isbn
    const isbnMatch = xml.match(/<isbn>([\s\S]*?)<\/isbn>/)
    if (isbnMatch) {
        record.isbn = parseXMLText(isbnMatch[1])
    }

    // Parse issn
    const issnMatch = xml.match(/<isbn[^>]*>([\s\S]*?)<\/isbn>/)
    if (issnMatch) {
        // Note: the test file has isbn instead of issn - fix the regex if needed
        record.issn = parseXMLText(issnMatch[1])
    }
    // Also check for actual issn tag
    const actualIssnMatch = xml.match(/<issn>([\s\S]*?)<\/issn>/)
    if (actualIssnMatch) {
        record.issn = parseXMLText(actualIssnMatch[1])
    }

    // Parse doi
    const doiMatch = xml.match(/<doi>([\s\S]*?)<\/doi>/)
    if (doiMatch) {
        record.doi = parseXMLText(doiMatch[1])
    }

    // Parse electronic-resource-num (DOI field used by Mendeley and newer
    // EndNote exports instead of the legacy <doi> element)
    const electronicResourceNumMatch = xml.match(
        /<electronic-resource-num>([\s\S]*?)<\/electronic-resource-num>/
    )
    if (electronicResourceNumMatch) {
        record["electronic-resource-num"] = parseXMLText(
            electronicResourceNumMatch[1]
        )
    }

    // Parse abstract
    const abstractMatch = xml.match(/<abstract>([\s\S]*?)<\/abstract>/)
    if (abstractMatch) {
        record.abstract = parseXMLText(abstractMatch[1])
    }

    // Parse notes
    const notesMatch = xml.match(/<notes>([\s\S]*?)<\/notes>/)
    if (notesMatch) {
        record.notes = parseXMLText(notesMatch[1])
    }

    // Parse research-notes
    const researchNotesMatch = xml.match(
        /<research-notes>([\s\S]*?)<\/research-notes>/
    )
    if (researchNotesMatch) {
        record["research-notes"] = parseXMLText(researchNotesMatch[1])
    }

    // Parse keywords
    const keywordsMatch = xml.match(/<keywords>([\s\S]*?)<\/keywords>/)
    if (keywordsMatch) {
        const keywordMatches = keywordsMatch[1].match(
            /<keyword>([\s\S]*?)<\/keyword>/g
        )
        if (keywordMatches) {
            record.keywords = {
                keyword: keywordMatches.map((k) => parseXMLText(k)),
            }
        }
    }

    // Parse language
    const languageMatch = xml.match(/<language>([\s\S]*?)<\/language>/)
    if (languageMatch) {
        record.language = parseXMLText(languageMatch[1])
    }

    // Parse urls
    const urlsMatch = xml.match(/<urls>([\s\S]*?)<\/urls>/)
    if (urlsMatch) {
        const urlsContent = urlsMatch[1]
        const urls = {}

        const webUrlsMatch = urlsContent.match(
            /<web-urls>([\s\S]*?)<\/web-urls>/
        )
        if (webUrlsMatch) {
            const urlMatches = webUrlsMatch[1].match(
                /<url[^>]*>([\s\S]*?)<\/url>/g
            )
            if (urlMatches) {
                urls["web-urls"] = {
                    url: urlMatches.map((u) => ({ "#text": parseXMLText(u) })),
                }
            }
        }

        const relatedUrlsMatch = urlsContent.match(
            /<related-urls>([\s\S]*?)<\/related-urls>/
        )
        if (relatedUrlsMatch) {
            const urlMatches = relatedUrlsMatch[1].match(
                /<url[^>]*>([\s\S]*?)<\/url>/g
            )
            if (urlMatches) {
                urls["related-urls"] = {
                    url: urlMatches.map((u) => ({ "#text": parseXMLText(u) })),
                }
            }
        }

        const pdfUrlsMatch = urlsContent.match(
            /<pdf-urls>([\s\S]*?)<\/pdf-urls>/
        )
        if (pdfUrlsMatch) {
            const urlMatches = pdfUrlsMatch[1].match(
                /<url[^>]*>([\s\S]*?)<\/url>/g
            )
            if (urlMatches) {
                urls["pdf-urls"] = {
                    url: urlMatches.map((u) => ({ "#text": parseXMLText(u) })),
                }
            }
        }

        const textUrlsMatch = urlsContent.match(
            /<text-urls>([\s\S]*?)<\/text-urls>/
        )
        if (textUrlsMatch) {
            const urlMatches = textUrlsMatch[1].match(
                /<url[^>]*>([\s\S]*?)<\/url>/g
            )
            if (urlMatches) {
                urls["text-urls"] = {
                    url: urlMatches.map((u) => ({ "#text": parseXMLText(u) })),
                }
            }
        }

        if (Object.keys(urls).length > 0) {
            record.urls = urls
        }
    }

    // Parse accession-num
    const accessionNumMatch = xml.match(
        /<accession-num>([\s\S]*?)<\/accession-num>/
    )
    if (accessionNumMatch) {
        record["accession-num"] = parseXMLText(accessionNumMatch[1])
    }

    // Parse call-num
    const callNumMatch = xml.match(/<call-num>([\s\S]*?)<\/call-num>/)
    if (callNumMatch) {
        record["call-num"] = parseXMLText(callNumMatch[1])
    }

    // Parse report-id
    const reportIdMatch = xml.match(/<report-id>([\s\S]*?)<\/report-id>/)
    if (reportIdMatch) {
        record["report-id"] = parseXMLText(reportIdMatch[1])
    }

    // Parse work-type
    const workTypeMatch = xml.match(/<work-type>([\s\S]*?)<\/work-type>/)
    if (workTypeMatch) {
        record["work-type"] = parseXMLText(workTypeMatch[1])
    }

    // Parse reviewed-item
    const reviewedItemMatch = xml.match(
        /<reviewed-item>([\s\S]*?)<\/reviewed-item>/
    )
    if (reviewedItemMatch) {
        record["reviewed-item"] = parseXMLText(reviewedItemMatch[1])
    }

    // Parse label
    const labelMatch = xml.match(/<label>([\s\S]*?)<\/label>/)
    if (labelMatch) {
        record.label = parseXMLText(labelMatch[1])
    }

    // Parse access-date
    const accessDateMatch = xml.match(/<access-date>([\s\S]*?)<\/access-date>/)
    if (accessDateMatch) {
        record["access-date"] = parseXMLText(accessDateMatch[1])
    }

    // Parse modified-date
    const modifiedDateMatch = xml.match(
        /<modified-date>([\s\S]*?)<\/modified-date>/
    )
    if (modifiedDateMatch) {
        record["modified-date"] = parseXMLText(modifiedDateMatch[1])
    }

    // Parse custom fields
    for (let i = 1; i <= 7; i++) {
        const customMatch = xml.match(
            new RegExp(`<custom${i}>([\\s\\S]*?)</custom${i}>`)
        )
        if (customMatch) {
            record[`custom${i}`] = parseXMLText(customMatch[1])
        }
    }

    // Parse misc fields
    for (let i = 1; i <= 3; i++) {
        const miscMatch = xml.match(
            new RegExp(`<misc${i}>([\\s\\S]*?)</misc${i}>`)
        )
        if (miscMatch) {
            record[`misc${i}`] = parseXMLText(miscMatch[1])
        }
    }

    return record
}

const verify = (enfile) => {
    // Read XML file and parse it
    const xmlContent = fs.readFileSync(enfile, "utf8")

    let records = []

    // Check for <records> wrapper (EndNote.dtd format)
    const recordsMatch = xmlContent.match(/<records>([\s\S]*?)<\/records>/)
    if (recordsMatch || xmlContent.includes("<records>")) {
        const recordMatches = xmlContent.match(/<record>([\s\S]*?)<\/record>/g)
        if (recordMatches) {
            for (const recordXml of recordMatches) {
                records.push(parseRecord(recordXml))
            }
        }
    } else {
        // Check for <EndNote> wrapper (Cite While You Write format)
        const endNoteMatch = xmlContent.match(/<EndNote>([\s\S]*?)<\/EndNote>/)
        if (endNoteMatch) {
            const citeMatches = xmlContent.match(
                /<Cite>[\s\S]*?<record>([\s\S]*?)<\/record>[\s\S]*?<\/Cite>/g
            )
            if (citeMatches) {
                for (const citeXml of citeMatches) {
                    const recordMatch = citeXml.match(
                        /<record>([\s\S]*?)<\/record>/
                    )
                    if (recordMatch) {
                        records.push(parseRecord(recordMatch[0]))
                    }
                }
            }
        }
    }

    let input = records
    let name = path.basename(enfile, path.extname(enfile))

    let found = converter.parseEndNote(input)
    clean(found)

    let expected = path.join(path.dirname(enfile), name + ".json")
    if (writeFixtures) {
        fs.writeFileSync(expected, JSON.stringify(found, null, 4) + "\n")
    }

    if (!fs.existsSync(expected)) {
        console.log(
            `Expected file ${expected} does not exist, creating fixture`
        )
        fs.writeFileSync(expected, JSON.stringify(found, null, 4) + "\n")
        return
    }

    expected = JSON.parse(fs.readFileSync(expected, "utf8"))
    clean(expected)

    it(name, () => {
        expect(found).to.be.deep.equal(expected)
    })
}

const fixtures = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "fixtures/import/endnote"
)
const enfiles = fs.readdirSync(fixtures)

for (let fixture of enfiles) {
    if (path.extname(fixture) !== ".xml") {
        continue
    }

    fixture = path.join(fixtures, fixture)

    verify(fixture)
}
