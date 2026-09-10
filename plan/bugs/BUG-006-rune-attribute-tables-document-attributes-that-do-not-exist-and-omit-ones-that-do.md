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
- [ ] `collection.md` no longer documents `item-template`; `show` is documented
- [ ] `tint.md` documents only `preset` and `mode`
- [ ] `xref.md` documents `primary`, marked required
- [ ] `aggregate.md` documents `layout`, `chart-type`, and `chart-title`
- [ ] A decision is recorded on whether `item-template` should be *implemented* rather than deleted from the docs

## Approach

Fix the four pages by hand — it is a small, mechanical diff and it should not
wait on tooling.

`item-template` needs a call before editing: the documented behaviour (point a
collection at a reusable partial instead of an inline body) is coherent and
matches `entityRoutes`' `render-template`, so this may be a *missing feature*
rather than stale prose. Deleting the section is correct only if the feature
isn't wanted; otherwise the bug is in the rune, not the page.

Preventing recurrence is {% ref "SPEC-128" /%} — generating these tables rather
than checking them. This bug is deliberately independent of it: the pages are
wrong today and the fix should not be blocked on a generator.

## References

- {% ref "SPEC-128" /%} — generate the tables from the rune reference, so this class of drift cannot recur
- `scripts/check-rune-docs.mjs` — the existing guard, which covers page existence but not page content
- WORK-534 / WORK-535 — narrowed per-rune universal attributes and improved `refrakt reference` reporting; the `tint.md` mismatch is visible against the post-WORK-534 schemas

{% /bug %}
