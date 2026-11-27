# Declarative fit of every refrakt rune's input against Marquise's 1.0 shape file

Measured 2026-11-27. Step 1 of Marquise's plan (`marquise/docs/concepts/scope.md`, "How it gets there").
Read-only: no repository was edited.

## Method

- **1.0 vocabulary**: the 1.0 column of the Size table in `scope.md`, plus `shapes.md`, `content-models.md`,
  `records.md`. Paragraph and item `template:` are "1.0 if proven" (heading templates are built), so they are
  counted as a *conditional* key, not as plain 1.0.
- **Input only**: attributes and how children map to fields. Output (transform tree, engine config, schema.org
  rows, components) is ignored, **except** where a transform does input work: re-reads children, splits text,
  partitions nodes by type, parses fence attributes, infers types. That counts as input.
- **Runes**: the catalogs today hold **128**, not 127: core 63 (SPEC-194 counted 62; `link`, SPEC-160 D8 /
  WORK-655, arrived after 2026-11-07), plugins 65 (including `hero`, `cta`, `testimonial`). The staged `steps`
  definition (`site/staged-runes/steps.md`) is classified in `steps`' row.
- Every schema file in `packages/runes/src/tags/`, `packages/runes/src/nodes.ts` (`link`), `plugins/*/src/tags/`
  and the four definition files was read for its attributes, content model and the input work in its transform.
  `form`, `budget`, `comparison`, `map`, `bento`, `pricing`, `palette/spacing/typography`, `changelog`,
  `conversation`, `tabs`, `deflist`, `section`, `pullquote` were read in full; renderer-heavy halves (`diff`'s
  line builders, `nav`'s render, `sandbox`'s policy) were skimmed.

### Classes

| Class | Meaning |
|---|---|
| **A: fits 1.0** | expressible with 1.0 keys and 1.0 match names only |
| **B: fits 1.0 but for a missing match name** | the structure is 1.0, but it matches a node 1.0's list of 14 match names lacks (`fence`, `blockquote`, bare `tag`, ...). Not a 0.x key, not code: a vocabulary gap in 1.0 itself |
| **C: fits with a conditional, 0.x or after-1.0 key** | named key: `template` (paragraph/item, 1.0 if proven), `compact`, `prepare`, `computes`, inline shapes with content models (Also planned) |
| **D: needs code, or grammar no key covers** | reading the input needs something no declared key (1.0 or later) expresses; grouped below with a proposal each |
| **E: not a shape** | a directive (preprocess), a deferred/host-filled shape (Rivière), a corpus reference, or the host's layout cascade. Their *attributes* would all fit 1.0 as data shapes; what makes them work is not a content model |

A rune is placed by its hardest need; its other needs are listed in the same row.

## Counts

| Class | Core (63) | Plugins (65) | All (128) |
|---|---|---|---|
| A: fits 1.0 | 25 | 29 | **54** (42%) |
| B: fits but for a missing match name | 2 | 6 | **8** (6%) |
| C: fits with a conditional / 0.x / after-1.0 key | 10 | 9 | **19** (15%) |
| D: needs code or uncovered grammar | 12 | 16 | **28** (22%) |
| E: not a shape | 14 | 5 | **19** (15%) |

Of the 109 runes that are shapes (A–D), **50% fit 1.0 as written; 57% with the missing match names added.**

C by key: `compact` 8 (`accordion`, `reveal`, `character`, `realm`, `faction`, `symbol-group`, `feature`, `plot`),
paragraph/item `template` 5 (`deflist`, `tint`, `budget-category`, `audio`, `definition`), `prepare` 3 (`embed`,
`diff`, `design-context`), inline shapes 3 (`code`, `badge`, `link`). Many D runes also need these keys.

E by kind: directives 4 (`include`, `snippet`, `data`, `file-ref`); deferred/host-filled 12 (`toc`, `pagination`,
`blog`, `collection`, `relationships`, `aggregate`, `expand`, `backlog`, `decision-log`, `plan-activity`,
`plan-progress`, `plan-history`); corpus reference 1 (`xref`); layout cascade 2 (`region`, `layout`).

## The table

State is SPEC-194's (2026-11-07): **comp** = already a composition; **planned** = one of the 58; **native/<group>** =
one of the 66, with SPEC-194's group (`prep` needs prepare, `pipe` cross-page/preprocess, `draw` drawing/behaviour,
`fn` SPEC-195 functions, `decl` purely declarative). SPEC-194 names only some of the 23 `decl` runes;
the rest are placed by elimination, marked `decl*`. **new** = not in SPEC-194's count.

| Rune | Package | SPEC-194 state | Class | Key or code needed | Reason |
|---|---|---|---|---|---|
| nav | core | native/pipe | D | nested list in an item (recursive item model); auto form is deferred | hand-written nav is sections on `heading:1` + list items (link or slug text, description, badge, **sub-list**); the sub-list needs an item model that contains itself |
| region | core | native/pipe | E | layout cascade (host) | `name`, `mode` + body; meaningful only inside `_layout.md` |
| layout | core | native/pipe | E | layout cascade (host) | `extends` + body |
| codegroup | core | native/draw | D | list of fences, each a record with the fence's `language`/`label`/`source`/`lines`; `computes` for the label fallback | today one repeating `fence` field; each fence becomes a tab whose label is read from the fence's info attributes. 1.0 has no `fence` and a repeating field is one rich-text value |
| grid | core | native/fn | D | an attribute list with a space separator (`spans="2 1"`) | `split: { by: hr }` repeated groups fits; `spans` is `SpaceSeparatedList`, and 1.0's list shorthand is comma-only |
| hint | core | native/decl | A | — | `type` enum + body |
| tab | core | native/decl* | A | — | `name`, `image` (a string) + body |
| tabs | core | native/draw | D | heading read by parts (image + text) | `custom`: each heading becomes a tab, its **image** and text read from the heading's inline content; 1.0 reads headings only by text template |
| details | core | native/fn | A | — | `summary`, `open` + body |
| drawer | core | native/pipe | A | — | `id`, `title`, `side`, `size`... + `split: { by: hr }` into body / footer. The heading-level auto-detect is output; SPEC-194's pipeline placement is about output |
| figure | core | native/fn | A | `computes` only for the `mixed` flag (output) | images then a caption paragraph; transform finds the first non-media paragraph anywhere, a fixed sequence with `position: last` covers the written forms |
| gallery | core | native/draw | D | a list from a repeating field (`items` on `match: image`) | transform flattens every image out of the body and reads each `alt` as its caption; in 1.0 a repeating `image` field is one rich-text value, not a list |
| accordion | core | native/draw | C | `compact` (section form of `accordion-item`) | sections by heading (auto level) emitted as `accordion-item`, or explicit `tag:accordion-item`; readable in 1.0 as records, unified as one child shape only with `compact` |
| accordion-item | core | native/decl* | A | — | `name` + body |
| toc | core | native/pipe | E | host-filled (page headings) | `depth`, `ordered`; no content |
| embed | core | native/prep | C | `prepare` (provider detection) | `url`, `aspect`, `title` + fallback body; the input fits, the provider table is computation |
| breadcrumb | core | native/pipe | A | the `auto` form is deferred; restructure the attribute-dependent model | an optional list of links; today the content model switches on `auto`, which Marquise forbids, but one model with an optional list reads both |
| pagination | core | native/pipe | E | deferred (site order) | attributes only |
| budget | core | planned | D | template literal alternatives + inline strikethrough; `computes` (totals) | categories are sections by heading, preamble detected by **relative** heading levels; a heading's estimate marker is `(estimate)`, `(est.)`, `~x~` or strikethrough; items `Description: $Amount` |
| budget-category | core | planned | C | item `template` (`{description}: {amount}`); `computes` (subtotal) | `label`, `estimate` + a list read by regex today |
| budget-line-item | core | planned | A | — | attributes only (data shape) |
| compare | core | native/fn | D | a list of fences, each a record (label from `labels[i]` or the fence language) | transform pairs each fence with a label; needs `fence` and a list from a repeating field; `labels` is a `list: true` attribute (1.0) |
| datatable | core | native/draw | A | — | attributes + a body holding a table (`any`); rows are not read as data |
| diff | core | native/prep | C | `prepare` (line diff); needs `fence` (B) | exactly two fences, before/after, with `language`, `source`, `lines` read off the fence |
| snippet | core | native/pipe | E | directive (preprocess) | reads a file region (`path`, `lines`, `symbol`, `match`) |
| data | core | native/pipe | E | directive (preprocess) | reads CSV/JSON into a table |
| code | core | native/decl | C | inline shape with a content model (Also planned) | inline tag with inline children |
| include | core | native/pipe | E | directive (`@marquise-md/include`) | `file`, `variables` (a structured attribute) |
| chart | core | native/draw | A | — (typed rows would need a table matcher) | attributes + a table in the body; the drawing reads the table client-side |
| diagram | core | native/draw | B | `fence` match name (`as: text`) | one fence holding mermaid/plantuml source |
| sidenote | core | native/decl | A | — | `variant` + body |
| conversation | core | native/fn | D | a list of blockquotes, each a record (speaker by paragraph template `**{speaker}:** …`); `computes` (speaker rotation, alternation) | `custom`: every blockquote becomes a message; needs `blockquote`, a list from a repeating field, and a template on the blockquote's first paragraph |
| conversation-message | core | native/decl* | A | — | `speaker`, `align` + body |
| reveal | core | native/draw | C | `compact` (section form of `reveal-step`) | same shape as `accordion` |
| reveal-step | core | native/decl* | A | — | `name` + body |
| section | core | native/decl | D | content model chosen by attribute values; template literal alternatives; `blockquote` | `header` (auto/headline/none) and `media-position` choose the model; the epigraph is a blockquote + `**Name**, Source` attribution read by regex, also detected **inside** the first body blockquote by the transform |
| juxtapose | core | native/draw | A | — | `split: { by: hr }` repeated groups; `labels` a list attribute |
| annotate | core | native/decl | A | — | `variant` + body holding explicit `note` tags |
| note | core | native/decl* | A | — | body (`annotate-note`) |
| form | core | native/prep | D | an ordered list of heterogeneous items (repeated choice); inference of field types from words and option counts (`prepare` or code) | headings are groups, `> label (multiple)` + list is a choice field, `Name (optional, placeholder: x)` items are inputs, the last bold-only paragraph is submit; type is inferred from the name (`email`, `message`...) |
| form-field | core | native/decl* | A | — | attributes only |
| sandbox | core | native/prep | D | raw body source (`as: source`, or keep as code) | its body is HTML/JS read verbatim (`config.variables.__source`), not Markdown; also `requires: trusted` (1.0) |
| pullquote | core | native/decl | D | template literal alternatives (`—`, `–`, `-`, `,`); `blockquote` | `when: hasChild blockquote` linearises fine (optional quote, then body); the attribution `**Name** — Source` is read by regex with four separators, inside or after the quote |
| textblock | core | native/decl | A | — | attributes + body |
| mediatext | core | native/decl | A | — (order becomes fixed) | transform pulls image paragraphs out from anywhere; a `media` field before `body` reads the written forms in order |
| link | core | new | C | inline shape with a content model (block form fits 1.0) | `href`, `title`, `aria-label` around inline or block content |
| icon | core | native/decl* | A | — | self-closing, attributes only (data shape as a tag) |
| tint | core | native/decl | C | sections by heading (`Light`, `Dark`, preamble = light) + item `template` (`{token}: {value}`, `token` an enum); `migrations` for the `background` alias | the body is parsed by regex in the transform today |
| showcase | core | native/decl* | A | — (deprecated aliases are `migrations`) | attributes + body |
| bg | core | native/decl* | A | — | attributes + an optional guest |
| blog | core | native/pipe | E | deferred (folder listing) | headline, blurb + attributes |
| xref | core | native/pipe | E | corpus reference (Rivière supplies `ref`) | `primary` (positional), `label`, `type`, `preview` |
| expand | core | native/pipe | E | deferred (entity transclusion) | attributes only |
| badge | core | native/decl | C | inline shape with a content model | `sentiment`, `type` + inline children |
| bar | core | native/decl | A | — | `split: { by: hr }` left/right (done in the transform today) |
| deflist | core | native/decl | C | item `template` (`**{term}:** {value}`), plus trailing blocks in an item | transform re-reads each item for a bold prefix ending in `:` |
| collection | core | native/pipe | E | deferred (Rivière); body is a per-item template (`@marquise-md/compose`) | query attributes |
| relationships | core | native/pipe | E | deferred (Rivière) | query attributes |
| aggregate | core | native/pipe | E | deferred (Rivière) | query attributes |
| file-ref | core | native/pipe | E | directive (reads a source file) / corpus | inline; `path`, `lines`, `symbol`... |
| progress | core | native/fn | A | — | `value`, `max`, `percent` + label body |
| card | core | planned | A | — | `split: { by: hr }` media / body / footer and a `group: [eyebrow, headline]`; both are in the transform today, and 1.0 expresses both |
| actions | core | native/fn | B | `fence` match name | list items read by parts (`link`), or a fence (a command line) |
| cast | business | planned | D | template literal alternatives (`Name — Role` with `-`, `–`, `—`); `compact` | list items: optional image + name + role by regex; emitted as `cast-member` or explicit tags |
| cast-member | business | planned | A | — | attributes + body |
| organization | business | planned | B | `blockquote`, bare `tag` | header `heading\|paragraph\|image`, body `list\|blockquote\|tag` |
| timeline | business | planned | D | heading template with literal alternatives (`{date} — {label}`, `-–—:`); `compact` | sections by heading (auto level) emitted as `timeline-entry` |
| timeline-entry | business | planned | A | — | `date`, `label` + body |
| swatch | design | planned | A | — | attributes only |
| palette | design | planned | D | a list-typed placeholder (`{name}: {values}`, comma list); `computes` (contrast) | groups by heading, items parsed by `indexOf(':')` + `split(',')` in the transform |
| typography | design | planned | D | a list-typed placeholder (`{role}: {family}[? ({weights})]`, integers) | items parsed in the transform |
| spacing | design | planned | D | a list-typed placeholder (`scale: 4, 8, 16`); sections by heading name (today a substring match on the text) | sections Spacing / Radius / Shadows, items `name: value` |
| preview | design | native/prep | D | raw body source; a field taken from anywhere (the fence) | renders the example and shows its source (`__source`) |
| mockup | design | planned | A | — | attributes + body |
| design-context | design | native/prep | C | `prepare` (collects tokens from child records) | body of explicit `palette`/`typography`/`spacing` tags; the input fits, the fold is computation (and `registers` is a corpus concern) |
| api | docs | planned | A | — | `method`, `path`, `auth` + body |
| symbol | docs | planned | A | one nested split (`heading:3` groups, `heading:4` members), as SPEC-194 D6 | today the model switches on `kind`, which Marquise forbids; one model reads every kind |
| symbol-group | docs | planned | C | `compact` (section form of `symbol-member`) | `heading:4` sections become members |
| symbol-member | docs | planned | A | — | body |
| changelog | docs | planned | D | heading template with literal alternatives (`{version}[? · {title}][? — {date}]`, `-–—`); `compact` | release headings parsed by three regexes in the transform |
| changelog-release | docs | planned | A | — | `version`, `title`, `date` + body |
| howto | learning | planned | B | bare `tag` | header, then `list\|tag`; tools (`ul`) and steps (`ol`) are partitioned by the transform anywhere in the body, fixed order in 1.0 |
| recipe | learning | planned | B | `blockquote` (tips) | `split: { by: hr }` media/content, eyebrow/headline/blurb, `list:unordered` ingredients, `list:ordered` steps |
| bento | marketing | planned | D | a heading's **level** as a value; `computes` (spans from the `levels` ladder) | each heading starts a cell whose size comes from its heading level, at any level in one bento |
| bento-cell | marketing | planned | A | — | attributes + `split: { by: hr }` media / body / footer (count-dependent, matched by zone order) |
| feature | marketing | planned | C | `compact` (list-item form of `definition`) | hr zones, eyebrow/headline/blurb with `shadows`; each list item becomes a `definition` |
| definition | marketing | planned | C | paragraph item model with parts `image`, `strong` and inline `tag:icon` (only `tag:ref` is a 1.0 inline part) | term paragraphs (image, icon or bold) then description |
| steps | marketing | planned | A | — (relies on auto heading level) | staged definition: `split` by heading, preamble `header` + `list:ordered` |
| step | marketing | planned | A | — | `split: { by: hr }` media / content |
| pricing | marketing | planned | D | heading level chosen by content (the first heading matching `Name — Price`); literal alternatives; `computes` (currency from symbol) | tiers are headings at whichever level first matches the regex |
| tier | marketing | planned | A | — | attributes + body |
| comparison | marketing | planned | D | literal alternatives (`**Label** — text`, `-–—:`), inline strikethrough, `blockquote`; `prepare` (aligning rows across columns) | `heading:2` columns; rows are task items (`[x]`/`[ ]`), struck-through or plain, keyed by a bold label |
| comparison-column | marketing | planned | A | — | `name`, `highlighted` + body |
| comparison-row | marketing | planned | A | — | `label`, `rowType` + body |
| hero | marketing | comp | B | `fence` (actions) | hr zones, eyebrow/headline/blurb, `list\|fence` actions |
| cta | marketing | comp | B | `fence` (actions) | same as hero, without zones |
| testimonial | marketing | comp | D | template literal alternatives (attribution `**Name** — Role`, `-–—,`); `blockquote` | the definition's `itemModel` reads `source` with an RE2-shaped regex, which Marquise forbids (regexes never read) |
| playlist | media | planned | D | nested list inside an item (cue points); `compact` (track's list-item form); item `template` | items `**Name** [src](url) *Artist* (3:45) — date` with a nested cue-point list; `list\|tag:track` |
| track | media | planned | A | — | attributes + title + body |
| audio | media | native/draw | C | item `template` (`[? **{label}**][? ({time})] {text}`, `time` a duration) | chapter list read by regex today |
| event | places | planned | B | `blockquote`, bare `tag` | header + `list\|blockquote\|tag` |
| map | places | native/draw | D | a placeholder whose type depends on its text (coordinates or an address); `prepare` or a `geo` value type (registry, after 1.0); literal alternatives | groups by heading, items `**Name** — address` or `lat, lng`, name falling back to address |
| map-pin | places | native/fn | A | — | attributes only |
| itinerary | places | planned | D | literal alternatives (stop headings); nested sections at a fixed level (today auto); `compact` | `when: hasChild heading:2`: days by `heading:2`, or one implicit day; linearisable as a preamble with the day model |
| itinerary-day | places | planned | D | heading template with literal alternatives (`{time} — {location}`); `compact` | stops are sections by heading (auto level) |
| itinerary-stop | places | planned | A | — | attributes + body |
| spec | plan | planned | A | — | `heading:1` title, summary, body (decisions as a nested `heading:3` split in Marquise's design) |
| work | plan | planned | A | — | sections on `heading:2` with aliases and `deprecated`, task-list criteria, ref lists, `other: keep` |
| bug | plan | planned | A | — | as `work` |
| decision | plan | planned | A | — | as `work` |
| milestone | plan | planned | A | — | title + body |
| backlog | plan | planned | E | deferred (collection sugar); body a per-item template | query attributes |
| decision-log | plan | planned | E | deferred | query attributes |
| plan-progress | plan | planned | E | deferred (aggregates) | query attributes |
| plan-activity | plan | planned | E | deferred | query attributes |
| plan-history | plan | native/pipe | E | deferred (git history) | attributes only |
| character | storytelling | planned | C | `compact` (section form of `character-section`) | portrait image, then sections by heading (auto level) |
| character-section | storytelling | planned | A | — | `name` + body |
| realm | storytelling | planned | C | `compact` | scene paragraph, then sections |
| realm-section | storytelling | planned | A | — | `name` + body |
| faction | storytelling | planned | C | `compact` | sections |
| faction-section | storytelling | planned | A | — | `name` + body |
| lore | storytelling | planned | A | — | attributes + body |
| plot | storytelling | planned | C | item `template` (`[? \[{marker}\] ][? **{label}**] {text}`, `marker` an enum `x > - ' '`); `compact` (beat) | beat markers read by regex; `[>]` and `[-]` are not `task` states |
| beat | storytelling | planned | A | — | attributes + body |
| bond | storytelling | planned | A | — | `from`, `to`, `type`... + body (`registers.edge` is the corpus layer's) |
| storyboard | storytelling | native/decl | D | `split: { by: image }`, the marker kept in its group | each image starts a panel; 1.0 splits only by `hr` or heading |
| storyboard-panel | storytelling | planned | A | — | body |

## The 1.0 keys most runes rely on

Counted over the 109 shapes.

| Key | Runes (approx.) | Notes |
|---|---|---|
| `attributes` with `type`, `matches`, `default`, `required` | ~100 | the bulk of every rune's input; refrakt's types map 1:1 (`String`, `Number`, `Boolean`) |
| `content.sequence` with `match`, `optional`, `repeat` | ~85 | `body: { match: any, repeat, optional }` alone is ~40 runes (`bodyOnly()`) |
| `split: { by: hr }` with `zones` / `primary`, or repeated groups | 14 | hero, card, bento-cell, feature, step, recipe, playlist, section, grid, juxtapose, bar, drawer, ... |
| `split: { by: heading }` / `sections` / `preamble` | 18 | plan's four with names and aliases; 9 with an **auto-detected** level (accordion, reveal, timeline, character, realm, faction, changelog, steps, itinerary-day) |
| `shadows` | ~12 | every eyebrow / headline / blurb header (hero, cta, feature, recipe, card, accordion, reveal, tabs, budget, pricing...) |
| `items` (item models by parts) | ~12 | cast, plot, audio, playlist, actions, definition, work's criteria (`task`), ... |
| heading `template` | 5 | timeline, changelog, itinerary-day, budget, pricing (all need literal alternatives) |
| paragraph / item `template` (conditional) | ~19 | deflist, tint, budget(-category), audio, plot, cast, palette, typography, spacing, pullquote, testimonial, section, comparison, map, conversation, playlist, form, ... |
| `group`, `position: last` | 4 | card, section, pullquote, form |
| `as` (`inline`, `text`, value types) | all header fields | refrakt declares none today; it is implied by the components |
| `positional` | 2 | xref, expand (`primary`) |
| `to` (references) | ~6 | plan's `source`, `supersedes`, blocked-by lists; bond `from`/`to`; beat `follows` |
| `list: true` attributes | ~8 | `labels`, `speakers`, `aliases`, `tags`, `pr`, `source`, `responsive`, `spans` (space-separated) |
| `other: keep`, `deprecated`, `key` | 4 | work, bug, decision (`Dependencies`), criteria by text |
| `requires: trusted` | 1 | sandbox |
| `preprocess` | 4 | include, snippet, data, file-ref (all class E) |
| extension namespaces | ~30 | `schema:` (schema.org rows), `riviere:` (`registers`) |

## Every "needs code" case, grouped, with the smallest key that would cover it

| Group | Runes | What reading needs | Proposal |
|---|---|---|---|
| **D1. Template value grammar** | pullquote, testimonial, section (epigraph), cast, timeline, changelog, itinerary, itinerary-day, budget, pricing, comparison, map (separators); palette, typography, spacing (list placeholders); grid (space-separated attribute list) | (a) one literal from a set: refrakt's regexes accept `-`, `–`, `—` (and `:` or `,`) wherever a separator stands, 12 runes; (b) a placeholder holding a list (`{name}: {values}` with `values` comma-separated, integers in `(400, 700)`); (c) a list attribute split on spaces | (a) **literal alternatives** in templates, e.g. `{name}[| — | – | - ]{role}` (the `[|` form beside `[?`), or one core format for a dash-like separator; (b) `list: true` on a template member, read with the same comma rule as list attributes; (c) `list: { separator: space }`, or one migration to commas. All additive, all written back. Without (a) a migration that normalises separators is the only route, and it rewrites authors' text |
| **D2. A list from a repeating field** | gallery, codegroup, compare, conversation | each node of a repeating run read as its own record (each image with its `alt`; each fence with `language`, `label`, `source`, `lines`; each blockquote with its speaker). 1.0 makes a repeating block field one rich-text value, and lists only from `match: list` item models | allow **`items:` on any repeating field**: `panels: { match: fence, repeat: true, items: { language: …, label: …, code: { as: text } } }`. Needs the `fence` matcher and fence members (its info string's language and attributes, its content as text) |
| **D3. Blocks inside a list item** | nav, playlist (and deflist's trailing paragraphs, feature's definition bodies) | a sub-list inside an item read by an item model (nav's tree, playlist's cue points); nav's is recursive | item-model members may `match: list` with their own `items:`; for recursion, an item model may name itself (`items: { ref: nav-item }`, or a named item model under the shape). Recursion is the one non-additive-looking part: decide before freezing |
| **D4. Headings read by more than text** | tabs (image part), bento (level as a value), pricing (level chosen by content) | 1.0 reads a heading only through a text template, and "the level belongs to the source" | `heading: { parts: { image: { match: image }, name: { match: text } } }` (parts, as items have), and a `level` member (`size: { from: level }`). pricing does not need its inference: fix the level and it becomes D1 only |
| **D5. Split by a node other than `hr` / heading** | storyboard | each image starts a group and stays in it | `split: { by: image }` (refrakt SPEC-147's `segmented`, SPEC-194 D7.1). One value of an existing key |
| **D6. Content model chosen by an attribute** | section | `header` and `media-position` choose the model | **no key**: Marquise's rule stands. One model (always `split: { by: hr }`, primary content zone) plus separate shapes for `header="none"`; symbol and breadcrumb already restructure this way |
| **D7. Raw source** | sandbox, preview | the tag's body as verbatim text (HTML/JS, or the example's Markdown), not a parsed tree | `as: source` on a body field (verbatim text of the region, with its provenance), gated by `requires: trusted`; or **keep as code**, as SPEC-194 D2's named exception. Preview also wants a field taken from anywhere (`position: any`, SPEC-194 D7.2) |
| **D8. Inference from text** | form, map | form: field type from keywords in the label and from option counts, an ordered list of heterogeneous items; map: a value that is coordinates or an address depending on its text | **keep as code** (`prepare`, after 1.0) for form's inference; its structure needs **repeated choice** (`repeat: { of: [ … ] }` yielding tagged items, SPEC-194 D7.4), which is a real grammar addition, not a key. Map: a `geo` value type through the value-type registry (after 1.0) and a union placeholder, or `prepare` |

With D1, D2 and the missing match names added, 18 of the 28 move to A or C; with D4's two heading members and D5,
4 more. What is left is 6–7 runes: nav and playlist (nested items), section (restructure), sandbox and preview (raw
source), form (inference and repeated choice), map (typed by text).

## Cross-cutting findings (not per rune)

1. **The 1.0 match vocabulary is too small for refrakt.** `matchesType` in `packages/runes/src/lib/resolver.ts`
   accepts any node type; refrakt's schemas use `fence` (12 uses), `blockquote` (8), bare `tag` (11), `hr`, `table`.
   Marquise's 14 names have none of them, and no inline `s` (strikethrough: budget, comparison) or inline `tag:<name>`
   beyond `tag:ref` (definition's `icon`). About 25 runes touch one. Adding them is additive and costs nothing
   in the analysis (each has a plain node type), so it should happen **before** the freeze: `fence`,
   `blockquote`, `table`, `hr`, `tag` (any explicit child shape), and inline `s` and `tag:<name>`. A `fence`
   needs members: its language and info attributes, and its content `as: text`.
2. **Paragraph and item templates are load-bearing, not optional.** ~19 runes read paragraphs or list items
   whose values share one run of text, and refrakt reads them all with regexes, which Marquise forbids
   ("regular expressions constrain values; they never read them"). If templates miss the "if proven" cut-off,
   those runes have **no** 1.0 reading at all. The cut-off rule should not apply to them.
3. **Universal attributes are dimensions, which come after 1.0.** Almost every block rune accepts the ~38
   attributes in `packages/runes/src/lib/universal-attribute-defs.ts` (`tint`, `bg`, `width`, `spacing`, `inset`,
   `elevation`, `frame-*`, `substrate-*`, `scrim-*`...). A 1.0 shape file can say "accepts these" only by declaring
   all 38 in every shape (no `extends` in 1.0 core either), or authors get `attribute-unknown` on every existing page.
   This is the largest single gap between refrakt's content and a 1.0 shape file, and it is not in any rune's row.
4. **Shared attribute bases need `extends` (0.x) or copying.** `SplitLayoutModel`, `splitLayoutAttributes`
   and `taxonomyAttributes` are bases of card, feature, step, recipe, playlist, section, character, lore, plot.
5. **Child shapes from sections or items need `compact` (after 1.0).** `emitTag` is used by 15 runes (accordion,
   reveal, cast, timeline, character, realm, faction, plot, itinerary, itinerary-day, symbol-group, feature,
   playlist, changelog by hand, budget by hand). In 1.0 the heading or list-item form can be read as a record, but
   the same child written explicitly (`{% accordion-item %}`) is a different value. Either accept two forms with
   two record types in 1.0, or ship `compact` with the read path rather than the write path: its read half is just
   "a template that yields the child shape".
6. **Auto-detected heading levels.** 9 runes split at "the first heading level present". Marquise forbids that
   in nested sections and calls it "a finding in strict shapes"; it is not clear whether `split: { by: heading }`
   at the top level is allowed under strict. Decide it explicitly: either `by: heading` (first level present) is
   1.0 at the top level, or those 9 runes need `strict: false` or a fixed level (a content change).
7. **Deprecations are migrations (0.x).** grid's `layout` → `spans`/`mode` (value-dependent), pullquote's
   `variant` → `prominence`, showcase's five aliases, tint's `background` token, plan's `Dependencies` heading
   (already `deprecated:` in 1.0).
8. **Content-conditional models linearise.** `when: { hasChild }` (pullquote, steps, itinerary) all rewrite as one
   sequence with optional fields and `shadows`; refrakt's `when` has no Marquise counterpart and needs none.

## Where SPEC-194's grouping and this one disagree

1. **"Declarative" in refrakt's grammar is not declarative in Marquise 1.0.** Refrakt's grammar reads with regex
   `pattern`s, switches models on attributes and on content (`when`), emits child tags (`emitTag`), extracts from
   headings by regex (`headingExtract`) and matches any node type. Each is outside the 1.0 shape file. So of
   SPEC-194's 23 "purely declarative" natives, section, pullquote and storyboard are D here, and tint, deflist,
   code, badge are C; and testimonial, already a composition, is D, because its definition reads `source` with a regex.
2. **SPEC-194's pipeline group (18) is about output; the input of three is ordinary.** drawer fits 1.0 (its
   heading level is output); breadcrumb's hand-written form fits 1.0; nav's hand-written form is a recursive list
   (D3), not a pipeline concern. Conversely, plan's `backlog`, `decision-log`, `plan-activity` and `plan-progress`,
   which SPEC-194 counts among the 58 planned compositions, are deferred shapes here (E): they are collection
   queries with a body template, which is Rivière's and `@marquise-md/compose`'s.
3. **The "drawing, nothing to compute" group (11) hides input work.** codegroup (fence attributes per tab) and
   gallery (images out of paragraphs) need lists from repeating fields (D2); tabs reads images out of headings (D4);
   map parses coordinates, which SPEC-194's own D6 lists as a `prepare` computation while its table puts map under
   drawings.
4. **"SPEC-195 functions only" (8) understates two.** compare and conversation need D2's list-of-nodes reading
   and conversation a blockquote matcher and a paragraph template; grid needs a space-separated list.
5. **`prepare` (6) is not the whole story for three of them.** form's hard part is input grammar (repeated choice),
   not computation; sandbox and preview need raw source, which is *reading*, and SPEC-194 D2 itself says prepare
   never sees raw input except by a named exception. design-context's input fits 1.0.
6. **Counts.** The catalogs hold 128 runes (core 63 with `link`). SPEC-194's "plugins 8 native" names only seven
   plugin runes across its groups (preview, design-context, plan-history, audio, map, map-pin, storyboard).

## What the 1.0 shape file holds that no rune uses (candidates to cut)

| 1.0 item | Users among the 128 | Recommendation |
|---|---|---|
| `pattern` (attributes **and** content fields), and the RE2 engine in the size budget | **0.** Every refrakt regex *reads* a value; none constrains one. Possible users: `aspect`, `lines`, `levels`, `content-place` | **Cut, or move to a satellite**, until a constraint user appears; it is the only 1.0 item carrying a dependency (`@bufbuild/re2`) |
| `plain: { level }` on fields | 0 | cut; `plain: { element }` at shape level has 4 users (the definitions' `tag:`) |
| field `format` (`format: 'h:mm'`, `clock`) | 0 (itinerary's "9:00 AM" is a time of day, which is not a 1.0 type at all) | cut from 1.0 shape files; keep in the value-type design |
| template formats `slug`, `path`, `date`, `lower`, `upper` | 0 in rune input (they serve Rivière's file paths and the write path) | keep in the `template()` API, drop from the shape-file vocabulary |
| attribute `as: inline` / `as: block` (rich text written as a string) | 0 | cut for now; additive later |
| `fields` (structured attributes) | 1, a directive (`include`'s `variables`) | keep only if data shapes need it in 1.0; no rune does |
| `min` / `max` | 0 declared (diff's two fences, actions could use it) | weak; keep only if `content-count` is wanted in 1.0 |
| `checks` (registered checks) | 0 runes (plan's checks run from the CLI today) | wait for plan's rebuild |
| `key` on items, `summary` | 0 runes today; Rivière and plan's rebuild use them | keep (records need them), but they are not proven by refrakt's runes |
| inline match name `code` | 0 | cut, or keep as free |
| `strict` | 0 runes need `false`, unless auto-detected heading levels are a strict finding (above) | keep |
| `requires` | 1 (sandbox) | keep |

The shape-file keys every rune needs are few: `description`, `attributes`, `content`, extension namespaces.
`summary`, `plain`, `strict`, `requires`, `preprocess` and `checks` have between 0 and 4 users each.

## Verdict

The **architecture** of the 1.0 content model (one cursor, `sequence`, `split` with zones and named sections,
item models, templates, `group`, `position: last`, `shadows`) is sufficient: it reads the structure of about
nine in ten shapes, and nothing found needs backtracking or attribute-dependent models. The **vocabulary** is not
yet sufficient. Three additive gaps account for most of the misfit and should close before the freeze:

1. the missing match names (`fence`, `blockquote`, `table`, `hr`, bare `tag`, inline `s` and `tag:<name>`), with
   fence members;
2. `items:` on any repeating field (a list of records from a run of nodes);
3. template literal alternatives and list-typed placeholders, with paragraph/item templates taken out of
   "if proven".

Two smaller ones (heading parts and level; `split: { by: image }`) and one real design question (recursive item
models) follow. After them, only about seven runes need code, and each of those is code by nature: raw source,
inference, or a model that Marquise rightly refuses.
