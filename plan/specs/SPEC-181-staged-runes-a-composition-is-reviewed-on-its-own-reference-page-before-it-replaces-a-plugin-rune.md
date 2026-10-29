{% spec id="SPEC-181" status="draft" tags="runes, composition, site, staging, review, plugins" %}

# Staged runes: a composition is reviewed on its own reference page before it replaces a plugin rune

A composition that will replace a plugin rune is written in a staging directory inside
that plugin. The docs site renders every page that uses the rune a second time with the
staged definition, at the same path under `/staging`. You compare the two by switching
browser tabs. Going live is a `git mv` from the staging directory to the plugin's rune
directory. This is the convention for every such conversion, starting with `hero` and
`cta` in v0.44.0.

## Why

**A composition has no page where anyone can look at it.**
- The composed `hero` and `cta` are test fixtures in `packages/runes/test/fixtures/composed/`.
  The five composed storytelling runes are in
  `packages/content/test/fixtures/composed-storytelling/runes/`.
- The only code that loads them is the test harnesses (`composed-marketing.ts`,
  `composed-storytelling.ts`). These build a fixture copy of the plugin with the composed
  runes swapped in.
- {% ref "SPEC-147" /%} D2 and the v0.44.0 milestone gate each replacement on a reviewed
  comparison with the plugin rune. Today that review means reading a list of differences in
  a work item's resolution. Nobody can see the differences.

**A side-by-side gallery is the wrong place to review a rune.**
- The gallery fixtures cover a few attribute combinations and are not yet solid.
- The reference page under `site/content/runes/` is what a user reads. It already shows each
  attribute, variant and pairing. It is also the page that must still render correctly once
  the rune goes live.
- So the review surface should be the reference page, rendered once with the live rune and
  once with the staged one.

**Prefixed names (`lab-hero`) would review the wrong thing.**
- A prefixed rune emits `data-rune="lab-hero"`, not the `data-rune="hero"` that ships.
- Every reference page would need a hand-edited copy that uses the prefixed tag, and those
  copies would drift from the real pages.
- Going live would need a rename and a content migration, not a move.

**Fixtures in test directories hide the definition from its future home.**
- A composed plugin rune ships from the plugin's declared `runeDir` ({% ref "SPEC-153" /%} D2).
- Its draft should already be in the plugin, so the only step between draft and shipped
  is moving the file.

## Design

### Where a staged definition lives

```
plugins/marketing/
  src/            — the shipping plugin, unchanged while a rune is staged
  staging/
    hero.md       — the composed hero, named after the rune it replaces (SPEC-153 D9)
    cta.md
  runes/          — the plugin's declared runeDir, once a rune goes live
```

- `staging/` is not in the package's `files` (every plugin publishes `dist` only), so a staged
  rune is never published.
- The test harnesses read their definitions from `staging/`. That makes the reviewed file and
  the tested file the same file.

### How the site loads it

The site configuration names the staging directories:

```json
"runes": {
  "staging": {
    "dirs": ["plugins/marketing/staging", "plugins/storytelling/staging"],
    "mount": "/staging"
  }
}
```

The loader builds a second, **staged** rune set: the site's plugins, plus each staging
directory loaded as project runes, with `prefer` set to `__project__` for each staged name.
This reuses the SPEC-153 D8 machinery.
- A staged rune replaces the plugin rune's schema, its generated theme config and its
  aliases.
- It does this only in the staged set. The live site is byte-identical to a build without
  `staging`.

### Mirror pages

Every page whose source uses a staged rune (by name or alias) gets a mirror at
`<mount><url>`. For example, `/staging/runes/marketing/hero` mirrors `/runes/marketing/hero`.
A mirror page:
- is rendered from the same source file, with the same frontmatter and the same layout
  cascade (resolved from the original path). Nav, header and sidebar are therefore
  identical, and switching between the two tabs changes only the runes;
- is transformed by the staged rune set and the staged engine config;
- is built in a production build, so a deployed preview can be reviewed;
- is kept out of every site-wide index:
  - not in `sitemap.xml`, `llms.txt`, `llms-full.txt` or the search index;
  - not in the page tree;
  - does not register entities (the live page already does), and reads the live
    aggregates in post-process;
- emits `<meta name="robots" content="noindex">` and a canonical link to the live page;
- carries a banner naming the staged runes on the page, with a link to the live page.

The mount root (`/staging`) is a generated index. It lists each staged rune, its plugin and
the pages that mirror it. This is the entry point; nothing in the site nav links to it.

### Going live

Replacing the plugin rune is a work item of its own, separate from the conversion
(SPEC-147 D1):
- `git mv plugins/<p>/staging/<rune>.md plugins/<p>/runes/<rune>.md`.
- The plugin declares `runeDir` if it does not yet.
- The rune's `transform`, theme entry and CSS are removed.
- `contracts/` and the SEO baseline are regenerated, and their diffs are explained.

The mirror pages disappear on their own, because the rune is no longer staged.

## Decisions

### D1 — a composition that replaces a plugin rune is staged in that plugin, under its final name

`plugins/<plugin>/staging/<rune>.md`. There is no prefix, so the staged output is the
shipped output (`data-rune="<rune>"`), and going live is a move. A composition that replaces
nothing (`teaser`, the section-grammar fixtures) is not staged; it stays a test fixture.

### D2 — the reference page is the review surface, rendered twice

The docs site mirrors every page that uses a staged rune. It does not maintain a separate
gallery of staged runes. Comparison is by switching between the live URL and the mirror
URL, which differ only by the mount prefix.

### D3 — staging is opt-in site configuration and never changes the live build

`runes.staging` is absent by default. With it set, the live pages, the indexes, the
contracts and the SEO baseline are identical to a build without it. Mirror pages are
additive and excluded from every index (Design: mirror pages).

### D4 — a staged name must name an existing plugin rune

A staged file whose name no loaded plugin provides is an error. Without a rune to replace
it is just a project rune, and it belongs in `runes.dir`. A core rune's name is an error,
as SPEC-153 D8 already rules.

### D5 — the staged set is built from the same merge as the live set

The staged rune set is the live merge plus the staged runes preferred over the plugin
runes they replace. A difference between a mirror and its live page is then the staged
rune's doing, never a loader difference.

### D6 — the test harnesses read the staged definition

The comparison tests (SPEC-147 D2) and the reviewed page read the same file. A definition
copied into a test fixture is not allowed for a staged rune.

### D7 — going live is its own work item

It is never part of the conversion item. The plugin rune stays until a person has reviewed
the mirror pages, as SPEC-147 D1 and the v0.44.0 milestone already require.

### D8 — the convention is stated where conversions are planned and checked where they are tested

- `CLAUDE.md` and the rune authoring docs describe it.
- A test fails when a composed definition under a test fixture directory has the name of a
  shipping plugin rune. That is how a future conversion that skips staging is caught.

## Not in scope

- Staging a replacement for a core rune. Core names are not shadowable (SPEC-153 D8).
- A diff view or in-page comparison widget. Tab switching between identical layouts is the
  comparison.
- Staging in published plugins or for third-party sites. `staging/` is a monorepo
  convention, and `runes.staging` is general enough that a project could use it, but it is
  documented only for this repository.

## Acceptance Criteria

- [ ] `runes.staging` loads staged definitions into a separate rune set, and the live build is unchanged with it set
- [ ] Every page using a staged rune has a mirror at the mount, rendered with the staged rune, with the live page's layout, and excluded from every site-wide index
- [ ] The mount root lists the staged runes and their mirror pages
- [ ] `hero` and `cta` are staged in `plugins/marketing/staging/`, their tests read them there, and `/staging/runes/marketing/hero` and `/staging/runes/marketing/cta` render
- [ ] The storytelling compositions are staged in `plugins/storytelling/staging/`
- [ ] The convention is documented, and a test catches a composed definition of a plugin rune outside staging

## References

- {% ref "SPEC-145" /%}: composed runes.
- {% ref "SPEC-147" /%}: D1 replace alongside, D2 every difference explained.
- {% ref "SPEC-153" /%}: D2 plugin `runeDir`, D8 precedence, D9 the filename is the name, D10 rune-edit invalidation.
- {% ref "SPEC-160" /%}, {% ref "SPEC-161" /%}: the marketing conversions.

{% /spec %}
