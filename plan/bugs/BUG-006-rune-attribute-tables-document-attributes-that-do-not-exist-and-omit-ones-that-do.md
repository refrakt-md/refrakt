{% bug id="BUG-006" status="confirmed" severity="major" milestone="v0.32.0" tags="docs,runes,reference" %}

# Rune attribute tables document attributes that do not exist, and omit ones that do

Thirteen rune reference pages carry a hand-written `## Attributes` table. Four
of them disagree with the rune's actual schema — in both directions. Measured
against `refrakt reference <name> --format json` on `main` at `f92d50a`, after
the v0.31.0 milestone work (WORK-534/535) landed.

| Page | Documented, not real | Real, undocumented |
|---|---|---|
| `collection.md` | `item-template` | `show` |
| `tint.md` | `tint`, `tint-mode` | — |
| `aggregate.md` | — | `layout`, `chart-type`, `chart-title` |
| `xref.md` | — | `primary` **(required)** |

## Expected

A rune's attribute table lists the attributes the rune accepts, and nothing
else. An author copying an example from the reference gets working Markdoc.

## Actual

Two failure modes, and the first is the worse one.

**`collection.md` documents an attribute that has never existed.** Lines 139–146
carry a `### Reusable templates — item-template` section with a worked example:

```markdoc
{% collection type="page" filter="url:/blog/*" sort="date-desc" item-template="cards:post.md" /%}
```

`packages/runes/src/tags/collection.ts` declares `type`, `filter`, `sort`,
`group`, `limit`, `show`, `fields`, `layout`, `group-display`, `empty`. There is
no `item-template`. A repo-wide search finds the string in exactly two places,
both **comments** in `config.ts`; it appears in no schema, no implementation, and
no test. `git log -S` confirms it has never been in the rune source — it entered
the docs at `c3fe915` and was never implemented.

**The attribute was deliberately abandoned**, not forgotten: a `{% partial %}`
placed inside the collection's body does the same job, and is the more intuitive
and composable pattern — it reuses the partial mechanism authors already know
rather than adding a second, collection-specific way to name a template file.
The docs simply kept describing the discarded design. So the fix is to document
the partial-in-body pattern, not to implement `item-template`.

**`tint.md` documents `tint` and `tint-mode`**, but the `tint` rune's own
attributes are `preset` and `mode`, and it carries no universal attributes at
all. Plausibly exposed rather than caused by WORK-534, which narrowed universal
attributes to the ones each rune actually applies.

**`xref.md` omits `primary`** — the rune's one **required** attribute. The table
lists `label`, `type`, and `preview`; the attribute an author cannot omit is not
in it.

**`aggregate.md` omits `layout`, `chart-type`, and `chart-title`.** The page's
prose covers `layout="chart"` correctly, and `rune-catalog.md` uses all three in
a live example — so the feature is documented and exercised in this repo, while
the table that claims to enumerate the rune's attributes is missing them.

## Steps to reproduce

```bash
npm run build
node packages/cli/dist/bin.js reference collection --format json
# → own: type, filter, sort, group, limit, show, fields, layout, group-display, empty
grep -n "item-template" site/content/runes/collection.md
# → documented as a live attribute with a worked example
```

## Root cause

`scripts/check-rune-docs.mjs` guards that every rune **has a page** and every
`type: rune` page **has a rune**. Nothing checks what the page says about the
rune. Coverage is enforced; content is not.

The tables are hand-copied from schemas that keep moving — and the reference
data needed to check them has existed the whole time, as
`refrakt reference <name> --format json`.

## Acceptance Criteria
- [ ] `collection.md`'s `### Reusable templates — item-template` section is replaced with the partial-in-body pattern, and `show` is documented
- [ ] `tint.md` documents only `preset` and `mode`
- [ ] `xref.md` documents `primary`, marked required
- [ ] `aggregate.md` documents `layout`, `chart-type`, and `chart-title`
- [ ] The replacement `collection` + `partial` example is verified to build, not written from the same assumption that produced the original

## Approach

Fix the four pages by hand — it is a small, mechanical diff and it should not
wait on tooling.

The `collection.md` edit is the only one that writes new prose rather than
correcting a row. The replacement is a `{% partial %}` inside the collection
body, and it **must be verified against a real build** before it ships: the
section being replaced was itself a plausible-looking example that never worked,
and swapping in a second unverified example would repeat the bug rather than fix
it.

Two things suggest the pattern is sound, and neither is proof: `collection.md:168`
already asserts that `{% link href=$item.url %}` "works in any body template,
**partial**, or table cell where `$item` is bound", and `config.partials` is
handed to Markdoc's transform config, so a partial's content expands within the
transform pass and per-item `$item` binding applies to it. Confirm with a build,
not with either of those.

Preventing recurrence is {% ref "SPEC-128" /%} — generating these tables rather
than checking them. This bug is deliberately independent of it: the pages are
wrong today and the fix should not be blocked on a generator.

## References

- {% ref "SPEC-128" /%} — generate the tables from the rune reference, so this class of drift cannot recur
- `scripts/check-rune-docs.mjs` — the existing guard, which covers page existence but not page content
- WORK-534 / WORK-535 — narrowed per-rune universal attributes and improved `refrakt reference` reporting; the `tint.md` mismatch is visible against the post-WORK-534 schemas

{% /bug %}
