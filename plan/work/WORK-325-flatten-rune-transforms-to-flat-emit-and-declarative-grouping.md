{% work id="WORK-325" status="done" priority="medium" complexity="complex" source="SPEC-081" tags="runes,plugins,transform,migration,layout" milestone="v0.18.0" %}

# Flatten rune transforms to flat-emit + declarative grouping

Migrate the runes that hand-build structural skeletons in TypeScript to emit a
**flat bag of `data-name` slots** (content interpretation only) and declare their
preamble / content / media grouping via the recursive `layout` from
{% ref "WORK-324" /%}. Output stays identical; the grouping moves from imperative
code to config.

## Acceptance Criteria

- [x] Recipe, howto, character, realm, faction emit flat slots; their content /
  media columns and preamble `<header>` are created via `layout`, not the schema.
- [x] Event, playlist, and the other meta-bearing page-section runes likewise
  emit flat slots + declarative grouping.
- [x] Per-rune output is visually identical — snapshot / structure-contract
  parity against the pre-migration output.
- [x] The `event` class of bug is structurally impossible: `headline` / `blurb`
  are addressable at the level `layout` places them (not buried in a
  schema-built wrapper).
- [x] Full suite + both contracts green.

## Dependencies

- {% ref "WORK-324" /%} — the recursive `layout` resolver.

## References

- {% ref "SPEC-081" /%} — declarative structure assembly.

## Resolution

Completed: 2026-06-03

Branch: `claude/definitions-list-styling-9nOGL`

### What was done
Migrated the meta-bearing page-section runes from hand-built structural
skeletons to **flat `data-name` emit + recursive `layout`** (WORK-324):

- **recipe** (`plugins/learning`) — content column + preamble header now from
  `layout`; flat ingredients/steps/tips slots.
- **howto** (`plugins/learning`) — content column + preamble header from
  `layout`; flat tools/steps slots.
- **character** (`plugins/storytelling`) — content column + preamble header
  from `layout`; portrait stays a floated avatar sibling at the article root.
- **realm + faction** (`plugins/storytelling`) — refactored the shared
  `buildStoryContent` helper to emit flat `body` + `sections` slots; the
  scene+content split, content column, and preamble header are declared in
  `layout`.
- **event** (`plugins/places`) — emit flat header slots; preamble `<header>`
  built by `layout` instead of `header.wrap('header')`. **This is the exact
  bug SPEC-081 cites** — headline/blurb are now individually addressable.
- **playlist** (`plugins/media`) — flat header/player/tracks/body slots;
  media+content split, content column, and preamble header from `layout`.
- **symbol** (`plugins/docs`) — same buried-preamble fix as event; the
  eyebrow signature-bar block is unaffected (stays a root-level block).

Both structure contracts (`contracts/structures.json`,
`packages/lumina/contracts/structures.json`) regenerated. Full suite green
(3070 tests). Updated the recipe/howto/playlist rune tests to assert flat
header slots rather than the old `<header>` wrapper.

### Notes
- **Parity:** every migration is visually identical except the invisible
  reorder of schema.org SEO metas (they now append at the article end instead
  of mid-tree — they carry no rendered output). The one deliberate visual
  change is **realm/faction**: their sections container was previously emitted
  *unnamed*, so the `.rf-realm__sections` / `.rf-faction__sections` rules
  (`gap: 1rem`) were dead. Naming the container activates the intended gap,
  bringing them in line with character. User-approved as a latent bugfix.
- **Budget deferred to WORK-326.** Budget is the only remaining rune that
  references `preamble` in its `layout` while hand-building the header, but its
  preamble is entangled with the `postTransform` totals/footer machinery that
  WORK-326 reworks. Its flat-emit migration folds into WORK-326.
- Interactive/structural runes (tabs, accordion, hero, cta, etc.) and
  collection runes (blog) hand-build headers but are not meta-bearing
  page-section runes projecting metadata into a content column — out of scope.

{% /work %}
