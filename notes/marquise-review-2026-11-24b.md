# Fifth review of the Marquise and Rivière concept docs (2026-11-24, afternoon)

Outside review, read cold. Scope: both READMEs and every page in both `docs/concepts/` directories; then
notes Q18–Q29, SPEC-199's 1.0 table and Order, the CEL spike's FINDINGS; then the 2026-11-24 review for
regressions. Nothing was edited.

**Citations:** `M:file.md:line` and `R:file.md:line` are concept pages (relative to `docs/concepts/`);
`M:/README.md` and `R:/README.md` are the repository READMEs; `NOTES:line` is `notes/marquise-foundation.md`.
**"Checked"** means I read the cited lines in the current checkouts. **"Recalled"** means a claim about an
external tool (CEL, YAML) from memory, not run.

**Scripts run (read-only):**

- every backticked kebab-case token in both doc sets compared against both `findings.md` catalogues: **no
  finding id is used without being catalogued** (checked). 16 catalogued ids are never used outside the
  catalogue (listed in section 6).
- every relative and cross-repository link and heading anchor resolved: **no broken link or anchor** (checked;
  the four misses are example links inside prose).

---

## The five most important things

1. **Plan's new parts, the 1.0 acceptance fixture, cannot be written as shown.** (high, checked)
   - The milestone's `progress` (`R:plan-as-shapes.md:157-160`) filters `links.items` with `i.entity.outcome`.
     `items` is an inverse over the top-level attributes `work.milestone` and `bug.milestone`, so it holds
     entities, not items (`R:references.md:191-193`, `R:queries.md:102-106`): `i.entity` does not exist, which is
     `computes-type`.
   - `outcome` is "absent until then" for every unfinished item (`R:references.md:353-354`), and the profile has
     no optionals, "until then `has()` covers them" (`M:syntax.md:211-212`). The formula reads it bare, so it
     fails (`computes-error`) for any milestone with open work, and `milestone-complete-with-open-work`
     (`R:plan-as-shapes.md:300`) becomes `rule-inconclusive` exactly where it should fire.
   - `resolution-not-done` uses `$terminal` in the table of Marquise `rules` (`R:plan-as-shapes.md:281-286`).
     `$terminal` is the `workflow` plugin's. Loaded by Marquise alone (the language server, `marquise validate`)
     it is `selector-unavailable`, an error, and "a shape with error findings is left out" (`M:api.md:74`).
   - Three shape files do not parse as YAML (below, F-P4).
   - *Fix:* write `links.items.filter(i, has(i.outcome) && i.outcome == 'achieved')`, define what an entity looks
     like inside CEL, move the rule to `riviere: { rules }`, and run the formula in the spike.

2. **Terminal states and outcomes do not hold together yet.** (high, checked)
   - `outcomes` lists bare states and never names a field (`R:references.md:340-342`). `$terminal` is "true when
     every field with transitions is in a terminal state" (`R:references.md:352-353`). Plan declares outcomes and
     no transitions (`R:plan-as-shapes.md:88-92`), so there is no field with transitions: read literally,
     `$terminal` is true for everything, and nothing says the outcomes are about `status`.
   - The docs' own `reopen` write requires `$terminal:true` and sets `status: ready`
     (`R:queries.md:328-329`). A state with a way out is not terminal, and an outcome naming one is
     `workflow-outcome-not-terminal` (`R:references.md:347-351`). So a corpus that allows reopening has no terminal
     states and no progress.
   - Under `extends` a transitions map "may only lose transitions" (`R:plugins.md:80-81`), while `work` and `bug`
     need different maps over different states; losing a state's exits makes it terminal in the descendant only.
   - *Fix:* key outcomes by field (`outcomes: { status: { achieved: […] } }`), define terminal as "has an
     outcome" rather than "has no exit", and let transitions out of a terminal state be explicit reopenings.

3. **`rule-inconclusive` covers rules and views only, at warning severity.** (high, checked)
   - It exists because "a missing value would otherwise turn `-latestRun.result:pass` true"
     (`M:selectors.md:89-91`). A saved write's `require` "may read" computed values (`R:references.md:237-238`,
     `M:findings.md:83`), and nothing says what a failed value does there. Under two-valued logic a negated
     clause passes and the write proceeds. The same gap: the policy's `where` (`R:writing.md:167`), a write over
     a selection (`R:writing.md:135`), a migration's `cases.when` (`M:extending.md:189`), a `collection` filter in
     content, `sort` and `count`.
   - The id is not in Rivière's pages at all (grep: no match in `R:`), and it is a warning (`M:findings.md:42`):
     an error-severity rule that cannot be evaluated leaves exit code 0.
   - *Fix:* one sentence in `M:selectors.md`: a selector reading a failed value is inconclusive everywhere; a
     gate (`require`, `where`, a migration case) treats inconclusive as not met; the finding takes the severity
     of the rule it silenced.

4. **Bindings as data were added without updating the trust model or the CEL boundary.** (high, checked)
   - `M:rendering.md:100` gives three prop forms including `{ cel }`; `M:trust.md:47` still says "Bindings take
     dot paths only".
   - `M:rendering.md:109-110` says bindings "can come from untrusted sources"; `M:trust.md:110` gives untrusted
     shapes "none of their own", and `M:trust.md:16` lists bindings as trusted code. NOTES:4172-4174 confirms the
     new intent, so `trust.md` is the stale side.
   - `M:syntax.md:125-128` makes CEL "the value language of configuration"; forty lines on, `M:syntax.md:167`
     still says "CEL appears only in `computes`", and `M:syntax.md:169-171` says "every computation lives in the
     shape".
   - The profile's limits and findings are named for `computes` only (`M:syntax.md:194`, `:202-203`;
     `M:trust.md:112`). Nothing says whether `matches()` is refused, which limits apply, or which finding id is
     reported for CEL in a binding, a migration, a foreign map or a write value.
   - *Fix:* a row "bindings" in the untrusted table (paths and maps; `{ cel }` under the untrusted limits),
     reword `trust.md:47` and `syntax.md:167`, and rename the profile findings or say they cover every CEL site.

5. **Rivière's second release is the new catch-all, and the tier statements drifted again.** (high, checked)
   - Three of today's additions sit in the second release with no consumer: combining definitions (`exclude`,
     `requires`), computed write values and `create: { set }` (`R:scope.md:30`). Plan's page uses none of them,
     and `R:plugins.md:88` names only "a releases add-on" as "the natural second". The scope rule is "everything
     else waits until a consumer asks" (`R:scope.md:5-6`).
   - Stale tiers elsewhere: `M:scope.md:65` ("Rivière's first release uses the write path"), `R:queries.md:71`
     (`$this`, `$root` in "Marquise 1.0 with rules"), `R:corpus.md:252` (`history: optional`, a first-release
     need counted "Later" at `R:scope.md:60`), fifteen "after the first release" phrases, and "(later)" on
     computed values in `R:findings.md:63` and `R:glossary.md:35`.
   - *Fix:* move the three to "when a consumer asks" until a second definition exists; one pass replacing "after
     the first release" with the tier name.

---

## 1. Contradictions between pages

### Release tiers

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| T1 | high | `M:scope.md:65` vs `M:scope.md:96-99`, `R:scope.md:8-9`, `:16-18` | "Rivière's first release uses the write path and deferred shapes that way." The first release only reads; the write path is used from the second. | "Its first release uses deferred shapes that way, its second the write path." |
| T2 | med | `R:queries.md:71-72` vs `M:scope.md:46-48`, `:119` | `$this` and `$root` arrive in "Marquise 1.0 with rules"; `$shapes` "with `extends`". Selectors and rules are a 0.x capability beside 1.0, with no selector built-ins in 1.0. | "with `@marquise-md/selectors` (0.x)". |
| T3 | med | `R:corpus.md:250-253`, `R:findings.md:35` vs `R:scope.md:60` | `history-unavailable` fails `validate` "unless the config says `history: optional`". `$modified` is first release and the docs site sorts by it (`R:docs-site-as-shapes.md:176`), on CI that clones shallowly; `history` is counted as a "Later" config key. | Count `history` in the first release, or say what the key is until then. |
| T4 | med | `R:scope.md:27-28`, `:59` vs `R:scope.md:8`, `R:corpus.md:66-68` | `into` (`file`, `order`, `container`) is counted in the read-only first release. Its only meaning is "where new ones go". | Move `into` to the second release; the first release reads many entities per file without it. |
| T5 | med | `R:docs-site-as-shapes.md:222-226` vs `:196-202`, `:218` | The page "is Rivière's first release", and shows `riviere move`, `riviere create term`, sorted insertion and a write policy on `symbol`. All are second-release writes. | Add a "From the second release" line, as the other worked pages have. |
| T6 | med | `R:events-as-shapes.md:184`, `:234`; `R:scope.md:30` vs `R:docs-site-as-shapes.md:178`, `R:corpus.md:239` | "Relative dates beyond `$today`" wait for a consumer, yet `$today+7d`, `$today-1y` and `$today-6mo` are used as first-release selectors. The term is defined nowhere. | Define it (a named period such as "this week"?) or delete the row. |
| T7 | med | `R:references.md:173`, `:212-215` vs `R:scope.md:29`, `:62` | Symmetric references sit under a heading "Decided, in the first release" with no tier of their own; scope has them when a consumer asks. | Mark the paragraph. |
| T8 | med | `R:traceability-as-shapes.md:252` vs `R:scope.md:29`, `R:references.md:130-136` | "Links with data and brackets" wait for this domain. A link with data is an ordinary item model with a reference field; `$entity`, brackets and "inverses (also over nested references)" are all first release. Nothing is left to wait for. | Say what Rivière adds (the `at` on graph edges, the "via" line), or drop the tier. |
| T9 | med | `R:plan-as-shapes.md:329`, `:336-337` vs `R:scope.md:32`, `:75-76` | The git history source comes "after Rivière's first release" on a page that *is* the second release; scope has it when a consumer asks. Plan's to-do list keeps it, and 1.0 needs that list empty. | Put the history source in the second release, or strike it from the exit test. |
| T10 | low | `R:traceability-as-shapes.md:262-263` | The latest-run value "waits for computed values (after the first release)". They are second release now, the same tier as this page's transitions, so the to-do item is writable. | Move it out of the to-do list. |
| T11 | low | `R:findings.md:63`, `R:glossary.md:35` vs `R:scope.md:30`, `R:references.md:217` | `computes-cycle` and "Computed value" are marked "(later)". | "second release". |
| T12 | low | `R:corpus.md:116`, `:145`, `:412`, `:490`; `R:references.md:293`; `R:shapes.md:58`; `R:integrations.md:103`; `R:site-builder-as-shapes.md:177`; `R:events-as-shapes.md:243`, `:251`; `R:prior-art.md:27`; `R:/README.md:121-122` | "After the first release" is the old two-tier wording. Each of these is "when a consumer asks" on the scope page. `R:plugins.md:54-57` says "later" for the same tier. | One name for the third tier everywhere. |
| T13 | low | `R:corpus.md:317`, `:512-513` | "In the first release: former ids, which plan's renumbering needs", and `@riviere-md/node` with its sink "in the first release, since the CLI and plan's rebuild need it". Plan is the second release. | Reword both reasons. |
| T14 | low | `R:cli-and-mcp.md:11-31`, `:65-73` vs `R:scope.md:35` | The command list marks only `generate` as later. `context`, `close --where`, `history` and the MCP `context` tool and `where` argument wait for a consumer. `R:/README.md:41` leads with `riviere context`. | A release column, as `M:commands.md` has. |
| T15 | low | `R:README.md:17` (concepts index) vs `R:scope.md:1`, `R:/README.md:89` | "Scope of the first release". | "first releases". |
| T16 | low | `M:extending.md:226-229` | "In 1.0 a fix is described" inside the scope of a 0.x capability. | "In the capability's first form". |

### Leftovers of replaced designs

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| L1 | med | `M:glossary.md:14-16` vs `M:configuration.md:3-5` | "Binding. Code a host passes to `createMarquise` … also a mapping of a shape onto a component". The rename to *host code* was made so the word means only the second. No "Host code" entry exists. | Split into "Binding" and "Host code". |
| L2 | low | `M:trust.md:52`, `:55`; `M:api.md:73-74` | "its `values` binding", "a binding, passed to `createMarquise`", "a missing binding". | "host code". |
| L3 | med | `M:syntax.md:167` vs `:125-128` | "CEL appears only in `computes`" (see the fourth of the five). | Delete the clause. |
| L4 | low | `M:glossary.md:21`, `:88` | CEL is that "in which `computes` is written"; the profile is "the part of CEL `computes` may use". | "the value language of configuration". |
| L5 | low | `R:corpus.md:430` | Overlays are "loaded in the snapshot's one async step", against the rule "async exactly where a host callback may be called" (`R:corpus.md:368`). | "while the snapshot loads". |
| L6 | low | `M:api.md:10` | "The read API is synchronous by design" beside `await mq.load` (`M:api.md:26`, `:93`). | "reads after loading are synchronous". |
| L7 | low | `M:extending.md:119` vs `M:rendering.md:85`, `:103` | Kits get "bindings in each renderer"; bindings are data files "the same for every renderer". | "components registered per renderer". |
| L8 | low | SPEC-199:151 | The spec's after-1.0 text still writes `createMarquise({ writer, computes })`, the old signature. | `createMarquise(config, { writer, computes })`. |

Not found, so held (checked by grep): `computes-unavailable`, `items: { property }`, `node` in CEL, `from: { tag,
if }`, a synchronous `with`, "the only async step" verbatim, git as the only storage, `fingerprint` or context
bundles in the first release, "if proven" outside templates. `defineBindings` appears once, as the escape hatch
(`M:rendering.md:108`).

### Two names or syntaxes for one thing

| # | Sev | Where | Problem (checked) | Fix |
|---|---|---|---|---|
| N1 | med | `R:findings.md:65` vs `R:references.md:237-238`, `M:findings.md:83` | A write to a computed value is `field-derived` in Rivière's catalogue and `write-read-only` on the feature page and in Marquise's. | Drop "a computed value" from `field-derived`. |
| N2 | med | `R:corpus.md:168`, `:174` vs `R:queries.md:326-329` vs `M:rendering.md:91-93` | A bare string in configuration means three things: a CEL expression (a foreign `map`), a literal (a write's `set`, where CEL is `{ cel }`), and a field path (a binding's prop, where CEL is `{ cel }`). | `{ cel }` everywhere an expression is meant; `map` values become `{ cel: … }` or plain source paths. |
| N3 | med | `M:shapes.md:70-72`, `R:queries.md:90-92` vs `R:queries.md:332`, `R:references.md:354` | CEL's reserved plain names are `now`, `today`, `links`, `entity` in "the one list". Write values add `actor` and `input`, and `workflow` adds `terminal` and `outcome`. A shape with a field `actor`, `input` or `outcome` collides, since top-level fields are plain paths (`M:syntax.md:148`). | Complete the list, or put layer names under one reserved root. |
| N4 | med | `R:references.md:226-230` vs `:245-246`; `R:plugins.md:29`; `R:queries.md:181` | Inverses are `links.verifiedBy` in one CEL example and bare `verifiedBy` four lines down. Plugin-derived members are "kept in `links`", so is `$outcome` `outcome`, `links.outcome` or `self.outcome` in CEL? `$depth`, `$modified` and `$container` have no CEL name at all. | One rule: where each `$` member lives in CEL. |
| N5 | low | `R:references.md:263` vs `R:plan-as-shapes.md:297` | `spec-status-lag` is written two ways (`has:backrefs(work.source) all:backrefs(…).status:done,cancelled,superseded`; `has:work all:work.$terminal:true`). | Use the plan page's form in both. |
| N6 | low | `M:validation.md:81`, `M:findings.md:98`, `M:glossary.md:105` vs `R:plan-as-shapes.md:285`, `:302` | Marquise's standing example of a scoped rule id is `work/done-without-resolution`; with the new base it is `plan-item/done-without-resolution`. | Pick another example, or update. |
| N7 | low | `M:trust.md:29` vs `M:configuration.md:15`, `:44` | `shapes: [article, note]` is the set of document shapes a folder allows; `shapes` in configuration is where shape files are. | Name the first key. |
| N8 | low | `R:queries.md:197` vs `R:shapes.md:9`, `R:references.md:249-250` | Core capabilities include "sum and average"; `aggregate` is "counts, grouped" and "selectors grow no counting functions". No page defines a sum. | Remove, or define on `aggregate`. |

---

## 2. The worked pages as fixtures

### Plan (`R:plan-as-shapes.md`), second release

- **F-P1 (high, checked).** `:157-160`, the `progress` formula: `i.entity` on entities, and `outcome` read
  without `has()`. See the first of the five. What it gets right: no nested macro, no optionals, no math
  extension, integer arithmetic, a ternary guarding the division, `size()`.
- **F-P2 (high, checked).** `:88-92`, `:96-98`: outcomes without transitions. See the second of the five.
- **F-P3 (med, checked).** `:286`: `$terminal` in a Marquise `rules` rule. Move it to the cross-entity table.
- **F-P4 (med, checked; YAML recalled).** `:57`, `:103`, `:169` (and `R:traceability-as-shapes.md:78`): an
  unquoted `description:` containing ": " (`description: A unit of work: what to build…`). A plain YAML scalar
  cannot contain a colon followed by a space, so these four shape files fail to parse. *Fix:* quote them.
- **F-P5 (med, checked).** `:62`, `:79`: `riviere: { context: full }` and `context: summary`. `context` is the
  `@riviere-md/context` satellite's key, which waits for a consumer, and "plan does not use them today"
  (`R:context-bundles.md:5`). In its own release the fixture loads with `plugin-not-installed` twice. *Fix:*
  remove, or list under "when asked" as traceability does for `trace:`.
- **F-P6 (med, checked).** The `extends` rules hold: `work` and `bug` narrow `status` to subsets and add
  attributes and sections; rule ids keep `plan-item/`. Not covered:
  - `to: [plan-item]` (`:78`, `:84`) names an abstract shape with no collection. The resolution rule constrains
    the search to "those shapes' collections" (`R:corpus.md:279-280`); nothing says a base's `to` reaches its
    descendants' collections.
  - "Outcomes add and narrow" (`R:references.md:357`) has no definition of narrowing an outcome. The inherited
    lists name states `work` does not allow (`fixed`, `wontfix`, `duplicate`).
- **F-P7 (low, checked).** `:271`: "every collection names `formerIds: 'formerly'`", milestone included; the
  milestone shape (`:146-147`) declares no `formerly`, which `R:corpus.md:300-301` requires.
- **F-P8 (low, checked).** `:300`: an empty milestone has `progress` 0, so a complete milestone with no items is
  reported as having open work.
- **F-P9 (low, checked).** `M:scope.md:140` makes "plan's sections" the exit test for paragraph and item
  templates. Plan uses a heading template only (`:192`) and part-based items (`:117-120`).

### Docs site (`R:docs-site-as-shapes.md`), first release

- **F-D1 (med, checked).** `:118`: the glossary's `term` is a paragraph template. Paragraph templates are the
  one "if proven" item in Marquise (`M:scope.md:21`, `:52-55`); Rivière's first release depends on them and
  `R:scope.md` does not say so.
- **F-D2 (med, checked).** T3, T4 and T5 above: `history`, `into` and the page's writes.
- **F-D3 (low, checked).** `:226`: "`$modified` and `$today` (from `@riviere-md/node`)". `$today` is core's.

### Traceability (`R:traceability-as-shapes.md`)

- **F-T1 (med, checked).** `:78`: the YAML colon (F-P4).
- **F-T2 (low, checked).** `:110`: the inverse is declared `verifiedBy`, a camelCase name in a shape file, which
  is reported (`name-camelcase`, `M:shapes.md:57`). The same in `R:references.md:125` (`dependsOn`, also missing
  `list: true`), `:226`, `:230`, and Marquise's own `M:syntax.md:136-138` (`totalTime`, `prepTime + cookTime`
  beside kebab-case attributes). *Fix:* say that names declared in `computes` and `inverse` follow the kebab
  rule, and write them so.
- **F-T3 (low, checked).** T8 and T10 above.

### Events (`R:events-as-shapes.md`)

- **F-E1 (med, checked).** T6: `$today+7d` at `:184` against "relative dates beyond `$today`" at `:234`.
- Otherwise writable as shown in the tiers it names (checked: id pattern, the CSV plugin, the map keyed by id).

### Site builder (`R:site-builder-as-shapes.md`)

- **F-S1 (low, checked).** `:239`: snapshots are "cached serialised"; the serialisable snapshot waits for a
  consumer and is missing from the page's own list at `:270-272`.
- Otherwise consistent with untrusted shapes as `M:trust.md` now defines them. The page does not use customer
  bindings, so it does not exercise the contradiction in the fourth of the five.

### In the concept pages' own examples

- **`M:rendering.md:93` (med; CEL recalled).** `has(icon)`. CEL's `has()` takes a field selection, not a bare
  identifier, so this does not compile. Write `has(self.icon)`, as `R:queries.md:329` does.
- **`R:/README.md:26-28` (med, checked).** `marquise: createMarquise(…)` is not awaited, so Rivière receives a
  promise. `createMarquise` has been async since Q19 (`M:api.md:23`, `:69`).
- **`R:queries.md:326-329` (low, checked).** The two saved writes have no `collection`.
- **`M:extending.md:138-141` (low, checked).** The declarative tier covers "a value mapped … to a patch of several
  attributes or dimensions", "an explicit slot or a frontmatter key renamed". No key for any of the three is shown
  or counted (`M:scope.md:116`).

---

## 3. The new mechanisms together

**X-1. Two definitions, one excluded, and a rule reading a computed value.** *Implied:* the excluded definition's
"references, rules, views and links" now point at the other owner's shape, and "every field they read must exist
with a compatible type" (`R:plugins.md:107-110`). *Silent on:*
- whether computed values, inverses and plugin-derived members count as fields for this check. A replacement
  that declares `progress` with another formula passes on type and changes meaning;
- CEL expressions and saved writes, which the sentence does not list;
- the excluded shape's own rules, which vanish with their scoped ids (`release/x`), so a CI gate on that id
  passes for ever;
- `$terminal`: if the replacement declares no workflow, `all:x.$terminal:true` in the excluded definition's
  rules is true for everything (second of the five);
- what `exclude: ["release"]` names: a shape, a collection, a view and a saved write may share that name.
*(high.) Fix:* `exclude` takes typed names (`shape:release`); the check lists every member read, in selectors and
CEL; a dropped rule id is reported once (`definition-rule-dropped`).

**X-2. A `readOnly` foreign collection targeted by a saved write.** *Implied:* refused at run time with
`data-file-read-only` (`R:corpus.md:186-187`). *Silent on:*
- a check when configuration loads, as transitions (`workflow-write-transition`) and value types
  (`write-value-type`) get;
- `create: { set }` on a `readOnly` collection, which is contradictory configuration with no finding;
- a write over a selection: `write-skipped` lists "`require`, transitions or the policy" (`R:findings.md:76`),
  not read-only;
- **renaming an entity that a read-only file references** (a package named in another `package.json`'s
  `dependsOn`). Writes are all or nothing (`R:writing.md:110`), fixes "skip and report" (`R:cli-and-mcp.md:42`).
  A rename that skips leaves a dangling reference; one that refuses makes every referenced entity unrenamable;
- `id: { from: "name" }` on a read-only file whose name changes: the former id cannot be recorded.
*(medium.) Fix:* a load-time finding for writes and `create` on read-only collections; say that a rename
touching a read-only referrer is refused, naming it.

**X-3. A binding's `{ cel }` prop on an untrusted shape.** *Implied, twice and oppositely:* allowed "within the
untrusted-shape limits" (`M:rendering.md:109`), and impossible, since untrusted shapes have no bindings
(`M:trust.md:110`). *Silent on:* which limits (the untrusted row covers `computes` only, `M:trust.md:112`),
whether the host must install the evaluator for a customer's binding, and whether a customer may name any
registered component. *(high; see the fourth of the five.)*

**X-4. `rule-inconclusive` inside a saved write's `require`.** *Silent.* See the third of the five. *(high.)*

**X-5. `$terminal` with outcomes and no transitions, then transitions added.** *Implied:* before, the outcomes'
states are terminal (`R:references.md:347-348`); after, terminal is derived from the map, and a state with no
entry (`pending`, say, by oversight) becomes terminal and gets `workflow-outcome-missing`. That guard is good.
*Silent on:* which field the outcomes belong to before the map exists; and the day the map is added, every
outcome state must have no exit, so a map that allows reopening invalidates the outcomes that worked the day
before (`workflow-outcome-not-terminal`). *(high; see the second of the five.)*

**X-6. `create: { set }` with an id template that reads the computed value.** `event` has
`id: '{start:date}-{title:slug}'` (`R:events-as-shapes.md:176`); add `create: { set: { start: { cel: … } } }`.
*Silent on:*
- order: whether the id and path templates are filled before or after `create.set`;
- what `self` is at creation. A write's `self` is "the entity before the write" (`R:queries.md:332`), and there
  is none;
- whether `create.set` overrides a value the caller supplied or only fills an absent one;
- whether the result is checked against `$new` (`R:references.md:333`).
*(medium.) Fix:* state the order (input, then `create.set`, then validation and `$new`, then id and path), and
that `self` is the input.

**X-7. An untrusted shape with `extends` and migrations.** *Implied:* it may extend a trusted shape
(`M:trust.md:114`), and the base's migrations then apply to it (`M:extending.md:218`). *Silent on:*
- **who owns `migration-ambiguous`.** "An extension adding a name a base's migration maps" is an error when
  shapes load (`M:extending.md:197-199`). If the finding lands on the migration, a customer's block puts an
  error on the platform's trusted shape, which is then "left out" (`M:api.md:74`). It must land on the
  untrusted extension only;
- components: an untrusted shape has "none of their own" (`M:trust.md:110`), but a component bound to a base
  "draws every descendant" (`M:shapes.md:188`), so by extending a trusted base it reaches the base's
  component, with attributes the component never declared;
- collections: a collection of a base shape "collects every instance of its descendants"
  (`R:corpus.md:38-39`), so a customer's extension becomes an entity in the platform's collection and in every
  `match: tag:base`.
*(medium.) Fix:* say that findings caused by an untrusted shape land on it; that the host lists which bases
untrusted shapes may extend; and whether descendants inherit bindings.

**X-8. Where configuration findings go.** `createRiviere` is synchronous (`R:corpus.md:10`,
`R:configuration.md:27`), yet findings are reported "when the configuration loads" (`R:plugins.md:103-104`,
`R:queries.md:334`, `R:references.md:389`), and loading definitions reads packages through the host. Marquise
answered this with `await createMarquise` and `mq.findings` (`M:api.md:69-75`); Rivière has no `rv.findings`
and no stated home. *(medium.)*

**X-9. Capabilities that need each other.** A migration file's `cases.when` is a selector
(`M:extending.md:189`) and a rule may read a computed value. `capability-unavailable` covers the second
(`M:findings.md:29`); `@marquise-md/migrations` needing `@marquise-md/selectors` is not said. *(low.)*

---

## 4. Scope and size

**Is Marquise 1.0 small now?** Smaller, and honestly counted: 10 shape-file keys, 9 attribute keys, 30
content-model keys, one body block (`M:scope.md:111-118`; my recount agrees). Three things still freeze more
than the table shows (checked):

- **S-1 (med). The hooks freeze before their users do.** "Shape-loading and resolution hooks" are in 1.0 as
  "the proof that the seams hold" (`M:scope.md:24`). Their only users are three 0.x packages that freeze
  later (`M:scope.md:46-50`). If selectors or migrations need a hook changed after 1.0, 1.0 breaks. *Fix:* keep
  the hooks 0.x until the first capability graduates, or name the hook surface and its exit test.
- **S-2 (med). 1.0's configuration is larger than five keys.** `M:scope.md:117` counts `shapes`, `trust`,
  `strict`, `timezone`, `contentValues`. `M:trust.md` also needs, in 1.0: the document shapes a folder allows
  (`:29`), the raw-HTML allowlist (`:34`), URL protocols (`:37`), asset hosts (`:63`) and content limits
  (`:72`). After 1.0: the code names, namespaces and ceilings a host lists for untrusted shapes
  (`M:trust.md:107-116`). None has a key or a count.
- **S-3 (low). Uncounted vocabularies.** Template formats (five, `M:content-models.md:289`), `match` names,
  example-block attributes (`M:shapes.md:85-86`), CEL functions, the `value` and `values` keys of a `computes`
  entry (`M:selectors.md:86-87`), `compact: { item }`, and the new binding-file keys (`component`, `props`,
  `from`, `map`, `default`, `cel`, `slots`, `hydrate`; `M:rendering.md:89-95`). `M:shapes.md:27-44` has no
  row for `preprocess`, which the size table counts.
- **S-4 (low).** Marquise 1.0's exit test for document shapes is plan in "Rivière's prototype"
  (`M:scope.md:141`), which needs the write path, CEL, selectors, `extends` and `workflow`. So 1.0's date hangs
  on Rivière's second release. Worth one sentence.

**Rivière's size table against the pages (checked).** The counts match their own rows. Missing rows:

- `history` (T3);
- the keys of combining: `from` and `exclude` on an `extends` entry, `requires` in a definition
  (`R:plugins.md:96`, `:112`);
- the `foreign` plugin (`foreign: { map }`) and the `formats` dialect key `format:` (`R:corpus.md:168`, `:192`),
  both absent from the plugins row at `R:scope.md:66`; `R:/README.md:116` has no `@riviere-md/foreign` either;
- the write ceiling, "50 entities (configurable)" (`R:writing.md:142`);
- CEL names and functions Rivière registers (`latest`, `nextAfter`; N3), and source and sink capabilities.

**Is the second release the catch-all?** Yes (fifth of the five). Besides the three consumer-less items, plan
uses neither `$input`, `versions` aliases, `riviere diff`, nor rules with `from` and `changed`; its transition
maps are still a to-do (`R:plan-as-shapes.md:334`). Those are traceability's and the site builder's needs,
shipped on plan's ticket. *Fix:* a column "used by plan" in the releases table; anything empty moves right.

---

## 5. Design risks

- **D-1 (high). Terminal means "no exit".** See the second of the five. Real trackers reopen.
- **D-2 (high). A failed computed value disables checks quietly.** See the third.
- **D-3 (med). CEL as a data mapper is what JSONata was turned down for.** `M:syntax.md:179-182` rejects
  JSONata because "its strength, reshaping data, is served by projections and the export". The foreign `map`
  (`R:corpus.md:168-174`) reshapes raw files with `map` macros and map literals. And the raw file has no
  schema, so "checked when the shape loads, by CEL's type checker" (`M:syntax.md:159`) cannot apply; the docs
  only say a mismatch "is still a finding" (`R:corpus.md:196`), with no id. *Fix:* say the map is checked
  against the target shape's input only, at read time, and name the finding.
- **D-4 (med). Is the boundary held?** Selectors choose: held (`require`, `where`, `when`, filters).
  Templates look up: held in content. CEL computes: stretched in three places. Bindings compute outside the
  shape (`M:rendering.md:93`), against "every computation lives in the shape" (`M:syntax.md:169`). Foreign maps
  reshape (D-3). And configuration now holds expressions, against "No interpolation: no environment variables
  or expressions" (`M:configuration.md:42`, `R:configuration.md:44`). Each is defensible; the principle text
  should say so, or the next use has no rule to be tested against.
- **D-5 (med). `exclude` is structural typing over a nominal design** (X-1): "checked like a type" checks
  shape, not meaning, in a system whose rule is "different meaning, different shape" (`M:shapes.md:205`).
- **D-6 (med). A definition's policy is "scoped to its own collections"** while the policy is "one ordered
  list" whose first match wins (`R:plugins.md:118-119`, `R:writing.md:150-151`). A rename that touches two
  definitions' collections, or a rule with no `collections` (`{ filesOver: 5 }`), has no stated owner.
- **D-7 (low). The catalogues have no id for common cases** although both claim completeness: a selector that
  does not parse or names an unknown field; a required attribute missing; a count outside `min`/`max` on a
  non-reference list (`M:content-models.md:49`); a configuration file failing its schema; a `limit` over its
  ceiling in untrusted content (`R:shapes.md:98`).
- **D-8 (low).** `rule-inconclusive` sits under "Shapes and shape files" in `M:findings.md:42`, though it is
  per record; the five `shape-untrusted-*` and `shape-too-large` ids sit under "Content" (`:51-55`), though they
  are shape-load findings. Both tables say "a rule or view"; a view is Rivière's word.

---

## 6. Anything else

- **Glossary gaps (checked).** Marquise: host code, trust level / untrusted shape, migration file and case,
  `self`, registered format. Rivière: terminal state, outcome, foreign file, write value and creation value,
  definition `exclude` and `requires`; "Capability" lists only a source's four (`R:glossary.md:16`), not a
  sink's six.
- **Catalogued, never used outside the catalogue (checked by script):** Marquise's
  `document-shape-disallowed`, `id-shorthand-dotted`, `name-camelcase`, `rule-id-reserved`,
  `section-alias-deprecated`, `section-duplicate`, `section-level-detected`, `shadows-unused`,
  `shape-key-unknown`; Rivière's `graph-cycle`, `id-duplicate`, `into-unsorted`, `ref-count`,
  `ref-wrong-target`, `relationships-needs-of`, `selector-traversal-limit`. The pages describe each in prose
  ("is a finding") without the id. Harmless; citing the ids would make the pages searchable.
- **Severities (checked):** no id has two severities across pages. `history-unavailable` is "a warning that
  fails `validate`", a third severity in all but name (`R:findings.md:35`).
- **`M:explicit-slots.md:35-36`** still says whether Markdoc's slots are stable "is still to be confirmed",
  under a 1.0 that depends on them. Carried from the last review.

---

## 7. From the 2026-11-24 review: what regressed

1. **"Scope tables obeyed by other pages"** (its section 7, item 1; S2, S3). Fixed this morning, reopened by
   the afternoon: T1–T16 above, and the missing rows in section 4. The pattern is the same each time: a
   decision edits its feature page and the scope table, not the pages that mention the feature in passing.
2. **"Worked pages load as written"** (its item 2; F-S2, F-T2). Held for the site builder, events and
   traceability's plugin keys. Regressed for plan through today's own additions (F-P1 to F-P5).
3. **Words with a second meaning** (its item 3). "Binding" was the one this session set out to fix; the
   glossary, `trust.md` and `api.md` still carry the old sense (L1, L2).
4. **`$` names and reserved names** (its C18 and the reserved-names finding). The one list exists
   (`M:shapes.md:62-72`), and went stale within hours: `actor`, `input`, `terminal`, `outcome` (N3).
5. **README package tables** (its low finding on `R:/README.md:112-121`). `tree`, `workflow` and `formats` were
   added; `@riviere-md/foreign` was introduced after and is missing.
6. **The trust page's `values` example** (its low finding on `M:trust.md:50-53`). The two layers are now
   shown apart, but in the old vocabulary (L2).

Held, checked: C2 (storage), C3 (`--against`), C5 (`from: { tag, if }`), C6 (`workflow:`), C7 (`fingerprint`),
C12 (`template`), C14 (`formats`), C15 (`term.name`), C16 (`riviere fix --finding`), C17 (`nextAfter`), C21
(apart from L5), F-S1 to F-S11, F-P1 to F-P6, and the finding catalogues' completeness.
