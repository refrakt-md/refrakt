{% bug id="BUG-006" status="fixed" severity="major" milestone="v0.33.0" tags="docs,runes,reference" %}

# Rune attribute tables document attributes that do not exist, and omit ones that do

Thirteen rune reference pages carry a hand-written `## Attributes` table. **Two**
of them disagree with the rune's actual schema.

| Page | Documented, not real | Real, undocumented |
|---|---|---|
| `collection.md` | `item-template` | — |
| `aggregate.md` | — | `layout`, `chart-type`, `chart-title` |

**Corrected during the fix — this bug originally claimed four pages, and three
of those claims were wrong.** The first pass compared each page's tables against
the rune's own attributes without reading the surrounding headings, which
produced three false positives:

- **`tint.md` is correct.** Its two tables are labelled `### On the tint child
  rune` (`preset`, `mode` — right) and `### On any parent rune` (`tint`,
  `tint-mode`). The second documents the *universal* tint axis, which every
  block rune carries. Accurate as written.
- **`xref.md` does document its required attribute**, as `(positional)` — which
  is what a Markdoc primary attribute is. Not omitted, just not named `primary`.
  Renaming it is still worth doing, because a generated table will emit
  `primary` and a reader needs to connect the two, but it is a clarity fix
  rather than drift.
- **`collection.md` does document `show`**, inline in the `type` row
  (*"`show` is an alias"*), which matches `collection.ts:21` exactly.

The measured drift rate is therefore 2 in 13, not 4. That weakens this bug and
strengthens {% ref "SPEC-128" /%}'s case rather than the reverse: the pages that
*are* wrong were not findable by eye — this took a schema dump to see, and the
first careful reading still got three of four wrong.

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
- [x] `collection.md`'s `### Reusable templates — item-template` section is replaced with the partial-in-body pattern, and the `item-template` table row goes with it
- [x] `aggregate.md` documents `layout`, `chart-type`, and `chart-title`
- [x] `xref.md` names its required positional attribute `primary`, so the page and a generated table agree
- [x] The replacement `collection` + `partial` example is verified against the real content pipeline, not written from the same assumption that produced the original

(A fifth criterion — *"`tint.md` documents only `preset` and `mode`"* — was
withdrawn: the page is correct as written. See the correction at the top.)

## Approach

Fix the pages by hand — it is a small, mechanical diff and it should not wait on
tooling.

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
- WORK-534 / WORK-535 — narrowed per-rune universal attributes and improved `refrakt reference` reporting; the reason `tint.md`'s "on any parent rune" table is trustworthy is that those axes are now schema-declared per rune

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`site/content/runes/collection.md`** — replaced the
`### Reusable templates — item-template` section with the partial-in-body
pattern, and removed the `item-template` table row. `item-template` was never
implemented; a `{% partial %}` in the collection body does the job.

**`site/content/runes/aggregate.md`** — added the missing `layout`,
`chart-type` and `chart-title` rows, with their `matches` values.

**`site/content/runes/xref.md`** — the required positional attribute is now
named `primary`, with a note that it is written positionally. The row existed
as `(positional)`; naming it means the page and a generated table will agree.

**`packages/content/test/collection-partial-template.test.ts`** — new. Builds a
temp site and asserts the partial renders once per entity with `$item` bound and
nothing unresolved. The interaction is not obvious — partials inline at *parse*
time while a collection's per-item template is a deferred body re-parsed per
entity (SPEC-070) — so this is pinned rather than trusted.

### Notes

- **Three of this bug's four original claims were wrong**, corrected in the body.
  The first pass compared each page's tables against the rune's attributes
  without reading the surrounding headings. `tint.md` is correct (its second
  table is labelled "On any parent rune" and documents the universal tint axis);
  `xref.md` did document its required attribute, as `(positional)`;
  `collection.md` does document `show`, inline in the `type` row. Real drift was
  2 of 13 pages, not 4.
- That cuts against this bug and for {% ref "SPEC-128" /%}: the two genuinely
  wrong pages needed a schema dump to find, and a careful reading still
  misjudged three of four.
- The replacement example was verified against the real content pipeline before
  shipping, as this bug required — the section it replaces was itself a
  plausible-looking example that never worked.

{% /bug %}
