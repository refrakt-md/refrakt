# Second review of the Marquise and Rivière concept docs (2026-11-19)

Paths: `M:` = `/home/user/marquise/` (`M:x.md` means `M:docs/concepts/x.md`; the README is `M:README.md`), `R:` = `/home/user/riviere/` likewise, `SPEC-199` and `SPEC-201` = `/home/user/refrakt/plan/specs/SPEC-199-…md` and `SPEC-201-…md`, `NOTES` = `/home/user/refrakt/notes/marquise-foundation.md`, `REVIEW-1` = `/home/user/refrakt/notes/marquise-review-2026-11-18.md`. Line numbers are file lines in the current checkouts.

Method. Pass 1 (sections 1 to 4) used only the two READMEs and `docs/concepts/`. Pass 2 read SPEC-199 and SPEC-201 in full, and NOTES sections 17, 19 ("Addresses"), 20, 21, 22 and the `@astrojs/markdoc` part of 14; the rest of NOTES only by heading. Pass 3 read REVIEW-1 in full. Nothing was edited in any repository.

Two caveats on "cold". Refrakt's `CLAUDE.md` was in my context from the start, so I knew before Pass 1 that plan uses `- [ ]` criteria, `## Blocked by` sections and semver milestone names. And no `node_modules` exist in any clone, so every statement about Markdoc, the language server protocol, Standard Schema or Astro is **recalled**, not checked. Statements about what the docs, specs and notes say are **checked**.

---

## 1. Summary: the five most important things

1. **The scope page exists, but the other pages do not obey it, and three 1.0 items rest on things that are after 1.0 or undefined.** Findings "carry suggested fixes" as edit operations (`M:validation.md:25`), and the language server offers quick fixes (`M:README.md:151`), yet edit operations are after 1.0 (`M:scope.md:31`). Compact forms are in 1.0 "read with matchers declared in frontmatter" (`M:scope.md:15`), but no page shows that syntax, and two pages say the body template defines the form (`M:content-models.md:92-93`, `M:writing.md:142-144`). Renderers are in 1.0 (`M:scope.md:19`) while whether Marquise has renderers is Open (`M:rendering.md:28-30`).

2. **The matching algorithm is now decided in SPEC-201, and the docs still describe it in one sentence that says something different.** `M:content-models.md:22` says the model "walks the tag's block nodes in order and binds each to the first field that accepts it". SPEC-201 D1 walks the fields, with one cursor, greedy repeats and no backtracking. `M:writing.md:87-88` already cites "a shape's analysis" and "a strict shape … (see Content models)", which that page never defines.

3. **Rivière's timing is contradictory, and its acceptance test cannot be written in the format as documented.** Three places say "after Marquise 1.0" (`M:overview.md:55`, `R:README.md:6-7`, `R:overview.md:12-13`); `M:scope.md:55-58` starts Rivière before 1.0 is declared. The plan rebuild needs task-list items, sections bound by heading text, list-valued references and ids with dots (`v1.0.0`). The first two appear nowhere, the third is Open (`R:references.md:17-18`), the fourth is forbidden (`M:writing.md:29`).

4. **The 1.0 release freezes formats whose only real test comes later.** Addresses are in 1.0 on findings, but their hard user is the write path. Rich text is a Leaning and is in 1.0 records. The content-model syntax is a Leaning and is "Marquise's most important public format" (`M:scope.md:46`). The plain markup is a contract with an example that already breaks its own rule (item I9). I would name these four as the 0.x exit criteria.

5. **Several new mechanisms from the last round are weaker than they read.** Rebase by value is unsafe with index addresses (idea 6). The bundle token is only unforgeable at full length, and the example shows six hex digits (I15). "Nothing reveals whether the entity exists" is false while a dangling reference produces a different finding (I14). `needsConfirmation` is set by the party that proposes the change (idea 9). `riviere claim` writes `status` and `assignee`, which is domain vocabulary in a layer that ships none (idea 7).

---

## 2. Consistency and definition findings

### Blocking

| # | Where | Problem | Suggested fix |
|---|---|---|---|
| B1 | `M:overview.md:55`, `R:README.md:6-7`, `R:overview.md:12-13` vs `M:scope.md:55-58`, `M:scope.md:31` | "Rivière comes after Marquise 1.0" against step 5 (Rivière 0.x) before step 6 (1.0 declared). The write path "waits for … Rivière's first real use", so the order matters. | Say "Rivière starts on Marquise 0.x; Rivière 1.0 follows Marquise 1.0" in all three places. |
| B2 | `M:scope.md:15`, `M:scope.md:24` vs `M:content-models.md:92-93`, `M:writing.md:142-144` | Compact forms are in 1.0 through frontmatter matchers. The body is empty in 1.0. No page shows a frontmatter matcher, and the leaning makes them secondary to body templates. 1.0 would freeze a mechanism already planned to be the exception. | Show the frontmatter form on the content-models page and say it is the reading definition; or move compact forms after 1.0. |
| B3 | `M:content-models.md:22-25`, `M:writing.md:87-88`, `M:scope.md:15` | The algorithm is one sentence. "Strict shape" and "analysis" are cited and undefined. "Combinators" is used once, on the scope page; `choice`, `group` and positions are not shown. Item models use `match: link`, and the playlist needs bold and italic, but the listed vocabulary is block-only. `image` is inline in Markdown and listed as a block match. | Add the ten rules of SPEC-201 D1, the two analysis findings, `strict: true`, one table of block and inline matchers, and the combinator list. |
| B4 | `R:shapes.md:33` vs `R:shapes.md:58-59` | Every Rivière shape "is a deferred shape", and `expand` works "through the same preprocess seam". Preprocess runs inside `mq.load`, before the snapshot exists. An entity lookup needs the snapshot. Unchanged since REVIEW-1 B4. | State a two-phase load, a cycle finding (A expands B expands A), and that corpus findings live on the snapshot. |
| B5 | `M:validation.md:25-28`, `M:validation.md:35`, `M:README.md:151`, `M:explicit-slots.md:80` vs `M:scope.md:31`, `M:writing.md:3` | Suggested fixes, SARIF fixes and quick fixes are edit operations. Edit operations are after 1.0 and need inline positions that no candidate parser gives (`M:syntax.md:52-57`). | Say that 1.0 fixes are limited to what line ranges allow (attribute values, with the small tag tokenizer), or move fixes after 1.0. |
| B6 | `R:overview.md:62-65` (Decided) vs `R:references.md:17-18`, `M:records.md:42-43` (Open), `M:writing.md:29` | The acceptance test depends on four things with no design: task-list items with a `done` value, heading-bound sections, list-valued references, and ids containing dots. | One worked `work` shape and one `milestone` shape in Rivière's docs, written in the documented format. What cannot be written is the to-do list. |

### Important

| # | Where | Problem | Suggested fix |
|---|---|---|---|
| I1 | `M:README.md:98-100`, `M:README.md:150`; `M:rendering.md:10`, `:21-25`; `M:api.md:15`, `:23-27`, `:80`; `M:shapes.md:6-23`; `M:principles.md:52-59` | These pages present the write path, `migrate`, bindings, middleware, dimensions, kits and `doc.edit` with no release attached. The first shape example has a body, which 1.0 rejects. | An "after 1.0" tag on each such section; a frontmatter-only first example. |
| I2 | `M:scope.md:12-22` | The table omits: explicit slots (a listed contract, `M:principles.md:54`); extension namespaces (the 1.0 `schema` satellite needs them); identity and `type: ref`; the trust mode; host callbacks; Markdoc's `if`, variables, functions and `partial`; the `html` renderer. | One row each, in or out. |
| I3 | `M:rendering.md:28-30`, `M:rendering.md:7` vs `M:scope.md:19` | "Open: whether Marquise ships its own renderers" against renderers in 1.0. `$$mdtype` is Markdoc's internal name in a public contract. | Say 1.0 ships refrakt's generic renderers; keep "ride on Comark's" as a later question. Rename the discriminator. |
| I4 | `M:rendering.md:6-11` | The shape node is "the one new piece" (`M:scope.md:19`). Its example shows one block slot. Text fields, value-typed fields and item records have no visible place. | Use the README hero as the example, complete. |
| I5 | `M:records.md:99` vs `M:writing.md:31`; `M:writing.md:35`; `M:records.md:150` vs `M:api.md:24`; `M:validation.md:61-62`; `M:records.md:115` vs `M:writing.md:40` | The nested callout has `id: "tip"` and address `recipe.body.callout`, against "an id, then a key, then an index". `writing.md:35` says nested shapes in records are "still open", and `records.md:91-126` defines them. `RecipeAddress` is `'servings'`, and `doc.edit` takes `'recipe.servings'`. The Standard Schema path is "the finding's address", but the record nests under `shapes`, so `['body','callout','title']` does not index the JSON. | Define two address kinds, document-rooted and record-relative, and the mapping to a JSON Pointer. Fix the example to `#tip`. Delete the stale parenthesis. |
| I6 | `M:writing.md:63-65` vs `R:writing.md:58-59`, `R:writing.md:91-96` | Marquise: "no atomicity across documents (git covers that)" and a stale batch "is refused". Rivière: all-or-nothing across files, and stale changesets are rebased. | Marquise: "Marquise gives none; Rivière's `apply` adds it" and "refused by Marquise; a caller may re-resolve". |
| I7 | see cells | Markers that disagree. (a) `M:records.md:32` Leaning; `R:overview.md:30-31` and `R:references.md:5` Decided. (b) `M:writing.md:67` Leaning (LSP edits); `R:writing.md:28` Decided. (c) `M:content-models.md:7` Leaning; `M:scope.md:8,15` Decided. (d) `M:records.md:47-58` is a Decided table with a Leaning row (rich text). (e) `M:trust.md:9-11` decides rules about document shapes (Leaning, after 1.0) and Rivière's collections. (f) `R:cli-and-mcp.md:46` Decided; `M:api.md:5-6` leaves the table of operations open. | (a) Decided. (b), (c): "decided in intent, format open until 0.x ends". (d) split the row out. (e) mark "applies when document shapes ship". |
| I8 | `M:records.md:68`, `:73-77`; `M:writing.md:91`; `M:content-models.md:84` | "Only unambiguous forms are parsed", but `3:45` and `(9:22)` are the duration examples. `9:22` is minutes and seconds, or hours and minutes. | Either `value-ambiguous` without `format: clock`, or state the rule that makes it unambiguous. |
| I9 | `M:rendering.md:43-52`, `:55`, `:59-63` | (a) The README source has `**minutes**`; line 47 prints "in minutes." with no `<strong>`. (b) "Keeps the source's semantics", yet eyebrow and blurb paragraphs become bare text in a `div`. (c) "One `data-slot` wrapper per field", yet `actions` is `<ul data-slot>` with no wrapper. (d) `id="hero-headline"` repeats when a page has two heroes. (e) `aria-labelledby` on the default `div` has no effect without a role (recalled). | Fix the example; state the wrapper rule for lists; define id generation; give the root `role="group"` when it is a `div`. |
| I10 | `M:records.md:8-9`, `:99`; `M:rendering.md:43-48` | Records put `shape`, `id` and `address` beside fields. Markup uses `data-shape` and `data-slot` beside attributes. No reserved-name rule exists, so an attribute called `shape` or `slot` collides. | List reserved names; report them as `name-collision`. |
| I11 | `R:README.md:11` vs `R:corpus.md:47`, `:53-55` | "Every shape instance becomes an entity" against "a shape instance with an id, in a collection" and "a callout … is not an entity". Unclear: is a `{% work #W-9 %}` nested in a spec file an entity, when its file is in `spec`'s glob? | Fix the README; add one sentence on nested instances. |
| I12 | `R:README.md:23`, `:33`; `R:writing.md:10`, `:65`; `R:corpus.md:72-74` | `rename` changes "the id and every typed reference". The file is `{id}-{slug}.md`, and the file pattern is an id source whose disagreement is a finding. So a rename must also rename the file and rewrite Markdown links. Mentions are not named either. | Say what `rename` touches: tag, frontmatter, file name, typed references, mentions, links. |
| I13 | `R:writing.md:14`, `:28`, `:34`, `:41`, `:53`, `:92-93` | A changeset "is shaped as" a `WorkspaceEdit`, has one at `cs.edit`, and keeps operations "beside" it: three descriptions. The example `uri` is a relative path, where the protocol wants a URI (recalled). `expectedHashes` is an extra member. "Applies … with no adapter" is too strong. Composition is still missing (two `create`s from one snapshot take the same id). | `{ ok, operations, edit, expectedHashes, findings }`, with `edit` a strict `WorkspaceEdit`. Add `c.with(cs)`. |
| I14 | `R:shapes.md:52-56` | A `ref` to an unreadable entity "renders as plain text"; a `ref` to a missing one is a dangling-reference finding. The author sees the difference. Filters, sorts and counts through a reference (`author.salary:>100`) also leak unlisted fields. | Same finding for both cases in untrusted mode; apply the field list to filters, sorts and paths. |
| I15 | `R:context-bundles.md:65-74`, `:77-80` | The token's length is unstated and shown as `7f3a9c…`. A short token can be made self-consistent by trial. Ids and paths are printed inside token lines, and the id character set is Open (`M:records.md:42`). | State at least 128 bits; escape or restrict what token lines carry. |
| I16 | `R:writing.md:98-113`, `R:cli-and-mcp.md:16` | `riviere claim` writes `status` and `assignee`. Nothing says how it learns those names. It also commits and pushes to the shared branch, which protected branches and pull-request flows forbid. | Move `claim` to plan as a saved write; keep the principle (a claim must conflict in git) in the docs. |
| I17 | `R:queries.md:33`, `:88`; `R:README.md:30` | Unchanged from REVIEW-1 I17: any-or-all over lists, quoting, how `-priority` orders an enum, and `unblocked:`, which `find` is never shown to take and which needs to know what "finished" means. | Define each; express `unblocked` as a path selector. |
| I18 | `R:use-cases.md:14-15`, `R:context-bundles.md:18-19` vs `R:references.md:13` | "A reference to a source path is a typed reference", but `to` names shapes, and a source file is no shape instance. | Define a `path` value type, or drop the claim. |
| I19 | several | Overloaded words. `ref`: value type, tag, bundle level (`R:context-bundles.md:48`), git ref. `expand`: a shape, `expand(placeholder, values)`, `c.expand(doc)`. `collection`: config entry, shape, Astro's. `tag`: the author's tag and `plain: { tag }`, an HTML element, on the page that says "two things, two words". `slot`: explicit slot, node `slots`, `data-slot` on a text field. `summary`: a key and a field (`M:shapes.md:88`). `form`: six senses. `content`: a shape key, a zone name, a collection option. | A glossary page. Rename `plain.tag` to `plain.element`, `data-slot` to `data-field`, the `expand` shape to `embed`, the `ref` tag to `mention`. |
| I20 | `M:README.md:150`, `M:scope.md:21`, `M:api.md:5`, `:80-81`, `M:trust.md:56` | Four command lists: `reference` is only on the scope page, `schema` only in api.md, `migrate` in two, `marquise check` in one. `--json` and `--format json` both appear. `format` is undefined, and it writes files in a release where "before anything writes" a spike is due (`M:scope.md:54`). | One table of operations with a release column; define `format`. |
| I21 | `M:principles.md:11-12` vs `M:scope.md:12-20`, `:48-51` | "A feature moves into Marquise only when it is implemented in refrakt", against 1.0 rows marked "new" and a step that "replaces the earlier plan of incubating". | Say the rule applies from 1.0; 0.x is where new pieces are built. |
| I22 | `M:syntax.md:16` vs `:34`; `:47-50` vs `:52-57`; `:46` vs `M:scope.md:13`, `M:writing.md:124` | Line 34 says "positions exist only for components"; the table says line ranges on block tokens. Lines 47-50 ask for a check that lines 52-57 report as done. "Open: which is primary" stands beside a Markdoc-only 1.0 under semver and write templates "in plain Markdoc". | Fix line 34; merge the two paragraphs; see idea 1. |

### Minor

- `M:content-models.md:90` `match: track` against `:24` `tag:card`. Still two spellings.
- `M:shapes.md:87`: `fills: { title: $text }` is undefined. `M:content-models.md:65` uses `max: 2`, which `:110` lists as "also planned".
- `M:extending.md:103` `appliesTo` and `:121` `removeAfter` are camelCase keys in formats whose rule is kebab-case. Say whether the rule covers format keys.
- `M:writing.md:98`, `:112` say `convert`; the operations table (`:53`) does not name it. Operation names are never listed.
- Severities are `error` and `warning` (`M:validation.md:7-10`), "info" (`M:extending.md:51`) and "note" (`M:validation.md:34`). List the set once.
- `M:extending.md:49`, `:59`: "a loading error", "a configuration error", against "content problems never throw … a broken shape file" (`M:validation.md:21`). Say where shape-file findings surface when no document is loaded.
- `M:api.md:27`: `next.ok ? next.source : next.findings` hides that a successful edit also returns findings (`M:writing.md:66`).
- Positional attributes (`{% collection "work" %}`, `{% ref "…" %}`, `{% form "item" %}`) cannot be declared in the shape format. `R:shapes.md:17` and `:35` still differ.
- `R:cli-and-mcp.md:17-18`: two argument forms for `set`. `:19`: `rename … --git` without `--apply`, which `:33` requires. `:48-54`: no tool applies a changeset.
- `R:README.md:63` "can plug in an engine" against `R:queries.md:50-52`, `:68` (deferred, "perhaps for good"). `R:overview.md:50` and `R:queries.md:70` still say "no query language".
- `R:README.md:72`, `R:cli-and-mcp.md:43`, `R:use-cases.md:35`: "tools are typed from its shapes" against Decided generic tools.
- `R:corpus.md:81`: "after 1.0" of which project?
- `R:integrations.md:22-23`: I could not verify `astro@7.4.12` or the listed loader fields (no network use).
- "Converter hook" (`M:principles.md:45`), "rich-text hook" (`R:integrations.md:85`), `prepare` (`M:extending.md:10`), "the AI grammar" (`M:shapes.md:29`), "strict projects" (`M:validation.md:48`): each named once, never defined.

### Where a Markdoc or MDX reader gets lost

Unchanged from REVIEW-1, and still the largest clarity gap. No page says whether Marquise replaces `Markdoc.transform`, what happens to a tag with no shape, to Markdown outside any tag, or to a document with no shape. No page shows a component being registered: the only rendering code is a binding (after 1.0) and the HTML renderer. `/* rendered */` (`M:README.md:42`) never gets a type. There is no MDX before-and-after, though the audience is said to use MDX.

---

## 3. Fresh perspectives

I leave out ideas REVIEW-1 already made and the notes took up. Three of its ideas got no recorded answer and I still support them: a merge driver by address, shape inference from existing content, and a grammar per shape for constrained decoding.

**1. The primary-syntax question is already answered; say so. (high)**
1.0 ships Markdoc, with a language server, a formatter, semver on "the content syntax" and templates in Markdoc. Changing the primary later is a major release for every author. The real open questions are narrower: is Comark ever accepted as input, and which parser supplies inline positions. I would move Comark to one appendix page. It appears on seven pages of a product whose first release does not include it.

**2. Bring the body half of document shapes into 1.0. (medium to high)**
The README sells "typed body content" against content collections (`M:README.md:91`). A reader from Astro thinks in documents. In 1.0 they must wrap a whole recipe page in `{% recipe %}`. Rivière's entities are mostly documents, and a Decided trust rule already governs document shapes. The body model is the same resolver on the document's children. Leave frontmatter typing to the host, as `M:shapes.md:96-97` already says.

**3. Make strict the default in Marquise, and settle item-model order before the freeze. (medium)**
See section 5 for the argument. Refrakt's hero idiom is the reason for the lenient default; Marquise's audience is authors and models who cannot see the shape.

**4. Name the 0.x exit criteria. (high)**
Four formats freeze at 1.0 before their hardest user exists: addresses, rich text, the content-model syntax, the plain markup. I would require before 1.0: one attribute edit and one field edit through the hybrid parser, to prove the address grammar; plan's records exported and consumed by something that is not Marquise, to prove rich text; refrakt's analysis run reviewed (a SPEC-201 criterion).

**5. Give rich text an opt-in `nodes` member, and measure its size. (medium)**
The reason against a Markdown string is that consumers would need a parser (`M:records.md:111-113`). A consumer that must render without Marquise (a mobile app, another language) still does: `markdown` is all it gets, since prose order is "not included". The tree is already plain JSON, so expose it on request. Separately, each level stores `markdown`, `text` and the nested records, which repeat their own `markdown`. Size grows with nesting depth. The serialised snapshot for edge runtimes carries all of it.

**6. Rebase by value needs stable addresses. (high)**
`R:writing.md:91-96` re-resolves each address and compares the value. With an index address (`tiers[2].price`, expected 29), an inserted tier moves another item to index 2. If its price is also 29, the edit lands on the wrong item, silently. Rebase only operations addressed by id or key; refuse the rest. `add`, `remove` and `move` have no "value at the target" and need their own rule.

**7. Offer a unified diff beside `WorkspaceEdit`. (high, as an addition)**
Only editors inside a language-server session apply a `WorkspaceEdit`. People, pull requests, agents and CI read diffs. `git apply` checks every hunk before writing any file, and `--3way` rebases by context (recalled). `cs.toPatch()` costs little and makes "reviewable changesets" literal. It may also show that the journal is only needed outside git.

**8. Cut from Rivière's first release. (medium)**
`claim` (I16). Context bundles, as a satellite: they use only the public API, which is the docs' own test for a satellite. The engine seam's five design bullets (`R:queries.md:53-60`), deferred "perhaps for good". Translations, the git source, the live loader, per-collection tools, the SQLite export. What stays is the snapshot, references, selectors and changesets, which is what the acceptance test needs.

**9. Security gaps not yet covered. (high for the first two)**
- **Host values.** Untrusted content can print any exposed value (`{% $user.email %}`) with Markdoc variables. `M:trust.md:17` calls host values trusted; exposure should be per value, off in untrusted content.
- **`needsConfirmation` is self-declared** (`R:writing.md:39`, `:48`). An agent marks its own change as needing no approval. Policy belongs to the host: which operations, collections or file counts need a person.
- **Regular expressions** are "trusted, but run on untrusted text" (`M:trust.md:48-49`). Name the defence: a linear-time engine, or a step limit.
- **YAML in untrusted documents:** alias expansion, and `__proto__` keys in frontmatter (the page covers bindings only).
- **`resolveAsset` on remote URLs** is a server-side request chosen by content.
- **Ids reach the DOM** (`id="hero-headline"`), which allows DOM clobbering (recalled); prefix them.

**10. Structured output should use the input schema, not the record schema. (high)**
`M:validation.md:63-67` builds the profile from "the shape's records". A record holds derived members (`text`, `shapes`) and read-only fields. A model should emit `RecipeInput`. Standard Schema separates input and output types (recalled); map `Input` and `Record` to them.

**11. Examples are needed in 1.0, and 1.0 has nowhere to put them. (medium to high)**
The body is empty in 1.0. Examples feed tests, the property tests of the laws, the default style of new values (`M:records.md:70`), completions and the AI grammar. Allow sidecar files (`shapes/hero.examples.md`) in 1.0, or the "grammar an AI can write against" ships without examples.

**12. Unique ids across the corpus by default. (medium)**
Ids are unique per collection (`R:corpus.md:68`), so every surface that takes a bare id needs an ambiguity rule: references, mentions, the CLI, `#WORK-123` addresses, bundle lines. Prefixed ids (`WORK-`, `SPEC-`) are already corpus-unique. Make that the default, with a finding, and let a collection opt in to scoped ids. Backstage's entity references (`kind:namespace/name`, recalled) are the precedent for the qualified form.

**13. Internationalisation of values. (medium)**
Written-out months are English (`12 Nov 2026`). Units are English (`45 min`). A `datetime` written without a zone has none. Say that natural-language forms come from locale data chosen by `lang`, and that a zoneless time is `value-ambiguous` unless the host gives a zone. Link checking also needs a heading-slug rule (`link-anchor-missing`), and hosts differ; make it a host callback.

**14. Prior art not yet on the list. (medium)**
- **ProseMirror's content expressions** (recalled): ordered matching compiled to an automaton, with `fillBefore` to compute what must be inserted to make content valid. That is the "writer generated from the content model".
- **Augeas**: lenses applied to configuration files, preserving formatting, in production for years. Closer to the write path than Boomerang.
- **Djot**: a Markdown successor designed with source positions on every node, inline included.
- **Sphinx domains and MyST**: typed directives, typed cross-reference roles, and an inventory of objects across documents. Rivière's entities, edges and mentions.
- **GROQ** (`->` to follow a reference) and GitHub's issue search, for the selector grammar.
- **org-mode with org-ql**, for typed queries over prose files.
- **beads and git-bug**: issue queues stored in git for agents. Direct prior art for claims.
- **Datasette**, for the SQLite export.
- **shadcn's registry**: distributing shapes as files copied into `shapes/` may suit "files are the truth" better than npm kits with a manifest.

**15. Opportunities.**
- `marquise explain file.md`, and inlay hints in the language server: which node went to which field, and why. Inference is invisible, so the first debugging question is always "why is this my eyebrow?".
- A form editor generated from a shape's input schema. The write path "usable from data alone" makes it nearly free, and it is what a team leaving a CMS will ask for first.
- Static JSON endpoints plus an OpenAPI document generated from shapes, making "an API from a git repository" a command.

---

## 4. Questions to answer before building

1. Which hooks and callbacks are in 1.0? Refrakt "depends on it at once", so everything refrakt uses today must exist in 0.x, deferred shapes included.
2. What does a 1.0 finding's `fixes` contain, when edit operations are after 1.0?
3. Is the frontmatter matcher form for compact forms permanent, or a 1.0 stopgap?
4. Which characters may an id contain? It decides addresses, qualified references, bundle lines, file names and DOM ids.
5. What is a tag with no shape, and a document with no shape: an error, a pass-through, or untyped?
6. What does `doc.records()` return for a document with several top-level tags and prose between them?
7. Is `#WORK-123` in an address local to a document, or corpus-wide? What if both match?
8. How are task-list items, heading-bound sections and list-valued references written in a content model?
9. Is a nested instance with an id an entity? In which collection?
10. Does `rename` rename the file?
11. How does `riviere claim` know which fields to write?
12. Do the contract rules bind during 0.x (NOTES Z6d)? This decides how expensive the next six months are.
13. Still open from REVIEW-1: is the tree a function of host values such as `$locale`, and so what is the snapshot's key? Which callbacks may be async? What is the cold-start cost of a one-shot CLI call on 10,000 documents?

---

## 5. Pass 2: discrepancies with SPEC-199, SPEC-201 and the notes

### The docs say something different

1. **Matching** (SPEC-201 D1, NOTES X3). `M:content-models.md:22` walks nodes and gives each to "the first field that accepts it". The spec walks fields: a field looks only at the node under the cursor; a required field that fails is reported and leaves the node. The two differ on `paragraph, paragraph, heading` for the hero.
2. **Rivière's timing** (SPEC-199 "Order" steps 6 to 8, NOTES X2). Rivière 0.x comes before Marquise 1.0. The docs kept the older M7 wording ("after Marquise 1.0") in three places. NOTES M7 is itself stale against X2.
3. **Identity and `ref`** are Decided (NOTES M3, 2026-11-18). `M:records.md:32` says Leaning.
4. **Comark positions** (NOTES X5): "every block has a line map, correcting 'only components'". `M:syntax.md:34` keeps the uncorrected phrase.
5. **Renderers** (NOTES X1): 1.0 has "the renderers refrakt already has", which SPEC-199 lists as React, Vue, Svelte and Astro. `M:rendering.md:28-30` leaves open whether Marquise has renderers. `M:README.md:152` adds `html` as a fifth.
6. **Compact forms in 1.0.** NOTES X1 says reading them "may be in 1.0". SPEC-199's table and `M:scope.md:15` state it flatly. The notes' own sketch (`compact: item:` in frontmatter, NOTES section 17) is the syntax the docs do not show.

### The docs leave out a decision that matters

7. **All of SPEC-201**: the ten rules, `field-unreachable`, `field-shadowed`, `strict: true` per shape or project, the guarantee that a strict shape is writable by inference alone, and its open questions. The docs' own first example (`M:content-models.md:16-19`: optional `blurb` paragraph, then `body: any`) is the shadowing case SPEC-201 opens with.
8. **"No parser locates attribute values: a small tokenizer over the tag's opening is needed"** (NOTES X5). Setting an attribute is the simplest edit and the likeliest 1.0 fix. Also missing from `M:syntax.md:55-57`: route (c), the MDC syntax family through `remark-mdc`.
9. **The combinator list** (NOTES section 17): `choice`, `repeat`, `group`, positions, `as: data`, `leftover`, `keep`. The docs name "combinators" and show `sequence` and `split`.
10. **Hooks.** SPEC-199 lists eleven and says "1.0 ships only the hooks refrakt needs at that point". The docs list four seams. Shared attributes, the wrapper, presentations and error presentation are absent, and they are what refrakt needs in order to depend on Marquise.
11. **Item records carry `content`** (SPEC-199 worked example), and "an item list renders from each item's `content`". Absent from `M:README.md:46-49` and `M:rendering.md`.
12. **Astro adoption** (NOTES section 14, I5, leaning): a preset for `@astrojs/markdoc` first, one host component for every shape, a pre-transform hook proposed upstream. This answers "can I adopt one tag at a time?". The docs list `@marquise-md/astro` only as a renderer.
13. **Strategy lines:** "the story is 'move from MDX and keep your components'"; "Shape files do not [carry a format version]"; Rivière's 1.0 needs "a consumer unlike plan"; the risk "Marquise becoming a second refrakt … the number of hooks is the early warning".
14. **Open questions not surfaced:** documents without a shape stay untyped (Z4d); whether contract rules bind in 0.x (Z6d); whether combinators replace the named patterns or sit beside them (C2); whether a field read only by a regular expression is acceptable as read-only (M5), which `M:records.md:155` states as fact; and X7's note that rich text is "a 1.0 question".

### The record lags the docs (for the record's owner)

SPEC-199's worked example still uses `type: delimited`, `fields`, `itemModel`, a top-level `tag:`, and a plain output with no heading element; decision 3 predates X12.4. Its acceptance criteria still require `@refrakt-md/model` in the monorepo, which decision 4 as revised replaces. SPEC-199 and SPEC-201 are both `status="draft"`.

### Where I still disagree with a recorded decision

- **X3, the lenient default.** I agree with ordered, greedy matching and no backtracking. I disagree that shadowing should be an info finding by default in Marquise. The reason given is refrakt's hero idiom. Marquise's authors cannot see the shape, and its write path gains its strongest guarantee only in strict mode. Default strict in Marquise, `strict: false` as the declared exception, refrakt's project setting lenient. Two open questions should close before the algorithm is called normative: item models are order-free while sequences and write templates are ordered (question 2), and a comment between two fields makes an optional field absent (question 4, which is a defect).
- **X1, five renderers and compact forms in 1.0.** Two renderers prove the contract. Compact forms freeze a frontmatter mechanism the leaning already demotes (B2).
- **X1, document shapes after 1.0** (idea 2).
- **X10, `riviere claim` and rebase by value as designed** (I16, idea 6). The scoped guarantees and the recoverable apply are right.
- **X9.3, the hash token.** Sound only at full length. It also assumes the reading agent checks tokens; a model reading Markdown does not. The JSON form is the real defence and should be the default for MCP.
- **X11, `WorkspaceEdit` as the only changeset view** (idea 7).
- **V5, ids unique per collection** (idea 12).
- **X12.4, headings at the author's level.** Better than a `div`. But the level an author types inside a tag is arbitrary against the page outline, so a page of unbound shapes gets several `h1`s. I would let `plain` declare a level.

---

## 6. Pass 3: REVIEW-1's findings now

### Resolved (briefly)

B1 (scope page), B2 (identity and `ref` defined), B3 (deferred shapes as a seam), B5 (`to` names shapes; ambiguity finding), B6 (`#`-rooted addresses), I1, I2, I3, I4, I6, I7 (the handle example), I10, I13, I14, I20. Minor: Markdoc's children wording, the frontmatter key table, the binding example, store-sourced entities, YAML 1.2, README "no query indexes". Design challenges taken up: lens laws, the positions spike, the read-path 1.0, early extraction, rich text, value types, fixes and SARIF, `WorkspaceEdit`, scoped concurrency, readable collections, the bundle token, CEL, the export, generic MCP tools, typed instances, accessible plain markup, hash and Unicode normalisation.

### Remaining

| REVIEW-1 | State now | Matters? |
|---|---|---|
| B4, `expand` circularity | untouched (`R:shapes.md:33`, `:58-59`) | yes, blocking for Rivière |
| B7, the algorithm | decided in SPEC-201; the docs page is unchanged | yes: the docs now contradict the record |
| I5, list-valued references | stated as Open in both repositories | yes: the acceptance test needs it |
| I8, I9 | rich text defined as a leaning; `$$mdtype` and the renderer question remain | yes for 1.0 |
| I11, `match: track` and `tag:card` | untouched | minor |
| I12, `computes` and `prepare` | CEL chosen for evaluation; `prepare` still undefined | after 1.0 |
| I15, `shape-unbound` in core findings | untouched (`M:validation.md:48`) | yes: core cannot know the bindings |
| I16, changeset composition | file operations solved; chaining is not | yes |
| I17, query semantics | untouched | yes |
| I18, `expand` and `ref` double meanings | untouched; `ref` gained a fourth meaning (bundle level) | yes for newcomers |
| I19, dimensions in the props namespace | untouched | after 1.0 |
| I21, command lists | now four lists; `format` still undefined | yes |
| I22, the published schema; the converter hook | untouched | yes: it is the main machine contract |
| I23, grammar decided before its catalogue; the Astro end state | untouched (`R:queries.md:25`, `R:integrations.md:55-59`) | marker only |
| Minor | `fills`; `summary` as key and field; shape names and two libraries' `card`; "form" and "template" senses; `convert`; ids with dots against `v1.0.0`; Standard Schema paths; Comark's `#name` in Markdoc pages (`M:explicit-slots.md:57`, `M:writing.md:86`); "scanned in milliseconds"; positional attributes; `set`'s two forms; `R:overview.md:50` | mostly small; ids with dots is not |
| Newcomer gaps | all five remain | yes: no page shows a component being bound |
| Its questions | 6, 7, 9, 10, 12, 14, 15 unanswered | 12 is blocking for the acceptance test |
| Not taken up | merge driver, `marquise diff`, shape inference, constrained-decoding grammars, a TypeScript shape builder, characters-per-token for CJK text, hub entities at depth 1, the "Prior art" page (planned, NOTES X12.7) | optional |

### Regressions and new inconsistencies from the changes

1. **Rivière "after Marquise 1.0"** now contradicts the new scope page (B1).
2. **`M:writing.md:35`** says nested shapes in records are "still open"; the new rich-text section defines them.
3. **`M:writing.md:87-88`** (the new "laws" text) cites a strict shape and an analysis that no page defines.
4. **`M:scope.md:15`** introduced frontmatter matchers for compact forms; two pages still say the template defines the form (B2).
5. **Suggested fixes** were added as Decided on a 1.0 item, built from operations that are after 1.0 (B5).
6. **`M:syntax.md`**: the new "Positions, measured" paragraph sits under a sentence asking for that check, and line 34 contradicts the corrected table row (I22).
7. **Value types**: the new "only unambiguous forms" rule is illustrated with `3:45` (I8). The Decided table includes a Leaning row.
8. **`M:records.md:99`**: the new rich-text example reports an index address for a shape that has an id.
9. **The plain presentation example** gained a heading and a label and lost the README's `**minutes**`; its generated id is not unique per page (I9).
10. **Marquise against Rivière on writes**: Marquise's leanings (no atomicity across documents; stale batches refused) now sit beside Rivière's new Decided rules (all-or-nothing; rebase by value) with no sentence joining them (I6).
11. **`WorkspaceEdit`**: three descriptions of what a changeset is; a relative path where a URI belongs; "no adapter" (I13).
12. **Readable collections**: "nothing reveals whether the entity exists" is contradicted by the dangling-reference finding, and paths through references are not covered (I14).
13. **The bundle token**: the argument holds only at a length the page does not state (I15).
14. **`riviere claim`** brought `status` and `assignee` into a layer that ships no vocabulary (I16).
15. **MCP wording**: "tools typed from its shapes" in three places against the new generic default.
16. **`M:trust.md:9-11`** now decides rules that rest on a Leaning, post-1.0 feature (document shapes) and on another project's concept (collections).
