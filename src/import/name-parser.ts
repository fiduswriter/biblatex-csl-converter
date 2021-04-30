import { BibLatexLiteralParser } from "./literal-parser";
import type { NameDictObject } from "../const";

export class BibLatexNameParser {
    nameString: string;
    nameDict: NameDictObject;
    _particle: Array<string>;
    _suffix: Array<string>;

    constructor(nameString: string) {
        this.nameString = nameString.trim();
        this.nameDict = {};
        this._particle = [];
        this._suffix = [];
    }

    parseName() {
        let parts = this.splitTexString(this.nameString, ",");
        if (parts.length > 1 && this.nameString.includes("=")) {
            // extended name detected.
            this.parseExtendedName(parts);
        } else if (parts.length === 3) {
            // von Last, Jr, First
            this.processVonLast(
                this.splitTexString(parts[0].replace(/[{}]/g, "")),
                this.splitTexString(parts[1])
            );
            this.processFirstMiddle(this.splitTexString(parts[2]));
        } else if (parts.length === 2) {
            // von Last, First
            this.processVonLast(
                this.splitTexString(parts[0].replace(/[{}]/g, ""))
            );
            this.processFirstMiddle(this.splitTexString(parts[1]));
        } else if (parts.length === 1) {
            // First von Last
            let spacedParts = this.splitTexString(this.nameString);
            if (spacedParts.length === 1) {
                if (
                    this.nameString[0] === "{" &&
                    this.nameString[this.nameString.length - 1] === "}" &&
                    this.nameString.includes("=") &&
                    this.nameString.includes(",") &&
                    this.nameString.includes(" ") &&
                    (this.nameString.includes("given") ||
                        this.nameString.includes("family"))
                ) {
                    parts = this.splitTexString(
                        this.nameString.slice(1, this.nameString.length - 1),
                        ","
                    );
                    // extended name detected.
                    this.parseExtendedName(parts);
                } else {
                    let literal = this._reformLiteral(spacedParts[0]);
                    if (literal.length) {
                        this.nameDict["literal"] = literal;
                    }
                }
            } else {
                let split = this.splitAt(spacedParts);
                let firstMiddle = split[0];
                let vonLast = split[1];
                if (vonLast.length === 0 && firstMiddle.length > 1) {
                    let last = firstMiddle.pop()!;
                    vonLast.push(last);
                }
                this.processFirstMiddle(firstMiddle);
                this.processVonLast(vonLast);
            }
        } else {
            this.nameDict["literal"] = this._reformLiteral(
                this.nameString.trim()
            );
        }
    }

    parseExtendedName(parts: Array<string>) {
        parts.forEach((part) => {
            let attrParts = part.trim().replace(/^"|"$/g, "").split("=");
            let attrName = attrParts.shift()!.trim().toLowerCase();
            if (["family", "given", "prefix", "suffix"].includes(attrName)) {
                (this.nameDict as any)[attrName] = this._reformLiteral(
                    attrParts.join("=").trim()
                );
            } else if (attrName === "useprefix") {
                if (attrParts.join("").trim().toLowerCase() === "true") {
                    this.nameDict["useprefix"] = true;
                } else {
                    this.nameDict["useprefix"] = false;
                }
            }
        });
    }

    get output() {
        this.parseName();
        if (Object.keys(this.nameDict).length) {
            return this.nameDict;
        } else {
            return false;
        }
    }

    splitTexString(string: string, sep: string = "[\\s~]+") {
        let braceLevel = 0;
        let inQuotes = false;
        let nameStart = 0;
        let result = [];
        let stringLen = string.length;
        let pos = 0;
        while (pos < stringLen) {
            let char = string.charAt(pos);
            switch (char) {
                case "{":
                    braceLevel += 1;
                    break;
                case "}":
                    braceLevel -= 1;
                    break;
                case '"':
                    inQuotes = !inQuotes;
                    break;
                case "\\":
                    // skip next
                    pos++;
                    break;
                default:
                    if (braceLevel === 0 && inQuotes === false && pos > 0) {
                        let match = string.slice(pos).match(RegExp(`^${sep}`));
                        if (match) {
                            let sepLen = match[0].length;
                            if (pos + sepLen < stringLen) {
                                result.push(string.slice(nameStart, pos));
                                nameStart = pos + sepLen;
                            }
                        }
                    }
            }

            pos++;
        }
        if (nameStart < stringLen) {
            result.push(string.slice(nameStart));
        }
        return result;
    }

    processFirstMiddle(parts: Array<string>) {
        this.nameDict["given"] = this._reformLiteral(parts.join(" ").trim());
    }

    processVonLast(parts: Array<string>, lineage: Array<string> = []) {
        let rSplit = this.rsplitAt(parts);
        let von = rSplit[0];
        let last = rSplit[1];
        if (von && !last) {
            (last as string[]).push((von as string[]).pop()!);
        }
        if (von.length) {
            this.nameDict["prefix"] = this._reformLiteral(von.join(" ").trim());
            this.nameDict["useprefix"] = true; // The info at hand is not clear, so we guess.
        }
        if (lineage.length) {
            this.nameDict["suffix"] = this._reformLiteral(
                lineage.join(" ").trim()
            );
        }
        this.nameDict["family"] = this._reformLiteral(last.join(" ").trim());
    }

    findFirstLowerCaseWord(lst: Array<string>) {
        // return index of first lowercase word in lst. Else return length of lst.
        for (let i = 0; i < lst.length; i++) {
            let word = lst[i];
            if (word === word.toLowerCase()) {
                return i;
            }
        }
        return lst.length;
    }

    splitAt(lst: Array<string>): [Array<string>, Array<string>] {
        // Split the given list into two parts.
        // The second part starts with the first lowercase word.
        const pos = this.findFirstLowerCaseWord(lst);
        return [lst.slice(0, pos), lst.slice(pos)];
    }

    rsplitAt(lst: Array<string>): [Array<string>, Array<string>] {
        const rpos = this.findFirstLowerCaseWord(lst.slice().reverse());
        const pos = lst.length - rpos;
        return [lst.slice(0, pos), lst.slice(pos)];
    }

    _reformLiteral(litString: string) {
        let parser = new BibLatexLiteralParser(litString);
        return parser.output;
    }
}
