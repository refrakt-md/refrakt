# Third review of the Marquise and Rivière concept docs (2026-11-21)

Checkouts reviewed: Marquise `b2a3010`, Rivière `dd74dd4` (both dated 2026-11-21), refrakt as checked out.

**Citations.** `M:x.md:n` and `R:x.md:n` are concept pages under `docs/concepts/`; `M:README.md` and `R:README.md` are the repository READMEs; `SPEC-199:n`, `SPEC-201:n`, `SPEC-195:n` are refrakt's specs; `NOTES:n` is `notes/marquise-foundation.md`.

**Method.** Pass 1 read both READMEs and every page in both `docs/concepts/` directories, cold. Pass 2 read SPEC-201 and SPEC-199 in full, the reopened notes on SPEC-195 D1 and D8, NOTES section 22 from "Domains beyond plan" (3630 to 3778) and the themes in section 23 (3997 to 4075). Pass 3 skimmed the 2026-11-19 review. Nothing was edited.

**Status of claims.** Every claim about the docs is **checked** against the cited lines unless marked otherwise. Claims about external tools (CEL, Markdoc, Astro, git hosting, RE2) are **recalled**: no `node_modules` are installed and nothing was fetched. Internal links and anchors in both doc sets were checked by script: none are broken.

**Caveat on "cold".** Refrakt's `CLAUDE.md` was in my context from the start, so I knew how plan's `Blocked by` / `Blocks` sections, statuses and file names work before reading `plan-as-shapes.md`.

---

## The five most important things

1. **The text-template rule breaks the paths that use it, including the acceptance test's.** A placeholder "ends at the first occurrence of the literal after it" (`M:content-models.md:234-235`). Paths are read "by the same engine" (`R:corpus.md:73-75`). So `plan/work/{id}-{slug}.md` (`R:plan-as-shapes.md:156`) reads `WORK-725-…` as id `WORK`, and `events/{start:date}-{title:slug}.md` (`R:events-as-shapes.md:180`) reads the date as `2026`. `{slug}` is not a defined placeholder either: the defined form is `{title:slug}` (`R:corpus.md:82-84`), which is lossy, so it cannot be "two-way", and the docs' own example (`WORK-123-typed-refs.md`, title "Typed references", `R:corpus.md:154`, `M:shapes.md:93`) would be a `path-mismatch`.

2. **None of the four worked pages can be loaded as written.** Each has shape errors by the concept pages' own rules: `title` declared as both attribute and field (`name-collision`, three shapes); optional fields shadowing a later `any` with no `shadows:` (an error, strict by default); required sections the example document lacks; `as:` on attributes, `exclude:`, a camelCase attribute, `--by a,b`, and a `fingerprint` value type that is placed after the first release. Section 2 lists all of them.

3. **A list of references has two incompatible readings, and plan's queries depend on the wrong one.** `blocked-by` is declared as items each holding a `target` reference (`R:plan-as-shapes.md:85`). Today's rule says a reference step through a nested field lands on the item (`R:queries.md:73-76`). Yet every plan selector writes `blockedBy.status` (`R:queries.md:36`, `R:plan-as-shapes.md:166`), which by that rule reads a `status` field on the item. Separately, plan's `## Blocks` direction (refrakt normalises both sections into one graph) is not in the `next` view, the cycle check or the to-do list.

4. **The selector language has outgrown its own description and is ambiguous in at least six places.** The quoting rule contradicts the docs' own examples (`pr:github:refrakt-md/refrakt#123`); `+` is both "one or more steps" and date arithmetic; commas mean OR in filters and separate entries in `fields`; `links.` is a prefix in one example and absent in all others; `has` and `all` are not reserved names; the clause grammar exists only as examples. The stated reason for keeping OR out ("it needs a real parser", `R:queries.md:212`) no longer holds, and "the catalogue comes before any grammar change" (`R:queries.md:249`) was not followed today.

5. **Scope pages lag today's decisions in both projects, and Marquise 1.0 now leans on Rivière.** `R:scope.md` omits path templates, mentions in selectors, links as mentions, `$this`/`$root` and brackets, and places resolvers "later" while `R:references.md:100` puts `local-file` in the first release. SPEC-199's 1.0 table (which its own acceptance criterion says 1.0 contains "exactly") lacks text templates, rules, sections by heading and `marquise explain`, and still describes `computes` in SPEC-195's syntax. Marquise's 1.0 rules are "written with the same selectors queries use" (`M:validation.md:61`), but no Marquise page defines a selector.

---

## 1. Contradictions between pages

### High

| # | Where | Problem (checked) | Fix |
|---|---|---|---|
| C1 | `R:queries.md:73-76` vs `R:queries.md:36-37`, `:64`, `:258`; `R:plan-as-shapes.md:85`, `:166`, `:198`; `M:records.md:45` | A list field declared `items: { target: { as: ref } }` is treated as a plain list of references everywhere (`blockedBy.status`, `c.walk(entity, 'blockedBy')`, `--edge blockedBy`, `acyclic` on the field), but the rule decided today lands a nested reference step on the item, whose other fields are then in scope. Under that rule the path is `blockedBy.target.status`. | Say in `M:records.md` that an item model whose only field is a reference collapses to the reference (record `Ref[]`), or rewrite every `blockedBy.x` as `blockedBy.target.x`. |
| C2 | `M:writing.md:27-28`, `M:shapes.md:49-50` vs `R:docs-site-as-shapes.md:82`, `:91`; `R:events-as-shapes.md:85`, `:97`, `:124`, `:131` | "Attributes, fields and dimensions already share one namespace"; two colliding names are `name-collision`. The `page`, `event` and `series` shapes each declare `title` as an attribute and as a content field. | Drop the attribute and read the title from the heading, or bring `fills` (`M:shapes.md:116-117`) forward and use it. |
| C3 | `R:queries.md:141-146` vs `R:references.md:95`; `R:docs-site-as-shapes.md:200` | A value containing `:` must be quoted. `pr:github:refrakt-md/refrakt#123` is unquoted; the docs-site page quotes the same form (`documents:"repo-file:src/load.ts"`). Quoted values are "literal", so it is also unclear whether a quoted value is still parsed as a qualified reference, a datetime (`2026-12-12T20:00` contains `:`) or a duration (`3:45`). | State that quoting only protects characters and the value is then typed by the field; fix the unquoted example. |
| C4 | `R:scope.md:14`, `:16` vs `R:references.md:100-104`, `R:docs-site-as-shapes.md:163`, `:210-212`; NOTES:3738 vs NOTES:4072 | Resolvers for external kinds are "Later" on the scope page and "first release without resolvers" in the decision log; `local-file` is "in the first release" on the feature page and used by the docs-site fixture. | Add "the built-in `local-file` resolver" to the first-release column; keep "registered resolvers" later. |
| C5 | `R:overview.md:49` vs `R:queries.md:191-208`, `R:docs-site-as-shapes.md:196-198` | "No URLs, routes, page tree, navigation, breadcrumbs or layouts: those are the site's." Today's tree gives `$position`, `$prev` and `$next` "for page navigation" and a "top-level menu" query. | Either reword the overview ("no routes or URLs; a collection may declare an ordering tree") or move `$prev`/`$next`/`$position` to the Astro integration. |

### Medium

| # | Where | Problem (checked) | Fix |
|---|---|---|---|
| C6 | `R:queries.md:111` vs `R:references.md:174-177`, `:210-211`; `R:corpus.md:333`; `R:traceability-as-shapes.md:251` | One selector writes `links.runs[…]`; every other page reads inverses, overlays and computed values as bare names (`runs[…]`, `ciStatus:failing`, `latestRun.result:pass`). The example is also wrong for its caption: `runs` is declared on `test`, not on a requirement. | Remove the `links.` prefix; rewrite as `verifiedBy.$entity.runs[at:>$root.$modified]`. |
| C7 | `R:queries.md:162` vs `R:corpus.md:12`, NOTES:3690 | `rv.snapshot({ now })` against `rv.load({ now })`. | Use `rv.load`. |
| C8 | `R:corpus.md:284`, `R:scope.md:20` vs `R:corpus.md:316-343`, `R:scope.md:14`, `R:glossary.md:65` | "Overlay" is two things: `rv.overlay(path, src)` for unsaved editor buffers (first release), and read-only data from another system (later). Both appear in one scope table. | Rename the editor one (`rv.buffer`, "unsaved buffers"). |
| C9 | `M:writing.md:126-134` vs `M:content-models.md:241-245`, `:186` | Two write-template syntaxes for one job. An item model "declares a write template in the shape's body" as a `{% form %}` block with `{% $name %}` and `{% if %}`; today's `text:` template "is the write template for its node", with `{name}` and `[? … ]`. | Say which one writes item models. The simplest: `text:` for item models and nodes, `{% form %}` only for compact forms of child shapes. |
| C10 | SPEC-201:79-82, `:291-293` vs SPEC-201:266, `M:content-models.md:244` | D1.10 and open question 2 say reading "derived from a template is order-free too"; D8.8 and the page say a template reads "in its order". | Scope D1.10's sentence to compact-form write templates, or drop it. |
| C11 | `R:writing.md:116-117` vs `R:writing.md:139` | "An agent's bulk write waits for a person by default" against "No matching rule allows the write". With no policy, nothing waits. | Say "under a policy that confirms agents' writes". |
| C12 | `R:references.md:185` vs `R:references.md:14-16`, `M:extending.md:34-36`, `:50` | `symmetric: true` sits beside `type: ref` as a core key; `acyclic` "is Rivière's, so it sits in Rivière's namespace, as every extension's keys do", and an unknown core key is an error. The same applies to `as: fingerprint, of: req` (`R:references.md:266`). | `riviere: { symmetric: true }`; register `fingerprint` as a value type from Rivière and say so. |
| C13 | `R:references.md:14`, `:86-91`; `M:records.md:39-41` | "`to` names shapes, since Marquise knows no collections", but `to: [github]` names an external kind, the qualifier `spec:SPEC-12` names a collection, `backrefs(collection.field)` names a collection, and inverses (`{ of: work.source }`) do not say which. The fixtures hide it because collection and shape names coincide, except `menu` / `menu-item` (`R:events-as-shapes.md:183`). | State for each of `to`, `of`, `backrefs()`, `mentionedBy()` and the qualifier whether it takes a shape or a collection, and what Marquise does with a `to` entry that is no shape. |
| C14 | `R:corpus.md:154-155`, `:272-273` vs `R:corpus.md:295-296` | An entity has a `document: MarquiseDocument` member; a snapshot "holds records and the index, not trees"; the serialised snapshot "stores each document's source and the index, not records". Three statements about what a snapshot holds. | One paragraph: in memory, records and index, documents loaded lazily; serialised, sources and index. Make `document` a method. |
| C15 | SPEC-199:116-129, `:717` vs `M:scope.md:17`, `:19`, `:24` | The spec's 1.0 table lacks sections by heading, task lists, text templates, lists of references, shape rules and `marquise explain`; the acceptance criterion says 1.0 contains "exactly" that table. | Update the table from `M:scope.md`. |
| C16 | SPEC-199:141, `:155`, `:218-219` vs `M:syntax.md:71-101`, SPEC-195:72-80, `:237` | SPEC-199 still places `computes` on SPEC-195's Markdoc call syntax (`$attrs`, `$computed`) and puts the filter grammar in Marquise core "with the value vocabulary"; today CEL replaced the former and selectors became "its own small package" (`R:queries.md:56-58`). | Note the reopening in SPEC-199 and name the selector package and its owner. |
| C17 | SPEC-199:522-523 vs SPEC-199:121, `M:scope.md:16` | Step 7 lists "document and deferred shapes" as after 1.0; the table has minimal document shapes in 1.0. | Remove "document" from step 7. |
| C18 | `R:prior-art.md:76-77` vs `R:queries.md:264-288`, `:119` | "GROQ's projections are open for views" against projections "Decided, in the first release"; "no expression language, no formulas" against `±duration` arithmetic and path values. | Update both sentences. |
| C19 | `R:writing.md:10` vs `R:docs-site-as-shapes.md:110-111`, `:206` | `c.create('term', { term, body })` against a `term` shape whose fields are `term`, `definition` and `more`. | Use `definition`. |
| C20 | `R:references.md:55-56`, `R:queries.md:69-70` vs `R:references.md:96` | "Mentions never count" in `backrefs()`; `riviere refs X --back` "lists everything that mentions it"; the API's `c.backrefs(entity)` does not say whether mentions are included. | State that `c.backrefs` and `refs --back` return edges and mentions, each marked. |

### Low

| # | Where | Problem (checked) | Fix |
|---|---|---|---|
| C21 | `R:corpus.md:59-60` | "How a derived id behaves when its field changes is decided with aliases" predates the decision in the same file (`:229-241`). | Point at "Former ids and names". |
| C22 | `R:corpus.md:219`, `R:README.md:23-24`, `R:writing.md:91` | `{id}-{slug}.md` survives from before path formats. | `{id}-{title:slug}.md`, once H-D1 below is settled. |
| C23 | `R:references.md:20` vs `M:content-models.md:172`, `:297`, `:320` | "Open: how counts are declared (`min`, `max`)"; `max: 2` is used in an example, counts are "also planned" (leaning), and deferred children check `min`. | One marker, in one place. |
| C24 | `R:prior-art.md:27` vs `R:integrations.md:101` | Inventories are "leaning" in one, "decided" in the other. | Align. |
| C25 | `M:validation.md:66-75` vs `R:plan-as-shapes.md:191-192` | The same two rules have different ids on the two pages (`shipped-needs-release` / `shipped-without-release`). Rule names are finding ids, so this is two ids for one finding. | Use plan's names in the Marquise example. |
| C26 | `M:content-models.md:7`, `:88` vs `:22`, `M:scope.md:8`, `:17` | The page's syntax is "a leaning revision" and `as` is "Leaning"; matching is "decided" and the scope page freezes both in 1.0. SPEC-201 itself is `status="draft"`. Carried over from the last review (I7c). | Mark the page decided where SPEC-201 decides. |
| C27 | `R:cli-and-mcp.md:41` vs `M:commands.md:23` | Exit code 2 is "not found" in `riviere` and "a usage or configuration error" in `marquise`. | One table for both CLIs. |
| C28 | `R:context-bundles.md:36-37` vs `R:plan-as-shapes.md:60`, `:81-86` | `blocked-by` is an attribute in one and a section in the other; `source` lacks `list: true`. | Copy plan's shape. |
| C29 | SPEC-199:399, `:411`, `:464`, `:686-697` | Stale inside the spec: the root is "the shape's `tag:`"; `marquise validate` warns `shape-unbound`; slots are `#name`; the worked example imports `transform` and `Content`. | Refresh or mark as superseded by the concept docs. |
| C30 | NOTES:3676, `:3718`, `:3734`, `:3757` | The decision log still says projections on views are open, tree ordering is open, external kinds declare `pattern`, and "the confirmation policy applies". | One line each pointing at the later decision. |

### One key, several meanings

Each is checked. None is wrong on its own; together they make shape files hard to read cold.

- **`text`**: a template key on headings, paragraphs and items (`M:content-models.md:218`, `:227`); a field name in the same position (`:196`, `R:plan-as-shapes.md:79`); a matcher (`match: text`); a member of rich text (`M:records.md:20`); an `as` value. An item model cannot have a field called `text` and a template. *Fix:* rename the template key (`template:` or `reads:`).
- **`key`**: the item-model key declaration (`key: text`, `M:content-models.md:194`) and a placeholder name in `"{key}: {title}"` (`:156`). Nothing says which placeholder is the section's key in `decisions["D3"]`. *Fix:* declare it (`key: key`) or reserve the placeholder name.
- **`repeat`**: `repeat: true` on a field, and `repeat:` holding a group model under a split (`M:content-models.md:155`). **`heading`**: a section's name or aliases (`:134-136`), and `{ text: … }` inside `repeat` (`:156`).
- **`as`**: what a field delivers; a column label in `fields` (`R:queries.md:278`); the name of a derived parent (`R:corpus.md:91`); and on attributes in two fixtures, where it is undefined (F-D3 below).
- **`at`**: an edit's address (`M:api.md:24`); a git ref (`R:corpus.md:13`); where a list sits in a data file (`:122`); where a link is written (`R:references.md:150`, `:156`); a field of `run` (`R:traceability-as-shapes.md:176`). `R:corpus.md:12` also names a variable `at`.
- **`content`**: the content model in a shape; `content: { read }` on a collection (`R:corpus.md:142`); a zone name in the README hero.
- **`summary`**: the projection key, a content field in `work` (`R:plan-as-shapes.md:54`, `:71`), an attribute in `symbol` (`R:docs-site-as-shapes.md:118`, `:122`).
- **`matches`**: allowed values on an attribute; `matches(x, "status:done")` in CEL (`M:syntax.md:98`); and CEL's own regular-expression function of the same name (recalled). See D5.
- **`fields`**: SPEC-201's word for content-model members; overlay field declarations (`R:corpus.md:326`); the projection attribute; policy rule matchers (`R:writing.md:129`).
- **A stored selector** is `filter` (views, the `collection` shape), `where` (writes, the policy), `when`, `require` and `from` (rules), and positional (the CLI). `require` is also a saved write's precondition.

### `$` built-ins

No page lists them all. Collected (checked): `$collection`, `$file`, `$container` (`R:corpus.md:170`); `$created`, `$modified`, `$authors` (`:172`); `$entity` (`R:queries.md:76`); `$this`, `$root` (`:103`); `$now`, `$today` (`:150`); `$actor`, `$input` (`:312-323`); `$tree`, `$depth`, `$position`, `$prev`, `$next` (`:197-203`); `$item` (`R:shapes.md:44`); `$new` (`R:references.md:291`); `$text` (`M:shapes.md:117`); `$locale` (`M:records.md:86`).

- `R:glossary.md:23-24` lists three. *Fix:* one table: name, type, where it may appear (left side, right side, write values, templates), which release.
- In CEL the same things lose the `$`: `now`, `today`, `links`, and `v.entity` for `$entity` (`R:references.md:192`, `:203`; `M:syntax.md:87`). A field named `entity`, `links`, `now` or `today` then collides in CEL but not in selectors. *Fix:* reserve those names, or keep one spelling.
- `$depth`, `$prev` and `$next` are "kept in `links`" (`R:queries.md:201`) but spelt as built-ins; `parent` from a folder is in `links` and spelt as a field (`R:corpus.md:91-92`). *Fix:* say what decides `$`.
- `links` and `record` are separate in the API (`spec.links.work`), merged in selectors (bare names), prefixed in CEL (`links.runs`) and merged again in Astro's `data` (`R:references.md:179`). Four conventions for one split.

---

## 2. The worked pages as fixtures

"Defined" below means defined on a concept page. All items are checked.

### Plan (`R:plan-as-shapes.md`)

| # | Sev | Line | Problem | Fix |
|---|---|---|---|---|
| F-P1 | high | 81-90 vs 21-47 | `criteria`, `blocked-by` and `blocks` have no `optional: true` (the three sections after them do). The example work item has no `## Blocks`, so it is `content-missing`; so is any item with no blockers. Rule `active-without-criteria` (`:190`) presupposes criteria can be absent. | Add `optional: true` to all three. |
| F-P2 | high | 156-160 | `{slug}` is not a defined placeholder, and `{id}-…` cannot be read back (see D1). | `{id}-{title:slug}.md` plus the fixes in D1. |
| F-P3 | high | 166, 198 | `blockedBy.status` against the landing rule (C1). | As C1. |
| F-P4 | high | 87-90, 166, 227-233 | `## Blocks` is read as a second list and then never used: `next` and `stale-blocked` look only at `blockedBy`, and `acyclic` is only on `blocked-by`. Refrakt normalises both into one directed graph. A cycle through one `Blocked by` and one `Blocks` is not detected, and an item named under another's `## Blocks` is offered by `next`. Not on the to-do list. | Add it to the to-do list; design "this field is the inverse of that one" (`blocks: { inverseOf: blocked-by }`) so both feed one edge set. |
| F-P5 | med | 118-119 | `goals` (optional list) precedes `body` (`any`): `field-shadowed`, an error in a strict shape, with no `shadows: [body]`. | Add `shadows: [body]`. |
| F-P6 | med | 107-148 | The page shows `work`, `milestone` and a fragment of `spec`. `bug` and `decision` have no shape, and `spec` has no attributes (`status`, `released-in`), though rules at `:191-202` use them. | Write all five shapes out, since this is the acceptance test. |
| F-P7 | med | 128-137 | `repeat:` with `heading: { text: "{key}: {title}" }`: which placeholder is the key for `decisions["D3"]` is not defined (see "One key, several meanings"). | Declare the key. |
| F-P8 | med | 147, 199-201 | `work: { of: work.source }` misses bugs, which also carry `source` in refrakt. An inverse over two collections is not defined. | Allow `of: [work.source, bug.source]`, or add a second inverse and extend the rules. |
| F-P9 | low | 77-79 | `match: task`, `match: text` (and `match: link` elsewhere) are not in the list of what `match` accepts (`M:content-models.md:37-39`). `key: text` keys on a rich-text value (`as: inline`); what is compared is not said. | List the inline matchers; say a key compares the field's `text`. |
| F-P10 | low | 216 | `riviere set WORK-1 pr=org/repo#1` replaces the list; refrakt's `--pr` adds. No CLI form for `add` to a list attribute is shown. | Show `riviere add WORK-1 pr org/repo#1` or equivalent. |
| F-P11 | low | 187-192 | `has:resolution`, `has:criteria`: whether `has:` is true for an empty list or an empty block is not defined (`R:queries.md:33`). | Define `has:` as "present and non-empty". |
| F-P12 | low | 191 | `has:released-in` uses the kebab-case source name; `R:references.md:14-15` says selectors use camelCase. `changed: [released-in]` likewise (`R:references.md:313`). | State that selectors accept both, as addresses do (`M:writing.md:25`), or use camelCase. |

### Traceability (`R:traceability-as-shapes.md`)

| # | Sev | Line | Problem | Fix |
|---|---|---|---|---|
| F-T1 | high | 158, 48-49 vs 246 | The `test` shape uses `as: fingerprint`, which the page itself places "Later". The shape cannot load in the first release, and the example document carries fingerprints. | Give a first-release variant without `reviewed`, or mark the page as two fixtures. |
| F-T2 | med | 155 | `"{req} ({coverage}[?, reviewed {reviewed}])"`: `coverage` is followed by an optional group and then `)`. "A placeholder ends at the first occurrence of the literal after it" does not say which literal when a group follows; "a group is taken when its first literal is found where it would start" is circular here. | State: the earlier of the group's first literal and the literal after the group. |
| F-T3 | med | 186 vs 138-165 | The `test` collection names `formerIds: 'formerly'`; the `test` shape declares no `formerly` (`R:corpus.md:232-233` requires it). | Add the attribute. |
| F-T4 | med | 236 | `riviere count requirement --by level,status`: `--by` with two fields is not defined (`R:shapes.md:9`, `R:cli-and-mcp.md:25`); grouping is "one level" (`R:queries.md:283`). | Define it or use two commands. |
| F-T5 | med | 119-124, 222-223 | `approved-is-frozen` under `--against` sees only endpoints. Approved, back to review, edited, re-approved in one branch is approved to approved with a changed statement: an error for an author who followed the process. `R:references.md:323-325` solves this for transition maps only. | Say rules with `from`/`changed` are strict only on Rivière's writes, or evaluated per commit. |
| F-T6 | low | 192, 188 (`R:events-as-shapes.md`) | `in-review:` and `this-week:` are unquoted keys with hyphens in a TypeScript object literal: a syntax error. | Quote them. |
| F-T7 | low | 203-211 | "Agents may draft and submit", but the last policy rule confirms everything else, so they wait for a person too. | Add an `allow` for `create` and `write:submit`, or reword. |
| F-T8 | low | 110, `R:references.md:167-183` | Inverses over nested paths are used ("lands on the link items") but only `backrefs()` defines landing on items; what `links.verifiedBy` holds in the API and in Astro's `data` is not said. | One sentence in "Inverses". |
| F-T9 | low | 103 | `-statement.text:/\bshall\b/`: whether a regular expression is anchored or searches is not defined (`R:queries.md:144-145`). | Say "searches". |

### Docs site (`R:docs-site-as-shapes.md`)

| # | Sev | Line | Problem | Fix |
|---|---|---|---|---|
| F-D1 | high | 82, 91 | `title` attribute and `title` field (C2). | As C2. |
| F-D2 | high | 110, 157-158, 206 | `term: { match: paragraph, text: "**{term}.** {definition}" }`. A field `term` contains a placeholder `term`. No page says whether placeholders of a paragraph template become top-level fields (then the names collide) or members of the field (then `id: { from: 'term' }`, `order: 'term'`, `summary: [term]` and `--set definition=` all point at the wrong thing). Where a paragraph template's placeholders are declared and typed is not shown either. Same in `M:content-models.md:223` and SPEC-201:253. | Define it: for example, a field with `text:` is a group whose members are the placeholders, addressed `term.term`; or lift them and forbid the clash. |
| F-D3 | high | 122; `R:events-as-shapes.md:157` | `{ type: string, as: inline }` on an attribute. `as` is defined for content fields only. Data-only shapes have no `content`, so how they declare rich text is undefined, though `R:corpus.md:104-105` relies on "the field's `as`". | Define rich-text attributes, or give data shapes a content model with unmatched fields. |
| F-D4 | med | 125, 129 | `replacedBy` is a camelCase name in a shape, which "is reported" (`M:shapes.md:50`). | `replaced-by` in the shape; the JSON keeps `replacedBy`. Say that data files use data names. |
| F-D5 | med | 153 | `exclude:` is used and defined nowhere. | Define it in `R:corpus.md`, or use a narrower `include`. |
| F-D6 | med | 204 vs 77-102 | The `docs-behind-code` rule is cited but not declared in the `page` shape; it exists only in `R:references.md:106-112`. | Add it under `riviere: rules`. |
| F-D7 | med | 154 | `docs/index.md` matches neither alternative as intended: the second gives id `index`, which is nobody's parent. | Add `'docs/index.md'` as an alternative, or say the root is `index`. |
| F-D8 | med | 202 | `mentionedBy(page)[parent+:guides]` is a bare bracketed path used as a clause. Used in several places, defined nowhere (see section 4). | Define clause forms. |
| F-D9 | low | 183 | "the record's headings": records have no headings; the loader has `rendered.metadata.headings` (`R:integrations.md:47`). | Reword. |
| F-D10 | low | 208-214 | The "first release" list omits what the page uses from today's decisions: path templates, the tree, mentions in selectors, the `local-file` resolver, `$prev`/`$next`. | Add them. |
| F-D11 | low | 38-44, 153 | The glossary page is excluded from `page`, so it has no entity: it is absent from the tree and menus, and a link to it is not a mention. | Say so, or let a page hold terms (`$container`). |

### Events (`R:events-as-shapes.md`)

| # | Sev | Line | Problem | Fix |
|---|---|---|---|---|
| F-E1 | high | 85/97, 124/131 | `title` twice in `event` and `series` (C2). | As C2. |
| F-E2 | high | 98-99 | `poster` (optional image) precedes `body` (`any`): `field-shadowed`, an error, unacknowledged. | `shadows: [body]`. |
| F-E3 | high | 180 | The path cannot be read back (D1): the date splits at its first `-`; `{title:slug}` is lossy; and the path's `start` is a date where the document's is a datetime, so "a disagreement is `path-mismatch`" needs a comparison rule nobody states. | See D1. |
| F-E4 | med | 180, 14-18 | Ids derived from titles collide for a venue ("Winter jazz night" next year), and a corrected title changes the id, the file name and the URL. | Derive the id from the path (`{start:date}-{title:slug}` as the id), or write ids. |
| F-E5 | med | 192-193 | `actors: 'editors'` is a host group. `R:writing.md:136` allows `agents`, `people` or a name; groups come only from a hosted sign-in (`R:corpus.md:374`), which is later. In the first release nothing can match this policy. | Define groups in the policy section; mark the policy as later. |
| F-E6 | low | 18 | `series: jazz-nights` has no target in the fixture (the only series is `quiz-night`): a dangling reference. | Add the series or drop the key. |
| F-E7 | low | 7-8 | The page says it exercises grouping; it never uses `group` (the menu example is in `R:queries.md:273`). | Add the `{% collection "menu" group="section" %}` example here. |
| F-E8 | low | 239 vs 153 | "New menu sections opening pull requests": `section` has fixed `matches` in the shape, so a new section is a shape change, not a content write. | Reword. |
| F-E9 | low | 15 | `start: 2026-12-12T20:00` has no seconds and no zone. `M:records.md:83-93` covers the missing zone; reduced-precision ISO forms are not listed among parsed forms. | List them. |

### Also in the concept pages' own examples

- `R:corpus.md:108-118`: `team/ada.yaml` writes `id: ada` in a collection with `id: { from: 'name' }`; the derived id is `ada-lovelace`, and "a written id that disagrees with the derived one is a finding" (`:58`). The example produces its own finding. *Fix:* drop `id: ada`. (low)
- `M:content-models.md:281-291`, SPEC-201:214-218: the deferred-children example has a per-item template body. `R:shapes.md:42-44` says per-item templates come with `compose`, "no temporary template mechanism". Without one, a `faq` collection yields `faq`, not `accordion-item`, so the example needs `compose`. *Fix:* say so beside the example. (medium)
- `R:references.md:81`: `url: 'https://doi.org/{value}'` uses `{value}`, which is not a placeholder of the kind's `text`. *Fix:* define `{value}` as the whole normalised value. (low)

### Finding ids

The 1.0 exit test wants "every finding id documented with an example" (`M:scope.md:79`). Checked:

- **Rivière has no catalogue page.** Ids appear only in passing: `entity-id-missing`, `collection-overlap`, `path-unmatched`, `path-mismatch`, `field-derived`, `history-unavailable`, `ref-former-id`, `id-reused`, `id-changed`, `external-malformed`, `external-missing`, `selector-value-list`, `computes-cycle`, `link-suspect`, `tree-cycle`, `region-stale`, `region-clock`, `region-in-shape`, `collection-not-readable`, `expand-cycle`, `write-denied`.
- **Findings described with no id** (Rivière): dangling reference, wrong target, ambiguous id, cycle, cardinality (`R:references.md:26-33`); duplicate id; written id against derived id, and frontmatter id against file name (`R:corpus.md:58-59`, `:219-220`); unsorted file on `into` (`:65-66`); the traversal ceiling (`R:queries.md:138`); a kind named like a collection (`R:references.md:90-91`); a saved write against a transition map (`:327-328`); a transition refused; `relationships` without `of=` (`R:shapes.md:92`).
- **No id** (Marquise): a `shadows:` naming no overlap (`M:content-models.md:82-83`); a section named twice and a deprecated alias (`:142-143`); automatic level detection in a strict shape (`:163`); `#` shorthand on a dotted id (`M:records.md:52-53`); a camelCase name (`M:shapes.md:50`); an unknown key and a namespace not installed (`M:extending.md:50-52`); a disallowed frontmatter shape (`M:trust.md:27`).
- **Rule names are finding ids** (`M:validation.md:80`). Nothing says what happens when two shapes declare one name (plan's `done-without-resolution` on `work` and `bug`), or a rule is named like a built-in. Renaming a rule becomes a breaking change under "ids are never reused". *Fix:* scope rule ids by shape (`work/done-without-resolution`) and reserve built-in ids.

---

## 3. Scope and timing

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| S1 | high | `R:scope.md:10-22` | Decided "in the first release" on their own pages and absent from the scope table: paths as two-way templates and parents from folders (`R:corpus.md:73`); links as mentions and `mentionedBy()`/`mentions()` (`R:references.md:49`, `:55`); `$this`/`$root` (`R:queries.md:103`); brackets (`:84`); the `local-file` resolver (C4). Decided with no release anywhere: negation's semantics, links with data, collections inside other shapes (`R:shapes.md:47`), binary files in changesets (`R:writing.md:64`), `riviere fix`. | Add a row or a cell for each. |
| S2 | high | `M:validation.md:58-63`, `M:scope.md:19` vs `R:queries.md:56-58` | Rules are a Marquise 1.0 item (if proven) written in selectors. Selectors are specified only in Rivière's docs, as "its own small package" whose owner, repository and release are not named. Marquise 1.0 would then freeze a format whose grammar another project is still changing. | Name the package and its home; give Marquise a "Selectors" page stating the subset rules may use (no paths through references, no `$now`), and what "if they have proven themselves" is measured by. |
| S3 | med | `M:content-models.md:215-221`, `M:validation.md:82` | Marquise 1.0 examples lean on Rivière features placed later: `as: fingerprint, of: req` (suspect links, after Rivière's first release), and a rule's `fix` "in the form of a saved write's `set`". | Use a neutral example; define the `fix` form in Marquise. |
| S4 | med | `R:corpus.md:73-75`, `R:references.md:92` vs `M:commands.md:35-43` | Rivière reads paths and external ids "by the same engine as Marquise's text templates". Marquise's API table exports no such function; Rivière builds "only on Marquise's public API" (`R:overview.md:12-15`). | Add the text-template engine to Marquise's public API (or to the shared package of S2). |
| S5 | med | `M:scope.md:17` vs `M:principles.md:10-12` | Text templates were designed today and placed in 1.0; the principle is that 1.0 ships "what is built and settled" and a feature graduates when "implemented in refrakt, used on real content". Their headline benefit ("so it can be written back") arrives after 1.0. | Keep the heading form in 1.0; let paragraph and item templates be "1.0 if proven", like rules. |
| S6 | med | `R:scope.md:19`, SPEC-201:239-240 vs `M:scope.md:36`, `:39` | Rivière's first release needs Marquise's write path and deferred shapes; both are "after 1.0", and 1.0's own test uses "a write-path prototype (not shipped)". The docs do not say whether Marquise 0.x ships them unfrozen (against "no experimental flags", `M:principles.md:13`) or Rivière's first release waits for Marquise's post-1.0 minors. | One sentence in each scope page: "present in 0.x and 1.x, outside the semver promise until graduated", or the other choice. |
| S7 | low | `R:events-as-shapes.md:243`, `R:corpus.md:252` | "After 1.0" without saying whose. Carried over from the last review. | Name the project. |
| S8 | low | `R:traceability-as-shapes.md:242-244` | "Inverses over nested paths" is claimed for the first release; the scope page says only "inverses". | Add it or drop the claim. |

---

## 4. The selector language as a whole

The grammar is given only by examples (`R:queries.md:27-46`) and prose. It is still small, but it is no longer a `field:value` list: it has quoting, globs, regular expressions, comparison, two prefixes (`has:`, `all:`), clause negation, brackets with nested selectors, three function-like steps (`backrefs()`, `mentionedBy()`, `mentions()`), a postfix closure (`+`), right-hand paths (`$this`, `$root`), date arithmetic and about twenty built-ins. `R:queries.md:212` keeps OR across fields out because "it needs a real parser"; nested brackets and quoted strings already need one.

**Tricky selectors.** Each line says what the docs give, or that they do not say.

| Selector | Per the docs |
|---|---|
| `-tags:auth,api` | Not (some tag is `auth` or `api`). Clear (`:29`, `:86`). |
| `all:tags:auth,api` | Every tag is one of the two; true for no tags. Implied by `:60-62`, not shown. |
| `points:>-5` | Not said. A value "starting with `-`" is quoted (`:141`), giving `points:>"-5"`; quoted values are "literal", so whether it is still a number is open, and so is where the operator sits. |
| `start:>=2026-12-12T20:00` | Must be quoted (contains `:`). Same open question. |
| `pr:github:refrakt-md/refrakt#123` | Invalid by `:141`, used at `R:references.md:95` (C3). |
| `end:<=$this.start+6h` against `blockedBy:$this.parent+` | `+` is arithmetic in the first and closure in the second. Distinguishable by the next character, and a closure on the right is a list (`selector-value-list`), but no rule is written. |
| `blockedBy.status:ready` | Some blocker is ready, if `blockedBy` is a list of references; a `status` field on the item, by `:73-76` (C1). |
| `backrefs(work.blockedBy).status:ready` | Not said: is the field `work.blockedBy` or `work.blockedBy.target`, and does it land on the entity or the item? |
| `verifiedBy[coverage:full]` | A bracketed path with no value, used as "some item matches" (`:96`, `R:traceability-as-shapes.md:127`). Never defined as a clause form. Is `has:verifiedBy[coverage:full]` the same? Is a bare `blockedBy` a clause? Not said. |
| `all:evidence[stance:supports].claim.status:accepted` | Not said. "Every supporting item's claim is accepted", or "every item supports, and …"? A path continuing after brackets appears only in `fields` (`:271`). |
| `evidence[claim.reviews[by:$this.owner]]` | `$this` is the innermost item (`:103-104`); the middle item cannot be named. Probably fine; not stated. |
| `points:<3,>8` | Not said: can comma-OR carry operators? |
| `fields="id, verifiedBy[coverage:full,partial].$entity.id as Tests"` | The comma is a separator in `fields` and OR inside brackets. Not said how they nest. |
| `evidence[note:a]b]`, `title:/a b, c/` | `[`, `]`, `(`, `)` are not in the quoting list; a regular expression containing a space, comma or `]` is not addressed. |
| `has:x`, `all:x` where the shape has a field named `has` or `all` | Ambiguous. Neither is reserved (`M:shapes.md:52`). |
| `-assignee:$actor` in a saved view | Not said. `$actor` is listed for writes and the policy only. |
| `documents.$modified:>$this.reviewed` | Defined, but a date against a datetime is "the start of the day" (`:118`), so a file committed at 10:00 on the day of the review is "after" it. See D6. |

**Fixes.**
1. Write the grammar down (EBNF, half a page): clause forms, where `-`, `has:` and `all:` may stand, what a bare bracketed path means, operators with commas, the lexical rule for `+`, the full list of characters that force quoting, and that quoting never changes a value's type. (high)
2. Reserve `has` and `all` as field names in Marquise, since rules use them in 1.0. (medium)
3. Add each tricky case above to the catalogue of queries before the grammar is built, which is what `R:queries.md:245-249` promises. (medium)
4. Either admit OR across clauses now, with parentheses, or give a reason that still holds. (low)

---

## 5. Design risks in today's decisions

| # | Sev | Risk | Fix |
|---|---|---|---|
| D1 | high | **Text templates used for paths and ids.** Checked: first-literal splitting (`M:content-models.md:234-235`) fails on any value containing the next literal: `WORK-725` before `-`, an ISO date before `-`, "Node.js" inside `**{term}.**`. `{title:slug}` cannot be inverted, so the path cannot "supply a field" (`R:corpus.md:88`); a comparison must slug the document's value, which is not said. Existing plan files have hand-shortened slugs, so reading them gives a `path-mismatch` per file. A title edit then asks for a move, and with ids from titles or paths a move is a rename. | Let a typed placeholder consume by its type's own pattern (an id by the collection's `id` pattern, a date by its format) before falling back to "first literal"; make `:slug` write-only and compare-loosely (any slug is accepted on read); say the mismatch is info for `:slug`. |
| D2 | high | **Lists of references** (C1, F-P4). The acceptance test's central query and its cycle check rest on an undefined record form and half of plan's dependency model. | As C1 and F-P4, before the prototype. |
| D3 | med | **Both projects grew a great deal in one session, against their own tests for growth.** Checked: Marquise's shape format gained `rules`, `text:` templates, CEL and deferred-child declarations; Rivière's config gained `into`, `tree`, `formerIds`, `names`, `external`, `overlays`, `baselines`, `timezone`, `policy`, `imports`, `transitions`, `inverse`, `fingerprint`, `computes`. "Avoid vocabulary in core" now sits beside git vocabulary (`$authors`), site vocabulary (`$prev`, `$next`, `$position`) and workflow vocabulary (`transitions`, `policy`). SPEC-199:535-537 names "the number of hooks" as the early warning for "becoming a second refrakt". | Count the keys and built-ins per release on each scope page; move `tree` navigation members and `$authors` to satellites unless plan's rebuild needs them. |
| D4 | med | **`rules` "never grows into a language"** (`M:validation.md:87-88`) while the selector language it is written in grew arithmetic, closures and item scoping the same day. Rules also bring RE2 matching into Marquise core (`R:traceability-as-shapes.md:103`). | Freeze a named subset for Marquise rules (S2). |
| D5 | med | **CEL as written will not behave as shown** (recalled, to verify in the spike). `round(done / total * 100)` (`M:syntax.md:80`): integer division in CEL truncates, so this is 0 or 100, and `round` is not in the profile at `:84-85`. `matches(x, "status:done")` (`:98`) has the name and arity of CEL's standard regular-expression function. Value types "with their own operators" and durations "with days" (`:88-89`) replace CEL's standard duration and timestamp, so the profile is not a subset of CEL and conformance suites and model familiarity apply less than claimed. | Fix the example (`done * 100 / total`); rename the bridge (`selects(x, "…")`); list in the spike whether each library allows custom types with operators; call it "a CEL dialect" if not. |
| D6 | med | **Git dates in rules.** Checked: `$modified` is per file and absent in shallow clones (`R:corpus.md:184-186`). Recalled: hosted CI and site builders clone shallowly by default. So `docs-behind-code`, `recent` and "last updated" are silent exactly where they run. The date-against-datetime rule also makes `documents.$modified:>$this.reviewed` fire for a commit on the review day. The cache (`R:corpus.md:269-271`) is keyed by content, which git dates are not part of. | Say `history-unavailable` is a warning that fails `validate` unless acknowledged; compare a datetime with a date by the date's end of day for `>`; key the date table by HEAD. |
| D7 | med | **The write policy cannot tell agents from people where agents work.** Checked: "the CLI is a person" (`R:writing.md:144`). Refrakt's own agents use the CLI and MCP interchangeably. So `actors: 'agents'` rules, including "agents never approve" (`R:traceability-as-shapes.md:204`), bind only MCP clients. The page says "guardrail, not access control", but the traceability page presents it as keeping agents from approving. | Add an environment marker (`RIVIERE_ACTOR`, or detect a non-interactive terminal as "unknown, confirm"); soften the traceability claim. |
| D8 | med | **MCP has no tool for the things the policy talks about.** Checked: the generic tools are `find`, `get`, `create`, `update`, `context` (`R:cli-and-mcp.md:55-61`). No saved write (`claim`), no `where`, no apply or confirm step, though `R:writing.md:117`, `:128` and `R:queries.md:309-310` assume them. The second half is carried over from the last review. | Add `write(name, id | where, input)` and `apply(changeset)` to the list. |
| D9 | med | **Derived parents and `links` blur "own data".** Checked: a page's `parent` comes from its folder and lives in `links`, and inverses of it are declared (`R:corpus.md:90-93`). A record then lacks its own hierarchy, and exports must join `refs` to rebuild it. Inverses of nested fields return items, not entities, so one inverse declaration has two result types. | State in "Entities" that `links` holds anything not written in the entity's own source; type inverses as `Link<T>` with `.entity` in both cases. |
| D10 | low | **Data files written "under the same laws"** (`R:corpus.md:126-128`): comment- and format-preserving YAML and JSON editing is a write path of its own, placed in the first release "once round-trip tests pass". | Make data files read-only in the first release, as CSV is. |
| D11 | low | **Generated regions are "safe anywhere" and also refused inside any shape** (`R:shapes.md:69` vs `:78-79`). Every plan file is a document shape, so the corpus the feature is motivated by ("a corpus with no site") can use regions only in files outside collections. | Say so, or allow a region as a section body. |
| D12 | low | **Rules that use the clock** are Rivière's (`R:events-as-shapes.md:110-115`) but nothing says a Marquise rule may not use `$now`; `R:queries.md:150` says "every selector". | State it in S2's subset. |

---

## 6. Anything else

- **Undefined `pattern`.** `pattern` "means an RE2 expression in shapes" (`M:content-models.md:228`), `pattern-unsupported` exists (`M:trust.md:69`), and records mark fields "extracted by a regular expression" read-only (`M:records.md:167`). No page shows the key on a field. *Fix:* one example, or remove the escape hatch from 1.0. (medium, checked)
- **`position: last` and groups** are normative in SPEC-201:67-70 and are the spec's own suggested fix for an unreachable field (`:125`); neither appears in `M:content-models.md`. "Combinators" (`M:scope.md:17`) is still undefined. Partly carried over. *Fix:* add both, or cut them from D1 for Marquise. (medium, checked)
- **READMEs lag the concept indexes.** `R:README.md:84-98` lacks the three new worked pages and Prior art; `M:README.md:127-146` lacks Prior art. `M:README.md:154` lists `migrate` (after 1.0) and omits `reference`, `schema`, `explain`, `check`. *Fix:* copy the tables. (low, checked)
- **Glossary gaps.** Rivière: selector, clause, built-in member (full list), `into`, derived id, path template, text template, projection, group, actor, claim, external node, resolver, inventory, import, suspect link, symmetric reference, computed value, clock, rule (within one entity). Marquise: selector, `computes`, item model, key, zone, section, split, shadowing, strict, registered check, seam, satellite, host, trace. (low, checked)
- **`has:deprecated` on a string attribute** (`R:docs-site-as-shapes.md:128`): fine, but with F-P11 open it is unclear for `deprecated: ""`. (low)
- **A dangling sentence** opens "Saved writes" before the term is introduced (`R:queries.md:292`). (low, checked)
- **`aggregate` takes `by`; `collection` takes `group`** (`R:shapes.md:9`, `R:queries.md:282`). Two names for grouping. (low, checked)
- **`astro@7.4.12`** (`R:integrations.md:23`) and the loader fields listed could not be verified here. (recalled: unverified)
- **Literal `$` strings in writes.** `set: { assignee: '$actor' }` (`R:queries.md:300`): how to set a literal string starting with `$` is not said. (low, checked)

---

## 7. From the 2026-11-19 review: what regressed or remains

**Regressed (worse than on the 19th).**

1. **Overloaded words** (its I19). The list grew by `overlay`, `at`, `text`, `key`, `repeat`, `heading`, `as`, `matches`, `fields`, and by six names for a stored selector. See section 1.
2. **"The grammar comes after its catalogue"** (its I23, `R:queries.md:249`). Seven grammar changes were decided since the 19th (comma and repeat, brackets, `+`, negation, `$this`/`$root`, mention steps, path values) with no catalogue.
3. **Command and package lists** (its I20). `M:commands.md` is now the one table, but `M:README.md:154` and `M:api.md:80-81` still differ from it, and both READMEs' concept tables fell behind their indexes.
4. **Scope pages obeyed by other pages** (its summary point 1). Fixed for Marquise on the 19th; today's Rivière decisions reopened it (S1, C4), and SPEC-199's table fell behind (C15).
5. **"A list field of references" settled** (its B6, I5). It was closed by `M:records.md:42-46`; today's landing rule reopened what the record looks like (C1).

**Still open, unchanged.**

- Markers that disagree on the content-models page (its I7c; C26 here).
- The inline matcher vocabulary and "combinators" (its B3).
- `max: 2` in an example against counts as "also planned" (its minor list; C23 here).
- No MCP tool applies a changeset; `riviere rename … --git` without `--apply` (`R:cli-and-mcp.md:22`, `:37`).
- Changeset composition: two `create`s from one snapshot take the same id (its I13).
- "After 1.0" of which project (S7).
- Positional attributes (`{% collection "work" %}`, `{% ref "…" /%}`) cannot be declared in the shape format; the generated-region marker now adds a third spelling, unquoted (`R:shapes.md:61`).

**Held.** Rivière's timing wording, the two-phase load and `expand-cycle`, the bundle token length, `rename`'s reach, the same finding for unreadable and missing, `claim` as a saved write, the write policy replacing `confirm` (no stale "confirmation policy" text left in the docs; one line in NOTES:3757).
