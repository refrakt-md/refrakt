# Sixth review: Marquise, Rivière and Belvédère concept docs (2026-11-26)

Outside review, read cold. Nothing was edited.

**Scope read.** Belvédère in full (README, concept, origins, mockups README). Rivière in full for `README.md`,
`corpus.md`, `references.md`, `plugins.md`, `scope.md`, `findings.md`, `configuration.md`, `overview.md`,
`glossary.md`, `shapes.md`, `docs-site-as-shapes.md`, and the first half of `queries.md`; the remaining Rivière
pages (`writing.md`, `integrations.md`, `cli-and-mcp.md`, `context-bundles.md`, `use-cases.md`, `prior-art.md`,
and the plan, traceability, events and site-builder pages) were covered by targeted greps and the scripts, not
read line by line. Marquise in full for `rendering.md`, `extending.md`, `schema.md`, `scope.md`, `findings.md`,
the first half of `shapes.md` and of the glossary; the rest by grep and script. Notes Q34–Q48 in full; SPEC-131
summary and attribute table, SPEC-134 proposal and decisions, SPEC-136 summary, proposal and decision titles; the
2026-11-24b review's five, section 1, 4, 6 and 7.

**Citations.** `M:file.md:line` and `R:file.md:line` are relative to each `docs/concepts/`; `M:/README.md` and
`R:/README.md` are the repository READMEs; `B:path:line` is relative to Belvédère's root; `NOTES:line` is
`notes/marquise-foundation.md`. **Checked** means I read the cited lines in the current checkouts.
**Recalled** means a claim about an external tool from memory, not run.

**Scripts run (read-only).**

- Every backticked kebab-case token in the three doc sets against both `findings.md` catalogues (150 ids).
  Two finding-like ids are used without being catalogued: `report-stale` (`R:corpus.md:341`, inside a leaning)
  and `page/documents-redundant` (`R:references.md:127`, a rule id with no owner; see 3.6). Everything else
  resolves (checked).
- Severity words within a sentence of each catalogued id, on every page: no disagreement found (checked,
  heuristic).
- Every relative and cross-repository link and heading anchor: none broken; the five misses are example links
  inside code spans (checked).
- Stale-term grep. **Held:** no live `repo-file:` or `local-file` (only the supersession note at
  `R:references.md:169`), no "links with data", no `trace-link-suspect`, no `computes-unavailable`, no
  "external URLs are not mentions" beyond the correct "other URLs are not mentions" (`R:references.md:58`),
  `bindings/*.yaml` only for bindings (`M:rendering.md:88`, `M:extending.md:96`).

---

## The five most important things

1. **The generator contract contradicts itself and does not fit three of its six generators.** (high, checked)
   - "Two entries with one id are the ordinary duplicate" (`R:corpus.md:268`) against "entries merge by id"
     nine lines later (`R:corpus.md:277-280`). The `code` generator needs the first, `patterns` the second;
     nothing says which applies when. `generator-conflict` is defined only "from several files"
     (`R:findings.md:31`), so two uses in one file are undefined.
   - `inputs(options): Glob[]` (`R:corpus.md:248`) cannot name history or the published schema, which
     `R:corpus.md:265-267` then allows. `perFile(file, content, ctx)` takes content, while `files` lists
     "without reading a file" (`R:corpus.md:432`). The git generator is "cached by hash, forever … only new
     commits" (`R:corpus.md:374-375`), which is neither of the two caching modes (`R:corpus.md:258-259`).
   - "Pure … no network, clock or environment" (`R:corpus.md:263-264`) against file entities carrying
     `$created`, `$modified`, `$authors` (`R:corpus.md:434-435`), which come from the source, are cached by HEAD
     (`R:corpus.md:501-502`), and read the clock for uncommitted changes (`R:corpus.md:497`).
   - Continuity is "a comparison … under `--against`" (`R:corpus.md:269-271`), yet a moved file gets a former id
     "from git's rename detection in the one-pass log" on any load (`R:corpus.md:438-439`). Symbols get
     continuity only inside the pull request that renamed them; afterwards an unrewritten span fails silently.
   - *Fix:* one paragraph per generator stating its mode, inputs, cache key and continuity; type `inputs` as a
     union; state that merging is opt-in per generator and otherwise duplicates are errors; move dates out of
     the generator into the source's members.

2. **Routing is decided as a first-release plugin, and four pages still say Rivière has none.** (high, checked)
   - `R:integrations.md:18`: "the URL policy lives in each integration. Leaning: no general site layer is
     built", with `urls: { work: '/work/{id}/' }` on the loader (`R:integrations.md:13`, `:28`).
   - `R:overview.md:49`, `:57` and `R:/README.md:62`: no URLs, routes or layouts; routing left to the host.
   - `R:plugins.md:79`: "One plugin ships with the first release, `tree`", against three in the table above it
     (`R:plugins.md:63-65`) and in `R:scope.md:51`.
   - The first-release fixture loads only `tree` (`R:docs-site-as-shapes.md:161`) and its "what this page uses"
     list names neither `site` nor `marquise` (`R:docs-site-as-shapes.md:221-226`). Its consumer is Astro, which
     routes and lays out itself (recalled), so `site` has no first-release asker: the catch-all pattern the
     last review flagged. NOTES:4298 names refrakt as the real one.
   - *Fix:* rewrite the three "not a site layer" statements as "core has none; the `site` plugin offers
     routes"; say where a route is declared when both `site: { route }` and the loader's `urls` exist; either
     show `site` in the docs-site fixture or move it to "when a consumer asks (refrakt)".

3. **Belvédère's first surface and its triage contradict its own principles and SPEC-134.** (high, checked)
   - The pull request report "needs only reading and `--against`" and carries "still true", "update" and
     "retire" on each item (`B:docs/concept.md:55-56`). Those are writes: a review hash into frontmatter, an
     edit, a status change. They need Rivière's second-release write path, a sink that commits to the branch,
     and an actor. A GitHub Action's comment cannot carry buttons (recalled).
   - "Fingerprints … ignoring formatting, comments and moves" (`B:docs/concept.md:12`) against "the same
     format `trace` uses", SPEC-134's hashes (`B:docs/concept.md:205`, `R:references.md:371-374`). SPEC-134 D2
     includes comments deliberately, and the stored hash is the strict one.
   - "Accept the 6 the agent cleared" in bulk (`B:docs/concept.md:176-177`) is the bulk stamping SPEC-134 D3
     and D8 exist to prevent, and makes a person act on every agent-cleared item, against principle 5
     (`B:docs/concept.md:28`).
   - "It writes only proposals" (`B:docs/concept.md:178`) against "a provisional review hash"
     (`B:docs/concept.md:171`): either that hash is stored (a write by CI) or the model is re-run on every push
     (not deterministic).
   - *Fix:* split surface 1 into a read-only report (first) and confirmation (needs the write path and a
     hosted sink); state the fingerprint's normalisation once, citing SPEC-134; replace bulk accept with a
     per-collection trust setting only.

4. **Review state for mentions exists only in the notes and in Belvédère.** (high, checked)
   - NOTES:4254-4256 records as decided, in Rivière's `references.md`: inferred mentions start "probably
     stale", a "still true" records the review hash in `trace`, kept in a `reviewed:` frontmatter map keyed by
     target. Rivière's pages hold none of it: "Suspect references" covers only a fingerprint written beside a
     reference item (`R:references.md:375-386`).
   - Belvédère builds on the map (`B:docs/concept.md:94-102`). It is keyed by target, not passage, so two
     passages citing one symbol share a review, which SPEC-134 D4 rejected for that reason; its keys
     (`createMarquise`, `instance.ts#reload`) are not Rivière ids (`path#name`, `R:corpus.md:231`); and
     `reviewed` is already a date on the docs-site page shape (`R:docs-site-as-shapes.md:91`).
   - "A reference with no fingerprint is suspect from the start" (`R:references.md:385-386`), and a declared
     subject "is a reference, so … the page becomes suspect" (`R:references.md:129-130`). With `trace` on, every
     `documents:` entry warns on day one. SPEC-134 says absent means untracked; Belvédère says unconfirmed is
     "tentative rather than alarming" (`B:docs/concept.md:48-49`).
   - *Fix:* write the section in `references.md`: where a mention's review hash lives, its key (target plus
     passage), the states (unreviewed, reviewed, suspect, agent-confirmed), and that unreviewed is silent.

5. **"One format, three readings" is three vocabularies, on a template language no page defines.** (high,
   checked)
   - Declarative tiers differ in key and direction: a migration keys by source (`attributes: { author: { to:
     name } }`, `M:extending.md:161`); an adapter keys by target (`fields: { title: subject }`,
     `M:rendering.md:127-131`); a binding uses `props` and `slots` (`M:rendering.md:90-94`). `to:` is a tag in a
     migration case (`M:extending.md:190`) and a list of allowed outputs in an adapter (`M:rendering.md:126`).
   - A composed shape definition has no "declarative tier in frontmatter", though `M:extending.md:179` says each
     reading has one. A shape body may hold only `{% example %}` blocks and loose content is an error
     (`M:shapes.md:119-120`, `M:findings.md:11`); an adapter's body is loose template content "in the shape-file
     format" (`M:rendering.md:118`).
   - `slot … each`, `$attrs` and `$each` (`M:rendering.md:142-146`, `:151-152`) are defined nowhere; the only
     other template uses `$item` (`M:content-models.md:339-340`). `compose` is "later perhaps"
     (`M:extending.md:79`), "after 1.0, perhaps" (`M:/README.md:168`) and "its specs being settled and built"
     (`M:scope.md:77`).
   - `adapter-ambiguous` is "reported at load" (`M:rendering.md:158`) but depends on "the current renderer"
     (`M:rendering.md:157-158`, `M:findings.md:97`), unknown at load.
   - Untrusted adapters are allowed (`M:rendering.md:162`); `M:trust.md` has no row for them. This repeats the
     last review's fourth finding (bindings added without the trust model).
   - *Fix:* claim one file format and one structural tier, not one declarative vocabulary, or align the keys;
     define `compose`'s `slot`, `each` and `$` names before two decided features rest on it; report the tie at
     render time; add adapters to the untrusted table.

---

## 1. Contradictions with today's decisions

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| C1 | high | `R:integrations.md:13`, `:18`, `:28`; `R:overview.md:49`, `:57`; `R:/README.md:62` | Q39 not carried: URL policy "lives in each integration", "no general site layer". | See the second of the five. |
| C2 | high | `R:plugins.md:79` vs `R:plugins.md:63-65`, `R:scope.md:51` | "One plugin ships with the first release." | "Three: `tree`, `site`, `marquise`." |
| C3 | med | `R:scope.md:11` vs `R:corpus.md:329-330`, `M:schema.md:39-41`; `R:corpus.md:415-418` | The finding catalogue is "a data file", "a view over `findings`" from the `marquise` generator, and generated by `patterns` from `defineFinding`, which "Marquise and Rivière do". Three sources; `patterns` is "when a consumer asks" (`R:scope.md:28`). | Say `marquise` for Marquise's ids and `patterns` for Rivière's, and give `patterns` a tier that matches. |
| C4 | med | `R:corpus.md:443` vs `R:plugins.md:63`, `:65`, `R:scope.md:72` | `encloses` is "when a consumer asks" on its own page, first release in the plugin table, and the `site` layout chain depends on it. | One tier. |
| C5 | med | `R:references.md:87`, `R:glossary.md:113` vs `R:references.md:115-117`, `:123-124` | Mention class `declared` exists, but "a page's declared subject is a typed field, not a mention", and coverage rules test `documented-by` and `mentionedBy` separately. The class has no members. | Drop the class, or define declared subjects as edges that also appear in `mentionedBy`. |
| C6 | med | `R:references.md:116` vs `R:docs-site-as-shapes.md:90`, `R:references.md:185` | `documents:` is `to: [symbol]` in one definition and `to: [file]` in the other; the `docs-behind-code` rule reads `documents.$modified`, which symbols do not have. | `to: [file, symbol]`, and say what the rule does for a symbol. |
| C7 | med | `R:references.md:57` vs `R:references.md:147` | A link to `…/pull/12` "mentions `github:org/repo#12`", but the kind's `url` template is `…/issues/{number}`; read back, `/pull/12` does not match. | Allow several `url` templates per kind, the first used for writing. |
| C8 | med | `R:writing.md:116-118`, `R:corpus.md:532-533` vs `R:corpus.md:433`, `:438-439` | "Moving a file rewrites only Markdown links; typed references and mentions stay." A file entity's id is its path, so a move renames it: `documents: [src/load.ts]` dangles until git's rename detection sees a commit. | State that for file entities a move is a rename, and that `riviere move` rewrites references to it. |
| C9 | med | `R:/README.md:116-122` | Package table lacks `site`, `marquise`, `patterns`, `code`; `@riviere-md/git` is "git history as a source", now a generator plugin (`R:plugins.md:68`). | Update the table. |
| C10 | med | `M:schema.md:22-37` vs `R:corpus.md:285-304`, `R:plugins.md:64` | `@riviere-md/marquise` "reads only the published authoring grammar" and emits migrations, dimensions, the `extends` chain, `abstract`, rules and `source`. The grammar lists none of them. | Add them to the grammar's list, or narrow the generator. |
| C11 | med | `M:rendering.md:66` vs `M:shapes.md:92-95` | The plain presentation is "one `data-*` attribute per attribute" and slots per field. A data shape has only attributes, some structured, so an unbound `commit` renders as an empty element: content silently lost, against `M:rendering.md:47`. | Define the plain presentation of structured attributes and data shapes. |
| C12 | low | `M:records.md:42-44`, `R:references.md:22-23` vs `M:shapes.md:84` | A list attribute on a tag is "a comma-separated string"; a structured one is a Markdoc array. Whether `tags=["a","b"]` is accepted, and which the printer writes, is unstated. | One sentence in `M:shapes.md`. |
| C13 | low | `M:writing.md:27-28` | "One flat props object", after structured attributes. | Drop "flat". |
| C14 | low | `R:glossary.md:75-76` | "Fingerprint" covers only fields, not anchored code. | Add the second half. |
| C15 | low | `R:references.md:370-374` | One format is claimed, but SPEC-134's strict and loose normalisations are defined for text slices; what they mean for "canonical record values" is unstated. Not two formats: 8 and 12 hex characters are both SPEC-134's. | Define the canonical serialisation that is hashed. |
| C16 | low | `R:plugins.md:65`, `R:corpus.md:417` vs `R:references.md:119-125` | A hand-written page is preferred over a generated one through `documents:`. After Q43 a page that only mentions its subject documents it, but does not become its page. | Say which signal the `site` plugin uses. |
| C17 | low | `B:docs/origins.md:4-5`, `:32-39` | "Entries Q1–Q34"; "none is recorded in Marquise's or Rivière's docs". Q35–Q44 came from Belvédère and Rivière's pages name it five times (`R:corpus.md:351`, `:383`, `R:references.md:86`, `R:plugins.md:68`, `:70`). | Update the range and the table; decide whether public docs name a private project as their consumer (NOTES:4233). |

Generated collections and the `files` generator sit in the first release on every page that gives a tier
(`R:corpus.md:220`, `:431`, `R:scope.md:29`, `:63`): held, apart from C4.

---

## 2. The generator contract, per generator

**`files`** (checked)

- G1 (high). Mode, inputs and purity: see the first of the five.
- G2 (high). **A file holding many entities has no entity.** "A file held by a document collection is that
  collection's entity; the file collection covers every tracked file no other collection holds"
  (`R:corpus.md:436-437`). `docs/glossary.md` holds twenty terms, a CSV holds rows, `package.json` is held by a
  foreign collection. A link to such a file resolves to nothing, or to an arbitrary one. *Fix:* the file entity
  exists whenever a file is not exactly one entity.
- G3 (med). **`to: [file]` cannot reach a document.** A Markdown page is a `page`, not a `file`, so
  `documents: [docs/guide.md]` is `ref-wrong-target` (`R:references.md:170-171`, `R:findings.md:49`). SPEC-136's
  declared edges are paths of any kind. *Fix:* let `file` stand for any path, resolving to the holding entity.
- G4 (med). **Former ids from all of history collide with `id-reused`.** "A former id stays taken"
  (`R:corpus.md:554-555`). A path that once held a file and now holds a new one is common (move `a.ts`, create
  `a.ts`). *Fix:* exempt generated collections from `id-reused`, or bound former ids to `--against`.
- G5 (low). The fixture declares `file:` outside `collections` (`R:docs-site-as-shapes.md:172-173`) with
  `include: 'src/**'`; how a collection's `include` relates to the generator's `inputs()` is unstated.

**`code`** (checked)

- G6 (med). Its description is split: the introduction is at `R:corpus.md:220-237`, and its bullets
  (`R:corpus.md:423-430`, `:456-457`) now sit under "Patterns", with the `files` and `encloses` bullets between
  them. *Fix:* move them back.
- G7 (med). **Duplicate ids are certain.** Ids are `path#name`, top-level declarations (`R:corpus.md:231`,
  `:429`). TypeScript overloads, and a `const` and `type` sharing a name, are ordinary (recalled). By
  `R:corpus.md:268` each is an `id-duplicate` error on a read-only entity nobody can fix.
- G8 (med). **A reference with a fragment has two readings.** `config.ts#SiteConfig` "resolves the declaration
  by name" through anchoring (`R:references.md:172-174`), and is also a symbol entity's id. In a field
  `to: [file]` it is either a file with a region or a wrong target. With no `code` collection only the first
  exists. *Fix:* say that a fragment on a file reference is a region, and a symbol only where a collection holds it.
- G9 (low). Table-driven names for "every language the table knows" (`R:corpus.md:456-457`), but ids, `kind`
  and `exported` in the example are TypeScript's; what `exported` means for CSS or shell is unstated.

**`patterns`** (checked)

- G10 (med). **Dynamic sites have nowhere to go.** A `dynamic` pattern "records sites it cannot resolve"
  (`R:corpus.md:409-410`), but an entry needs an id and the contract returns only entries. *Fix:* a
  collection-level diagnostics channel in the contract.
- G11 (low). `sites` carry line numbers (`R:corpus.md:405`), so every edit above a use changes the entity and
  shows in `c.diff`. Masking comments needs the language table, against "any text file, in any language"
  (`R:corpus.md:389`, `:408`).
- G12 (low). "The collection's shape may declare a field's merge" (`R:corpus.md:279-280`): no key is named, and
  none is in the size table.

**`git`** (checked)

- G13 (med). Caching: see the first of the five. A range "since a tag" (`R:corpus.md:356`, `:378`) reads a
  mutable pointer, so output does not depend "only on the inputs' contents".
- G14 (med). **`files` at the detail level references files that no longer exist** (`D`, or since moved;
  `R:corpus.md:370`). Each is `ref-unresolved`, an error, on an immutable entity.
- G15 (med). **`ref-former-id` on commit messages cannot be fixed.** A bare id in an old commit that was later
  renumbered resolves through former ids with "a fix rewriting it" (`R:corpus.md:552-553`); a commit cannot be
  rewritten, so the info finding is permanent, one per commit.
- G16 (low). "Names, never email addresses" (`R:corpus.md:363`), while trailers are kept whole
  (`R:corpus.md:367-369`); `Signed-off-by` and `Co-Authored-By` values carry addresses (recalled).
- G17 (low). Shallow history reports `history-unavailable`, which fails `validate` (`R:corpus.md:380`,
  `R:findings.md:39`), in CI that clones shallowly by default.

**`marquise`** (checked)

- G18 (med). Input: see C10.
- G19 (med). **`--against` is undefined.** Generated entities are "produced per snapshot, at the snapshot's
  version" (`R:corpus.md:223`), but the input is `mq.schema()` of the one instance the host passed
  (`R:corpus.md:266-267`). The base version's shapes need a second instance, and kits' shapes are not in the
  repository (`R:corpus.md:287-288`).
- G20 (low). Ids are "qualified by kit when two would clash" (`R:corpus.md:291`), so installing a kit renames an
  existing entity, against "ids … are stable" (`R:corpus.md:268`).
- G21 (low). `remove-after:<=$release` (`R:corpus.md:320`): `$release` is defined nowhere, and versions have no
  value type to compare.
- G22 (low). `migration-unused` is a core finding (`R:findings.md:70`) and "an ordinary rule" of this plugin
  (`R:corpus.md:308-309`). `instances` lists non-entities, which "cannot be referenced" (`R:corpus.md:475-477`);
  its type is unstated.

**`foreign` as "the declarative generator"** (checked)

- G23 (med). The equation does not hold (`R:corpus.md:276`). Generated entities "have an identity and no
  location, are read-only" (`R:corpus.md:222-223`); foreign entities have a file, findings "on that file"
  (`R:corpus.md:198`), an `include`, and their own `readOnly` key. *Fix:* "like a per-file generator", or give
  generated entities a location.
- G24 (med). **"Generated" has two opposite meanings.** `generated: true` is a file a build produces, "left
  out of `--against`" (`R:corpus.md:191-192`); a generated collection is compared under `--against`
  (`R:corpus.md:223`). Q46 writes "generated foreign collections" (`R:corpus.md:336-337`). *Fix:* rename the key
  (`built: true`).

**Interactions the contract is silent on** (checked)

- G25 (med). **Reading is synchronous, but details are computed only for what load could foresee**
  (`R:corpus.md:260-262`). An ad hoc `riviere find symbol 'hash:…'`, an MCP query or a predicate in code is not
  known at load. *Fix:* say the field is absent, or that such a query is refused with a named finding.
- G26 (med). **The serialised snapshot** stores "each document … and the index, not records", and restoring
  "calls nothing" (`R:corpus.md:613-616`). Generated entities are not documents. Likewise `c.document(entity)`
  (`R:corpus.md:465`), `expand`, the entity's `address`, the Astro loader's rendered body, and the id of a
  refused write to a generated entity.
- G27 (low). Editor buffers (`R:corpus.md:602`) have no blob id for the cache key.
- G28 (low). "Untrusted shapes use one only where the host allows it" (`R:corpus.md:274-275`): generators are
  named by collections, not shapes.
- G29 (low). `Entry`, `Fields`, `ctx` and `ShapeSource` are undefined; `kind:` (`R:corpus.md:302`, `:373`)
  selects among `shapes[]` and is not in the interface.

---

## 3. Mentions as a whole

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| M1 | high | `R:references.md:97-100` | Code spans resolve "against collections that hold code". Nothing says how a collection declares that. Belvédère resolves spans to files, packages, findings and config keys (`B:docs/concept.md:77-83`). | A key on the target collection, or a `to` list on `mentions: { code }`. |
| M2 | high | `R:references.md:99`, `R:corpus.md:428` | Uniqueness is the only guard. On refrakt 6,589 of 8,724 declared names occur once, so `` `config` `` or `` `options` `` resolves to whichever symbol is the one top-level declaration of that name. Q36's guards (generic names weighed down, base rates per class, the eight classes; NOTES:4247-4250) are only in Belvédère (`B:docs/concept.md:86-88`). No ignore list exists outside `patterns`. | Carry the classes and an `ignore` list into `references.md`. |
| M3 | med | `R:references.md:101-104` | The rule for unresolved and ambiguous inferred candidates sits in the code-span paragraph. Bare ids (`R:references.md:92-95`) are called inferred, but `mention-ambiguous` is defined as "a code span" (`R:findings.md:47`). Which fields of a data shape are scanned is unstated. | One paragraph "inferred mentions", before both. |
| M4 | med | `R:references.md:60-62`, `R:configuration.md:46-49` | Branch against commit is decided by `{ref}`; a tag is neither. A branch name with a slash makes `{ref}/{path}` ambiguous (recalled). A permalink to a file since deleted has no target. A permalink with a line range is stable, and still gets `link-coordinate`. | Define each case; exempt permalinks from `link-coordinate`. |
| M5 | med | `R:references.md:80-82` | A fragment naming no symbol (`instance.ts#gone`): an error, a silent miss, or Marquise's `link-anchor-missing`? Members (`Instance.reload`) are never entities (`R:corpus.md:429-430`). | State the finding and its severity. |
| M6 | med | `R:references.md:126-128` | `page/documents-redundant` presumes a shape named `page`, has no owning definition, and compares two lists, which selectors refuse (`selector-value-list`, `M:findings.md:39`). It also tells an author to delete the highest-precision edge class (SPEC-136) in favour of an inferred one. | Make it a registered check of a named docs definition; fire only for `ref` and `link` classes. |
| M7 | med | `R:references.md:88` | A passage's address is an index (`body[12]`), since paragraphs have no id or key (`M:writing.md:31`). An insertion above moves it. | Say passages are matched by content hash, not address. |
| M8 | low | `R:references.md:48`, `:53-63`, `:80-84` | The table lists two ways to write a mention of five; "links are mentions" is stated twice, with `link-coordinate` in both. | Merge. |
| M9 | low | `R:references.md:99`, `B:docs/concept.md:77` | A path in a code span: relative to the repository root, the document or the package? | Root-relative only, as SPEC-136. |
| M10 | low | `R:corpus.md:565-567`, `:227`, `:434` | Names "come later", while file and symbol resolution rests on `names`. | Tier names with the first generator that needs them. |

---

## 4. Adapters and "one format, three readings"

Beyond the fifth of the five (checked):

- A1 (med). **Rendering order with bases, chains and cycles.** A binding on a base shape draws descendants
  (`M:rendering.md:83-84`). Whether an adapter from a base applies to descendants, whether a base's binding
  beats a descendant's adapter, whether adapters chain, and what a cycle is, are unstated
  (`M:rendering.md:156-158`). Whether `shape-unbound` fires for an adapted shape is too.
- A2 (med). **`as=` overlaps per-item templates.** `R:shapes.md:38-40` renders entities through an adapter,
  which may be a `compose` template; five lines on, per-item templates "arrive with `compose`" as `$item`, and
  until then there is "no temporary template mechanism" (`R:shapes.md:45-48`). Two mechanisms, two variables
  (`$item`, `$attrs`). The node "carries data, not markup … `items: WorkRecord[]`" (`R:shapes.md:41-42`);
  what it carries under `as=` is unstated.
- A3 (med). **Findings at render time.** `adapter-invalid` is raised "when rendering" (`M:rendering.md:154-155`).
  Every other finding belongs to a document or a snapshot at load; where this one goes is unstated.
- A4 (med). **Invertibility.** "All paths" is not sufficient (`M:rendering.md:160-161`): two targets from one
  source field, a target type narrower than its source, and sources that are read-only by construction
  (`commit`, `symbol`, the page's own examples). The template tier's editability is unstated.
- A5 (low). The declarative tier has one `fields:` map and `to:` is a list (`M:rendering.md:126-127`); with two
  targets it is ambiguous. `fields:` also means a structured attribute's members (`M:shapes.md:79`).
- A6 (low). `{% slot name="attributes" each %}` reads an attribute named `attributes` through `slot`, and
  `$attrs.id` reads a reserved name (`M:rendering.md:142-143`, `M:shapes.md:66`).
- A7 (low). `M:rendering.md:164-165` is a stranded sentence of the Bindings section, now after Adapters.
- A8 (low). `as` now has three meanings: a field's reading (`as: inline`), a value type (`as: ref`), and an
  adapter target (`as="timeline-entry"`).

---

## 5. Layering and the size tables

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| L1 | med | `R:scope.md:72` | The plugins row has no `git`, `patterns`, `code` or `sqlite`, so `range`, `kind`, `patterns` (`match`, `id`, `fields`, `dynamic`), `ignore`, `site`'s keys and `chain` are counted nowhere. | Add them. |
| L2 | med | `R:scope.md:63` | `mentions` counts `code` only; `mentions: { ids }` (`R:references.md:93`) is missing. By my count the first column holds 16 names (members included, with `files`) against a stated 15. | Recount. |
| L3 | med | `M:scope.md:113`, `:109-125` | "Attribute keys (9)" lacks `fields`. There is no row for adapter-file keys (`adapts`, `to`, `fields`). Structured attributes are counted in the 1.0 column (`M:scope.md:111`) with no row in "What 1.0 contains" and no "state today"; adapters are missing from "After 1.0" (`M:scope.md:73`). | Add the rows and a tier for Q41. |
| L4 | med | `R:configuration.md:46-49`, `R:scope.md:64` | `repository` is a core key that renders "view source" URLs. By Q39's own test (not every corpus needs it; buildable on the public API) it belongs to `site`. | Move it, or say why reading URLs back is mechanism. |
| L5 | low | `R:plugins.md:9-18` vs `:24` | The "core is" list omits generators and generated collections; the layer table includes them. | Add. |
| L6 | low | `R:corpus.md:82`, `:110-113` | Parents from folders (`tree:`) are described in core's path section without naming the plugin. | Name it. |
| L7 | low | `R:plugins.md:65` | `site` depends on `tree`'s `encloses`; plugins have no way to require one another. | A `requires` for plugins, or state the union. |
| L8 | low | `R:plugins.md:44` vs `R:references.md:313`, `R:findings.md:69`, `M:findings.md:31` | A rule reading a member computed from its own findings is `computes-order`, Marquise's id for declaration order; Rivière's cycle id is `computes-cycle`. | Use `computes-cycle`. |
| L9 | low | `R:queries.md:65-84` | "Every `$` name, in one place" lacks `$dir` (`R:corpus.md:448`), `$release`, `$attrs`, `$each`. `within` has no `$`, though built-ins start with `$` "so they never collide" (`R:corpus.md:481`). | Complete the table. |

---

## 6. Belvédère

**Fit with Rivière** (checked)

- B1 (high). Review state, the `reviewed:` map and agent confirmations: see the fourth of the five. Belvédère
  lists the agent state as a need (`B:docs/concept.md:208-209`), which is honest; the map it presents as given.
- B2 (med). **Members are not entities.** `` `Instance.reload` `` resolves to "the member"
  (`B:docs/concept.md:80`), and the map keys `instance.ts#reload` (`B:docs/concept.md:101`). Rivière's code
  collection is top-level declarations only (`R:corpus.md:429-430`).
- B3 (med). **"Declared subjects scope ambiguous names"** (`B:docs/concept.md:87`). Rivière's resolution is one
  rule for every surface (`R:corpus.md:525-531`), and an ambiguous inferred mention never resolves.
- B4 (med). **Region dates need full history.** "Probably stale" reads "git history of both regions"
  (`B:docs/concept.md:94`), which is per-region `git log -L` from the history source, "when a consumer asks"
  (`R:corpus.md:492-494`). The first surface runs in CI, shallow by default, where SPEC-136 D5 refuses.
- B5 (low). Signature claims (`B:docs/concept.md:81`) are not in Rivière, which strips call syntax
  (`R:references.md:100-101`), nor in Belvédère's list of needs.
- B6 (low). SPEC-136 did not find prose paths "the only edge class that discriminated"
  (`B:docs/concept.md:71`): described links measured 39% and were accepted (SPEC-136, edge-class table and D16).

**Claims beyond what the layers provide** (checked)

- B7 (med). **"Plain Markdown works without shapes"** (`B:docs/concept.md:10`). A Rivière entity is a shape
  instance with an id in a collection (`R:corpus.md:461`). Belvédère must ship a page shape and a corpus
  definition.
- B8 (med). **The region in `CLAUDE.md`** (`B:docs/concept.md:144-146`). Regions are "for documents outside
  collections"; inside a shape's content they are `regions-in-shape` (`R:shapes.md:83-86`). Belvédère also
  treats `CLAUDE.md` as a page and as the source memory is captured from (`B:docs/concept.md:10`, `:16`), so
  memory would be copied out of the file and generated back into it.
- B9 (med). **"Only a person may ratify"** (`B:docs/concept.md:153-154`). Rivière's policy is "a guardrail, not
  access control" (`R:glossary.md:185-186`); the actor comes from the caller, and an agent with a shell edits
  the file.
- B10 (med). **Commit references break on squash and rebase.** Ledger entries link "its commits"
  (`B:docs/concept.md:43`) and are committed after them (`B:docs/concept.md:148-150`). A squash merge replaces
  those hashes (recalled), and the commit collection holds only reachable commits (`R:corpus.md:376`), so every
  merged entry has dangling references.
- B11 (low). Parallel agent branches creating records under `.belvedere/` need hashed ids, a leaning
  (`R:corpus.md:117-120`), not in Belvédère's needs.

**Principles against mechanisms** (checked)

- B12 (med). **"Every piece of work … is done by nobody, or by an agent"** (`B:docs/concept.md:5-6`), with
  "Setup: nobody". The mechanisms need collections declared, the `code` generator's globs, `repository`
  templates, `mentions: { code }` per collection, each class "measured by base rate before it is turned on"
  (`B:docs/concept.md:88`), CI with full history, and `belvedere init` (`B:docs/concept.md:156`).
- B13 (med). **"It depends on adoption … only lightly"** (`B:docs/concept.md:219-220`). It needs `code`, `git`,
  `trace`, `regions`, `context`, `foreign`, `tree`, MCP, the write path and a hosted sink
  (`B:docs/concept.md:194-211`): nearly every "when a consumer asks" item.
- B14 (med). **States.** "Every link to code has one of three states" (`B:docs/concept.md:47`); the page then
  uses unconfirmed, probably stale, provisional and outdated (`:48`, `:94`, `:171`, `:65`), and the mockups add
  "drifting" (`B:mockups/README.md:11`). Dashed means unconfirmed in the mockups (`B:mockups/README.md:20`)
  and agent-confirmed in the concept (`B:docs/concept.md:171`).
- B15 (low). **"Leaving costs nothing"** (`B:docs/concept.md:30`): `reviewed:` maps stay in every page's
  frontmatter, and GitHub renders frontmatter as a table (recalled).
- B16 (low). "The mockups show six" above a list of seven (`B:docs/concept.md:53-66`). A hook around every
  tool use is a cold CLI call; the warm snapshot is "later" (`R:corpus.md:595-596`).

---

## 7. Anything else

- **Glossary gaps (checked).** Rivière has no entry for generator, generator contract, detail level, symbol,
  passage, mention class, inferred mention, coordinate, permalink, reference with data, `encloses` and `within`,
  layout chain, derived member, anchor, review hash, base shape, patterns. "Former id" is "kept in the field its
  collection names" (`R:glossary.md:81-82`) and "Entity" is in "its files" (`R:glossary.md:63-64`); neither holds
  for generated entities. Marquise has no entry for structured attribute or adapter file's `adapts`.
- **Uncatalogued ids (script):** `report-stale` (`R:corpus.md:341`), `page/documents-redundant`
  (`R:references.md:127`).
- **Double tiers.** `R:references.md:363-365` says "when a consumer asks" twice in two lines.
- **`migration-applied` twice.** Marquise's warning (`M:findings.md:79`) and the example rule
  `old-form-in-use` (`R:corpus.md:315-318`) both fire per old form.
- **Carried, still open:** `M:explicit-slots.md:34-35`, whether Markdoc's slots are stable; a bare string in a
  foreign `map` is CEL (`R:corpus.md:169`), in an adapter a path (`M:rendering.md:128`).

---

## From the 2026-11-24b review: what regressed

1. **"Scope tables obeyed by other pages"** (its section 7, item 1). Regressed by the same mechanism: C1, C2,
   C3, C4, L1–L3. Q39 edited `plugins.md`, `scope.md` and `overview.md:43` and missed `integrations.md`,
   `overview.md:49` and the README.
2. **"Bindings added without the trust model"** (its fourth of the five). Repeated for adapters:
   `M:rendering.md:162` with no row in `M:trust.md`.
3. **README package tables** (its item 5). `foreign` was added; `site`, `marquise`, `patterns` and `code` are
   missing, and `git` is described as a source (C9).
4. **"`$` names and reserved names in one place"** (its item 4). `$dir`, `$release`, `$attrs`, `$each` (L9).
5. **"Worked pages load as written"** (its item 2). `file:` outside `collections`
   (`R:docs-site-as-shapes.md:173`).
6. **The size tables' uncounted vocabularies** (its S-3). Binding keys were added; adapter keys and `fields`
   were not (L3).
7. **Glossary gaps** (its section 6). The gaps it named were filled; today's decisions opened a new set.

**Held, checked:** T1 (`M:scope.md:65`), T2 (`R:queries.md:71`), T5 (`R:docs-site-as-shapes.md:5-7`), T14
(`R:cli-and-mcp.md:34`), L1 (Binding and Host code separate), N1 (`field-derived`), both finding catalogues'
completeness apart from the two ids above, and severities.
