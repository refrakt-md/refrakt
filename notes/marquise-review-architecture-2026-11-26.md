# Architectural review: Marquise and Rivière (2026-11-26)

Scope: structure only. Consistency (contradictions, stale text, catalogue gaps) was not re-checked.

Citation legend:
- `M:` = `/home/user/marquise/docs/concepts/` (and `M:README.md` = `/home/user/marquise/README.md`)
- `R:` = `/home/user/riviere/docs/concepts/` (and `R:README.md` = `/home/user/riviere/README.md`)
- `L:` = `/home/user/refrakt/notes/marquise-foundation.md` (section 22)
- `refrakt:` = `/home/user/refrakt/`

Method: I read both doc sets and formed the views in sections 1-4 before opening the log; section 5 was written after. Refrakt's code was consulted only for seam realism; the counts quoted from it are from `grep` over `packages/runes/src` and `plugins/*/src`, not from a build or test run. Nothing was executed against the designs, since nothing is built.

---

## 0. Verdict

The centre of the design is sound and mostly proven: a deterministic, forward-only content model that turns prose into typed fields, findings with ids, and records as plain data. Around that centre the documents have accumulated roughly ten small languages, two plugin systems, thirteen first-party Rivière plugins and a write path, almost all marked "Decided" and almost none built. The evidence base is five spikes and one production resolver; the decision base is about fifty dated decisions, thirty-seven of them made on two days (section 5). The two things I would change before any code is extracted are (1) the 1.0 gate, which claims to freeze "the read path" but is in fact blocked on the entire stack, and (2) the order of proof: the cheapest experiment that could falsify the product (a project outside refrakt, written from the docs) is scheduled third, after the expensive extraction. The design is not wrong in shape. It is over-decided relative to what is known, and its smallest release is not small.

---

## 1. The five load-bearing decisions

### 1.1 A positional, no-backtracking content model, expressed declaratively in a shape file, is the frozen public format

- What it is: one cursor, fields in declared order, greedy, nothing given back (`M:content-models.md:23-36`); strict by default, overlaps are errors unless acknowledged (`M:content-models.md:85-89`); "the shape file is Marquise's most important public format" (`M:scope.md:87-88`).
- Evidence for: the strongest in either project. Refrakt's resolver reads every rune this way (`M:content-models.md:3-5`); the file exists (`refrakt:packages/runes/src/lib/resolver.ts`, 1,104 lines) and 106 source files call `createContentModelSchema`.
- Evidence against, which the docs understate:
  - The *algorithm* is proven; the *declarative file* is not. The docs say shape files are "built in refrakt, in a few definitions" (`M:scope.md:16`). I count three live composed definitions (`refrakt:plugins/marketing/runes/{hero,cta,testimonial}.md`) and one staged (`refrakt:site/staged-runes/steps.md`).
  - The revised syntax (combinators, `as`, item models, nested sections, `tag:` matches) is "to be built in refrakt first" (`M:scope.md:19`).
  - In refrakt, 102 schema files carry a programmatic `transform(resolved, …)` and 16 declare a `custom` content model (nav, tabs, form, conversation, budget, preview, symbol, feature, comparison, bento, map, storyboard, reference among them). The shape file has no place for that logic in 1.0: `computes`, `prepare` and `@marquise-md/compose` are all after 1.0 (`M:scope.md:72`, `M:scope.md:78`, `M:shapes.md:36-37`). The existing composed `hero.md` itself depends on a template body, which 1.0 forbids (`M:shapes.md:119-121`).
- Confidence: high that the matching rule is right; medium-low that a purely declarative grammar covers real shape libraries without the after-1.0 features; low that strict-by-default survives contact with 100 existing runes (the docs' own flagship example needs `shadows:`, `M:content-models.md:19`).
- If wrong: everything. Records, the input schema, generated types, addresses, the write path's writers and Rivière's entities are all derived from this grammar.

### 1.2 Markdoc is the only syntax, with the front end inside core behind an internal seam

- What it is: `M:syntax.md:3`, `M:syntax.md:37-48`. The interface is deliberately unpublished until a second implementation exists (`M:syntax.md:44-48`).
- Evidence for: all existing tooling and content is Markdoc (`M:syntax.md:17-23`); a spike ran the resolver on Comark's tree (`M:syntax.md:257-258`).
- Evidence against: the decision is less settled than its label. "A second syntax" waits for "the decision on which syntax is primary" (`M:scope.md:77`), and the renderer base (Comark's or refrakt's) is undecided (`M:rendering.md:28-39`). The resolver today imports Markdoc directly (`refrakt:packages/runes/src/lib/resolver.ts:8-9`), so syntax neutrality is a CI lint yet to be written (`M:syntax.md:38-39`). The public shape node carries Markdoc's own marker, `"$$mdtype": "Shape"` (`M:rendering.md:7`), while "public types never mention Markdoc's" (`M:syntax.md:39-40`); records carry `"syntax": "markdoc"` and raw Markdoc source (`M:records.md:17-21`, `M:records.md:140`), so every record consumer that renders rich text depends on the syntax.
- Confidence: medium-high for reading. The seam is in the right place (internal). The leak is in the data formats, not the code.
- If wrong: reading survives a second front end. Writing does not survive cheaply, because the consequence of choosing markdown-it-based Markdoc is the two-parser locator (1.4).

### 1.3 One address and one record model serve findings, records, edits, selectors and changesets, and are frozen at 1.0 before anything writes

- What it is: `M:writing.md:11-13`, "no sigils: attributes, fields and dimensions already share one namespace" (`M:writing.md:27`), shape names as path steps inside block fields (`M:writing.md:34-35`); rich text as `{markdown, syntax, text, shapes}` (`M:records.md:124-136`, still marked *Leaning*).
- Evidence for: none built. The scope table says "addresses new" (`M:scope.md:20`). The exit test is "a write-path prototype (not shipped) edits one attribute and one field by address" (`M:scope.md:139`).
- Evidence against: the single namespace is already paying a visible tax. The reserved-name list holds 7 field names, 5 shape names and 8 CEL names plus Rivière's (`M:shapes.md:66-75`), and every future selector prefix, CEL name or record member is a breaking change for shape authors after 1.0. Rivière's rebase refuses index addresses outright (`R:writing.md:220-223`), so the address form the 1.0 grammar produces by default for unkeyed lists is the one the write layer cannot use safely.
- Confidence: medium-low. This is the contract I would least like to freeze on a two-edit prototype.
- If wrong: this is the most expensive seam to move (section 2.3). Finding consumers, CI gates, Standard Schema paths, policy `fields` prefixes (`R:writing.md:173-176`), the Astro loader's `data`, saved fixes and every stored changeset hold addresses.

### 1.4 The write path is a lens: surgical text edits, verified by re-reading, refused when not provable

- What it is: `M:writing.md:73-107`; reader/locator/printer (`M:syntax.md:60-78`); verification outside the front end (`M:syntax.md:74-76`).
- Evidence for: two spikes. 99.4% tree agreement between markdown-it and micromark on 1,474 files, 11 of 11 edits verified (`M:syntax.md:92-102`). Verify-or-refuse is the right safety posture: a wrong locator cannot corrupt silently.
- Evidence against: one corpus, written by the same people who wrote the parser dialect; the docs list what was not tested (`M:syntax.md:92-93`, `M:scope.md:70`). Eleven edits measure *safety*, not *coverage*: nothing measures how often a real write is refused, falls back to an explicit slot (`M:writing.md:87-91`), or promotes compact to explicit. The property tests run over each shape's own examples (`M:writing.md:103-107`), which are few and author-chosen.
- Confidence: medium that it never corrupts; low that it writes often enough to carry what is stacked on it.
- If wrong (meaning: refusals are common): the following all degrade together, because each is "apply fixes through the write path": migrations' write half and codemods (`M:extending.md:242-244`), the promise of a codemod with every breaking change (`M:principles.md:15`), quick fixes, Rivière's entire second release (`R:writing.md:5`), plan's rebuild, and therefore Marquise's own 1.0 gate (1.6 below).

### 1.5 Rivière is an immutable whole-corpus snapshot, scanned not indexed, with everything derived per snapshot and one selector language as the declarative query surface

- What it is: `R:corpus.md:5-7`; "no query indexes and no query planner. A corpus of thousands of documents is scanned in milliseconds" (`R:README.md:59-61`, `R:queries.md:222-223`); selectors owned by Marquise, vocabulary registered by Rivière (`M:selectors.md:182-184`).
- Evidence for: refrakt's plan scanner and registry exist; one spike over 742 plan entities (`refrakt:spike/query-engines/FINDINGS.md:7`); generator timings on refrakt (`R:corpus.md:245-246`, `R:corpus.md:499`).
- Evidence against: the "milliseconds" claim has no measurement; targets are "set by the first measurement, then held" (`R:corpus.md:666-668`), which cannot fail. Meanwhile the design aims at "tens of thousands of entities" (`R:corpus.md:657`), code symbols (8,724 names in refrakt alone, `R:corpus.md:246`), every tracked file (`R:corpus.md:504`), commits, and many tenants per process (`L:3954-3955`). Per snapshot it computes inverses, merged edge sets, transitive closures (`R:queries.md:125`), tree positions, computed values in dependency order (`R:references.md:329-330`), plugin-derived members that may read findings (`R:plugins.md:40-44`), and promises that "a change invalidates exactly what depended on it" (`R:corpus.md:679-681`). That is an incremental computation engine. It is the hardest piece of engineering in Rivière and it has one paragraph.
- Confidence: high at plan's scale (hundreds of entities, one process); low at the scale and tenancy the worked domains assume.
- If wrong: the language server on every keystroke (`R:corpus.md:676`), the live loader, and the site builder. The files-and-git case survives.

### 1.6 Runner-up, and the one I would change first: the 1.0 gate

"1.0 is the read path" (`M:scope.md:8`), but the document-shape exit test "runs on plan's rebuild, Rivière's second release, which also needs the write path, CEL, selectors, `extends` and `workflow`, so 1.0's date depends on that release" (`M:scope.md:150-151`). Selectors freeze only after Rivière and plan have used them (`M:scope.md:49`). So the release that freezes the least is gated on the release that needs the most. Either the gate is honest, in which case 1.0 is the whole stack and should be planned as such, or one document-shape consumer that only reads (the docs site already is one, `R:scope.md:8-13`) is enough and the dependency on plan should be cut.

---

## 2. Coupling and seams

### 2.1 Where each knows too much about the other

Marquise knows Rivière:
- **Core's reserved names include a Rivière plugin's vocabulary.** `terminal` and `outcome` are reserved field names in Marquise's one list (`M:shapes.md:72-74`); they belong to `@riviere-md/workflow` (`R:references.md:500-503`), a plugin of the layer above. `actor`, `input`, `links`, `now`, `today` are Rivière's too. A shape author using Marquise alone cannot name a field `outcome` because of a plugin two layers up. That list freezes with the shape file.
- **The 1.0 grammar names a tag whose shape ships in Rivière.** `tag:ref` is one of the fourteen frozen `match` names (`M:scope.md:121`, `M:content-models.md:40-41`), and a list of references is "each item a `{% ref %}` tag" (`M:records.md:45-46`); yet "`ref` lives in Rivière's core" (`R:shapes.md:96-97`). The docs do not say what `{% ref %}` is in a Marquise-only project.
- **The selector grammar carries corpus semantics with no single-document meaning:** `+` closure (`M:selectors.md:134`, `M:selectors.md:160`), `$root` versus `$entity`, and a failure table whose rows are Rivière's contexts (`M:selectors.md:96-102`). This is acceptable only because selectors are a 0.x capability; it becomes a problem the day they graduate into core.
- **`lang` is reserved "for locale variants in a corpus layer"** (`M:shapes.md:163-164`), a design marked leaning and "after Rivière 1.0" (`R:corpus.md:643`).

Rivière knows Marquise's internals-in-waiting:
- Its *first* release, described as resting on "Marquise's read path, its most settled part" (`R:scope.md:8`), needs deferred shapes (after 1.0), selectors, `extends`, migrations (0.x), paragraph templates ("if proven", `R:scope.md:37-38`), the public template engine for paths (`R:corpus.md:76-78`) and the authoring grammar (`R:corpus.md:345-348`). That is six unfrozen surfaces (`R:scope.md:16-21`).
- The authoring grammar was already extended for Rivière's plugin (`L:4451-4455`), and the generator contract has an input kind, `{ schema: true }`, that exists for exactly one first-party plugin (`R:corpus.md:261`, `R:corpus.md:342`).

Assessment: the dependency arrow is formally one-way ("only its public API", `R:overview.md:12-15`), but the *design* arrow runs both ways. Marquise's public API is being shaped by one consumer written by the same author on the same day. That is not the independent test of seams the docs claim (`M:extending.md:17-18`).

### 2.2 Seam by seam

| Seam | In the right place? | Cost to move later | Note |
|---|---|---|---|
| Syntax front end | Yes: internal until a second implementation (`M:syntax.md:44-48`) | Low for code, medium for data (`$$mdtype`, `syntax`, raw source in records) | Fix the data leaks before 1.0 |
| Renderers and bindings | Undecided (`M:rendering.md:28-39`) | Medium | The component contract freezes at 1.0 with the base library unchosen |
| Published schema | Plausible, but it is a second serialisation of the shape file that "only grows" (`M:schema.md:44`) | High: two formats to keep in step forever | Marquise's own tools reading only it (`M:schema.md:5-6`) is good discipline |
| Addresses and records | Frozen too early (1.3) | **Highest** | See 2.3 |
| Selector resolver | Right idea; registry scope undefined (2.4) | Medium | |
| CEL | Behind an interface (`M:syntax.md:204-205`) | Low for the evaluator, high for the *language*: six uses now depend on it (`M:syntax.md:125-128`) | The profile is Marquise's own AST walk, with no cost model in either implementation (`M:syntax.md:212-213`) |
| Write path | Right place (a capability, `M:api.md:39-56`) | Medium | Its *outputs* (fix kinds, addresses) are frozen before it exists (`M:validation.md:28-31`) |
| Sources and sinks | Right place, well drawn (`R:corpus.md:763-770`), capabilities declared | Low | The best seam in either project |
| Generators | Closed input kinds is good discipline (`R:corpus.md:279-285`) | Medium | Revised four times in two days without an implementation (5.4) |
| Rivière plugins | Too wide: seven registration kinds (`R:plugins.md:33-53`) | High once third parties exist | |

### 2.3 The most expensive seam: addresses and the record

It is not a module boundary, so it is easy to miss. Everything that leaves the process is keyed by it. It is frozen in 1.0 on the strength of a prototype that edits one attribute and one field (`M:scope.md:139`), while the layer that stresses it (rebase by value, policy by field prefix, changesets stored as JSON drafts, `R:writing.md:32-34`) arrives two releases later. The docs apply the right principle to the front end ("published with one implementation, it would be frozen before its second user could show what is wrong with it", `M:syntax.md:44-45`) and do not apply it here.

### 2.4 An unowned seam: where registrations live

The instance is "an immutable value" and "nothing registers at import time" (`M:api.md:63-65`, `M:api.md:69-70`), but vocabulary is added with module-level `registerStep` / `registerBuiltin` (`M:selectors.md:187-195`) and formats with `registerFormat` (`M:content-models.md:290`), with names "unique within a host" (`M:selectors.md:204`). The docs do not say whether a registration belongs to a process, an instance or a Rivière corpus. It matters for: two instances in one process (tests, monorepos, `M:records.md:225-228`); the site builder's many tenants; and cache validity, since Rivière's cache key is file hash, shapes' hashes and Marquise's version (`R:corpus.md:660-662`) and omits Rivière's version, plugin versions, registered vocabulary, CEL functions, the collection config and the time zone, each of which changes records or index entries.

---

## 3. Layering: "core is mechanism, plugins are a domain's mechanism, corpus definitions are opinions"

### 3.1 Where the design follows it

- Routing moved out of core into `site`, and `encloses` out of core into `tree` (`R:plugins.md:20-29`; `L:4286-4298`).
- Claims are a saved write in plan's words, not vocabulary (`R:writing.md:237-238`).
- Ecosystem notions (packages, crates) are corpus definitions over foreign files (`R:corpus.md:501-502`).
- Marquise ships no design vocabulary (`M:extending.md:89`).

### 3.2 Where it violates it

1. **Rivière core contains things its own test excludes.** The test is "what every corpus needs and what cannot be built on the public API" (`R:plugins.md:8`). Saved views are "stored arguments to `find`" (`R:queries.md:246`), saved writes are stored arguments to `set` (`R:queries.md:289-291`), the JSONL export is a loop over records, and the five authoring shapes are "its read API in authoring form, and nothing more" (`R:shapes.md:3-4`). All four are definitionally buildable on the public API and all are core (`R:plugins.md:15-18`).
2. **A plugin fixes an opinion.** `workflow` hard-codes the outcomes `achieved` and `retired` "so that rules and progress mean the same in every corpus definition" (`R:references.md:498-499`). That is a domain opinion (it is plan's vocabulary, from refrakt's `cancelled`/`superseded` rule) placed in mechanism.
3. **A plugin's names are reserved in the bottom layer** (2.1, `M:shapes.md:72-74`).
4. **Core has a generator kind for one plugin** (`R:corpus.md:261`).
5. **The built-in `files` generator carries a language table** from a shared anchoring package (`R:corpus.md:499-500`), which is not a "universal fact" of a file.
6. **Marquise's "seams proven by their first users"** (`M:extending.md:17-18`) are proven by first-party packages written with the seam. The log lists "the hooks freezing before their users" as still undecided (`L:4229`).

### 3.3 Is the rule right?

Partly. Two objections.

- **It is two rules, and they disagree.** "Mechanism versus opinion" (`R:plugins.md:20`) is a judgement; "every corpus needs it and it cannot be built on the public API" (`R:plugins.md:8`) is a test. The violations in 3.2 are exactly the cases where the judgement overrode the test. Keep the test and drop the slogan.
- **It relocates breadth; it does not reduce it.** "Rivière's risk is breadth" (`R:plugins.md:3`), and the answer is thirteen first-party plugins and satellites (`R:plugins.md:61-77`) plus a plugin API with seven kinds of registration (`R:plugins.md:33-53`), all built and maintained by the same people. The size tables count keys in core apart from plugins (`R:scope.md:51-53`), so the early-warning number goes down as the total goes up. The plugin API then becomes the largest frozen contract in the project, designed before any third party has written against it.

A better statement: core is what must be *consistent across every extension* (identity, the snapshot, the changeset, the finding) and nothing else; a plugin exists when a second, independent consumer asks; until then the code lives in the consumer.

---

## 4. Half the concepts

### 4.1 Is the current first release the smallest thing that proves the idea?

No, for either project.

- Marquise 1.0 is 10 shape keys, 10 attribute keys, 30 content-model keys, 14 match names, 5 template formats (`M:scope.md:112-122`); structured attributes and data shapes, added on the last day of the log (`L:4308`, `L:4471`); a template engine of its own (`M:content-models.md:283-288`); an RE2 engine; a preprocess hook with provenance; Standard Schema; a structured-output profile; SARIF; `explain` with inlay hints; a language server; eight CLI commands; five renderers; two satellites (`M:scope.md:13-33`); and three 0.x capability packages beside it (`M:scope.md:47-51`).
- Rivière's first release, for a read-only site of about forty-five pages, includes generated collections, the generator contract, mentions from links, external kinds, inverses, `inverseOf`, transitive paths, `acyclic`, the tree plugin, projections and grouping, former ids, YAML/JSON data files, the on-disk cache, a 10,000-document benchmark, watching and editor buffers (`R:scope.md:27-35`). The log records the cause: "the first release had grown to nearly everything designed" (`L:4094-4096`), and the trim moved the *label*, not much of the content.
- The idea to be proved is: *authors write prose, developers get typed data, and that is compelling to a team that is not refrakt.* The experiment that tests it is step 3 of six (`M:scope.md:93-94`: "a proof outside refrakt… If it is not compelling, stop there"), after the content-model revision and the extraction.

### 4.2 The half I would keep

Marquise (first useful release):
- shape files with `attributes`, `content` (`sequence`, `split`/`zones`, `sections`, list `items`), `description`, `plain`;
- `as` with `block`, `inline`, `text` and four value types (number, boolean, date, url);
- findings with ids and addresses, marked unstable;
- records and the record JSON Schema; generated types;
- the plain presentation and two renderers (HTML, React);
- `validate`, `extract`, `types`, `explain`;
- document shapes, minimal; `{% example %}` blocks.

Cut or defer: paragraph and item templates, structured attributes and data shapes, `pattern`/RE2, the preprocess hook and both satellites, Standard Schema and the structured-output profile, SARIF, the input schema and form test, three of five renderers, the language server (keep diagnostics through the CLI), `checks`, extension namespaces, and all three 0.x capabilities (selectors/rules, `extends`, migrations).

Rivière (first useful release):
- collections over one-entity-per-file documents; identity `(collection, id)`; duplicate detection;
- typed references resolved across documents: dangling, wrong target, cycles;
- `find` with selectors that follow references, and `backrefs`;
- `riviere validate` and `find`; the Astro loader.

Cut or defer: generators (including `files` and `marquise`), mentions, external kinds, former ids, many entities per file, data files, the tree plugin, the five authoring shapes and deferred expansion (Astro's `getCollection` already serves the docs site, as `R:shapes.md:22-23` concedes), views, projections, the cache, watching.

### 4.3 What would still work

The README's hero example end to end (`M:README.md:18-80`); a recipe site with a typed search index; a plan-like corpus that validates references and answers `status:ready source.status:accepted`. That is the product thesis. What would not work: writing, migrations, kits, corpus data inside content, the docs site's generated shape reference. None of those tests the thesis; each tests a second-order bet.

---

## 5. Instability in the log

Counted from the dated Q-entries: 49 are dated; 17 fall on 2026-11-24 and 20 on 2026-11-26. In the same period the repository holds five spikes relevant to these designs (`refrakt:spike/{parser-positions,markdoc-locator,marquise-cel,marquise-comark,query-engines}`).

| Area | Revisions | What it suggests is not understood | Experiment that would settle it |
|---|---|---|---|
| **Scope of 1.0 and of the first release** | Y3, Y10, Q21 (`L:4062-4075`: "gained four 'if proven' items in four days and would have frozen four languages"), Q23 (`L:4094-4107`), Q32 (`L:4195-4202`), Q58 (`L:4468-4472`) | What the product is. Scope is being defined by subtraction from a total design rather than by a consumer | Write the proof project's content and shapes first, on paper, from the docs; scope is what it uses |
| **Text templates** | Q1 (`L:3796-3805`), Q8 (`L:3875-3885`), Q21 (5), Q52 | Whether reading several values from one run of text is a grammar feature or an escape hatch; the engine is bespoke (`M:content-models.md:283-288`) and still "if proven" while Rivière's first release needs it (`R:scope.md:37-38`) | Port refrakt's regex-extracting runes and the glossary to templates; count `text-mismatch` on real content |
| **Selectors: ownership and logic** | Q3, Q4 (core depends on it, `L:3826`), Q21 (a 0.x capability, `L:4067-4069`), Q25, Q31 (`L:4188-4194`) | The logic for missing values: absent is two-valued, failed-compute is three-valued (`M:selectors.md:60-63`, `M:selectors.md:91-93`), a hybrid found by review, not by use | Write the query catalogue (`R:queries.md:227-231`) *now* as data, implement a 300-line evaluator against plan's 742 entities, and see which cases surprise |
| **CEL's role** | Q5, Q17, Q25, Q28, Q29, Q33 | The boundary. It went from `computes` to six uses (`M:syntax.md:125-128`) in three days, on a library at 73% conformance with a 37% optional-values pass rate (`M:syntax.md:157-158`, `M:syntax.md:199-205`) | Ship `computes` alone for one release; admit a second use only when a consumer cannot be served without it |
| **Terminal states** | Q26 then Q30 on the same day (`L:4136`, `L:4178-4187`: Q26 "failed without a map, with reopening, and with different maps for `work` and `bug`") | Domain semantics cannot be designed ahead of the domain's rebuild | Build plan's rebuild with the outcomes as plain plan config; extract `workflow` afterwards |
| **Sync or async** | Q11, Q19 (`L:4040-4049`: a review found three holes) | The API was specified in prose; holes show only in types | A compiling `.d.ts` skeleton of both APIs with one fake host, before more prose |
| **Generator contract** | Q40, Q42, Q44, Q45, Q49 (`L:4383-4385`: "written for `code` and did not fit the others") | The abstraction was generalised from one imagined instance, five times | Implement `files` and one other generator by hand in Rivière with no contract; extract the contract from the two |
| **Files, mentions, routing** | Q35-Q39, Q43, Q50, Q53, Q54; `encloses` went core to plugin in a day (`L:4262`, `L:4286-4298`); `site` went into the first release and out again (`L:4295`, `L:4470`) | Whether Rivière is a content graph or a knowledge layer over a repository | Decide the product; the second is a different product with a different first customer |
| **Mapping vocabulary and adapters** | Q47, Q48, Q52 on one day (`L:4364-4431`) | Nothing yet; this is design three levels above anything built | None now. Park it |
| **Migrations** | Q15, Q20, Q52 | Matching rules depend on `extends`, document shapes and the write path at once | Express refrakt's existing deprecations as declarative migrations and count how many fit the declarative tier |

The common pattern: each revision was triggered by a document review or a question, not by code. The reviews are finding real holes, which means the design has more holes of the same kind that no review has yet reached. Six consistency passes are a symptom: the corpus of prose is now large enough to need its own maintenance.

---

## 6. What is missing

1. **Versioning between the projects.** Nothing states which Rivière versions work with which Marquise versions, how a plugin, kit or corpus definition declares the range it supports, or what happens on mismatch. Lockstep is stated only for `@marquise-md/write` and `@marquise-md/cel` (`M:scope.md:63-65`). The shape file itself has no format-version key in its key list (`M:scope.md:112`), although "formats read by outside tools carry a format version" (`M:principles.md:66`); a kit on npm cannot say which shape-file grammar it was written for.
2. **Failure of host code.** "Content problems never throw" (`M:api.md:108`), but the docs do not say what happens when a generator, check, resolver, overlay loader, registered step, CEL function or sink throws, times out or returns garbage. Generators are "bounded in entities and time" (`R:corpus.md:323-324`) with no mechanism named; a synchronous JS function cannot be pre-empted.
3. **Enforcement of purity.** A generator's read outside its declared inputs "is refused" (`R:corpus.md:288`) and evaluation is "deterministic and bounded: no I/O, clock or randomness" (`M:selectors.md:200-202`). In-process JavaScript cannot enforce either; it holds only if all access goes through a context object and the plugin is honest. The docs call the alternative "the honour system" (`R:corpus.md:279-281`) and do not notice they are still on it.
4. **Extension supply chain.** Configuration is "never executed" (`L:3961-3962`), but it names plugins and corpus definitions by package name, which the node packages resolve and load (`L:3963-3964`; `R:plugins.md:143`: "plugins are the union of all"). Installing a corpus definition therefore loads code chosen by data in a dependency. There is no allowlist, no statement of what a plugin may touch, and the write policy is declared "a guardrail, not access control" (`R:writing.md:187-189`).
5. **Observability.** `explain` covers the content model (`M:content-models.md:64-83`). Nothing covers: why a cache entry missed, which derived member was recomputed and why, how long a rule or selector took, why a write was refused at the locator level, or a way to trace a finding back through an include, an adapter and a migration.
6. **Performance budgets.** Both the bundle budget and the benchmark targets are "set by the first measurement, then held" (`M:api.md:114-116`, `R:corpus.md:668`). A budget derived from the first result constrains regressions, not design. There is no number a design choice can fail today: no keystroke budget for the language server, no cold-start budget for the CLI, no memory ceiling per snapshot.
7. **Concurrency beyond the lock.** The lock covers two `apply` calls (`R:writing.md:211-213`). Unaddressed: the language server, a watcher, the CLI and CI sharing `.riviere/cache`; a build reading files mid-apply (the journal makes apply recoverable, not isolated, `R:writing.md:246-255`); a `git checkout` during a watch; the working copy (`R:writing.md:21-34`) under two editors.
8. **Error recovery in parsing.** An unclosed tag swallows the rest of a page (`M:syntax.md:68`); streaming validation is "Open" (`M:validation.md:129-132`). For a product whose pitch includes AI-written content, behaviour on half-valid documents is a first-order concern and has four lines.
9. **Testing strategy for the hard parts.** PutGet is tested with "values generated from each field's JSON Schema" (`M:writing.md:103-104`), which cannot generate meaningful block or inline rich text, the fields where surgical writing is hardest. There is no differential fuzzing between reader and locator beyond one corpus, no conformance kit for third-party sources and sinks beyond "the same suite" (`R:corpus.md:809-810`), and no plan for testing the incremental engine against a from-scratch rebuild.
10. **The cost of the published contracts.** `M:principles.md:51-60` lists about twenty contract families: finding ids never reused, every shape-declared rule id public (`M:validation.md:81-83`), plain markup, CLI JSON, addresses, the grammar document. No estimate of the snapshot and review load, and no statement of who carries it. Dependencies with a single maintainer (cel-js, `M:syntax.md:199`) and an upstream the project hopes to patch (`M:syntax.md:109`, `M:syntax.md:211`) are in the critical path.
11. **How a third party builds on it.** The plugin model lists what can be registered (`R:plugins.md:33-53`) but not the context object, lifecycle, error contract or stability tier. There is no stated test kit for Rivière plugins (Marquise promises one for kits, `M:extending.md:122-124`).
12. **Refrakt's own adoption path.** "Refrakt depends on it at once" (`M:scope.md:89`). Refrakt's pipeline is schema transform to a renderable with meta tags, then an identity-transform engine keyed on `data-rune-fields` (`refrakt:CLAUDE.md`, "Transformation Pipeline"). The shape node is "the one new piece" (`M:scope.md:28`). Nothing describes how 106 TypeScript schemas, their 102 transforms and the engine consume shape nodes, or what refrakt runs during the transition.

---

## 7. Ten questions the docs do not answer

1. What fraction of refrakt's existing runes can be written as a 1.0 shape file with no `transform`, no template body and `strict` on? Which of the 16 `custom` models have no declarative form, and what happens to them?
2. On content not written by refrakt's authors, what percentage of attempted writes does the locator refuse, and what percentage fall back to an explicit slot? What number would make you abandon the two-parser route?
3. If the write path arrives two releases after addresses freeze and needs a different address form (for unkeyed list items, or prose between nested shapes), what is the plan?
4. Is a `registerStep` registration scoped to the process, the Marquise instance or the Rivière corpus? What is in a cache key when it changes?
5. What is the memory and recompute cost of one keystroke in a 10,000-entity corpus with inverses, one transitive closure, a tree and ten cross-entity computed values? What is the budget?
6. Which Rivière versions run on which Marquise versions, and how does a kit, plugin or corpus definition declare it? What does a user see on mismatch?
7. A generator throws, or runs for a minute. A registered step reads the clock. What does the snapshot do in each case, and how is it detected?
8. Marquise 1.0's date depends on plan's rebuild (`M:scope.md:150-151`). If plan's rebuild takes a year, is there a Marquise 1.0 without it? If yes, why is the dependency there?
9. Who is the second consumer? The proof project and the docs site are both written by the designers. What has a team outside the project said about the shape file?
10. What is the total surface the project commits to maintain at Rivière 1.0, in packages, finding ids and frozen keys, and how many maintainers is that planned for?

---

## 8. Recommendations

Severity: **structural** (changes the shape or the plan), **significant** (changes a contract or a release), **minor**.

### R1. Run the outside proof first. Severity: structural

- Evidence: the falsifying experiment is step 3 of 6 (`M:scope.md:93-94`); steps 1-2 are the expensive ones (`M:scope.md:86-92`). Every consumer named so far is the designers' own (`M:scope.md:97-99`).
- Change: before extracting anything, take refrakt as it is, hide everything but shape definitions, records and one renderer behind a thin facade, and have someone who did not design it build a small site from the docs. Scope 1.0 from what they used and where they got stuck.
- What would change my mind: an outside team already asking for this, with their content in hand.

### R2. Cut the 1.0 gate's dependency on plan's rebuild, or rename 1.0. Severity: structural

- Evidence: `M:scope.md:8` against `M:scope.md:148-151` and `M:scope.md:49`.
- Change: make the document-shape exit test the read-only docs site. Let plan's rebuild gate Rivière 1.0 and the write path's graduation only.
- What would change my mind: a concrete way in which a read-only consumer cannot expose a flaw in document shapes that a writing one would.

### R3. Do not freeze addresses or the record's rich-text form at 1.0. Severity: structural

- Evidence: 1.3; `M:scope.md:20`, `M:scope.md:139`; rich text still *Leaning* (`M:records.md:124`); the principle at `M:syntax.md:44-45`.
- Change: ship addresses in 1.0 as a documented, versioned but explicitly unstable format (the treatment `explain`'s JSON already gets, `M:content-models.md:81-82`); freeze when the write path graduates. Remove `$$mdtype` from the shape node and decide whether `syntax`/raw source belongs in a default record.
- What would change my mind: a write-path prototype exercising rebase, keyed and unkeyed lists, nested shapes in rich text and Rivière's policy prefixes, passing without an address change.

### R4. Measure declarative fit before freezing the grammar. Severity: structural

- Evidence: 1.1; 3-4 composed definitions against 106 TypeScript schemas, 102 transforms, 16 custom models.
- Change: mechanically convert every refrakt rune's content model to the revised frontmatter and publish three numbers: loads strict-clean, loads with `shadows:`, cannot be expressed. Make "cannot be expressed" an explicit, named category in the docs with its destination (component, `prepare`, refrakt-only).
- What would change my mind: the exit test at `M:scope.md:138` already passing, with the residue listed.

### R5. Take the upper layers' names out of Marquise's frozen format. Severity: significant

- Evidence: `M:shapes.md:72-75`, `M:scope.md:121`, `R:shapes.md:96-97`.
- Change: reserve by mechanism, not by list: give CEL's context names and selector built-ins a syntactic namespace that cannot collide with fields (the `$` sigil already does this in selectors), so no layer above can break a shape by adding a name. Define `ref` as a Marquise shape (it is already a Marquise value type) or remove `tag:ref` from the 1.0 match names.
- What would change my mind: evidence that authors of shapes strongly prefer bare names in CEL and that the reserved list will not grow after 1.0.

### R6. Define registration scope and make cache keys complete. Severity: significant

- Evidence: 2.4; `M:api.md:63-70`, `M:selectors.md:187-204`, `R:corpus.md:660-662`.
- Change: all registration goes through the host object passed to `createMarquise` / `createRiviere`; the instance exposes one hash covering shapes, capabilities, vocabulary, formats, plugins with versions and config; every cache keys on it.
- What would change my mind: nothing; this is cheap now and expensive later.

### R7. Treat the incremental snapshot as the central engineering risk of Rivière and spike it. Severity: significant

- Evidence: 1.5; `R:corpus.md:679-681`, `R:plugins.md:40-44`, `R:references.md:329-330`.
- Change: a spike on the generated 10,000-document corpus with inverses, one closure, a tree and cross-entity computed values: full rebuild time, one-file update time, memory, and correctness checked against the full rebuild. Set numeric budgets from the *use* (keystroke, CLI cold start), not from the first measurement.
- What would change my mind: results showing full recomputation is fast enough that no incremental engine is needed, which would also let a page of design be deleted.

### R8. Shrink Rivière's first release to references and queries; write generators by hand. Severity: significant

- Evidence: 4.1; `R:scope.md:27-35`; the generator contract's five revisions (`L:4299`, `L:4317`, `L:4337`, `L:4346`, `L:4383`).
- Change: first release as in 4.2. Build the docs site's shape reference as an ordinary script over `mq.schema()`. Extract a generator contract only after two generators exist in code.
- What would change my mind: the docs site demonstrably needing file entities or the `marquise` plugin to pass its exit test (`R:scope.md:45-47`: every page renders, every link resolves), which as stated it does not.

### R9. Replace the layering slogan with the test, and apply it to core. Severity: significant

- Evidence: 3.2, 3.3.
- Change: one rule ("consistent across every extension, or needed by every corpus and not buildable on the public API"). Move views, saved writes, the JSONL export and the five authoring shapes out of `@riviere-md/core` or state why the rule does not apply. Make `workflow`'s outcome names configuration. Count plugin keys in the size total.
- What would change my mind: a demonstrated cost of one more package that exceeds the cost of a wider core contract.

### R10. Cap CEL at one use until it has a year of production. Severity: significant

- Evidence: `M:syntax.md:125-128`, `M:syntax.md:157-158`, `M:syntax.md:199-218`; six log entries.
- Change: `computes` only. Foreign maps, write values, bindings, adapters and migration values use paths and value maps (already designed as the first two of three forms, `M:extending.md:171-173`) until a consumer is blocked.
- What would change my mind: a conformant, checked CEL implementation with a cost model and more than one maintainer.

### R11. Introduce a third status and demote unbuilt, unrequested designs. Severity: significant

- Evidence: sections marked both "Decided" and "when a consumer asks" (`R:corpus.md:158`, `R:corpus.md:413`, `R:corpus.md:456`, `R:corpus.md:735`, `R:writing.md:130`); 37 decisions in two days.
- Change: "Decided" means built or spiked. Everything else is "Designed, unvalidated" and moves to an appendix that core designs may not cite as a requirement. This also ends the need for consistency passes over text nobody is implementing.
- What would change my mind: nothing structural; this is about what the documents are allowed to constrain.

### R12. Write the missing operational chapter before 0.x. Severity: significant

- Evidence: section 6, items 1-4, 7.
- Change: one page per project covering version compatibility, host-code failure and timeouts, the trust statement for plugins and corpus definitions (what loading one can do), and multi-process access to the cache and working tree.
- What would change my mind: a decision that Rivière is single-process, first-party-plugins-only until 1.0, stated in the scope page.

### R13. Compile the API. Severity: minor

- Evidence: `L:4040-4049`.
- Change: a type-only skeleton of both public APIs, checked in, with the capability-typed handle (`M:api.md:61-62`) and one in-memory host. Prose reviews stop finding sync/async holes once the compiler does.
- What would change my mind: n/a.

### R14. Measure refusal, not only agreement, for the locator. Severity: minor (now), structural (if the number is bad)

- Evidence: 1.4; `M:syntax.md:92-103`.
- Change: extend the spike to a generated edit suite (every field of every example in refrakt, plus two outside corpora) and report the refusal and fallback rates.
- What would change my mind: n/a; it is the measurement that decides 1.4.

---

## 9. What the designers have right, briefly

So that disagreement is not mistaken for dismissal: verify-or-refuse writing; findings as the only error channel; configuration as plain data; sources and sinks with declared capabilities; identity separate from location; keeping the front-end interface private until there are two; the size tables as an early warning; refusing a query language in favour of an export; and the instinct, visible in Q21, Q23 and Q32, to cut. The recommendation of this review is to cut again, harder, and to let code rather than review find the next round of holes.
