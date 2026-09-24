---
'@refrakt-md/content': minor
'@refrakt-md/cli': minor
'@refrakt-md/mcp': minor
'@refrakt-md/types': minor
'@refrakt-md/transform': minor
---

Rank documentation against the code it describes, and ask before the divergence
exists.

```
staleness = commits touching the target since the referring page last changed
```

`refrakt stale` prints that ranking, with the commit subjects — "11 commits" is
a number, but "generate breadcrumb positions from a declared index" is a person
recognising that the page they wrote is out of date.

**It ranks; it never fails.** Findings do not affect the exit code, and there is
no flag to make them. The cheapest way to turn any edge green is to edit the
referring page, so a gate would train people to make trivial documentation edits
to clear it — destroying the signal it measures. Being unable to measure at all
(a shallow clone, no config) is a different event and does exit non-zero.

Four kinds of reference are found: `snippet`/`file-ref` `path=`, internal links
that carry an adjacent description, backticked repo paths in prose, and a new
`documents:` frontmatter field:

```yaml
---
title: Rune Authoring Overview
documents:
  - packages/runes/src/config.ts
  - packages/transform/src/engine.ts
---
```

A page's subject is often not in its words, and `documents:` says it outright.
Unlike an inferred reference, an entry that resolves to no file is an error: the
author asserted the relationship.

The `refrakt.stale` MCP tool answers the same survey, and one more question that
is better timed:

```
refrakt.stale { touching: ["packages/runes/src/config.ts"] }
→ the pages that document that file, before it changes
```

That query involves no commit count and no git history at all, so it answers for
a file created in the working tree and never committed.

An optional `stale` section in `refrakt.config.json` narrows what is measured:
`archival` globs name referring pages that are historical records, `generated`
globs name targets that change by construction. Both default to empty, and
whatever they remove is counted in the report footer.
