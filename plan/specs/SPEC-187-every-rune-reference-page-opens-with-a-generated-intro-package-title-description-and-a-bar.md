{% spec id="SPEC-187" status="accepted" tags="docs, runes, reference, composition, site, data, include" %}

# Every rune reference page opens with a generated intro: package, title, description and a bar

Every page under `site/content/runes/` opens with the same intro, rendered from data rather than
written by hand: the rune's package as an eyebrow, its title, its description as the blurb, and a
bar. The bar's left side says what the rune is (a composition, a status other than `stable`); its
right side holds actions (the rune's source in a drawer, the install command). It replaces the
"This rune is part of @refrakt-md/…" hint.

## Why

**Compositions are about to go live, and nothing on a reference page says a rune is one.** Once
`hero`, `cta` and `testimonial` move into the marketing plugin's `runeDir` ({% ref "SPEC-181" /%}
D5), their reference pages look exactly as before. A composition's definition is a short Markdoc
file a reader can learn from and copy into their own `runes.dir`; the page should say so and show
it.

**The page header is hand-written on 119 pages, and has drifted.** The install hint appears on 45
of them, worded by hand. The `# Title` repeats the frontmatter `title`, and the opening paragraph
often repeats the frontmatter `description`. {% ref "SPEC-128" /%} solved the same problem for
attribute tables: a generated data file, one shared partial, and a guard.

**The parts exist.** `scripts/generate-rune-attributes.mjs` already writes per-rune data; the
`include` rune ({% ref "SPEC-129" /%}) resolves `data` in a shared partial before the transform;
`section` reads an eyebrow, headline and blurb; `bar` is a two-group row; `file-ref` with
`preview="drawer"` shows a file in a drawer with a GitHub link.

## Design

```markdoc
{% section %}
[@refrakt-md/marketing](/runes/marketing)

# Hero

Full-width intro sections for landing pages with background support and action buttons

{% bar %}
{% badge %}{% icon name="puzzle" /%} Composition{% /badge %}
---
{% file-ref path="plugins/marketing/runes/hero.md" preview="drawer" %}{% icon name="code" /%}{% /file-ref %}
{% /bar %}
{% /section %}
```

A page writes one line where its header was:

```markdoc
{% include file="rune-intro.md" variables={r: "rune:hero"} /%}
```

## Decisions

### D1 — every rune page gets the intro, native or composed

The intro is the page's header, not a composition marker. A native rune's page shows the same
eyebrow, title, blurb and bar; only the badges differ. One convention on every page is easier to
read and to guard than two.

### D2 — the intro is a `section`; the bar is its body

- **Eyebrow:** the package, linked to its plugin page, or `Core`.
- **Headline:** the page's `# Title`, still an `<h1>`.
- **Blurb:** the frontmatter `description`.
- **Body:** the `bar`, directly under the blurb.

The bar is not the eyebrow: `section`'s eyebrow matches a paragraph, and a leading `{% bar %}`
would stop the header from being read. It is not the footer either: the footer zone exists only
with `media-position` and would need an empty media zone.

### D3 — the bar's left side says what the rune is; its right side holds actions

- **Left:** a `Composition` badge with a puzzle icon when the rune is composed; a status badge when
  the frontmatter `status` is not `stable`. Nothing else is required; schema.org type is an open
  question.
- **Right:** a source icon that opens a `file-ref` drawer, and the install command for a plugin
  rune.

### D4 — the source is the file that defines the rune

A composition's source is its `.md` definition: the plugin's `runeDir` file, or a project rune's.
A native rune's source is its schema file (`packages/runes/src/tags/<rune>.ts` or the plugin's
`src/tags/<rune>.ts`). The drawer shows what actually builds the rune, whichever kind it is.

### D5 — the data is generated, and title and description come from the page's frontmatter

The generator writes one record per rune: `title`, `description`, `package`, `install`,
`composed`, `status` and `source` (repo-relative). `title` and `description` are read from the
reference page's frontmatter, so they exist once. `composed` and `source` come from how the rune
resolves, not from a flag an author sets. Whether this extends `generate-rune-attributes.mjs` or
is a sibling script is an implementation choice; the drift check covers it either way.

### D6 — the hand-written header goes, and a guard keeps it gone

The rollout removes, on every rune page, the hand-written `# Title` and the install hint, and
merges or cuts an opening paragraph that restates the description. `scripts/check-rune-docs.mjs`
fails on a rune page without the intro include, or with the old hint.

### D7 — staging shows the staged state honestly

The committed data file does not depend on the site, so on its own it would tell
staging.refrakt.md that a staged rune is native. On the `staging` site a rune that `runes.prefer`
resolves to `site/staged-runes/` shows a `Staged` badge and its staged definition as the source.
Whether that is a per-site data file or a value computed at build time is decided in the work
item, and the D3 test of `staging` against `main` ({% ref "SPEC-181" /%}) must keep passing.

## To confirm in implementation

1. **The `<h1>` inside an include still feeds the page title, the TOC and the heading index.** The
   include resolves before the transform, so it should; a test asserts it.
2. **`file-ref` takes its `path` from a `$row` value.** `data` substitutes values in the preprocess
   phase, before `file-ref` reads the file; a test asserts it.
3. **The register.** `section`'s default prominence and spacing on a docs page read as a page
   header, not a landing-page band. If not, the partial sets the section's attributes; it does not
   add CSS for one site.

## Open questions

1. Does the bar show the schema.org type (`Review`, `HowTo`) the rune publishes?
2. Does the install command sit in the source drawer, or behind the package eyebrow?

## Not in scope

- Composing `steps` or taking any other rune live. That is SPEC-181's work, one item per rune.
- The rune catalog page and `refrakt inspect` / `reference` showing a composition marker. Both can
  read the same data later.

## References

- {% ref "SPEC-181" /%}: staged runes and the go-live gates.
- {% ref "SPEC-128" /%}: the generated attribute tables this follows.
- {% ref "SPEC-129" /%}: the pre-transform `include`.

{% /spec %}
