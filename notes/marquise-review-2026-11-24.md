# Fourth review of the Marquise and Rivière concept docs (2026-11-24)

Outside review, read cold. Checkouts: Marquise `a4ad15d`, Rivière `7166dd7`, refrakt branch
`claude/adr-049-framework-components`. Nothing was edited and nothing was installed.

**Citations.** `M:file.md:line` and `R:file.md:line` are concept pages under `docs/concepts/`
(`M:README.md` and `R:README.md` cited as `M:/README.md`, `R:/README.md` when the repository README is meant).
`SPEC-201:line`, `SPEC-199:line`, `NOTES:line` are refrakt's files.

**Marking.** Every claim about the docs below was read in the current checkouts and is **checked** unless a
sentence says otherwise. Claims about external tools (CEL, Markdoc, micromark, RE2) are marked **recalled**.

**Mechanical checks run.** Every internal link and anchor in both doc sets resolves (checked by script).
Every backticked finding id used anywhere in either doc set is in one of the two catalogues (checked by
script); the catalogue problems that remain are findings described in prose with no id, and severity
disagreements (section 6).

---

## The five most important things

1. **The trust model does not cover the case the newest worked page is built on.** `M:trust.md:14-16` lists
   shapes as *trusted* ("code, reviewed like any dependency"). The site builder stores customers' shapes and
   serves "customers' content and customers' shapes" as "both untrusted" (`R:site-builder-as-shapes.md:228`),
   and the CEL limits are justified by "untrusted shapes" (`M:syntax.md:181`). Nothing says what an untrusted
   shape may do: `plain: { element }` is free text (a customer's `script` or `iframe` root), `pattern` and
   selector regexes, `rules` messages, `schema:` output, `requires: trusted`, shape analysis cost, replacing
   a kit's shape by name. The page also spells the mode `untrusted: true`, where configuration has
   `"trust": "untrusted"` (`M:configuration.md:15`). (high)

2. **Stores, versions and `--against` were decided, and the older text still says the opposite.** "Git is the
   storage, the files are the truth, and there are no transactions across documents" (`R:/README.md:59`); "No
   storage but files, no transactions" (`R:overview.md:51`); against "Stores: a database as the truth" and "a
   store sink applies a changeset in one transaction" (`R:corpus.md:403`, `:415`). `--against` is
   "source-neutral" (`R:corpus.md:335`), "git's" eight paragraphs later (`:413-414`), "not offered" on the
   site builder (`R:site-builder-as-shapes.md:176`) and "another git ref" in two more places
   (`R:cli-and-mcp.md:36`, `R:scope.md:19`). A snapshot at a version is "cached by it, forever"
   (`R:corpus.md:324`) although a snapshot also fixes a clock and overlays (`R:queries.md:134`,
   `R:corpus.md:370`), and the site builder says "the clock is the request's" (`:234`). (high)

3. **"Producing is async, reading is sync" has three holes.** (a) `createMarquise(config, bindings)` is never
   awaited (`M:api.md:24`, `M:getting-started.md:84`), `mq.load` is "the only async step" (`M:api.md:26`), yet
   shapes are "read through `files`" (`M:configuration.md:39`), an async host callback "called only while
   producing" (`M:api.md:73-74`); no API member reports shape-level findings (`computes-type`,
   `selector-unavailable`, `extends-*`, `config-unregistered`). (b) `c.with(cs)` is synchronous
   (`R:writing.md:27-28`) but produces a snapshot holding new documents, records, references and rule
   results. (c) A serialised snapshot "stores each document's source and the index, not records: records are
   computed on demand" (`R:corpus.md:314-315`), while queries on a snapshot are synchronous (`R:corpus.md:6`)
   and return records. Computing a record is a Marquise `load`, which is async. (high)

4. **Migrations do not yet fit `extends`, document shapes or the write path.** The showcase migration
   (`playlist type=podcast` into a family) is "declarative … `from: { tag: playlist, if: 'type:podcast' }`" in
   the shape (`M:shapes.md:178-179`); the migrations page puts "shapes merged or split" in a migration *file*
   (`M:extending.md:146`) and defines neither the object form of `from` nor `if`. A migration applies "only
   where the current form rejects an instance" (`M:extending.md:164`), but a document shape passes undeclared
   frontmatter keys through "without a finding" (`M:shapes.md:104-106`), so a renamed optional frontmatter key
   is never migrated, silently. The 1.0 read half carries fixes that are "the edit operations that write the
   new form" (`M:extending.md:170`), which freezes edit operations in a 1.0 finding before the write path
   exists. Details and more cases in sections 3 and 4. (high)

5. **Two of the five fixtures still cannot load as written, and both size tables undercount.**
   Traceability puts `transitions` and `fingerprint` directly under `riviere:`
   (`R:traceability-as-shapes.md:107`, `:111`), where the decision is "under the workflow plugin's
   `workflow:` key" (`R:references.md:319`, NOTES:3955-3956). The site builder names plugins `"tree"` and
   passes none as bindings (`:140`, `:166-170`) against `"@riviere-md/tree"` plus `plugins: [tree(), …]`
   (`R:configuration.md:12`, `:27`), uses a dimension from a kit (`tone="warm"`, `:49`) that Marquise places
   after 1.0, and derives a post's id from an optional date (`:146`, `:121`). The size tables, "the early
   warning" (`M:scope.md:81-82`, `R:scope.md:39-40`), list 13 content-model keys where the pages use about
   30, omit `symmetric`, and omit five config keys the pages use. (high)

---

## 1. Contradictions between pages

### High

| # | Where | Problem | Fix |
|---|---|---|---|
| C1 | `M:trust.md:14-16` vs `R:site-builder-as-shapes.md:67-68`, `:228`; `M:syntax.md:181` | Shapes are trusted; the site builder and the CEL limits assume untrusted shapes. No page defines that mode. | Add "Untrusted shapes" to `M:trust.md`: what is checked (an allowlist for `plain.element`, RE2 only, CEL limits, analysis and size ceilings, no `requires: trusted`, namespaces allowed), and name the option once. |
| C2 | `R:/README.md:59-61`, `R:overview.md:51`, `R:writing.md:102-104`, `M:/README.md:120` vs `R:corpus.md:403-422` | "Files only, no transactions" against stores with transactional sinks. | Reword all four: "the Markdown source is the truth, in files or in a store; no isolation between readers, no query planner". |
| C3 | `R:corpus.md:335-336` vs `R:corpus.md:413-414`, `R:site-builder-as-shapes.md:176-177`, `R:cli-and-mcp.md:36`, `R:scope.md:19` | `--against` is source-neutral in one paragraph and git's in four others. On a store with a `published` name, `--against published` is exactly the decided case. | Keep the source-neutral text; change the other four to "a named version" and say the site builder offers it against `published`. |
| C4 | `R:corpus.md:324` vs `R:queries.md:134-136`, `R:corpus.md:370`, `R:site-builder-as-shapes.md:227`, `:234` | A snapshot is cached "by version, forever", but it also depends on `now`, overlays, the shapes and Marquise's version (`R:corpus.md:287-288` keys the file cache by those). | State the cache key: version, shapes' hashes, config hash, Marquise version, and the clock at the granularity the queries used. |
| C5 | `M:shapes.md:178-179` vs `M:extending.md:144-146` | A shape split by a value is a declarative migration in the shape file on one page, a migration file on the other. `from: { tag, if }` appears only in the first. | Decide one. If the shape file: add "a tag renamed onto it under a condition" to the declarative tier and define `from: { tag, if }` (a selector over the old tag's attributes) in `M:extending.md`. |
| C6 | `R:references.md:319-320`, `R:site-builder-as-shapes.md:104-106`, NOTES:3955 vs `R:traceability-as-shapes.md:111-117` | Two places for `transitions`: under `riviere: { workflow: … }` and directly under `riviere:`. | Move traceability's map under `workflow:`. |
| C7 | `R:scope.md:19` and `R:traceability-as-shapes.md:249-250` vs `R:scope.md:48`, `R:plugins.md:51`, `M:records.md:96-98` | The `fingerprint` value type is "in the first release" (registered by core), "later" (the `trace` plugin), and depends on Marquise's value-type registry, which is "after 1.0" and not among the 0.x packages. | Pick one. Simplest: the fixture declares `reviewed` as a plain string until `trace` ships, and scope row 19 drops the value type. |

### Medium

| # | Where | Problem | Fix |
|---|---|---|---|
| C8 | `R:overview.md:31-34` vs `M:scope.md:17`, `M:records.md:39-46` | "When [references] arrive relative to Marquise 1.0 is open"; Marquise's scope has `type: ref` and lists of references in 1.0. | Delete the "open" clause. |
| C9 | `M:scope.md:48`, `:72` vs `M:syntax.md:92-102`, NOTES:3896-3906 | The write path still "waits for a spike checking source positions"; both spikes ran (2026-11-19, 2026-11-22). | Replace with what it waits for now: the locator built, and the untested cases of the spike (attribute escapes, nested fences). |
| C10 | `M:syntax.md:55-58` vs `M:syntax.md:80-88` | "Positions, measured" still lists three open routes; the next section decides one. | End the first section with "decided below". |
| C11 | `M:findings.md:15` vs `M:extending.md:52-53`, SPEC-199:198-200 | `namespace-unknown` is a warning in the catalogue, an info finding on the feature page and in the spec. | Info. |
| C12 | `R:references.md:96` vs `R:references.md:82`, `M:content-models.md:250-252` | External kinds are "checked against [their] `text` template"; the key was renamed `template:` and the example four lines up uses it. `R:glossary.md:57` says "a text template" too. | "its `template`". |
| C13 | `R:queries.md:186-202`, `:220-221` vs `R:queries.md:20-23`, `M:selectors.md:139-141` | "Rivière owns a small, exact selector language" and "vocabulary [is] a reason for an engine" predate Marquise owning the grammar and "vocabulary" meaning registered steps. The word now means two things on one page. | Rewrite the section: "capabilities in Marquise's grammar, vocabulary registered, operators beyond that in an engine". |
| C14 | `R:corpus.md:116` vs `R:corpus.md:143` | CSV, TSV and NDJSON come "from the `formats` plugin", then are "built in". | "YAML and JSON built in; CSV, TSV and NDJSON from `formats`". |
| C15 | `R:corpus.md:53-54`, `:58` vs `R:corpus.md:102`, `R:docs-site-as-shapes.md:164-165`, `R:glossary.md:43` | The glossary collection derives ids `from: 'term'` and orders by `'term'`; everywhere else it is `term.name`. `term` is a paragraph field with two members. | `term.name` in both lines. |
| C16 | `R:cli-and-mcp.md:16` vs `M:extending.md:172`, `R:site-builder-as-shapes.md:218`; `M:validation.md:80` | `riviere fix spec-status-lag` (positional, unscoped) against `riviere fix --finding migration-applied`; rule ids are scoped (`spec/spec-status-lag`). | One form: `riviere fix [--finding <id>]`, scoped ids. |
| C17 | `R:references.md:229`, `R:events-as-shapes.md:245` vs `R:references.md:239-240`, `M:syntax.md:201-202` | Two names for one function: `nextOccurrence(schedule, now)` and `nextAfter(start, days(7), now)`. | Use `nextAfter` in both examples, or say the first needs the recurrence type. |
| C18 | `M:syntax.md:138` vs `R:queries.md:83-84` | CEL names a corpus layer reserves: three (`links`, `now`, `today`) against four (plus `entity`). | Four. |
| C19 | `M:syntax.md:143` vs `M:syntax.md:202` | Amounts are "a custom type with functions" and "a map with `value` and `currency`"; the spike found custom types unusable on one implementation. | Keep the map; drop "custom type". |
| C20 | `M:api.md:5-6` vs `M:api.md:8-9` | MCP tools generated from the table is a leaning, then decided, in adjacent paragraphs. | Decided. |
| C21 | `M:api.md:26`, `M:commands.md:41`, `R:corpus.md:11` vs `M:api.md:69-70`, `R:writing.md:5-7` | "The only async step" is said of `load` beside awaited `edit`, `update`, `fill`, `rebase` and every Rivière write. | "the only async step when reading". |
| C22 | `M:content-models.md:359-360` vs `M:shapes.md:179-180` | "A structural choice between models is declared, and the generated type is a union" has no syntax and reads as the variants `shapes.md` rules out. | Remove it, or say it means `match: a \| b`. |
| C23 | `M:principles.md:11-13`, SPEC-199:101-103 vs `M:scope.md:38-44` | "A feature moves into Marquise only when it is implemented in refrakt"; the scope page lets un-graduated features live in 0.x packages "beside Marquise", and the write path is designed against Rivière, not refrakt. | Reword the principle: graduation into `marquise`, with 0.x packages as the waiting room. |
| C24 | SPEC-199:116-133, `:155`, `:731` vs `M:scope.md:20-21` | The spec's 1.0 table lacks `extends`/`abstract` and the migrations read half; "Migrations" is wholly after 1.0 there; the acceptance criterion says 1.0 contains "exactly" the table. | Update the table from `M:scope.md` (again). |
| C25 | `M:trust.md:67-71` | "Content-model patterns … run on untrusted text … plain matching is preferred anyway" describes patterns that *read* content; since Q8 a `pattern` only constrains a value (`M:content-models.md:361-363`). | Reword: "`pattern` on attributes and fields, and regular expressions in selectors". |
| C26 | `M:content-models.md:85-86` vs `M:writing.md:89-91` | "Writing never needs an explicit slot" against "falls back to an explicit slot … for overlaps the shape acknowledges". | Add "unless an overlap is acknowledged" to the first. |

### Low

- **`M:shapes.md:152`** lists `examples` as a key; examples are body blocks. (checked)
- **`M:prior-art.md:30`** says "Marquise's write templates"; `M:scope.md:32` says write templates do not exist.
  `M:prior-art.md:39` sends the reader to `syntax.md` for Djot, which that page never mentions. (checked)
- **`M:explicit-slots.md:35-36`**: "whether Markdoc's slots are stable or experimental is still to be
  confirmed", while `M:syntax.md:29` builds 1.0 on them. Confirm, or mark the risk on the scope page. (checked)
- **`M:trust.md:50-53`** shows `values` (a binding) and `contentValues` (configuration,
  `M:configuration.md:17`) in one object. (checked)
- **`M:trust.md:56`**: the allowlist "governs functions the host registers for content", against "no general
  functions in content" (`M:syntax.md:119`). (checked)
- **`M:syntax.md:83-84`** switches off "indented code … and raw HTML"; the spike also switched off setext
  headings (spike FINDINGS, "What was built"). (checked)
- **`R:plugins.md:37`**: plugin findings are "under the plugin's prefix"; the first-party ones are not
  (`transition-refused` from `workflow`, `link-suspect` from `trace`, `R:findings.md:39`, `:52`). (checked)
- **`R:plugins.md:76`**: prose follows the closing code fence on the same line, so the fence does not close
  and the rest of the page renders as code. (checked; CommonMark behaviour recalled)
- **`R:site-builder-as-shapes.md:250-251`**: "`rebase` in Marquise with the write path" is listed as later
  than the write path the same page uses; `:255-259` lists four decided items under "Not yet writable".
  (checked)
- **`R:/README.md:102-103`**: the fifth domain is listed before the fourth; `R:/README.md:112-121` has no row
  for `@riviere-md/tree`, `workflow` or `formats`, which ship in the first release (`R:plugins.md:47-49`).
  (checked)
- **`M:/README.md:153-166`** has no `@marquise-md/deferred` (`M:scope.md:39`), and the CLI row omits
  `flatten` (`M:commands.md:20`). `M:scope.md:28` omits `schema` and `check`. (checked)
- **Opposite examples for one shape:** `testimonial-card` renames `name` to `author` in
  `M:extending.md:153` and `author` to `name` in `R:site-builder-as-shapes.md:212`. (checked)
- **SPEC-195:82** dates the spike 2026-11-24; the spike says it ran on 2026-11-23. (checked)

### `$` names and reserved names

- **"Every `$` name, in one place"** (`R:queries.md:65-81`) lacks `$text` (`M:shapes.md:118`, in `fills`) and
  `$locale` (`M:api.md:122`, `M:records.md:86`). `$locale` is a host value, `$today` a registered built-in
  (`M:selectors.md:167`); the docs never say that these are two mechanisms sharing one sigil. (medium,
  checked) *Fix:* add both rows and a sentence on host values against built-ins.
- **Built-in counts disagree by construction:** `R:scope.md:47` counts seven core built-ins; `$input` and
  `$new` (`R:queries.md:79-80`) are counted nowhere. `R:corpus.md:186` and `R:glossary.md:34-35` list three.
  (low, checked)
- **Reserved names are stated in four places with four lists:** `shape`, `id`, `address`, `slot`, `lang`,
  `has`, `all` (`M:shapes.md:55`); `shape`, `id`, `lang` (`M:shapes.md:107`); `has`, `all`
  (`M:selectors.md:133`); `now`, `today`, `links`, `entity` (`R:queries.md:83`). None covers the names
  records already own inside rich text (`markdown`, `syntax`, `text`, `shapes`, `nodes`, `M:records.md:122-126`).
  `statement.text` in a selector (`R:traceability-as-shapes.md:103`) is the rich-text member, but "inside a
  block field, a name is a shape" (`M:writing.md:34`), so a shape called `text` or `shapes` is ambiguous.
  (medium, checked) *Fix:* one list in `M:shapes.md`, with what a layer adds; reserve the rich-text members
  as shape names.
- **CEL has reserved words of its own** (`in`, `as`, `if`, `for`, `function`, `import`, `namespace`,
  `package`, `return`, `var`…; recalled), and `M:syntax.md:137` says values are "plain dot paths". A field
  named `package` or `namespace` cannot be read that way; the getting-started shape has an attribute `type`
  (`M:getting-started.md:19`), CEL's type function (recalled). *Fix:* say how such a field is reached
  (index syntax on a record variable), or report it when `computes` is used. (low)

### Words that gained a second meaning this session

Checked; none is wrong alone. `extends` (a shape, `M:shapes.md:29`; a config file,
`R:configuration.md:11`); `from` (a migration's old tag, `M:extending.md:144`; a rule's old version,
`R:references.md:331`; a derived id, `R:corpus.md:53`; a parent, `:81`; a binding's source,
`M:rendering.md:94`); "capability" (installed into an instance, `M:api.md:39`; declared by a source,
`R:corpus.md:411`; a shape's `provides`, `M:shapes.md:185`; `requires: trusted`, `M:trust.md:64`; "capabilities
in core", `R:queries.md:188`); `rebase` (by span then address, `M:api.md:111-113`; by value,
`R:writing.md:195`); "version" (a document's content hash, `M:writing.md:56`; a source's version,
`R:corpus.md:322`; the LSP counter, `R:writing.md:92`; an attribute of `spec`, `R:plan-as-shapes.md:140`);
"template" (`template:`; `compose` templates; a site builder's site templates; per-item templates);
"resolver" (`R:glossary.md:108-109` admits two); "patch" (a diff; "a patch of several attributes",
`M:extending.md:132`; `update(collection, id, patch)`, `R:cli-and-mcp.md:61`); plugin, satellite, kit, corpus
definition and extension as five kinds of package.

---

## 2. The worked pages as fixtures

### Site builder (`R:site-builder-as-shapes.md`), new

| # | Sev | Line | Uses | Problem | Fix |
|---|---|---|---|---|---|
| F-S1 | high | 228 | `untrusted: true`, untrusted shapes | No such option; configuration has `"trust": "untrusted"`. Untrusted shapes are undefined (C1). | Use the config key; define the mode. |
| F-S2 | high | 140, 166-170 | `"plugins": ["tree", "workflow"]`, no `plugins` binding | Names are package names and implementations are bindings (`R:configuration.md:12`, `:27`, `:35`); as written this is `config-unregistered`. | Full names, and `plugins: [tree(), workflow()]` in `createRiviere`. |
| F-S3 | high | 49, 62 | `{% hero tone="warm" %}`, "the platform's template kit" | `tone` is a dimension; kits and dimensions are after Marquise 1.0 (`M:scope.md:52`) and absent from "What this page uses" (`:248-251`). | Add to the "later" list, or use a declared attribute. |
| F-S4 | med | 146, 121 | `id: "{published:date}-{title:slug}"` | An id pattern is "filled in once, when an entity is created" (`R:corpus.md:100-101`); `published` is optional and a draft has none. | Use `{n}` or a slug, or say what an unfillable pattern does (a finding id). |
| F-S5 | med | 142-145, 188 | `w.create('page', { title: 'Workshops' })` | The `page` collection has `path` and no `id`. Nothing says how a new entity's id is made when ids come from paths (`R:corpus.md:66`, `:100-103` cover patterns and `from` only). Same gap in the docs site. | Define it: `create` takes an id, or `id: { from: 'title' }` composes with `{id:path}`. |
| F-S6 | med | 168-169 | `storeSource`, `storeSink` | Neither exists in the first release (`R:corpus.md:420-422`); the page says so at `:250`, yet calls itself "a test fixture for the store seams" (`:5`). | Write the fixture with the in-memory source and sink; keep SQL as the illustration. |
| F-S7 | med | 153-154 | `"actors": ["owners", "editors", "contributors"]` | The policy takes "`agents`, `people`, or a name" (`R:writing.md:154`); a list of actors, and host groups in the policy, are defined nowhere but `R:corpus.md:430-431` in passing. | Add groups and lists to the policy's definition. |
| F-S8 | med | 218-219 | `riviere fix --finding migration-applied` | Flag not in the CLI page (C16). Also assumes the fix can be applied to every instance; a block used in a read-only data file cannot be written (`R:corpus.md:139-142`). | Document the flag; say what `migration-unused` does when instances are unwritable. |
| F-S9 | med | 220 | drafts "get the same findings and fixes when they are reopened" | A stored changeset holds *operations at addresses* (`R:writing.md:50-51`); an operation naming `author` is not content and gets no finding. See M-3. | Define it or drop the bullet. |
| F-S10 | low | 232 | `rv.moveVersion` on a store | "Moving names through git and store sinks" is later (`R:scope.md:17`); not in the page's "later" list. | Add it. |
| F-S11 | low | 244 | "apply the inverse changeset" | Only `diff.toChangeset()` exists (`R:corpus.md:340`). | Say `c.diff(old).toChangeset()`. |
| F-S12 | low | 67-68 | "`computes` is bounded CEL" | True of the profile, but `computes` is a separate package after 1.0 and the block shown uses none. | Drop, or show one. |

### Traceability (`R:traceability-as-shapes.md`)

- **F-T1 (high, checked).** `:111` `transitions` outside `workflow:` (C6).
- **F-T2 (high, checked).** `:107` `riviere: { fingerprint: [statement] }` is the `trace` plugin's key, placed
  later; by `R:plugins.md:24-26` a plugin's keys sit under its own name and "a key whose plugin is not
  installed is a finding". `:159` `as: fingerprint, of: req` needs a registered value type (C7). The fixture
  therefore loads with findings in the first release, against `:249-250`.
- **F-T3 (medium, checked).** `:186` `tree:` and `:188` an NDJSON collection need the `tree` and `formats`
  plugins; "What this page uses" (`:245-247`) names neither, and no `plugins` key is shown.
- **F-T4 (medium, checked).** `:190` `versions: { … }` is a config key the size table does not count
  (`R:scope.md:45`).
- **F-T5 (low, checked).** `:103` `-statement.text:/\bshall\b/` relies on a rich-text member as a path step
  (see reserved names) and on a regular expression in a 1.0 rule, so 1.0's core needs a linear-time regular
  expression engine (D-4).
- **F-T6 (low, checked).** `:237` answers a question with `link-suspect` findings, which are later; mark the
  row.

### Plan (`R:plan-as-shapes.md`)

- **F-P1 (medium, checked).** `:157-160` declares `key: key` inside `repeat:`; Marquise's own example of the
  same model omits it and still addresses `decisions["D3"]` (`M:content-models.md:165-170`). One of the two
  is wrong. *Fix:* add `key: key` to Marquise's example and say it is required for keyed sections.
- **F-P2 (medium, checked).** `extends` is "in 1.0 if proven … plan's corpus as the test" (`M:scope.md:20`,
  `M:shapes.md:123-124`), but the page never uses it: `work` and `bug` repeat `assignee`, `milestone`,
  `source`, `pr`, `formerly`, `blocked-by` and `blocks` verbatim (`:59-65`, `:82-94`, `:178-197`). The one
  use is three lines in `R:plugins.md:71-75`. *Fix:* an abstract `plan-item` base on this page, so the
  acceptance test exercises add-and-narrow, `to: [plan-item]`, and a rule declared once.
- **F-P3 (medium, checked).** `:267`, `:278`: one rule declared on `work` and `bug` with the union of both
  shapes' status values (`status:done,fixed`). Selectors are "checked against the shape"
  (`M:selectors.md:79`, `:154-155`); whether a literal outside a field's `matches` is an error is not said.
  If it is, the table cannot be written as shown.
- **F-P4 (medium, checked).** `:249` `push: true` on a saved write is a git action in a core config key; it
  is defined only in prose (`R:queries.md:283-284`) and has no meaning on a sink that is not a checkout
  (M-5).
- **F-P5 (low, checked).** `:94` `inverseOf: blockedBy` writes the data name in a shape file, where names are
  kebab-case and camelCase "is reported" (`M:shapes.md:52-53`). Say whether values that name fields follow
  the rule.
- **F-P6 (low, checked).** `:313` "the codemod from wrapper tags to document shapes" is not expressible as a
  migration in either tier (`M:extending.md:132-138`: tags, attributes, values, slots and frontmatter keys
  renamed). It is the 1.0 exit test for document shapes (`M:scope.md:108`). Say it is a one-off script, or
  add "a tag unwrapped into a document shape" to the tiers.
- **F-P7 (low, checked).** `:71`, `:150`: a content field named `summary` beside the shape key `summary:`.
  Carried over.

### Docs site (`R:docs-site-as-shapes.md`)

- **F-D1 (medium, checked).** `:170` `template: '{path}'` for `repo-file`. "Other placeholders never" contain
  `/` (`R:corpus.md:92-93`), so `src/load.ts` does not fit unless that rule is only for collection paths.
  *Fix:* `{path:path}`, or scope the rule.
- **F-D2 (medium, checked).** `:160-163` same gap as F-S5: a page's id on `create`.
- **F-D3 (low, checked).** `:114` `summary: [term.name]`: a path in `summary`; `M:shapes.md:37` says
  "fields".
- **F-D4 (low, checked).** `:209` quotes `"repo-file:src/load.ts"` where the quoting rule needs no quotes
  (`M:selectors.md:84-87`) and `R:references.md:99` writes the same form bare. Harmless; pick one.

### Events (`R:events-as-shapes.md`)

- **F-E1 (low, checked).** `:178` a CSV collection needs `formats`; `:228-229` lists CSV as first release
  without the plugin.
- **F-E2 (low, checked).** `:133-135` declares `note` `optional: true` inside `[? … ]`;
  `R:references.md:142-145` and `M:content-models.md:247` leave members of an optional group undeclared as
  optional. Say whether a group makes its members optional.
- **F-E3 (low, checked).** `:245` `nextOccurrence` (C17).

### In the concept pages' own examples

- **`M:content-models.md:284`, `M:commands.md:44`**: `{name:format}` and `{title:slug}` are named in
  Marquise, but the formats (`date`, `year`, `month`, `slug`, `path`) and "`:slug` is never read back" are
  defined only in `R:corpus.md:88-93`. The engine is Marquise's and public in 1.0. (medium, checked) *Fix:*
  move the format list to Marquise, or say formats are registered by the host.
- **`M:selectors.md:72`, `:81`** use `+6h` and `-30d`; the units (`min`, `h`, `d`, `w`, `mo`, `y`, with calendar
  months) are defined only in `R:queries.md:130-131`, and the grammar's `duration` (`M:selectors.md:107`) is
  not Marquise's `duration` value type, which has no months. (medium, checked)
- **`M:selectors.md:127`** explains `fields`, a Rivière attribute. (low, checked)
- **`M:syntax.md:137`** gives `node.label` as a path; `node` is defined nowhere. `M:syntax.md:153`
  `selects(x, "status:done")`: nothing says what names the record itself (the spike used `attrs`).
  (medium, checked)
- **`M:rendering.md:169`** `items: { property: hasPart }`: where this key sits (inside `schema:`?) is not
  shown. (low, checked)
- **`M:schema.md:14`** and `M:writing.md:54` name a `create` operation ("create from a shape");
  `M:commands.md:38-49` has none, and `convert` (`M:writing.md:101`), `toPointer()` (`:40`) and the
  engine's read and write calls are missing too. Rivière's `c.create` depends on it. (medium, checked)
- **`M:validation.md:88-90`**, `M:glossary.md:68`: a registered check "which a shape names"; no key is
  shown, and none is counted on the scope page. Same for `preprocess: include` (`M:extending.md:18`),
  `requires: trusted` (`M:trust.md:65`), `strict: false` (`M:content-models.md:95`) and `prepare`
  (`M:extending.md:10`). (medium, checked)

---

## 3. Scope and timing

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| S1 | high | `M:extending.md:169-170`, `:183-184`; `M:validation.md:28-30`, `:83-84`; `M:scope.md:21`, `:48` | 1.0 (if proven) ships `migration-applied` findings and rule `fix`es whose content is edit operations; findings' "ids, severities and parameters" are a frozen contract (`M:principles.md:57`). The operations are designed with the write path, after 1.0, in a 0.x package. | Freeze only a fix's *description* in 1.0 (a kind and an address), and mark the operation payload unfrozen, as the trace's JSON is. |
| S2 | high | `M:scope.md:86-88` | The size table lists 13 content-model keys. The pages also use `zones`, `name`, `primary`, `preamble`, `group`, `position`, `min`, `max`, `deprecated`, `content`, `to`, `matches`, `format`, `before`, `after`, `write`, `plain` (on a field), `strict`, and shape keys `strict`, `requires`, `preprocess`, `prepare` and the check key (`M:content-models.md:45-49`, `:95`, `:117-122`, `:139-147`, `:163`; `M:shapes.md:148`; `M:writing.md:142`; `M:rendering.md:74`; `M:records.md:80`). The table is the stated early warning. | Regenerate it from the pages; count per release. |
| S3 | high | `R:scope.md:44-49` | `symmetric` is in the first release (`R:scope.md:19`, `R:references.md:207`) and not among the five `riviere:` keys. Config keys `extends`, `plugins`, `marquise` (`R:configuration.md:10-12`), `versions` (`R:corpus.md:326-327`) and `history` (`R:corpus.md:202-203`) are not among the six. Saved-write keys (`require`, `set`, `input`, `push`), policy keys and `into`'s members are not counted at all. | Same. |
| S4 | med | `M:commands.md:44` vs `M:content-models.md:286-287`, `M:writing.md:132` | `template(source)` "to read values from text and write them back" is 1.0; only heading templates are certain for 1.0 and writing is after 1.0. Rivière's first release reads and writes paths with it. | 1.0: parse and read; write with the write path. Say paths are the plain-text case and are in 1.0. |
| S5 | med | `M:extending.md:174-175` vs `M:scope.md:50`, `M:api.md:55-56` | A 1.0-if-proven migration may transform values "by CEL … with the installed `computes` capability", a package after 1.0. `computes-unavailable` covers only shapes declaring `computes`. | Maps only in 1.0; CEL in migrations when `@marquise-md/cel` graduates, with its own finding. |
| S6 | med | `M:scope.md:39`, `R:scope.md:8-11` vs `M:api.md:42-45`, `M:commands.md:46`, `M:/README.md:153-166` | `@marquise-md/deferred` exists on the scope pages only. Nothing says how `fill` is installed (it is not in the capabilities table), and `rebase` is not listed under `writer`. | Add `deferred` (and `rebase`) to the capabilities and package tables. |
| S7 | med | `R:scope.md:17` vs `R:corpus.md:328-330` | `moveVersion` "where the source can" is first release; "moving names through git and store sinks" is later. So in the first release only the in-memory source moves names, and the capability is described on sources while the move goes "through the sink". | Say so in one sentence; decide whether moving is a source or a sink capability. |
| S8 | med | `M:scope.md:22`, `M:selectors.md:6-7`, `:173` | `@marquise-md/selectors` is a package "core depends on", in 1.0 "if rules are", yet "`data`-style directives and CEL's `selects()` use the package either way". Whether 1.0 ships it when rules are not proven is not said; nor why something core depends on is a separate package under a principle of a small core. | State both. |
| S9 | med | `M:commands.md:20` | `marquise flatten` writes a shape file in 1.0; nothing says what happens to the base's migrations, rule ids (`base/rule` or `shape/rule`) and examples in the flattened file. | Define, or move after 1.0. |
| S10 | low | `M:principles.md:57` | "Edit operations … MCP tools" are listed as public contracts with no release; both are after 1.0. | Mark them. |
| S11 | low | `M:scope.md:99-108` | The exit tests have no row for the "if proven" items (`extends`, migrations, rules, item templates): what "proven" means is given only as a consumer, not a test. | One row each. |

---

## 4. The new mechanisms as a whole

**M-1. A migration on an abstract base.** *Implied:* it applies to every descendant
(`M:shapes.md:167-168`, `M:extending.md:179`). *Silent on:* (a) `from: <tag>` onto an abstract base, whose
result is `shape-abstract`; (b) a base value map whose target a descendant narrowed away ("the result must
validate against the current form", `M:extending.md:165-166`: reported under which id?); (c) a base renames
`name` to `author` and a project's extension later adds its own `name`: the current form now accepts
`name=`, so the migration "applies only where the current form rejects" and old content is silently
re-read with a new meaning; (d) which shape scopes the finding and where an abstract base keeps the example
the exit test demands, since it cannot be written as a tag; (e) `until: unused` on a kit's base: unused in
whose corpus. (high for (c), medium otherwise, checked) *Fix:* refuse an added name that a live migration of
the chain still maps (`extends-migrated-name`); state (a), (b), (d), (e).

**M-2. An extension's added field against the base's content model.** *Implied:* chains are "analysed
flattened (so an added field that steals a base field's content is caught)" (`M:shapes.md:159-160`), with
`before:`/`after:` placement (`:148`). *Problems:* (a) "every instance of an extension is a valid instance
of its base" (`:142-143`) is false at source level: read by the base, an added attribute is
`attribute-unknown` and an added field's node is unmatched or taken by a base field. It holds only for
records. (b) Narrowing "optional to required" on a field carrying `shadows:` leaves the base's `shadows:`
naming no overlap (`shadows-unused`), which the extension cannot remove. (c) A strict overlap between an
added field and a base field can be fixed only by `shadows:` on whichever comes first; if that is the base
field, the extension must change a base field, which is neither adding nor narrowing. (d) SPEC-201 never
mentions `extends`, `before` or `after`. (medium, checked) *Fix:* say "valid as a record of its base";
let an extension add or drop `shadows:`; add the placement keys to SPEC-201.

**M-3. `rebase` across a migration.** *Implied:* nothing. `rebase(result, newSource)` re-resolves "by
address" (`M:api.md:111-114`); a result carries a content hash of the document, not of the shapes
(`:113-114`); a changeset's `expectedHashes` are files' (`R:writing.md:54`). After a shape renames an
attribute, a stored operation at `…author` names an address that "checks against the schema"
(`M:writing.md:32`) and fails. The site builder asserts the opposite (F-S9). (medium, checked) *Fix:* edit
results and changesets carry the shapes' hash; rebase maps addresses through declarative migrations where
it can and refuses with a named finding where it cannot.

**M-4. A template on an extended shape.** *Silent.* `compact`, `provides`, `dimensions`, `strict` and
`requires` are missing from the extension table (`M:shapes.md:145-152`). A field's `template:` is a string:
changing it is neither adding nor narrowing, so by `:154` it is `extends-widens`, which means an extension
that adds an item member cannot put it in the template. And a base "stands for its descendants"
(`:162`) while a bare shape name matches "a track in any of its forms" (`M:content-models.md:304-306`): with
`match: audio-item`, a list item may fit several descendants' compact templates and nothing picks one.
(medium, checked) *Fix:* add the rows; let an extension replace a template only when the new one reads
everything the old one read (checkable at load); refuse a bare abstract name where compact forms overlap.

**M-5. A sink without a capability a feature assumes.** *Implied:* "a feature needing a capability its
source lacks gives a finding" (`R:corpus.md:412-413`). *Silent on sinks:* only sources have a capability
list (`R:corpus.md:411-412`), though the scope page says "sources and sinks … with declared capabilities"
(`R:scope.md:25`). Undefined on a store or in-memory sink: `push: true` on a saved write
(`R:queries.md:279`); `rv.apply(cs, { git: true })` (`R:/README.md:36`); the policy's `confirm`, which
"opens a pull request" (`R:corpus.md:435`); binary files (`R:writing.md:82-84`); moving a name. The one
catalogued id, `history-unavailable`, is worded "git history is too shallow" (`R:findings.md:23`).
(medium, checked) *Fix:* a sink capability list (atomic apply, commit, push, propose, binary, move names),
and one finding, `capability-unavailable`, naming the feature and the seam.

**M-6. Capabilities, async and sync.** See the third of the five. Also: the loader form of a capability is
"resolved on first use by an async method" (`M:api.md:47-48`); for `computes` the first use is a shape
loading, which has no stated moment. `c.document(entity)` (`R:corpus.md:169`, `:291`) is not said to be
async. (medium, checked) *Fix:* `await createMarquise(…)` or an explicit `await mq.ready()` returning shape
findings; `await c.with(cs)`; say `loadSnapshot` is async and recomputes records, or store records.

**M-7. Named versions with everything else.** `rv.load({ at })` is "read-only" (`R:corpus.md:13`); a
working copy starts from `rv.load()` only, so a draft against `staging` is not expressible. A config's
`extends` replaces lists (`R:configuration.md:39-40`): a project that lists any plugin drops the ones its
corpus definition needs, and the definition's `workflow:` keys become findings. Rivière never states its
"own rules" for merging `riviere:` when a shape extends another (`M:shapes.md:151`): whether a project may
change an inherited `transitions` map or `inverse`. (medium, checked) *Fix:* union for `plugins`; a
paragraph in `R:plugins.md` on `riviere:` under `extends` (add and narrow, as core).

**M-8. Rule ids under `extends`.** Ids are "scoped by its shape" (`M:validation.md:80`); a base's rule firing
on an `episode` is `audio-item/x` or `episode/x`, not said. CI gates read ids. (low, checked)

---

## 5. Design risks

- **D-1. Marquise 1.0 is no longer small.** (high, checked) Since the 21st, 1.0 gained, as "if proven":
  `extends` and `abstract`, the migrations read half, `marquise flatten`; and firmly: a public template
  engine, a public selector vocabulary API, three published descriptions with a structured-output profile,
  `marquise check`, `schema`, `explain`. Four items are "if proven" (`M:scope.md:19-22`), each designed within
  the last four days, against "1.0 ships what is built and settled" (`M:principles.md:10`). Marquise now
  defines four languages besides Markdoc: the content-model YAML, selectors (an EBNF with step functions,
  closure and date arithmetic, `M:selectors.md:100-117`), templates (typed consumption, optional groups,
  format specs, `M:content-models.md:250-287`) and a CEL profile. *Fix:* give "if proven" a cut-off date and
  a default of "not in 1.0"; ship selectors without step functions and arithmetic in Marquise's own 1.0.
- **D-2. The selector grammar is ambiguous around `-` and `.`.** (medium, checked) Names may be kebab-case
  in selectors (`M:selectors.md:26`), and "`+` or `-` followed by a digit is arithmetic" (`:119`); the
  stated disambiguation covers `+` only. `$this.start-6h`, `$today-30d`, a literal `2026-12-01`, an id
  `WORK-12` and an event id `2026-12-12-winter-jazz-night` all contain `-` followed by a digit; `bare`,
  `name` and `duration` have no lexical rule (`:108-116`). Third-party names are prefixed with a dot
  (`acme.related()`, `$acme.score`, `:146`, `:151`, `:162`), which the grammar reads as a path of two steps
  (`:109-113`). *Fix:* lexical rules for `bare`, `name` and `duration`; a shift only directly after a
  built-in or path on the right-hand side; a prefix separator that is not `.`.
- **D-3. Migrations "apply only where the current form rejects".** (high, checked) Besides the frontmatter
  case in the five, a mapped value that is still allowed, or an old tag name that a project has since reused,
  is never migrated and never reported. *Fix:* a migration states its own match (an old name present), and a
  form both the migration and the current shape accept is a finding.
- **D-4. An unnamed linear-time regular-expression engine sits in 1.0's core.** (medium, checked) `pattern`
  and selector regexes "run with a linear-time engine" (`M:trust.md:69-70`, `M:selectors.md:91-92`), in a
  pure core with a browser size budget (`M:api.md:67`, `:89-92`). The CEL spike measured `@bufbuild/re2`
  alone at 16 kB gzipped and refused `matches()` because cel-js has no such engine (`M:syntax.md:180-182`).
  If Marquise has the engine for selectors, the refusal needs another reason; if it does not, the trust
  claim is unbacked. *Fix:* name the engine, count it in the budget, or make regexes a capability.
- **D-5. Dates in CEL depend on a zone Marquise has no input for.** (medium, checked) Dates map "onto a
  timestamp at the start of the day in the host's zone" (`M:syntax.md:142`); neither the configuration nor
  the bindings has a zone (`M:configuration.md:10-19`, `M:api.md:118-127`), and determinism is defined over
  "content, shapes, kit versions and host values" (`M:principles.md:59`). *Fix:* a `timezone` configuration
  key in Marquise, UTC by default, which Rivière's key sets.
- **D-6. cel-js passes 37% of CEL's optionals suite and 73% overall** (spike FINDINGS, "Conformance"), and
  the profile includes optional values (`M:syntax.md:136`, `:197`). "A true subset of CEL, to which its
  conformance tests apply" (`:144`) holds only with a deviation list. (medium, checked) *Fix:* publish the
  list with the profile, and keep optionals out until their suite passes.
- **D-7. The locator's 99.4% is refrakt's corpus only,** and the spike lists as not tested: escapes and
  entities in attribute values, nested fences, footnotes, large files (spike FINDINGS, "Not tested").
  `M:syntax.md:92-104` reports the numbers without the caveat. (low, checked)
- **D-8. Rivière's breadth moved into plugins but not out of the first release.** Three plugins, a
  satellite, the Astro loader, MCP, the working copy, versions with a structural diff, the write policy and
  five deferred shapes are all first release (`R:scope.md:13-25`), on top of a Marquise write path that is
  0.x. `R:plugins.md:57-59` proves the plugin seams with first-party code that still ships together.
  (medium, checked) *Fix:* state which of these plan's rebuild needs; cut the rest to "when a consumer
  asks".
- **D-9. Plugin findings and core rules share one catalogue with no namespace** (`R:plugins.md:37` against
  the ids in use). A third-party `tree-cycle` collides. (low, checked)
- **D-10. `extends` across kits makes a base's every change a breaking change for unknown projects**
  (`M:shapes.md:167-168` says so for required attributes only). Adding an optional attribute or a field can
  collide with a name an extension already added. (medium, checked) *Fix:* say kits' abstract bases follow
  semver with "any added name is a minor change that may break extensions", or reserve a prefix for
  extensions' names.

---

## 6. Anything else

**Findings described with no id.** Both catalogues say "every finding" (`M:findings.md:3`,
`R:findings.md:3`). Checked, with no id in either:

- Marquise: a write to a read-only field (`M:writing.md:105-107`); a stale batch and overlapping targets
  (`:56-57`, `:65`); a failed fallback "refused with a finding" (`:89-90`); `rebase` refused "with a finding"
  (`M:api.md:113`); duplicate keys "reported" (`M:writing.md:36`); a selector whose types are not comparable
  (`M:selectors.md:79`); a template failing its load checks other than ambiguity
  (`M:content-models.md:275-277`, `M:writing.md:152`); an instance a migration cannot carry
  (`M:extending.md:166`); an expired migration (`:177`); `requires: trusted` "disabled with a finding"
  (`M:trust.md:64-65`); prototype keys "rejected with a finding" (`:61-63`); the size, depth and count limits
  (`:66`); two packages claiming a namespace (`M:extending.md:50`).
- Rivière: a stale changeset (`R:writing.md:199-200`); `delete` refused while backrefs exist (`:15`); a
  write refused because a reference is ambiguous (`:173-174`); the bulk ceiling and skipped entities
  (`:125-133`); `apply` refused pending confirmation (`:89-91`); a rename without a former-ids field "warns"
  (`R:corpus.md:252-253`); a plugin key whose plugin is absent (`R:plugins.md:25-26`); the fallback to
  endpoints "reported as info" (`R:references.md:359`); a bad overlay value (`R:corpus.md:367`); a refused
  write to a data file (`R:corpus.md:141-142`); the finding shared by an unreadable and a missing reference
  (`R:shapes.md:102-104`).
- `selector-no-actor` is in Marquise's catalogue (`M:findings.md:71`) for a built-in only Rivière registers.

**Undefined or thin terms.** (checked) "Preset" (`M:extending.md:88`, `M:scope.md:52`); "binding" has a
section but no glossary entry; "capability", "locator", "reader", "printer", "authoring grammar", "input
schema", "profile" and "vocabulary" are missing from `M:glossary.md`; "kit" and "satellite" are there.
`M:glossary.md:74-75` still says a rule's "name is its finding id", unscoped. Rivière's glossary lacks
"store", "document key", "capability", "projection" in the sink sense (`R:corpus.md:417`) and "draft".

**Smaller things.** (checked)

- `M:content-models.md:316-319`: a sentence with two "because" clauses and no join.
- `M:content-models.md:325-328`: the paragraph introducing the example ends in a colon and is followed by a
  different paragraph, then the example.
- `M:content-models.md:8`: "matching rules are decided (SPEC-201)"; the spec is `status="draft"` with an
  open question on content checks (SPEC-201:1, `:311-312`). Carried over.
- `R:shapes.md:63`: the generated-region marker writes the positional collection unquoted (`collection
  work`), where the tag quotes it. Carried over.
- `R:/README.md:36`: `rv.apply(cs, { git: true })`; `R:writing.md:18` defines no options.
- `R:prior-art.md:49`, `:19-20`: "Rivière's truth is the Markdown files" and "Rivière's selectors" predate
  stores and Marquise owning the grammar.

---

## 7. From the 2026-11-21 review: what regressed

1. **Scope tables obeyed by other pages** (its S1, C4, C15). Fixed on the 21st; reopened by this session:
   `fingerprint` (C7), `symmetric` and five config keys (S3), the content-model key count (S2), and
   SPEC-199's 1.0 table, which again lacks what `M:scope.md` added (C24).
2. **Worked pages load as written** (its point 2). Held for plan, docs and events. Regressed for
   traceability, which missed the `workflow:` move the notes record as "also aligned" (NOTES:3955-3956), and
   not met by the new site-builder page (F-S1 to F-S5).
3. **Overloaded words** (its section "One key, several meanings"). `text` was fixed; this session added
   `extends`, `from`, "capability", `rebase`, "version", "patch" and five kinds of package (section 1).
4. **`key` in nested sections** (its "`key`: … declare it"). Fixed in plan (`R:plan-as-shapes.md:158`), not
   in Marquise's own example (`M:content-models.md:165-167`).
5. **"The grammar comes after its catalogue"** (its regression 2). The catalogue's edge cases
   (`R:queries.md:223-229`) do not include this session's additions: `$shapes:`, registered step functions
   with arguments, dotted third-party names.
6. **Stale `text` template wording** (its Q1 rename): `R:references.md:96`, `R:glossary.md:57`.
7. **Command and package lists** (its regression 3). `M:commands.md` held; both READMEs' package tables fell
   behind again (`@marquise-md/deferred`, the three Rivière plugins).

**Held.** Links and anchors; every backticked finding id catalogued; rule ids scoped by shape;
`$this`/`$root` ownership; lists of references; exit codes; `rv.buffer`; `rv.load({ now })`; counts;
READMEs' concept tables; "after 1.0" naming its project.
