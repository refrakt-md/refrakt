---
title: Composed Runes
description: Define a rune as a Markdown file that places existing runes — the file, the template vocabulary, what a template may place, where definitions go, and every error the compiler reports
---

# Composed Runes

A composed rune is a rune written as a Markdown file instead of code. It has no `transform`, ships no CSS, and has no hand-written engine config. Its output is other runes — a `section`, a `hint`, a `details` per section — arranged by a template, and the rune itself is the name and the claim around them.

This page is the reference for writing one. Everything on it applies whether the file ships in a plugin or sits in your own project; [Where definitions go](#where-definitions-go) covers the two differences.

## The file

One file per rune, and **the file's name is the rune's name**: `runes/bond.md` defines `{% bond %}`. The frontmatter declares the rune's input, the body is its output template, and **slot names are the join** between them — a field the content model produces is placed where the template names it.

```markdoc
---
tag: aside
attributes:
  from: { type: string, required: true }
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
---

{% hint type="note" %}
	From **{% $attrs.from %}**:

	{% slot name="body" /%}
{% /hint %}
```

- **No name in the frontmatter.** A `rune:` or `name:` key restating the filename is rejected, because two sources for one fact drift. Renaming the rune is renaming the file.
- **No suffix.** The file is `bond.md`, not `bond.rune.md`: it always sits in a directory that is declared as a rune directory, so the directory already says what it is. Every `.md` there must be named `<rune>.md` with a kebab-case name; anything else is an error, not skipped.
- **Fixtures go beside it, not in it.** A plugin keeps them in a sibling `fixtures/` directory, as for any rune.

### Indentation

A template nests runes, so indent it to show the nesting. A tag's content may be indented by tabs or by spaces, and four spaces or a tab are **not** a code block in refrakt, as they would be in CommonMark. Indented and flat, a template parses to the same tree. This is true of every refrakt source, pages included.

The convention, which [`refrakt format`](/docs/cli/format) applies and `refrakt format --check` verifies, is to **indent a tag's content by one tab only when it holds another block tag**:

```markdoc
{% section %}
	{% slot name="sections" each %}
		{% details summary=$each.heading %}
			{% slot /%}
		{% /details %}
	{% /slot %}
{% /section %}
```

A tag holding only prose and inline tags, such as a `{% hint %}` with paragraphs, stays flat. Other Markdown renderers, GitHub's among them, would show its indented lines as code. Code fences keep their own relative indentation.

### Frontmatter

| Key | Declares |
|---|---|
| `tag` | The root element (default `div`). |
| `aliases` | Other tag names the rune answers to. |
| `description` | What the rune is for — shown by `refrakt reference` and in prompts. |
| `attributes` | The rune's attributes: each `{ type, required, default, matches, description }`, `type` one of `string`, `number`, `boolean`. An attribute with `matches` becomes a `data-*` modifier on the root. |
| `provides` | Capabilities the rune bears. `[prose]` admits the prose attributes (`reading`, `dropcap`) on it. |
| `content` | The content model: how authored Markdown becomes named fields. `type: sequence` with `fields`; `type: sections` with a `preamble` and per-section `sectionModel`, `emitAttributes`, `headingExtract`, `knownSections`, `implicitSection`; or `type: delimited` with `zones`. Each field is `{ match, optional, greedy, description, itemModel, emitTag, emitAttributes, fills }`. See [the content models a composition takes](#the-content-models-a-composition-takes) and [Content Models](/extend/rune-authoring/content-models). |
| `metaFields`, `blocks` | Metadata about attribute values, and the blocks that group them — placed with `{% metablock %}`. |
| `registers` | Entities and edges the rune puts in the site registry. See [Declaring Registration](/extend/rune-authoring/registration). |
| `schema` | The schema.org row for the rune — in a plugin only, see [why](#why-schema-is-allowed-in-a-plugin-and-not-in-a-project). |
| `defaults` | Defaults for universal attributes (`width: full`, `elevation: flush`, `density: compact`), each landing where the author's attribute would. See [defaults](#defaults). |

Some keys are refused because they would contradict what a composed rune is: styles (`css`, `style`, `styles`, `stylesheet`, `block`, `class`) — its appearance is the primitives'; a second emit path (`transform`, `emits`, `slots`) — the template is its emit path; and `layout` — a composed rune's containers belong to the runes it places, so the template arranges them.

## The content models a composition takes

A composition's slots are its content model's fields, so a model is accepted only when every field it resolves has a fixed name. That rules in three of the four model types.

| `type` | Its slots |
|---|---|
| `sequence` | Its `fields`. |
| `sections` | Its `preamble` fields, plus `sections`: one item per section. |
| `delimited` | The fields of all its `zones` together. |

`custom` is rejected, because its code decides what it produces. A conditional (`when`) model is rejected too. Every case it covered has a declarative form: `implicitSection`, `each` over a list field, or a template that places every alternative and lets the empty one render nothing. A content model also never depends on attribute values. A model written as a function of the attributes is read once, with none.

### `delimited`: content split on `---`

A delimited model splits the content at each `---` into zones, and each zone is a sequence of fields:

{% snippet path="packages/runes/test/fixtures/composed/teaser.md" /%}

- **The slots are the zones' fields together**, here `media`, `headline` and `blurb`. A field name belongs to one zone; using it in two is an error.
- **`primary` names the zone that receives content written with no `---` at all.** Without it, that content goes to the first zone. Here a teaser written without a picture is all `content`, not all `media`.
- **Only `hr` is a delimiter**, and **zones are fixed**. `dynamicZones` is rejected: its zones have no names, so a template has nothing to place.
- **The composition consumes the author's `---`.** The template re-emits one where a placed rune should split. Here `section`, given `media-position`, gets a media zone and a content zone, and its header reads the slots named `headline` and `blurb` (a slot named for its role fills it with no warning). The template's `---` is unconditional, and an empty media zone is one `section` omits, as the `{% if %}` section below explains.

**A titled region with media places `section`, not `card`.** Both split on `---`, but `card` draws a surface, which a composition rarely wants under its content (ADR-041). `section` reads zones only when `media-position` is given, so a composition opts in by passing the attribute through, with a default: `{% section media-position=$attrs["media-position"] %}`. Its `media` attribute (`portrait | cover | thumbnail | hero | icon`) names what the media zone holds, so a portrait is cropped round with no CSS of the composition's own.

Use a delimited model when the template must **address a field inside a zone**: wrap a zone's trailing list, place one list here and another there. A composition that only passes the zones through to one rune that splits them itself needs one greedy field, not zones.

### `implicitSection`: no headings is one section

A sections model treats content with no section heading as preamble. `implicitSection` makes it one section instead, so a rune reads the same whether or not the author used headings:

```yaml
content:
  type: sections
  sectionHeading: heading:2
  emitAttributes: { label: $heading }
  implicitSection: { attributes: { label: "" } }
```

The implicit section is an ordinary item of the `sections` slot, and its `attributes` are its `$each` values. They must give exactly the keys of `emitAttributes`, so `$each.label` exists for a real section and for the implicit one alike.

## The template vocabulary

The body is ordinary Markdoc with **two tags and two bindings** of its own. This is the whole list:

| Form | Means |
|---|---|
| `{% slot name="x" /%}` | Place the resolved field `x` here. |
| `{% slot name="x" %}…{% /slot %}` | The same, with fallback content when `x` is empty. |
| `{% slot name="xs" each %}…{% /slot %}` | The engine iterates `xs`; the body describes **one** item, with `$each` bound. |
| `{% slot /%}` (bare, inside `each`) | This item's content. |
| `{% metablock name="x" /%}` | Place the rune's declared meta block `x`. |
| `{% if %}` / `{% else /%}` | Markdoc's own conditional — with the limit below. |
| `$attrs.name` | A resolved attribute, in content or in an attribute position. |
| `$each.name` | Inside an `each` slot: one field of the current item — exactly the content model's `emitAttributes`. |

Every rune the template places — `section`, `hint`, `details`, `grid` — is ordinary rune vocabulary, not part of this list. [What a template may place](#what-a-template-may-place) bounds which.

### `{% slot %}`

A slot names a **field**, and every field and every slot are matched exactly once:

- a slot naming no field of the content model is an error;
- a field no slot places is an error, because its content would be dropped;
- the same slot placed twice is an error — two positions are two fields, or a theme's concern.

A slot leaves no element of its own. Its content is placed where the tag stands, each node marked with `data-slot` naming the field, so a schema row or a registration can still find it inside the primitive that holds it.

Fallback content renders only when the field is empty: `{% slot name="description" %}No description yet.{% /slot %}`.

**A placed `section` reads its header by position, slots included.** A paragraph directly before the section's first heading is its eyebrow, and one directly after it is its blurb ([`section`](/runes/section)). A slot placed in either position fills that role, whatever its name. When the slot's name is not the role's, the build reports `slot-header-role`: *"slot `description` of `profile` is read as `section`'s blurb; name the field `blurb`, or set `header="headline"` on the section"*. Either remedy works. Naming the field for the role keeps it in the header, and `header` on the section keeps it out. The warning changes nothing that renders.

### `each` and `$each`

`{% slot name="sections" each %}` does not put a loop in the template. The engine iterates and the template describes **one** item. `sections` is the field a `sections` content model fills, and an ordinary slot name like any other.

```markdoc
{% slot name="sections" each %}
	{% details summary=$each.heading %}
		{% slot /%}
	{% /details %}
{% /slot %}
```

- `each` needs a field that holds a list: a `greedy` field, a field with an `itemModel` and an `emitTag`, a field matching one Markdown list ([below](#each-over-a-list)), or `sections`.
- The bare `{% slot /%}` inside is the item's content. An `each` slot without one drops every item's content, so it is an error.
- `$each` exposes exactly the content model's `emitAttributes` for the item — `emitAttributes: { heading: $heading }` makes `$each.heading`. Naming anything else is an error, not a silent `undefined`.
- Only the item's content and `$each` belong inside: a named slot or a meta block inside an `each` slot would be placed once per item, and is rejected.

The name is `$each` rather than `$item` on purpose. A `collection`'s `$item` is an entity and a `data` row's `$row` is flat; a composition's item is neither, so it gets its own name.

### `each` over a list

A list can reach `each` in two ways, depending on whether its items need reading.

**Placed as written.** A field that is not `greedy` and matches one list (`list`, `list:ordered` or `list:unordered`) iterates that list's items. Each item's content is the bare `{% slot /%}`, and `$each` binds nothing. This is how one model takes steps written either as headings or as an ordered list:

{% snippet path="packages/runes/test/fixtures/composed/steps.md" /%}

An author writes headings or a list. The template places both slots, and the one not written is empty and renders nothing. A greedy list field cannot be iterated this way, because it collects several lists and `each` could not say whose items it means. That is an error. So is a field that may match something other than a list.

**Read into fields.** An `itemModel` with an `emitTag` reads each item into named values, and `emitAttributes` exposes them as `$each`:

```yaml
rows:
  match: list
  itemModel:
    fields:
      - { name: name,  match: text, pattern: "^\\s*([^:]+?)\\s*:" }
      - { name: value, match: text, pattern: remainder }
  emitTag: span
  emitAttributes: { name: $name, value: $value }
```

`- Primary: #2563EB` gives `$each.name` = `Primary` and `$each.value` = `#2563EB`.

- **A `pattern` is a regular expression, written as a YAML string.** Capture group 1 is the value, or the whole match without one. `remainder` takes what is left.
- **Patterns consume the text they match, in order.** In the example `value` must be `remainder`: a second pattern expecting the colon would find it already gone.

### A paragraph read into the rune's own values

A field matching `paragraph` takes an `itemModel` too, in the same vocabulary. It reads the paragraph's inline content into one record, and `fills` names the rune's declared attributes those values supply:

```yaml
attributes:
  author: { type: string }
  role:   { type: string }
content:
  type: sequence
  fields:
    quote: { match: blockquote }
    attribution:
      match: paragraph
      optional: true
      itemModel:
        fields:
          - { name: name, match: strong }
          - { name: role, match: text, pattern: '^\s*[-–—,]\s*(.+)$', optional: true }
      fills: { author: $name, role: $role }
```

`**Ada Lovelace** — Analyst` fills `author` = `Ada Lovelace` and `role` = `Analyst`, exactly as `author="Ada Lovelace" role="Analyst"` would. The values land in the rune's field bag, so `{% metablock %}`, `$attrs`, the schema row and `registers` read them the same way, whichever form the author wrote.

- **The field matches only a paragraph whose required item fields match.** A paragraph with no `strong` is not a byline: it is left for the next field.
- **The author's attribute wins.** A value written as an attribute is never replaced by one read from content. Writing both is a `fill-overridden` warning, because the paragraph then does not render.
- **Values are flattened text.** `**Ada** _Lovelace_` fills `Ada Lovelace`.
- **A filling field is placed into values, not by a slot.** It does not need a `{% slot %}`, and placing it with one as well is an error: the byline would render twice.
- `fills` may name only declared attributes, and only `$` fields of its own item model.

Use it when the reader sees the values as text: a byline, a credit, a caption line. What configures the rune and is never read as prose (a rating, a variant) stays an attribute.

### `$attrs`

`{% $attrs.from %}` in content, `tone=$attrs.role` in an attribute position. It names a declared attribute; an undeclared one is an error. Every attribute the author set, or that defaulted, also rides the rune's field bag, which is what `registers`, the schema row and the generated modifiers read.

### `{% metablock %}`

A composed rune has no `layout`, so a declared `metaFields` + `blocks` entry is placed by the template: `{% metablock name="metadata" /%}` marks where the block goes, and the engine renders it there from the rune's own values, exactly as `layout` projection would. It takes only `name`, has no content, stands on its own line, names a declared block, and is placed once.

Use it when the value is an **attribute**: `metaFields` gives each field its meaning (`category`, `status`, `temporal`, …), its sentiment and its formatting, and the theme decides the block's shape. Placing a `{% bar %}` or a `{% deflist %}` with badges in it looks nearly the same and loses all of that — the badges are always tags, and the placed rune is a schema boundary. The rule: **is the value in an attribute? Use a metablock. Is it content someone writes? Place the rune.**

### `{% if %}`, and what it hides

Markdoc's conditional works — `bond` uses it for its arrow. Its limit: content models match the AST **before** it is transformed, and an `{% if %}` is still an unresolved tag then. So anything a template wraps in a conditional is invisible to the structural matching of the rune it sits inside.

The case that bites is a split's media zone. This does not work — the `---` sits inside the `if`, `section` never sees it, and the section silently gets one zone instead of two:

```markdoc
{% section media-position="top" %}
	{% if $attrs.image %}
		{% slot name="portrait" /%}
		---
	{% /if %}
	…
{% /section %}
```

Emit both unconditionally and rely on the consuming rune's empty-input guard instead — `section` omits an empty media zone:

```markdoc
{% section media-position="top" %}
	{% slot name="portrait" /%}

	---
	…
{% /section %}
```

Use `{% if %}` around whole rune invocations and around content; never around anything a nested rune matches structurally — delimiters, and positional fields alike.

### There is no iteration tag

`each` is a slot modifier, not a loop, and there is no `{% for %}`. The binding is deliberately shallow — bind an item, render a block — the same line `collection` and `data` templates hold.

## Where universal attributes land

A composed rune takes the universal attributes (`width`, `elevation`, `tint`, `prominence`, …) like any rune, but its own root is an empty wrapper around what the template places. An attribute painted there would draw a second surface around the first. So each attribute lands where it acts, decided by its axis:

| Axis | Lands on |
|---|---|
| `width`, `spacing`, `inset` | the composed rune's own root, the box in page flow |
| `elevation`, `substrate`, `bg` (with the `scrim` family), `reveal` and `stagger`, `tint` | the **paint carrier** |
| `prominence` | the placed rune that owns a page-section header |
| `reading`, `dropcap` | the placed rune that declares prose and owns the body |
| `frame` and the `frame-*` family | the placed rune that owns the media zone, or names a frame target |

An axis moves whole: `tint-mode` goes with `tint`, `frame-aspect` with `frame`. The attribute is written onto the target as an ordinary attribute, so it renders exactly as if the author had written it on that rune. When the target is itself a composition, its own template moves the attribute again, down to the first rune with a block.

### The paint carrier

A template with exactly one rune at its top level needs nothing: that rune is the carrier. A template that places several marks one with a bare `chrome`:

```markdoc
{% section chrome %}
	{% slot name="intro" /%}
{% /section %}
{% grid %}
	{% slot name="items" /%}
{% /grid %}
```

- **The marker is consumed.** It reaches neither the placed rune's attributes nor the HTML.
- **It goes on a rune the template places**, once. Not on slot content, and not inside an `each` slot, which would place it once per item.
- **Several top-level runes and no marker is rejected** (`chrome-ambiguous`). Usually the template wants one region painted, so the better fix is to wrap the runes in one `{% section %}`, which then carries the paint by default.
- **A template that places no rune** has no carrier. A paint attribute written on it is ignored with a warning, rather than painting the empty root.
- An `{% if %}` is counted as written: a rune inside one counts as placed.

### Role-bound axes

`prominence`, `reading`, `dropcap` and `frame` land on the rune that owns the role: the carrier when it owns it, else the single placed rune that does. When no placed rune owns the role, or several do and none is the carrier, the composed rune does not offer the attribute. `refrakt reference` leaves it out, and `inspect` and `contracts` say why. A composition that places no rune keeps an axis on its own root when it meets the axis's gate itself, as `provides: [prose]` does for `reading`.

So a composition placing one `section` offers `prominence` and the `section`'s title scales exactly as it would on a `section` written directly.

A scrim lands with its background on the carrier. When the template puts a different rune in cover mode, the scrim cannot reach that rune's media, and validation warns, naming both.

### Defaults

A native rune states its chrome defaults in its config. A composed rune states them under `defaults`:

```yaml
defaults:
  width: full
  elevation: flush
  prominence: display
  density: compact
```

- **Universal attributes only.** A rune's own attribute takes its default under `attributes`. A key that is not a universal attribute, or a value its axis does not accept, is rejected when the definition loads (`defaults-invalid`).
- **A default lands where the author's attribute would.** `width` on the root, `elevation` on the paint carrier, `prominence` on the header's owner. A default that would land nowhere, because no placed rune takes the axis, is rejected too.
- **A band's loudness is its `prominence`.** The `prominence` step sizes the header's title, blurb and spacing and, on a `flush` band, its padding, so a composition picks a step rather than writing CSS. The composed `hero` defaults to `marquee`, a landing page's opening band, and the composed `cta` to `display`.
- **`density` is a default only** (`full`, `compact`, `minimal`). Authors cannot write it, so nothing overrides it. It lands on the carrier.
- **The order is author, then template literal, then default.** A literal the template writes on the rune where the attribute lands, `{% section elevation="sunken" %}`, beats the definition's default. The author's attribute beats both: it replaces the literal at expansion. **A template cannot pin a universal attribute against the author.**

`refrakt inspect` shows each default with its source, and the literal that beats it; `refrakt reference` lists the defaults.

## What a template may place

Two rules shrink what a template may place, and the set they leave is stated here once, as one list.

- **A rune that requires a parent cannot be placed directly.** The composed rune is the nearest ancestor of everything its template places, so a rune declaring `requiresParent` always fails that check. Place its parent instead and let the parent's content model produce it: `{% steps %}`, not `{% step %}`.
- **A rune that declares a schema type of its own is a peer**, and a composition declaring a type of its own may not place one: two top-level entities in one subtree. A *subordinate* type is fine — `figure`'s `ImageObject` becomes the outer entity's `image`.

### The placeable set

Every rune here may be placed by any composition. The set is derived from the catalog — core and the official plugins — and this table is checked against that derivation, so it is current.

| Package | Placeable runes |
|---|---|
| core | `actions`, `aggregate`, `annotate`, `badge`, `bar`, `bg`, `budget-category`, `budget-line-item`, `card`, `chart`, `code`, `codegroup`, `collection`, `compare`, `conversation`, `conversation-message`, `deflist`, `details`, `diagram`, `diff`, `drawer`, `embed`, `expand`, `figure`, `file-ref`, `form`, `form-field`, `gallery`, `grid`, `hint`, `icon`, `juxtapose`, `layout`, `mediatext`, `nav`, `note`, `pagination`, `progress`, `pullquote`, `region`, `relationships`, `reveal`, `reveal-step`, `sandbox`, `section`, `showcase`, `sidenote`, `tabs`, `textblock`, `tint`, `toc`, `xref` |
| @refrakt-md/marketing | `bento`, `comparison`, `comparison-column`, `comparison-row`, `cta`, `feature`, `hero`, `steps` |
| @refrakt-md/docs | `api`, `changelog`, `changelog-release`, `symbol-group`, `symbol-member` |
| @refrakt-md/storytelling | `beat`, `bond`, `character-section`, `faction-section`, `realm-section`, `storyboard`, `storyboard-panel` |
| @refrakt-md/design | `design-context`, `mockup`, `palette`, `preview`, `spacing`, `swatch`, `typography` |
| @refrakt-md/media | `audio` |
| @refrakt-md/plan | `backlog`, `bug`, `decision`, `decision-log`, `milestone`, `plan-activity`, `plan-history`, `plan-progress`, `spec`, `work` |

`data`, `snippet` and `include` are not in it although neither rule excludes them: they resolve before any template renders, so a template using one is rejected (`preprocessor-tag`). A repeated block that needs them is an `{% include %}`, not a composition.

### Not placeable

| Rune | Why |
|---|---|
| `accordion-item` | requires `accordion` |
| `tab` | requires `tabs` |
| `bento-cell` | requires `bento` |
| `definition` | requires `feature` |
| `step` | requires `steps` |
| `tier` | requires `pricing` |
| `itinerary-day` | requires `itinerary` |
| `itinerary-stop` | requires `itinerary` |
| `map-pin` | requires `map` |
| `accordion` | peer type `FAQPage` |
| `blog` | peer type `Blog` |
| `breadcrumb` | peer type `BreadcrumbList` |
| `budget` | peer type `ItemList` |
| `datatable` | peer type `Dataset` |
| `pricing` | peer type `Product` |
| `testimonial` | peer type `Review` |
| `symbol` | peer type `TechArticle` |
| `character` | peer type `Person` |
| `faction` | peer type `Organization` |
| `lore` | peer type `Article` |
| `plot` | peer type `CreativeWork` |
| `realm` | peer type `Place` |
| `event` | peer type `Event` |
| `itinerary` | peer type `ItemList` |
| `map` | peer type `Place` |
| `cast` | peer type `Person` |
| `cast-member` | peer type `Person` |
| `organization` | peer type `Organization` |
| `timeline` | peer type `ItemList` |
| `timeline-entry` | peer type `ListItem` |
| `howto` | peer type `HowTo` |
| `recipe` | peer type `Recipe` |
| `playlist` | peer type `MusicPlaylist` |
| `track` | peer type `MusicRecording` |

**The peer rule is relational.** It fires only when the composed rune declares a `schema` of its own. A composition with no `schema` — which includes every [project definition](#why-schema-is-allowed-in-a-plugin-and-not-in-a-project) — may place a peer-typed rune as a **wrapper**: a `cooking-post` placing `{% recipe %}` plus a byline claims nothing itself, so exactly one type exists in the subtree. A wrapper takes one greedy body slot and places it whole, outside any `{% if %}`: splitting the author's Markdown into fields would eat the structure the inner rune parses, and a conditional would hide it. The required-parent rows apply to every composition.

### Placed, but a node kind is rebuilt

These runes are placeable, but each reinterprets one kind of node as its own structure. Slot content of that kind reaches the output rebuilt, without the `data-slot` marker a schema row or a registration would find it by. Put other kinds of content in their slots, or keep such a field out of `schema` and `registers`.

| Rune | Node kind | What it does with it |
|---|---|---|
| `nav` | list | rebuilds each list item as a `nav-item` rune |
| `tabs` | heading | rebuilds a heading as a `tab` button label |
| `tabs` | list | rebuilds list items as `tab` buttons |
| `budget-category` | list | rebuilds each list item as a `budget-line-item` rune |
| `conversation` | blockquote | rebuilds each blockquote as a `conversation-message` rune |
| `reveal` | heading | rebuilds a heading as a `reveal-step` name |
| `form` | paragraph | rebuilds a paragraph as its own `text` paragraph |
| `form` | list | rebuilds a list as a `form-field` of choices |
| `form` | heading | rebuilds a heading as a fieldset legend |
| `form` | blockquote | rebuilds a blockquote as a `help` paragraph |
| `comparison` | heading | rebuilds a heading as a header cell of its table |
| `comparison` | list | rebuilds a list into its table |
| `symbol-group` | list | rebuilds each list item as a `symbol-member` rune |
| `changelog` | heading | rebuilds a heading as a `changelog-release` version |
| `preview` | fence | rebuilds the fence as its `source` view |

## Where definitions go

The file is the same wherever it lives. Only how it is found differs.

### In a plugin: `runeDir`

A plugin declares a directory, relative to its package, and every `<rune>.md` in it loads as a composed rune — exactly as if it were a `Plugin.runes` entry carrying the file as its `template`.

```typescript
export const storyPack: Plugin = {
  name: 'story-pack',
  version: '1.0.0',
  runeDir: 'runes',
  runes: {},
};
```

The directory must be listed in `files`, and `<pkg>/package.json` must resolve — no `exports` map, or one listing `"./package.json"`. `refrakt plugins validate` checks both. A missing, unreadable or empty directory is an error at load, never zero runes. See [Building a Custom Plugin](/extend/plugin-authoring/authoring#shipping-composed-runes-from-a-rune-directory).

### In a project: `runes.dir`

A project's definitions go in `runes.dir`, relative to the project root and `runes` by default — so a project can start one without a config edit. The directory is read through the project's file provider, so a hosted build with no filesystem has them too, and in dev an edited definition reloads every page that uses it. See [`runes.dir`](/docs/configuration/plugins#runesdir).

`runes.local` is not for definitions. It takes a JavaScript module, for developing a plugin before publishing it, and a `.md` given to it is rejected with a pointer to `runes.dir`.

### Precedence

**core < plugin < project**, with two limits:

- **A project rune can never take a core rune's name or alias.** `{% card %}` meaning something local breaks every snippet, every doc page and every composition built on the core one. There is no override.
- **A project rune takes a plugin rune's name only through `runes.prefer`.** `"bond": "__project__"` lets the project's win; naming the plugin keeps the plugin's. Without an entry the build stops and says which to add.

### Why the two are declared differently

A plugin **declares** its directory and a project's is a convention with a default, and the difference has a reason rather than a preference behind it. A package has a publish step that drops files `files` does not list, and an `exports` map that can block the path the loader resolves through — both invisible in a monorepo and fatal once installed. A declaration is what `refrakt plugins validate` checks those against. A project has neither: its files are the files, so a default does no harm.

### Why `schema` is allowed in a plugin and not in a project

Nothing checks a schema.org row against schema.org. A row's correctness rests on a reviewer reading it — in `refrakt inspect`, `refrakt contracts` and the structured-data baseline — and a wrong row is invisible on the page by construction: it renders identically and publishes a false claim as JSON-LD.

That holds for a definition shipped in a package, which is reviewed like the package's code. It does not hold for a project's own definition, whose row would publish with nobody reading it. So a plugin's definition may declare `schema` and a project's may not: the project loader rejects it, naming the rune. A project whose definitions are reviewed like first-party code can say so with [`runes.schema: "allow"`](/docs/configuration/plugins#runesschema), and its definitions may then declare `schema` too. A mechanical check was measured as the thing that could lift the ban; it catches a misspelt type or property, and not the wrong type, the empty type or the wrong value that make up most real mistakes — so the ban stays until something does.

A project rune without `schema` still publishes what the runes it places emit, and may wrap a typed rune as above.

## Converting a plugin rune: staging, then going live

A composition that replaces a plugin rune is reviewed on the site before it replaces anything. refrakt's own conversions work this way (SPEC-181), and a plugin of your own can follow the same steps.

**Stage it.** The definition goes in `site/staged-runes/<rune>.md`, under the plugin rune's own name. The repository's `staging` site renders the same content as `main`, with that directory as its `runes.dir` and a `"<rune>": "__project__"` entry in `runes.prefer`, so the composition stands in for the plugin rune on every page. Preferring the rune also settles the aliases it shares with the plugin rune (`review` with `testimonial`). The comparison tests read the staged file, and no copy goes in a test fixture directory: a test fails on one.

**Make the content valid on both sites.** Both sites render one content directory. Where the composition is written differently from the plugin rune, the plugin rune first learns the new form as well as its own, and the content moves to it, with a codemod where there is one. `hero` learned `align="start | end"`, and `testimonial` learned `author` and `role`.

**Review it.** `npm run dev:staging` serves the staging site on its own port, and `npm run build:staging` builds it into `site/build-staging`. Every push to `main` deploys it to [staging.refrakt.md](https://staging.refrakt.md), so a merged composition can be reviewed there without a local build. Paths are the same on both sites, so a comparison is two tabs: refrakt.md and staging.refrakt.md. The review covers the rune's reference page and every other page that uses it, light and dark.

**Go live, one rune at a time, in a work item of its own.** A rune goes live when:

1. its staged version has been reviewed on its reference page and every page that uses it;
2. every difference its conversion item lists is accepted or fixed;
3. any authored content whose meaning changes has a codemod, run over the repository, and the plugin rune has accepted the new form for at least one release;
4. it depends on no primitive whose spec is still `draft`.

Going live moves the file into the plugin (`git mv site/staged-runes/<rune>.md plugins/<plugin>/runes/<rune>.md`, with `runeDir` declared). It removes the rune's `transform`, theme entry, CSS and `prefer` entry, and regenerates both contract copies and the structured-data baseline, explaining every diff. The changeset carries a migration note, and a codemod where authored content changes meaning.

## Worked examples

Both definitions below are the files the tests build, compare against the storytelling plugin's own runes and check against the structured-data baseline — included here, not retyped.

### `bond` — the small end

{% snippet path="packages/content/test/fixtures/composed-storytelling/runes/bond.md" reviewed="156c48d955e7:ac1c69086d7b" /%}

- The whole rune is a `hint`: the template is the output, and there is nothing else.
- `{% if $attrs.bidirectional %}` picks the arrow. It wraps text, never a delimiter, so it is safe.
- `type` has no default. `registers.edge` copies it into the edge's data as `bondType` and reads the edge `kind` from there; an unset type registers `bondType: ""` and the kind falls back to `bond`.
- `provides: [prose]` keeps `reading` and `dropcap` available on it.

A page using it:

{% snippet path="packages/content/test/fixtures/composed-storytelling/fixtures/bond.canonical.md" /%}

### `character` — the full case

{% snippet path="packages/content/test/fixtures/composed-storytelling/runes/character.md" reviewed="741480f4a3d2:c233a206df9f" /%}

- **Sections become `details`** through `{% slot name="sections" each %}`. `emitAttributes: { heading: $heading }` is what makes `$each.heading` exist.
- **Role and status are a meta block**, not badges: they are attribute values, so `metaFields` gives them their meaning and sentiment.
- **The portrait sits in `section`'s media zone**, before the `---`, unconditionally — an absent portrait leaves the zone empty and `section` omits it. `media="portrait"` crops it round through the media dimension.
- **The name is `section`'s headline.** The meta block placed after it keeps the description out of the blurb role, so the description stays body and no `slot-header-role` warning is raised.
- **A catch-all `body` field** keeps content written before the first section; without a field to match it, it would be dropped.
- **It declares `schema`**, `Person`, so it can only ship in a plugin. Placed inside, `section` and `details` declare no type, so nothing competes with it.

A page using it:

{% snippet path="packages/content/test/fixtures/composed-storytelling/fixtures/character.body-and-sections.md" /%}

## Errors

A definition is checked when it is built, not when a page renders, and every failure names the rune and the thing it rejected.

- A **build** stops at the first, with the definition's file and line for a project rune.
- **`refrakt validate`** reports every project definition that does not build, as a finding at its file and line, before it validates content.
- **`refrakt plugins validate`** builds every definition a plugin ships.

Each error has a code. The fix column assumes the cause in the meaning column.

| Code | Means | Fix |
|---|---|---|
| `name-not-kebab` | The rune's name — the file's name — is not kebab-case. | Rename the file: lowercase words joined by hyphens. |
| `no-frontmatter` | The file has no `---` … `---` block at the top. | Add one, even if it only says `tag: div`. |
| `frontmatter-yaml` | The frontmatter is not valid YAML, or is not a mapping. | Fix the YAML at the reported line. |
| `name-restated` | The frontmatter has `rune:` or `name:`. | Remove it; the file's name is the rune's name. |
| `style-key` | The frontmatter declares styles (`css`, `block`, `class`, …). | Remove it. A rune that needs its own styling is a declared rune in a plugin, not a composition. |
| `second-emit-path` | The definition, or a plugin entry, declares `transform`, `emits` or `slots` beside the template. | Keep one emit path: the template, or code. |
| `layout-key` | The frontmatter declares `layout`. | Arrange the containers in the template; place meta blocks with `{% metablock %}`. |
| `unknown-key` | The frontmatter has a key a definition does not take. | Check the spelling against [Frontmatter](#frontmatter). |
| `invalid-value` | A value has the wrong shape — `tag` not an element name, `aliases` or `provides` not a list, `schema`, `registers`, `metaFields` or `blocks` not a mapping. | Fix the value at the reported line. |
| `attribute-invalid` | An `attributes` entry is malformed: a bad name, not a mapping, an unknown key, a `type` other than `string`/`number`/`boolean`, an empty `matches`. | Fix the entry at the reported line. |
| `attribute-reserved` | An attribute with `matches` would render as a `data-*` the engine writes itself (`data-name`, `data-rune`, `data-slot`, …). | Rename the attribute. |
| `content-model-type` | `content.type` is not `sequence`, `sections` or `delimited`, or the model is conditional. | A composition's slots are its model's fields; use one of the three. For a conditional model, see [the declarative forms](#the-content-models-a-composition-takes). |
| `content-model-invalid` | The content model or one of its fields is malformed: a field without `match`, an unknown key, both `fields` and `preamble`, a bad `headingExtract`, `emitAttributes`, `implicitSection` or zone, an `itemModel` `pattern` that is not a regular expression. | Fix it at the reported line; see [Content Models](/extend/rune-authoring/content-models). |
| `delimiter-unsupported` | A delimited model's `delimiter` is not `hr`. | Split on `---`; it is the only delimiter a composition takes. |
| `dynamic-zones` | A delimited model declares `dynamicZones`, or a `zoneModel`. | Declare fixed, named `zones`. |
| `zone-field-twice` | A field name is declared in two zones. | Rename one: a composition's slots are all its zones' fields together. |
| `implicit-section-mismatch` | `implicitSection.attributes` does not give exactly the keys of `emitAttributes`. | Give one value for each `emitAttributes` key, and no others. |
| `schema-invalid` | The `schema` table fails its own checks — a source naming no attribute, field or node. | Fix the row the message names. |
| `registers-invalid` | The `registers` declaration fails its own checks — a `{ field }` naming no key of the data bag, an undeclared source. | Fix the entry the message names; see [Declaring Registration](/extend/rune-authoring/registration). |
| `template-parse` | Markdoc cannot parse the template, or a tag in it is never closed or never opened. | Fix the syntax at the reported line. |
| `preprocessor-tag` | The template uses `{% data %}`, `{% snippet %}` or `{% include %}`, which resolve before a template renders. | A repeated block that needs them is an `{% include %}`, not a composition. |
| `attrs-undeclared` | `$attrs.x` names no declared attribute, or `$attrs` names none. | Declare `x` under `attributes`, or fix the name. |
| `each-outside-slot` | `$each` is used outside an `each` slot. | Use it only inside `{% slot name="…" each %}`. |
| `each-field-not-emitted` | `$each.x` names a field the content model does not emit, or `$each` names none. | Add `x` to the model's `emitAttributes`. |
| `slot-invalid` | A `{% slot %}` has an attribute other than `name` and `each`, `each` has a value, or `name` is empty. | `{% slot name="x" /%}`, or `{% slot name="x" each %}`. |
| `bare-slot-misplaced` | A bare `{% slot /%}` is outside an `each` slot, iterates, or has fallback content. | Use the bare form only as an `each` item's content; name the field anywhere else. |
| `slot-inside-each` | A named slot is placed inside an `each` slot, which would place it once per item. | Move it outside the `each` slot. |
| `slot-unknown-field` | A slot names no field of the content model. | Fix the name, or declare the field under `content`. |
| `slot-placed-twice` | The same slot is placed twice. | Place it once; two positions are two fields, or a theme's concern. |
| `each-on-single-field` | `each` iterates a field that holds one value. | Make the field `greedy`, match it to one list, or drop `each`. |
| `each-on-list-ambiguous` | `each` iterates a greedy field that can collect several lists. | Make the field match one list, not greedily, and `each` iterates its items. |
| `each-item-unplaced` | An `each` slot has no bare `{% slot /%}`, so each item's content would be dropped. | Add `{% slot /%}` where the item's content goes. |
| `field-unplaced` | A content-model field is placed by no slot, so its content would be dropped. | Place it, or remove the field. |
| `fills-invalid` | A field's `fills` names an attribute the definition does not declare, references a `$` field its item model does not declare, or sits on a field without an `itemModel`. | Declare the attribute, fix the reference, or give the field an `itemModel`. |
| `fill-placed` | A field with `fills` is also placed by a slot, so its content would render as well as fill the rune's values. | Remove the slot; the filled values are placed through `{% metablock %}` or `$attrs`. |
| `metablock-invalid` | A `{% metablock %}` has no `name`, has content, has another attribute, or sits inside a line of text. | `{% metablock name="x" /%}` on its own line. |
| `metablock-inside-each` | A `{% metablock %}` is inside an `each` slot. | Move it outside. |
| `metablock-undeclared` | It names no block declared under `blocks`. | Declare the block, or fix the name. |
| `metablock-placed-twice` | The same block is placed twice. | Place it once. |
| `chrome-invalid` | A `chrome` marker has a value, or marks a rune inside an `each` slot. | Write it bare, on a rune the template places once. |
| `chrome-marked-twice` | Two placed runes are marked `chrome`. | Mark one: a rune has one paint carrier. |
| `chrome-ambiguous` | The template places several runes at its top level and marks none `chrome`, so the paint attributes have nowhere to land. | Wrap them in one `{% section %}`, or mark one of them `chrome`. |
| `defaults-invalid` | A `defaults` entry names no universal attribute, gives a value its axis does not accept, or lands nowhere (no placed rune takes the axis). | Default a rune's own attribute under `attributes`; fix the value; or place a rune that takes the axis. |
| `chrome-collision` | A rune the template places declares an attribute named `chrome`, which the marker would shadow. | Rename that rune's attribute. |
| `composition-cycle` | The rune places itself, directly or through another composed rune. | Break the cycle. |
| `parent-required` | The template places a rune that requires a parent it does not get. | Place the parent and let its content model produce the child — see [the placeable set](#the-placeable-set). |
| `peer-schema-type` | The rune declares a schema type and places a rune declaring a peer type. | Place primitives that declare no type, or drop the outer `schema` and wrap. |
| `file-name-invalid` | A `.md` in a rune directory is not named `<rune>.md`. | Rename it; keep fixtures and notes out of the directory. |
| `file-unreadable` | A definition file is listed but cannot be read. | Check the file's permissions, and that it is a file. |
| `rune-dir-invalid` | A plugin's `runeDir` is empty, or points outside its package. | Name a directory inside the package. |
| `rune-dir-unreadable` | A plugin's declared rune directory cannot be read once installed. | List it in `files`; `refrakt plugins validate` checks this. |
| `rune-dir-empty` | A plugin's declared rune directory holds no definitions. | Publish the definitions (`files`), or remove `runeDir`. |
| `package-unresolvable` | A plugin's `<pkg>/package.json` does not resolve, so its directory cannot be found. | Add `"./package.json": "./package.json"` to `exports`. |
| `rune-defined-twice` | A plugin defines a rune in its `runeDir` and in `Plugin.runes` (or as an alias there). | Keep one definition. |
| `project-schema` | A project definition declares `schema`. | Remove it — [why](#why-schema-is-allowed-in-a-plugin-and-not-in-a-project) — or, if every definition in the directory is reviewed like first-party code, set `runes.schema: "allow"`. |
| `project-core-name` | A project rune's name or alias is a core rune's name or alias. | Rename the definition; core names cannot be shadowed. |
| `project-plugin-name` | A project rune takes a plugin rune's name with no `runes.prefer` entry. | Add `"<name>": "__project__"` (or the plugin's name) under `runes.prefer`, or rename. |
| `local-definition` | `runes.local` is given a definition, or a module exporting a `template`. | Move the file to `runes.dir`. |
| `template-entry-invalid` | A `Plugin.runes` entry's `template` is not a definition string, or the rune also has a hand-written `theme.runes` config. | Pass the file's text; drop the theme entry — the config is generated. |
