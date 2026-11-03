{% spec id="SPEC-187" status="accepted" tags="docs, runes, reference, composition, site, data, include" %}

# Every rune reference page opens with a generated intro: package, title, description and a bar

Every page under `site/content/runes/` opens with the same intro, rendered from data rather than
written by hand: the rune's package as an eyebrow, its title, its description as the blurb, and a
bar. The bar's left side says what the rune is (a composition, a status other than `stable`, the
schema.org type it publishes); its right side holds actions (an Install drawer, the rune's source
in a drawer). It replaces the
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
{% ref "install-marketing" %}{% icon name="package" /%}{% /ref %}
{% file-ref path="plugins/marketing/runes/hero.md" preview="drawer" %}{% icon name="code" /%}{% /file-ref %}
{% /bar %}
{% /section %}

{% drawer id="install-marketing" title="Install" %}
…the two steps, built from the package (D8)…
{% /drawer %}
```

The exact trigger markup for the Install drawer is the partial's to choose; the sketch shows its
shape, not its syntax.

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

**Left**, in this order, each only when it applies:

1. **Kind:** a `Composition` badge with a puzzle icon when the rune is composed. A native rune
   shows no kind badge: native is the default and is not announced.
2. **Status:** a badge when the frontmatter `status` is not `stable`.
3. **schema.org type:** the type the rune publishes, linked to its schema.org page (D9).

**Right:** an Install action for a plugin rune (D8), then a Source action (D4). A core rune shows
only Source. The right side is never empty, so the bar's height and position do not change from
page to page.

*Amended in WORK-706:* the actions are text links, `Install` and `Source`, not icons. `ref` and
`file-ref` are self-closing and take a text `label`, so neither can wrap an icon without changing
the runes; a text action is also the clearer one to a screen reader. The sketches' `[▣]` and
`[</>]` stand for these labels.

### D4 — the source is the file that defines the rune

A composition's source is its `.md` definition: the plugin's `runeDir` file, or a project rune's.
A native rune's source is its schema file (`packages/runes/src/tags/<rune>.ts` or the plugin's
`src/tags/<rune>.ts`). The drawer shows what actually builds the rune, whichever kind it is.

### D5 — the data is generated, and title and description come from the page's frontmatter

The generator writes one record per rune: `title`, `description`, `package`, `composed`,
`status`, `schemaType` (empty when the rune publishes nothing, D9) and `source` (repo-relative).
`title` and `description` are read from the reference page's frontmatter, so they exist once.
`composed`, `source` and `schemaType` come from how the rune resolves, not from a flag an author
sets. Whether this extends `generate-rune-attributes.mjs` or
is a sibling script is an implementation choice; the drift check covers it either way.

### D6 — the hand-written header goes, and a guard keeps it gone

The rollout removes, on every rune page, the hand-written `# Title` and the install hint, and
merges or cuts an opening paragraph that restates the description. `scripts/check-rune-docs.mjs`
fails on a rune page without the intro include, or with the old hint.

### D7 — staging shows the staged state honestly

The committed data file does not depend on the site, so on its own it would tell
staging.refrakt.md that a staged rune is native. On the `staging` site a rune that `runes.prefer`
resolves to `site/staged-runes/` shows a `Staged` badge in place of `Composition` (a staged rune is
always a composition, so one badge says both) and its staged definition as the source.
Whether that is a per-site data file or a value computed at build time is decided in the work
item, and the D3 test of `staging` against `main` ({% ref "SPEC-181" /%}) must keep passing.

### D8 — install is its own action, a drawer, built from the package

The install command is neither in the Source drawer (a different reader, a different question) nor
only behind the package eyebrow (a link nobody knows to click, where the hint it replaces was
visible on the page).

- A package icon on the bar's right opens an Install drawer with both steps the hint gives today:
  `npm install <package>` and the `plugins` entry in `refrakt.config.json`, and a link to the
  plugin's overview page.
- The drawer's text is built by the partial from the record's `package`, so its wording lives in
  one place. The data carries no `install` field.
- The eyebrow still links to the plugin's overview page, whose Installation section says the same.

### D9 — the schema.org badge shows the type the rune publishes by default

SPEC-130 D5 trades validation for visibility: nothing checks a schema table against schema.org, so a
wrong row is caught by someone reading it. A rune's reference page is where most people will read
it, so the bar shows it.

- The type is the one the resolved row publishes with the rune's defaults, read from the same row
  `refrakt inspect <rune> --site main` prints.
- When the type depends on an attribute (`playlist`'s `type`), the badge shows the default type; the
  attribute section explains the variants.
- When an attribute can switch it off (`schema="none"`), the badge still shows the default type.
- A rune that publishes nothing shows no badge, not a "none" badge.

## Sketches

Illustrative, not pixel targets. `[▣]` is Install, `[</>]` is Source.

```
hero — a composition in a plugin
  @REFRAKT-MD/MARKETING
  Hero
  Full-width intro sections for landing pages with background support and action buttons
  ┌───────────────────────────────────────────────────────────┐
  │ [🧩 Composition]                           [▣]  [</>]     │
  └───────────────────────────────────────────────────────────┘

testimonial — a composition that publishes structured data
  │ [🧩 Composition] [Review]                  [▣]  [</>]     │

howto — a native plugin rune
  │ [HowTo]                                    [▣]  [</>]     │

hint — a core rune
  │                                                 [</>]     │

a plugin rune whose status is not stable
  │ [⚠ Experimental] [MusicPlaylist]           [▣]  [</>]     │

testimonial on staging.refrakt.md, before it goes live (D7)
  │ [🧩 Staged] [Review]                       [▣]  [</>]     │
```

```
┌ Install ──────────────────────┐   ┌ Source ───────────────────────────┐
│ npm install @refrakt-md/      │   │ plugins/marketing/runes/hero.md   │
│   marketing                   │   │ ───────────────────────────────── │
│                               │   │ ---                               │
│ refrakt.config.json           │   │ tag: div                          │
│ "plugins": [                  │   │ description: Full-width intro…    │
│   "@refrakt-md/marketing"     │   │ attributes:                       │
│ ]                             │   │   align: { … }                    │
│                               │   │ …                                 │
│ → Marketing plugin overview   │   │ View on GitHub ↗                  │
└───────────────────────────────┘   └───────────────────────────────────┘
```

## To confirm in implementation

1. **The `<h1>` inside an include still feeds the page title, the TOC and the heading index.** The
   include resolves before the transform, so it should; a test asserts it.
2. **`file-ref` takes its `path` from a `$row` value.** `data` substitutes values in the preprocess
   phase, before `file-ref` reads the file; a test asserts it.
3. **The register.** `section`'s default prominence and spacing on a docs page read as a page
   header, not a landing-page band. If not, the partial sets the section's attributes; it does not
   add CSS for one site.

## Not in scope

- Composing `steps` or taking any other rune live. That is SPEC-181's work, one item per rune.
- The rune catalog page and `refrakt inspect` / `reference` showing a composition marker. Both can
  read the same data later.

## References

- {% ref "SPEC-181" /%}: staged runes and the go-live gates.
- {% ref "SPEC-128" /%}: the generated attribute tables this follows.
- {% ref "SPEC-129" /%}: the pre-transform `include`.

{% /spec %}
