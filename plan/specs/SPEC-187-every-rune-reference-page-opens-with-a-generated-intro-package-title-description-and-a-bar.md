{% spec id="SPEC-187" status="implemented" tags="docs, runes, reference, composition, site, data, include" %}

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
{% section prominence="prominent" %}
marketing

# Hero

Full-width intro sections for landing pages with background support and action buttons

{% bar %}
{% badge %}{% icon name="puzzle" /%} Composition{% /badge %}
---
{% actions %}
- [{% icon name="package" /%} Install](#rune-install)
- [{% icon name="code" /%} Source](#rune-source)
{% /actions %}
{% /bar %}
{% /section %}

{% drawer id="rune-install" title="Install" %}
…the two steps, built from the package (D8)…
{% /drawer %}

{% drawer id="rune-source" title="Source" %}
{% snippet path="plugins/marketing/runes/hero.md" /%}
{% /drawer %}
```

The actions are ordinary links to drawers on the page (D10), placed with `actions` and styled by
it in the bar's context (D11); the Source drawer is declared by the partial (D12). The partial
fills every value from the record.

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

- **Eyebrow:** the plugin's short name as plain text (`marketing`, not `@refrakt-md/marketing`), or
  `core`. *Amended:* not a link; the plugin page is linked from the Install drawer.
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

*Amended:* the actions are `actions` items, each an icon and a short label (D10, D11). An
earlier note made them text links, because `ref` and `file-ref` take only a text `label`; D10
removes the need for either rune here.

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

*Amended (WORK-707):* a page could not tell which site it is rendered for. Each adapter selects its
site with `resolveSite()` and passes only the site's config on, so the name was dropped before the
page variables were built. So:

- **A `$site` page variable**, `$site.name` the site's key in `refrakt.config.json`. Normalizing the
  config tags each site with its key, and `buildPageContentVariables()` — the one place every page's
  variables are built — reads it from the config it already receives. No adapter changes. An object,
  so other site fields can join it later without a breaking change. `name` is derived: an authored
  `name` that differs from the key is reported. A load with no site config has no `$site`.
- **The intro data has one partition per site**, keyed by name, each from that site's resolution. On
  `staging`, a rune resolved from `site/staged-runes/` is `staged`, its source that file. The partial
  selects with `root=$site.name`.

### D8 — install is its own action, a drawer, built from the package

The install command is neither in the Source drawer (a different reader, a different question) nor
only behind the package eyebrow (a link nobody knows to click, where the hint it replaces was
visible on the page).

- An `Install` action on the bar's right opens an Install drawer with both steps the hint gives today:
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

### D10 — a link to a drawer on the page opens it

Today only `ref` and `file-ref` open a drawer: the drawer behaviour wires `a[data-target-type="drawer"]`,
and only those two runes set the attribute. A Markdown link to the drawer's anchor scrolls to it
and does not open it. That ties every drawer trigger to two runes that take only a text label, so a
trigger cannot carry an icon or be an `actions` button.

**Any link whose target is a drawer on the same page is a trigger.** `[Install](#rune-install)`,
`{% link href="#rune-install" %}` and an `actions` item all open the drawer `rune-install`.

- **Where:** the build step that already knows the page's drawers rewrites such a link's `href` to
  the drawer's anchor (`#drawer-<id>`) and sets `data-target-type="drawer"`. The drawer behaviour is
  unchanged.
- **Which id:** the link names the drawer's own `id`, as `ref` does. `#drawer-<id>` is accepted too,
  since it is what a rendered trigger's `href` already is.
- **A drawer wins.** When a drawer and a heading share an id, the link opens the drawer. When no
  drawer has the id, the link is left alone: it is an ordinary same-page anchor.
- **Without JavaScript** the link still reaches the drawer, which renders in flow at its position.
- **Icons come with it.** Markdown link text takes inline tags, so `[{% icon name="code" /%} Source](#rune-source)`
  needs no new attribute on any rune.

`ref` and `file-ref` keep working as they do. The `file-ref` monospace treatment of prose labels
(`label="the latest release notes"`) is a separate defect and not changed here.

### D11 — actions in a bar are a context of `actions`, not a style for links in a bar

The intro's `Install` and `Source` are things a reader does, so they are authored as actions. Their
look in a bar is the theme's.

- **Not a bar link style.** Most links in bars are values: the plan plugin's bars link an entity's
  source spec, its milestone, its ID. Restyling every link in a bar as an action would make a value
  look like a command, across every bar layout. Links that are values keep prose link styling.
- **A context modifier on `Actions`:** `contextModifiers: { bar: 'in-bar' }`, giving
  `.rf-actions--in-bar`. It is named in the structure contract and `inspect`, so another theme sees
  the hook rather than finding a descendant selector.
- **What it means:** quieter than a button and clearly not prose. Compact (the badges' height, small
  text, tight padding), tonal rather than filled (text or muted colour, a subtle surface or border
  that strengthens on hover), an icon before the label. Rank still reaches the markup; Lumina gives
  a primary action in a bar no fill, so authors need no "no primary" option.
- **How:** `actions` already takes its size from properties a host sets (`--action-padding`,
  `--action-font-size`), as `marquee` does. The bar is one more host; the tonal look is Lumina's,
  and the skeleton keeps the row structural.

### D12 — the Source drawer is declared by the partial

`file-ref preview="drawer"` hoists its drawer under an id derived from the path, which the partial
cannot build: the preprocess resolver does not concatenate (BUG-010). So the partial declares the
drawer itself, `{% drawer id="rune-source" title="Source" %}` around `{% snippet path=$row.source /%}`,
followed by a link to the file on GitHub. The record carries that URL (`sourceUrl`), built by the
generator from the site's `repoUrl` and `repoBranch`.

If `snippet` cannot take its `path` from `$row` inside `data`, `file-ref` gains an `id` attribute
for its drawer instead, and the partial keeps it.

## Sketches

Illustrative, not pixel targets. `[▣]` is Install, `[</>]` is Source.

```
hero — a composition in a plugin
  MARKETING
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
   add CSS for one site. *(Confirmed in WORK-706: `prominent` matches a docs page's `<h1>`.)*
4. **`snippet` takes its `path` from a `$row` value** inside `data` (D12). *(Confirmed in WORK-709.)*
5. **`actions` ranks link items with icons in them.** It finds the first `a`, which a Markdown link
   already is at transform time; a test asserts it. *(Confirmed in WORK-709.)*

## Not in scope

- Composing `steps` or taking any other rune live. That is SPEC-181's work, one item per rune.
- The rune catalog page and `refrakt inspect` / `reference` showing a composition marker. Both can
  read the same data later.

## References

- {% ref "SPEC-181" /%}: staged runes and the go-live gates.
- {% ref "SPEC-128" /%}: the generated attribute tables this follows.
- {% ref "SPEC-129" /%}: the pre-transform `include`.

{% /spec %}
