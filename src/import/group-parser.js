export class GroupParser {
    constructor(entries) {
      this.groups = false
      this.groupType = 'jabref4'
      this.warnings = []
      this.entries = entries
      this.stringStarts = [
          ["jabref-meta: databaseType:bibtex;", () => this.groupType = 'jabref4'],
          ["jabref-meta: groupsversion:3;", () => this.groupType = 'jabref3'],
          ["jabref-meta: groupstree:", () => this.readGroupInfo()]
      ]
    }

    checkString(input) {
        this.input = input
        this.pos = 0
        this.stringStarts.find(stringStart => {
            let pos = this.input.indexOf(stringStart[0], this.pos)
            if (pos < 0) {
                return false
            } else {
                this.pos = pos + stringStart[0].length
                stringStart[1]()
                return true
            }
        })
    }

    readGroupInfo() {
        switch(this.groupType) {
            case 'jabref3':
                this.readJabref3()
                break
            case 'jabref4':
                this.readJabref4()
                break
            default:
                break
        }
    }

    readJabref3() {

      /*  The JabRef Groups format is... interesting. To parse it, you must:
          1. Unwrap the lines (just remove the newlines)
          2. Split the lines on ';' (but not on '\;')
          3. Each line is a group which is formatted as follows:
             <level> <type>:<name>\;<intersect>\;<citekey1>\;<citekey2>\;....

          Each level can interact with the level it is nested under; either no interaction (intersect = 0), intersection
          (intersect = 1) or union (intersect = 2).

          There are several group types: root-level (all references are implicitly available on the root level),
          ExplicitGroup (the citation keys are listed in the group line) or query-type groups. I have only implemented
          explicit groups.
      */
        // skip any whitespace after the identifying string */
        while (
            (this.input.length > this.pos) &&
            ('\r\n '.indexOf(this.input[this.pos]) >= 0)
        ) { this.pos++ }
        // simplify parsing by taking the whole comment, throw away newlines, replace the escaped separators with tabs, and
        // then split on the remaining non-escaped separators
        // I use \u2004 to protect \; and \u2005 to protect \\\; (the escaped version of ';') when splitting lines at ;
        let lines = this.input.substring(this.pos).replace(/[\r\n]/g, '').replace(/\\\\\\;/g, '\u2005').replace(/\\;/g, '\u2004').split(';')
        lines = lines.map(line => line.replace(/\u2005/g,';'))
        let levels = { '0': { references: [], groups: [] } }
        for (let line of lines) {
            if (line === '') { continue }
            let match = line.match(/^([0-9])\s+([^:]+):(.*)/)
            if (!match) { return }
            let level = parseInt(match[1])
            let type = match[2]
            let references = match[3]
            references = references ? references.split('\u2004').filter(key => key) : []
            let name = references.shift()
            let intersection = references.shift() // 0 = independent, 1 = intersection, 2 = union

            // ignore root level, has no refs anyway in the comment
            if (level === 0) { continue }

            // remember this group as the current `level` level, so that any following `level + 1` levels can find it
            levels[level] = { name, groups: [], references }
            // and add it to its parent
            levels[level - 1].groups.push(levels[level])

            // treat all groups as explicit
            if (type != 'ExplicitGroup') {
                this.warnings.push({
                    type: 'unsupported_jabref_group',
                    group_type: type
                })
            }

            switch (intersection) {
                case '0':
                // do nothing more
                break
                case '1':
                // intersect with parent. Hardly ever used.
                levels[level].references = levels[level].references.filter(key => levels[level - 1].references.includes(key))
                break
                case '2':
                // union with parent
                levels[level].references = [...new Set([...levels[level].references, ...levels[level - 1].references])]
                break
            }
        }

        this.groups = levels['0'].groups
    }


    readJabref4() {

        this.readJabref3()

        // this assumes the JabRef groups always come after the references
        this.entries.forEach(bib => {

            if (!bib.unknown_fields.groups || !bib.entry_key) {
                return
            }
            // this assumes ref.unknown_fields.groups is a single text chunk
            let groups = bib.unknown_fields.groups.reduce(
                (string, node) =>
                    node.type === 'text' ? string + node.text : string,
                ''
            ).trim()
            delete bib.unknown_fields.groups

            if (!groups.length) {
                return
            }

            groups.split(/\s*,\s*/).forEach(groupName => {
                let group = this.find(groupName)
                if (group) {
                    group.references.push(bib.entry_key)
                }
            })
        })
    }

    find (name, groups) {
        groups = groups || this.groups
        if (!groups) {
            return false
        }

        for (let i = 0; i < groups.length; i++) {
            if (groups[i].name === name) return groups[i]
            let group = this.find(name, groups[i].groups)
            if (group) return group
        }
        return false
    }
}
