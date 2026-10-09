# @refrakt-md/plan

## 0.41.0

### Minor Changes

- d94709b: **`content-unmatched` is now an error.** Content inside a rune that no field of its content model matches was reported as a warning since it was introduced; it is now reported at error severity, so `refrakt validate` exits non-zero and the build summary lists it as an error.

  **This is a behaviour change for any project whose content trips the check.** Each finding names the rune, the dropped node and its line. That content is not rendered — it never was — so the fix is in the rune, not the page:

  - add a field that takes it, for example a catch-all `{ name: 'body', match: 'any', optional: true, greedy: true }` at the end of the position where authors write it;
  - or, for a rune whose transform reads its body as raw source rather than through the content model, set `rawBody: true` on `createContentModelSchema`.

  To unblock a build while you fix a rune, add `"content-unmatched"` to `validation.disableIds` in the site config, which demotes the finding to info.

  **The plan runes keep everything authors write.** They were the reason the check shipped as a warning — 800 nodes dropped over this repository's own `plan/` directory:

  - `milestone` keeps its `##` sections. Everything after the lead paragraphs — the goals list, notes and every section — renders in the body, in authored order.
  - `work`, `bug` and `decision` keep preamble content that is not a paragraph: a `> Ref:` blockquote, a list, a fence, a table or a `---` before the first `##`. It renders in a new `intro` region between the metadata and the sections, omitted when empty. Their layout gains the `intro` slot, and Lumina styles it like the body.

### Patch Changes

- Updated dependencies [5840734]
- Updated dependencies [d94709b]
- Updated dependencies [c04815d]
- Updated dependencies [640494a]
- Updated dependencies [90d5a05]
- Updated dependencies [f7280ae]
  - @refrakt-md/runes@0.41.0
  - @refrakt-md/content@0.41.0
  - @refrakt-md/types@0.41.0
  - @refrakt-md/transform@0.41.0

## 0.40.0

### Patch Changes

- f7a2b3a: The plan scanner no longer descends into dot-directories such as `.git`. Their contents are not plan content, and a lock file git deleted mid-scan could fail the scan with `ENOENT`.
- d7f2b03: `@refrakt-md/plan` and `@refrakt-md/docs` now export `./package.json`. Their `exports` maps previously left it out, so `require.resolve('<pkg>/package.json')` threw `ERR_PACKAGE_PATH_NOT_EXPORTED` and anything reading the installed package (such as plugin fixture discovery) silently found nothing. `@refrakt-md/plan`'s `files` also no longer lists a `styles` directory that does not exist.
- Updated dependencies [7b30425]
- Updated dependencies [1f4aee2]
- Updated dependencies [cfbab94]
- Updated dependencies [587518b]
- Updated dependencies [cf25876]
- Updated dependencies [bf59a0e]
  - @refrakt-md/transform@0.40.0
  - @refrakt-md/runes@0.40.0
  - @refrakt-md/types@0.40.0
  - @refrakt-md/content@0.40.0

## 0.39.0

### Patch Changes

- 44bd72d: A rune can declare its output slots instead of writing a transform (WORK-614, WORK-616)

  `createContentModelSchema` takes an `emits` declaration as the alternative to
  `transform`: the renderable's identity (`rune`, `tag`, `property`), its property
  metas in `fieldMetas`' data form, and its named content `slots`, each a `value`
  or a `region` read from one resolved field or attribute. The schema builds the
  transform from it once, at construction, and calls it where it would call a
  hand-written one, so the output is the same either way. The declaration is
  plain data: functions, nesting, ordering and containers are rejected when the
  schema is built, as are a slot that would put one `data-name` on two nodes and a
  rune that declares both `transform` and `emits`, or neither. The rune's
  `sections` join table is derived from its slots.

  `work`, `bug` and `decision` in `@refrakt-md/plan` now use it. Their rendered
  output is unchanged.

  `refrakt inspect` and `refrakt reference` list a declared rune's slots, with
  every default spelled out (`slots` and `emits` in JSON output).

- 1607dfe: Grouping by a multi-value field puts an entity in one group per value (BUG-025)

  `collection`, `aggregate` and `backlog` all accept `group="<field>"`. For a
  field holding several comma-separated values, such as `tags`, `source` or `pr`,
  the group key used to be the whole string, so an entity tagged
  `runes, data, csv` landed in a group called `runes, data, csv`. Against this
  repository's own plan, `group="tags"` gave 719 groups for 803 entities, and
  counting work items per spec read SPEC-008 as 16 when it has 19.

  Grouping now splits the value the same way `filter` already did. The value is
  split on commas, each member is trimmed, empty members are ignored, and an
  array is split by element. The entity joins every group whose value it carries.
  A group's size now means "entities carrying this value", so per-group counts
  can add up to more than the entity count. `aggregate`'s `total` still counts
  each entity once. Grouping by a single-valued field such as `status` or
  `priority` is unchanged, and an entity with no value still groups under
  `(none)`.

  `sort` on a multi-value field no longer orders by the joined string either. An
  entity sorts by its smallest value ascending and its largest descending. With a
  declared order, it sorts by its best-ranked value ascending and its
  worst-ranked value descending. Sorting by a single-valued field is unchanged.

  `@refrakt-md/runes` also exports `fieldMembers` and `groupKeys`, the split used
  for grouping, next to the display helper `fieldValue`.

- Updated dependencies [377b95c]
- Updated dependencies [0d6f027]
- Updated dependencies [44bd72d]
- Updated dependencies [8a272a4]
- Updated dependencies [1607dfe]
- Updated dependencies [ad3edde]
- Updated dependencies [ab22ead]
- Updated dependencies [ed2b992]
- Updated dependencies [651e4c4]
  - @refrakt-md/runes@0.39.0
  - @refrakt-md/content@0.39.0
  - @refrakt-md/transform@0.39.0
  - @refrakt-md/types@0.39.0

## 0.38.0

### Minor Changes

- 11b89a1: Rune configs are now plain data, and `plan migrate ids` keeps the published claimant (WORK-608, WORK-607)

  **Breaking: `styles[…].transform` takes a name, not a function** (WORK-608).
  Use one of the named transforms already used by meta fields and structure
  entries. That vocabulary now has three more entries:

  - `align`: an alignment keyword becomes a CSS `align-*` value (was `resolveValign`).
  - `fr`: `"2 1"` becomes `2fr 1fr` (was `ratioToFr`).
  - `gap`: a gap preset becomes a spacing token (was `resolveGap`).

  The type is exported as `NamedTransform`. Replace
  `transform: resolveValign` with `transform: 'align'`. The helpers stay exported.
  After this change `postTransform` is the only function a `RuneConfig` carries,
  so a rune config can cross a JSON boundary. A test checks every core and plugin
  rune for this. Structure contracts now record these transform names; before,
  `JSON.stringify` silently dropped them because they were functions. Rendered
  output is unchanged.

  **`plan migrate ids --against <ref>`** (WORK-607, BUG-026). When two files
  claim one ID, the one already on the base ref keeps it, and the branch-local
  claimant is renumbered. Before this, the claimant that moved was picked by
  sorting filenames, which could renumber the entity already referenced from
  merged commits and published CHANGELOGs. Without `--against`, a collision is
  now refused rather than resolved by filename. Every renumber and refusal names
  the claimant that kept the ID and why. `plan validate --against` now suggests
  the matching `migrate ids --against` command.

### Patch Changes

- 68a8864: Stop emitting property-mapped meta tags into rune `children`.

  Every rune that mapped a meta under `properties` and also listed it in `children`
  had it filtered straight back out by `createComponentRenderable`; the value
  already lives in the `data-rune-fields` bag. The emission is removed from 62 tag
  files and the auto-breadcrumb builder. Rendered output is unchanged: structure
  contracts, the structured-data baseline, and `refrakt inspect` across every rune
  and variant are identical before and after.

  The one exception is content that is already invalid. A `blog` with no `folder`
  (a required attribute) no longer renders an empty `<meta data-field="folder">`.

- 15b13a9: New rune-authoring helpers in `@refrakt-md/runes` (WORK-602, WORK-603)

  - `renderNodes(value, config)` returns a `RenderableNodeCursor` over the
    transformed content. It replaces
    `new RenderableNodeCursor(Markdoc.transform(asNodes(x), config) as RenderableTreeNode[])`.
  - `bodyOnly()` is the content model of a rune whose children are all body. It
    returns a fresh object per call.
  - `fieldMetas(attrs, config, spec)` builds a rune's property metas from one
    declaration. A bare string is the default for the attribute of the same name.
    `{ from: ['attrs.x', 'file.x'], default }` takes the first non-empty source.
    The spec is plain data and round-trips through JSON. Any root other than
    `attrs` or `file` is rejected.
  - `groupByHeading(nodes, { initial, heading, item, other? })` is the shared walk
    where a heading sets the running group and list items become entries.

  The built-in runes now use these helpers: 78 cursor constructions, 49 content
  models, 12 property maps (including the five plan runes' `created` / `modified`
  fallback to file dates) and six heading-grouped list parsers. Neither helper is
  mandatory. Rendered output is unchanged.

- 66dae35: Simplify rune transforms: optional slots and shared text helpers (WORK-600, WORK-601)

  - `properties` and `refs` on `createComponentRenderable` now accept `null` as well
    as `undefined`; both are skipped. The 52 `...(x ? { k: x } : {})` guards inside
    slot literals are now plain `k: x`.
  - `extractText(node)` (concatenated text of an AST node) is exported from
    `@refrakt-md/runes` and replaces six identical local copies. Three plugin-local
    text helpers on rendered trees now use the exported `textContent`.

  Rendered output is unchanged.

- Updated dependencies [a798a2c]
- Updated dependencies [68a8864]
- Updated dependencies [11b89a1]
- Updated dependencies [15b13a9]
- Updated dependencies [66dae35]
- Updated dependencies [66dae35]
  - @refrakt-md/runes@0.38.0
  - @refrakt-md/transform@0.38.0
  - @refrakt-md/content@0.38.0
  - @refrakt-md/types@0.38.0

## 0.37.0

### Patch Changes

- 335d1ef: Fix `plan validate --against` reporting a renamed plan entity as an ID collision.

  `collisionsFrom` compared the two sides' **slugs** with the ID prefix stripped, so it
  forgave only a rename that kept its slug and moved directory. A slug change — the
  ordinary rename, since the slug is derived from the title — was reported as a
  collision. That fires on any title edit to an existing entity, and on
  `plan validate --against` after `plan migrate filenames --apply` renames files
  wholesale.

  The check now tests what its own contract describes: **a collision is two claimants
  surviving the merge.** If the base's path is absent from the working tree, the merge
  applies the deletion and one claimant remains, so it is not reported. `collisionsFrom`
  takes the repo root to make that test.

  Nothing is weakened. A new file claiming an ID whose base file _survives_ is still
  flagged, and two files claiming one ID in the same tree is still an error from
  `checkDuplicateIds`, which runs before this.

  What this deliberately does not catch is an ID _reused_ for a different entity — the
  base's file deleted, a new one written under the same ID. That also leaves one
  claimant, so it is not a collision, but it silently repoints every reference to it.
  Detecting that needs content rather than paths, and it is not a reason to block a
  merge; a test pins the distinction so it stays deliberate.

  The misreport was also actively dangerous, because the error text advises
  `plan migrate ids --apply --git`. Run against a rename, that renumbers a legitimate
  entity and breaks every reference to it.

- Updated dependencies [172b29b]
- Updated dependencies [f88f959]
- Updated dependencies [172b29b]
  - @refrakt-md/runes@0.37.0
  - @refrakt-md/transform@0.37.0
  - @refrakt-md/types@0.37.0
  - @refrakt-md/content@0.37.0

## 0.36.0

### Minor Changes

- 79a39e8: Prevent duplicate plan IDs before the merge that creates them, and renumber
  them when it can be proved what every reference meant.

  ```bash
  refrakt plan validate --against origin/main
  refrakt plan migrate ids --apply --git
  ```

  `plan validate` already reported duplicates at error severity. It could only do
  so once **both** claimants were reachable — after the merge, when every
  `{% ref %}` to that ID had already become ambiguous. `--against <ref>` fires one
  step earlier, on the branch, comparing the IDs you claim against those the base
  ref spends. A ref that cannot be resolved fails loudly rather than reporting a
  clean run.

  `plan migrate ids` joins the `filenames` / `pr-attrs` / `dependencies` family —
  dry-run by default, `--apply` writes, `--git` stages. It renumbers an entity's
  `id`, its filename and its self-references, and rewrites `{% ref %}`,
  `{% xref %}`, `source=` and `supersedes=`.

  **It refuses when anything outside the moved entity references the colliding
  ID**, naming each blocking reference with file and line. Once two files share an
  ID there is no way to establish which one a reference meant, and repointing one
  at the wrong entity is silent and permanent.

  The duplicate-ID finding now names `plan migrate ids` as its fix, matching how
  the filename findings name theirs.

### Patch Changes

- Updated dependencies [c050169]
- Updated dependencies [481415f]
- Updated dependencies [a911cc4]
- Updated dependencies [0348f37]
  - @refrakt-md/content@0.36.0
  - @refrakt-md/transform@0.36.0
  - @refrakt-md/runes@0.36.0
  - @refrakt-md/types@0.36.0

## 0.35.0

### Patch Changes

- Updated dependencies [a8012b6]
- Updated dependencies [f1908a3]
- Updated dependencies [f1908a3]
- Updated dependencies [846d2d4]
- Updated dependencies [f1908a3]
- Updated dependencies [b40cbac]
- Updated dependencies [d123b67]
- Updated dependencies [f1908a3]
  - @refrakt-md/runes@0.35.0
  - @refrakt-md/content@0.35.0
  - @refrakt-md/transform@0.35.0
  - @refrakt-md/types@0.35.0

## 0.34.0

### Patch Changes

- Updated dependencies [7c2b184]
- Updated dependencies [d75bffb]
- Updated dependencies [550dc77]
- Updated dependencies [e8f9d54]
  - @refrakt-md/content@0.34.0
  - @refrakt-md/types@0.34.0
  - @refrakt-md/runes@0.34.0
  - @refrakt-md/transform@0.34.0

## 0.33.0

### Patch Changes

- Updated dependencies [7532b55]
- Updated dependencies [cb05ee2]
- Updated dependencies [ec7357b]
- Updated dependencies [84d025d]
- Updated dependencies [ec7357b]
- Updated dependencies [bc06abe]
- Updated dependencies [2c1b5c2]
- Updated dependencies [f23d794]
- Updated dependencies [0963668]
- Updated dependencies [9f912a1]
- Updated dependencies [d9b9417]
- Updated dependencies [a6752f4]
- Updated dependencies [fde9ae0]
- Updated dependencies [0d3ebed]
  - @refrakt-md/runes@0.33.0
  - @refrakt-md/transform@0.33.0
  - @refrakt-md/content@0.33.0
  - @refrakt-md/types@0.33.0

## 0.32.0

### Patch Changes

- Updated dependencies [a4ff5ad]
- Updated dependencies [19eb537]
- Updated dependencies [33ec21f]
- Updated dependencies [20f27f6]
- Updated dependencies [9c9ea05]
- Updated dependencies [79751e2]
- Updated dependencies [6b94801]
  - @refrakt-md/runes@0.32.0
  - @refrakt-md/transform@0.32.0
  - @refrakt-md/content@0.32.0
  - @refrakt-md/types@0.32.0

## 0.31.0

### Patch Changes

- 19cb36e: Declare the schema↔engine join tables in tag modules (SPEC-125 Phase 2)

  `sections`, `mediaSlots` and `frameTarget` are not theme configuration: their keys are `data-name`s a rune's own transform emits and their values are a closed engine vocabulary, so the theme owns neither side. All 72 declarations across core and the nine plugins now live in the tag module that owns each rune, with `ThemeConfig.runes` _referencing_ the declaration rather than defining it:

  ```ts
  // tags/card.ts
  export const cardSections = { media: 'media', body: 'body' } as const;
  export const card = createContentModelSchema({ sections: cardSections, … });

  // config.ts — already imports from tags/
  Card: { block: 'card', sections: cardSections, … }
  ```

  This is what makes narrowing possible. `createContentModelSchema` now has the gating facts **at construction**, recorded on a new `schemaRuneStructures` WeakMap alongside the existing `schemaContentModels` — so a rune's Markdoc schema can later offer only the universal attributes that can affect it, with no config lookup and no import cycle. The direction matters: `config → tags` holds uniformly across the repo, and having tags import config instead would cycle in core, where `createContentModelSchema` runs at module scope and would observe `coreConfig` uninitialised.

  **Pure relocation.** No values changed, the engine's read path is untouched (it still reads `config.sections`, `config.mediaSlots`, `config.frameTarget`), transform output is byte-identical, and `refrakt contracts --check` passes with no regeneration.

  `IDENTITY_FIELDS` gains `mediaSlots` and `frameTarget`, closing the gap the identity guard deliberately left. `frameTarget` in particular needs it: frame applicability resolves as `config.frameTarget ?? (hasMediaSection(config.sections) ? 'media' : null)` and the type has no `'none'`, so it can only ever _grant_ — an unguarded theme could add `frameTarget: 'self'` to a rune whose schema rejects `frame=`, config granting what the schema forbids.

  New public API on `@refrakt-md/runes`: `schemaRuneStructures`, plus the `RuneStructure` and `SectionRole` types. `createContentModelSchema` accepts `sections`, `mediaSlots` and `frameTarget`; all three are optional and nothing reads them yet.

- Updated dependencies [3b799a5]
- Updated dependencies [a88de39]
- Updated dependencies [6c6b824]
- Updated dependencies [19cb36e]
  - @refrakt-md/runes@0.31.0
  - @refrakt-md/transform@0.31.0
  - @refrakt-md/content@0.31.0
  - @refrakt-md/types@0.31.0

## 0.30.1

### Patch Changes

- Updated dependencies [eb46d12]
- Updated dependencies [e67e4eb]
- Updated dependencies [9a8f354]
- Updated dependencies [d72385b]
- Updated dependencies [e2736d4]
- Updated dependencies [05115f6]
- Updated dependencies [c2c1709]
- Updated dependencies [a760a5c]
- Updated dependencies [9b62d17]
- Updated dependencies [04a6112]
  - @refrakt-md/transform@0.30.1
  - @refrakt-md/content@0.30.1
  - @refrakt-md/runes@0.30.1
  - @refrakt-md/types@0.30.1

## 0.30.0

### Minor Changes

- 5ee4c96: Add lifecycle-drift validation to `plan validate` (SPEC-119).

  `plan validate` now flags entities whose status contradicts the terminal
  evidence around them — the symmetric counterpart to the existing one-directional
  lifecycle checks. New v1 checks:

  - `spec-status-lag` (warning) — a pre-implemented spec (`draft`/`review`/
    `accepted`) whose linked work is entirely achieving-terminal.
  - `spec-started-in-draft` (info) — a `draft` spec with started work.
  - `spec-status-ahead` (warning) — an `implemented`/`shipped` spec with a
    non-terminal linked work item.
  - `released-in-without-shipped` (warning) — `released-in` set on a
    non-`shipped` spec (mirror of `shipped-without-release`).
  - `stale-blocked` (warning) — a `blocked` work item whose `## Blocked by`
    targets are all achieving-terminal.
  - `milestone-complete-with-open-work` (warning) — a `complete` milestone with
    a non-terminal member (replaces `complete-milestone-open-item`, now keyed on
    terminal rather than done/fixed so retired members don't falsely flag).

  `plan status`'s `suggestImplemented` hint and validate's `spec-status-lag`
  share one predicate, so the suggestion and the warning can never diverge.
  `--strict` promotes the new warnings to errors.

- a8b6c07: Remove the bespoke `plan build` / `plan serve` render stack (SPEC-120).

  **Breaking:** the `refrakt plan build` and `refrakt plan serve` commands are
  gone, along with their private static-site generator (the three-family
  render-pipeline router, `planLayout` shell, the port-3000 dev server + file
  watcher + SSE reload, the behavior bundler, and the pagefind invocation).
  Invoking either command now yields an unknown-command error.

  A plan directory is an ordinary refrakt site since SPEC-071: scaffold a
  deployable plan site with `create-refrakt --type plan` (or `refrakt plan init
--target <adapter>`) and use the standard adapter dev server / `npm run build`,
  or wire `entityRoutes` + `collection` into an existing refrakt site. The plan
  runes, the `register`/`aggregate` pipeline hooks, and the entire authoring CLI
  (`create` / `next` / `update` / `validate` / `status` / `migrate` / `next-id` /
  `history` / `init`) are unchanged.

  Also drops the now-orphaned `@refrakt-md/html`, `@refrakt-md/highlight`,
  `@refrakt-md/behaviors`, `reflect-metadata`, `esbuild`, and `pagefind`
  dependencies from `@refrakt-md/plan`.

### Patch Changes

- @refrakt-md/content@0.30.0
- @refrakt-md/runes@0.30.0
- @refrakt-md/transform@0.30.0
- @refrakt-md/types@0.30.0

## 0.29.0

### Patch Changes

- Updated dependencies [9a4e4b9]
  - @refrakt-md/types@0.29.0
  - @refrakt-md/transform@0.29.0
  - @refrakt-md/runes@0.29.0
  - @refrakt-md/behaviors@0.29.0
  - @refrakt-md/html@0.29.0
  - @refrakt-md/content@0.29.0
  - @refrakt-md/highlight@0.29.0

## 0.28.0

### Minor Changes

- 0063b66: Give plan dependencies a direction so cycle detection means what it says (SPEC-114).

  - **Directed sections** — `work` and `bug` gain canonical `## Blocked by` (this item waits for the ref) and `## Blocks` (the ref waits for this item) sections, each with aliases. `## Dependencies` is retained as a deprecated alias of `Blocked by`, so legacy content keeps parsing.
  - **Typed edges** — `PlanEntity` carries a directed `dependencies` array derived _only_ from those sections. Prose `{% ref %}` mentions, `## References`, and the source line are no longer dependency edges.
  - **Meaningful cycle detection** — `checkCircularDeps` builds its graph from the typed edges (normalised to "A is blocked by B"), not the raw ref set. This clears the 88 false-positive `circular-dependency` errors that any two items mentioning each other used to produce, while a genuine directed deadlock is still caught. `plan next` and the pipeline dependency rollups consume the same typed edges — one source of truth.
  - **`refrakt plan migrate dependencies`** — renames legacy `## Dependencies` headings to `## Blocked by` (dry-run by default; `--apply`/`--git`) and flags — without auto-flipping — entries whose prose reads like the reverse direction, for manual review.
  - **Docs** — CLAUDE.md and the plan workflow docs describe the directed model, the section aliases, and the migration.

  The scan cache is versioned so upgrading discards a stale cache whose entities predate the typed `dependencies` field.

- 47ae0d7: Close the spec → work → PR traceability loop (SPEC-049).

  - **Spec lifecycle** — specs gain `implemented` (code in `main`) and `shipped` (released to npm) statuses beyond `accepted`, plus a `released-in="vX.Y.Z"` attribute. `plan validate` errors on a `shipped` spec that lacks `released-in`.
  - **ADR `rejected`** — decisions gain a terminal `rejected` status for "considered and explicitly declined", distinct from `superseded`/`deprecated`.
  - **First-class `pr` attribute** — `work` and `bug` accept a multi-valued `pr` (`<org>/<repo>#<number>`). `plan validate` errors on malformed values but does not warn on a missing `pr` (carrot before stick). The legacy `PR:` resolution line is still parsed as a fallback; the attribute wins.
  - **`plan status` traceability rollups** — a per-spec PR rollup (deduped across `implemented-by` work) and an `implemented`-flip suggestion when every linked work item of an `accepted` spec is `done`. Exposed in `--format json`.
  - **`refrakt plan migrate pr-attrs`** — backfills the `pr` attribute on legacy `done` work / `fixed` bug items by mining git merge-commit history (dry-run by default; `--apply`/`--git`). It attributes a commit to the PR whose topic branch actually introduced it, skips items whose history is ambiguous, and reports unresolved items without touching them.
  - **Docs** — CLAUDE.md's completion checklist gains a standalone `pr` step; the `plan init` template, SPEC-021, and the site plan docs describe the new statuses, the `pr` attribute, and the `accepted → implemented → shipped` lifecycle.

- 81896e6: Consolidate the plan status vocabulary and add terminal work states (SPEC-117).

  `plugins/plan/src/commands/enums.ts` is now the single source of truth for status/severity/priority/complexity vocabularies. Consumers (rune schemas, MCP input schemas, `next`/`status`/`validate`, the renderer, and `theme.orderings`) import from it instead of re-declaring value lists, and an exhaustiveness test fails CI if a canonical status ever lacks a sentiment-map or ordering entry.

  - **New terminal work states** — `cancelled` (deliberately dropped) and `superseded` (replaced, paired with a new `supersedes="WORK-xxx"` attribute). Both are terminal but non-achieving: excluded from `plan next`, milestone progress numerators, and `plan-progress` achieved counts. `superseded` produces a `supersedes` / `superseded-by` relationship edge.
  - **Derived lifecycle helpers** — `TERMINAL_STATUSES`, `ACHIEVING_STATUSES`, `ACTIONABLE_STATUSES` and `isTerminal` / `isAchieving` / `isActionable`, so every consumer asks the same lifecycle question the same way.
  - **Validation** — `plan validate` warns on a `superseded` work item without `supersedes` (or with an unresolvable one), and no longer warns about a `## Resolution` on a `cancelled` / `superseded` item (terminal items may record why they were retired).
  - **Drift fixes** — the MCP `plan.update` tool now accepts `pending` (work) and `cosmetic` (bug severity) and rejects `trivial`, because its enums derive from `enums.ts` rather than a hand-maintained copy that had drifted (a regression of the WORK-127 / SPEC-037 fix).

### Patch Changes

- Updated dependencies [816b0d1]
  - @refrakt-md/runes@0.28.0
  - @refrakt-md/behaviors@0.28.0
  - @refrakt-md/content@0.28.0
  - @refrakt-md/html@0.28.0
  - @refrakt-md/highlight@0.28.0
  - @refrakt-md/transform@0.28.0
  - @refrakt-md/types@0.28.0

## 0.27.0

### Minor Changes

- 971fa1f: ProjectFiles seam (SPEC-113) — a virtual project filesystem for hosted and in-browser builds.

  Consolidates the ad-hoc `node:fs` seams at the pipeline edges into one injectable, synchronous `ProjectFiles` interface (`read`/`list`/`exists` over normalized POSIX project-root-relative keys, with containment as part of the contract). Ships `fsProjectFiles`, `memoryProjectFiles`, and `recordingProjectFiles` providers via `@refrakt-md/types/project-files`.

  - **Sandbox, snippet, expand, file-ref, fileRoots, and the plan scan** now read through the provider instead of calling `node:fs` directly. The previously-unguarded sandbox `src` directory join inherits containment, closing a path-traversal gap.
  - **`loadContentFromTree`** accepts `projectFiles` and `gitTimestamps`, and the new `ContentTree.fromContentMap` assembles a page corpus from a normalized key→content map — so a complete site can build from a pure in-memory `Map` with zero filesystem access (the hosted-renderer path).
  - Every consumer keeps an `fs` fallback, so self-hosted builds are unchanged; the only behavioural change is containment on previously-unguarded paths.
  - Docs: a new "Hosted & In-Memory Builds" guide covers the contract and the fetch-then-build materialization pattern.

### Patch Changes

- Updated dependencies [971fa1f]
  - @refrakt-md/types@0.27.0
  - @refrakt-md/content@0.27.0
  - @refrakt-md/runes@0.27.0
  - @refrakt-md/highlight@0.27.0
  - @refrakt-md/html@0.27.0
  - @refrakt-md/transform@0.27.0
  - @refrakt-md/behaviors@0.27.0

## 0.26.0

### Patch Changes

- Updated dependencies [decb8d5]
- Updated dependencies [d6b7567]
- Updated dependencies [693cf13]
- Updated dependencies [7988847]
- Updated dependencies [7988847]
- Updated dependencies [7988847]
  - @refrakt-md/behaviors@0.26.0
  - @refrakt-md/transform@0.26.0
  - @refrakt-md/runes@0.26.0
  - @refrakt-md/html@0.26.0
  - @refrakt-md/content@0.26.0
  - @refrakt-md/highlight@0.26.0
  - @refrakt-md/types@0.26.0

## 0.25.1

### Patch Changes

- Updated dependencies [35d7658]
  - @refrakt-md/behaviors@0.25.1
  - @refrakt-md/html@0.25.1
  - @refrakt-md/content@0.25.1
  - @refrakt-md/highlight@0.25.1
  - @refrakt-md/runes@0.25.1
  - @refrakt-md/transform@0.25.1
  - @refrakt-md/types@0.25.1

## 0.25.0

### Patch Changes

- Updated dependencies [3a3ddf3]
  - @refrakt-md/types@0.25.0
  - @refrakt-md/transform@0.25.0
  - @refrakt-md/content@0.25.0
  - @refrakt-md/highlight@0.25.0
  - @refrakt-md/html@0.25.0
  - @refrakt-md/runes@0.25.0
  - @refrakt-md/behaviors@0.25.0

## 0.24.6

### Patch Changes

- Updated dependencies [c25b10b]
- Updated dependencies [2ce7a17]
  - @refrakt-md/runes@0.24.6
  - @refrakt-md/transform@0.24.6
  - @refrakt-md/behaviors@0.24.6
  - @refrakt-md/types@0.24.6
  - @refrakt-md/html@0.24.6
  - @refrakt-md/content@0.24.6
  - @refrakt-md/highlight@0.24.6

## 0.24.5

### Patch Changes

- @refrakt-md/behaviors@0.24.5
- @refrakt-md/content@0.24.5
- @refrakt-md/highlight@0.24.5
- @refrakt-md/html@0.24.5
- @refrakt-md/runes@0.24.5
- @refrakt-md/transform@0.24.5
- @refrakt-md/types@0.24.5

## 0.24.4

### Patch Changes

- Updated dependencies [fee0ec3]
- Updated dependencies [de974e1]
  - @refrakt-md/transform@0.24.4
  - @refrakt-md/content@0.24.4
  - @refrakt-md/highlight@0.24.4
  - @refrakt-md/html@0.24.4
  - @refrakt-md/runes@0.24.4
  - @refrakt-md/behaviors@0.24.4
  - @refrakt-md/types@0.24.4

## 0.24.3

### Patch Changes

- Updated dependencies [e85a0f0]
  - @refrakt-md/transform@0.24.3
  - @refrakt-md/content@0.24.3
  - @refrakt-md/highlight@0.24.3
  - @refrakt-md/html@0.24.3
  - @refrakt-md/runes@0.24.3
  - @refrakt-md/behaviors@0.24.3
  - @refrakt-md/types@0.24.3

## 0.24.2

### Patch Changes

- Updated dependencies [8090b69]
  - @refrakt-md/runes@0.24.2
  - @refrakt-md/content@0.24.2
  - @refrakt-md/html@0.24.2
  - @refrakt-md/behaviors@0.24.2
  - @refrakt-md/highlight@0.24.2
  - @refrakt-md/transform@0.24.2
  - @refrakt-md/types@0.24.2

## 0.24.1

### Patch Changes

- Updated dependencies [ce700c2]
  - @refrakt-md/transform@0.24.1
  - @refrakt-md/runes@0.24.1
  - @refrakt-md/content@0.24.1
  - @refrakt-md/highlight@0.24.1
  - @refrakt-md/html@0.24.1
  - @refrakt-md/behaviors@0.24.1
  - @refrakt-md/types@0.24.1

## 0.24.0

### Patch Changes

- acc9474: **Fix: `plan create` now validates enum attributes at write time.** `plan update` rejected invalid `status`/`priority`/`complexity`/`severity` values, but `plan create` passed any `attrs` straight into the scaffolded file unchecked — so a stray `complexity="small"` (or `status="todo"`) landed silently and only surfaced later as a `plan validate` error. `create` (and the `plan.create` MCP tool) now run the same validation as `update`, rejecting unknown attributes and out-of-vocabulary enum values with a message listing the valid set, before any file is written. The vocabularies (`VALID_STATUS`, `VALID_PRIORITY`, `VALID_COMPLEXITY`, `VALID_SEVERITY`, allowed-attr lists) are consolidated into a single shared `enums` module so `create`, `update`, and `validate` can no longer drift apart, and the `plan.create` MCP schema documents the accepted enum values.
- Updated dependencies [dd2d955]
- Updated dependencies [dd2d955]
- Updated dependencies [dd2d955]
  - @refrakt-md/runes@0.24.0
  - @refrakt-md/transform@0.24.0
  - @refrakt-md/content@0.24.0
  - @refrakt-md/behaviors@0.24.0
  - @refrakt-md/types@0.24.0
  - @refrakt-md/highlight@0.24.0
  - @refrakt-md/html@0.24.0

## 0.23.0

### Patch Changes

- Updated dependencies [b2f3f23]
  - @refrakt-md/transform@0.23.0
  - @refrakt-md/runes@0.23.0
  - @refrakt-md/content@0.23.0
  - @refrakt-md/highlight@0.23.0
  - @refrakt-md/html@0.23.0
  - @refrakt-md/behaviors@0.23.0
  - @refrakt-md/types@0.23.0

## 0.22.0

### Patch Changes

- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
  - @refrakt-md/runes@0.22.0
  - @refrakt-md/types@0.22.0
  - @refrakt-md/transform@0.22.0
  - @refrakt-md/content@0.22.0
  - @refrakt-md/highlight@0.22.0
  - @refrakt-md/html@0.22.0
  - @refrakt-md/behaviors@0.22.0

## 0.21.0

### Patch Changes

- Updated dependencies [92c8f1b]
- Updated dependencies [b8d9396]
- Updated dependencies [cf0489f]
- Updated dependencies [27124ea]
- Updated dependencies [8939b35]
- Updated dependencies [69b4d9c]
- Updated dependencies [2f6332d]
- Updated dependencies [ad780ca]
- Updated dependencies [7d89f23]
  - @refrakt-md/runes@0.21.0
  - @refrakt-md/behaviors@0.21.0
  - @refrakt-md/transform@0.21.0
  - @refrakt-md/content@0.21.0
  - @refrakt-md/html@0.21.0
  - @refrakt-md/highlight@0.21.0
  - @refrakt-md/types@0.21.0

## 0.20.2

### Patch Changes

- @refrakt-md/behaviors@0.20.2
- @refrakt-md/content@0.20.2
- @refrakt-md/highlight@0.20.2
- @refrakt-md/html@0.20.2
- @refrakt-md/runes@0.20.2
- @refrakt-md/transform@0.20.2
- @refrakt-md/types@0.20.2

## 0.20.1

### Patch Changes

- Updated dependencies [7a6aaf5]
- Updated dependencies [7a6aaf5]
  - @refrakt-md/behaviors@0.20.1
  - @refrakt-md/transform@0.20.1
  - @refrakt-md/html@0.20.1
  - @refrakt-md/content@0.20.1
  - @refrakt-md/highlight@0.20.1
  - @refrakt-md/runes@0.20.1
  - @refrakt-md/types@0.20.1

## 0.20.0

### Patch Changes

- Updated dependencies [8faa272]
- Updated dependencies [702732b]
- Updated dependencies [3952770]
- Updated dependencies [32a3b52]
- Updated dependencies [2d6dad9]
  - @refrakt-md/runes@0.20.0
  - @refrakt-md/transform@0.20.0
  - @refrakt-md/types@0.20.0
  - @refrakt-md/behaviors@0.20.0
  - @refrakt-md/content@0.20.0
  - @refrakt-md/highlight@0.20.0
  - @refrakt-md/html@0.20.0

## 0.19.0

### Minor Changes

- 6f30052: Modernize `backlog` to compose over the `bar` rune (SPEC-084 / WORK-342). Its
  default item is now a `card` whose top strip is a `bar` — the identifier on the
  left, a sentiment-coloured status `badge` on the right, title below — built from a
  **universal projection** that works for every plan type. New `layout` attribute
  (`cards` default · `list` · `table`) is forwarded to `collection`. A type chip
  appears only for a mixed set; a single-type backlog also surfaces that type's key
  field (work→priority, bug→severity). The `$item` projection gains `identifier`
  (`id || name`, so milestones slot in), `sentiment`, and `mixed`, shared by every
  collection/aggregate rollup.
- 2e56ab6: Decompose `plan-progress` into sugar over the `aggregate` rune (SPEC-076). It now
  composes **one aggregate per entity type** — a type heading ("Work", "Specs", …)
  above a progress bar labelled with that type's achieved status ("Done",
  "Accepted", …) plus a per-status badge row — resolved by the shared
  `resolveAggregates`. Mixing types under a single ratio was misleading (work `done`
  and bug `fixed` measure different things). Plan defaults are baked in
  (`type="work,bug"`, achieved-status per type, `group="status"`, `milestone=`
  scoping); the bespoke plan-side render path is removed. A bare `{% plan-progress /%}`
  scopes to `work,bug`; widen with `type=`/`show=`. (Per-status badge colour is
  deferred — see WORK-357.)

### Patch Changes

- 9cb55f3: Per-group sentiment projection in `aggregate` (SPEC-076 / WORK-357). `aggregate`
  now projects `$item.sentiment` onto the per-group template (and tags chart data
  cells with `data-meta-sentiment`), looked up from a `(type → field → value →
sentiment)` map threaded through `embedConfig`. The map is derived automatically
  from each rune's existing `metaFields.*.sentimentMap` (keyed by entity type) — no
  new registration. This lights up the deferred colour from WORK-296/353: plan
  status badges and roadmap charts now read green-done / red-blocked with no
  per-call config. `plan-progress` badges colour via `sentiment=$item.sentiment`.
- Updated dependencies [97522a0]
- Updated dependencies [9cb55f3]
- Updated dependencies [6f30052]
- Updated dependencies [fd484bc]
- Updated dependencies [e4e5f5c]
- Updated dependencies [2f2b04f]
- Updated dependencies [5c92e0b]
- Updated dependencies [61e15c9]
- Updated dependencies [0375d22]
  - @refrakt-md/runes@0.19.0
  - @refrakt-md/content@0.19.0
  - @refrakt-md/behaviors@0.19.0
  - @refrakt-md/transform@0.19.0
  - @refrakt-md/types@0.19.0
  - @refrakt-md/html@0.19.0
  - @refrakt-md/highlight@0.19.0

## 0.18.0

### Patch Changes

- Updated dependencies [cd30659]
- Updated dependencies [b05fc8d]
  - @refrakt-md/transform@0.18.0
  - @refrakt-md/content@0.18.0
  - @refrakt-md/highlight@0.18.0
  - @refrakt-md/html@0.18.0
  - @refrakt-md/runes@0.18.0
  - @refrakt-md/behaviors@0.18.0
  - @refrakt-md/types@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [2d85b5f]
  - @refrakt-md/types@0.17.0
  - @refrakt-md/transform@0.17.0
  - @refrakt-md/runes@0.17.0
  - @refrakt-md/content@0.17.0
  - @refrakt-md/highlight@0.17.0
  - @refrakt-md/html@0.17.0
  - @refrakt-md/behaviors@0.17.0

## 0.16.1

### Patch Changes

- Updated dependencies [ae5c904]
- Updated dependencies [8a84210]
  - @refrakt-md/runes@0.16.1
  - @refrakt-md/types@0.16.1
  - @refrakt-md/transform@0.16.1
  - @refrakt-md/content@0.16.1
  - @refrakt-md/highlight@0.16.1
  - @refrakt-md/html@0.16.1
  - @refrakt-md/behaviors@0.16.1

## 0.16.0

### Minor Changes

- e5b9dc6: **v0.16.0 — Registry-driven sites.**

  Turns the entity registry into pages and listings declaratively, ships the three sibling registry-query runes (`collection` / `relationships` / `aggregate` — items / edges / numbers), and proves the system by scaffolding refrakt's own plan site from the `plan/` content tree.

  ### Registry-query runes

  - **`{% collection %}`** (SPEC-070) — the plural counterpart to `ref` / `expand`. Queries the registry with `type` + `filter`, applies `sort` / `group` / `limit`, and projects entities into `list` / `grid` / `table` layouts. Per-item body templates with `$item` bound; heading-delimited table columns; shared field-match grammar; shared formatter functions (`humanize`, `date`, `number`, `currency`, `join`); 3-zone body (preamble / template / fallback) with `$count` / `$shown` bindings; `group-display="accordion"` for collapsible groups.
  - **`{% relationships %}`** (SPEC-072) — graph-edge counterpart to `collection`. Renders an entity's edges grouped by kind (or type), generic over any domain's relationship vocabulary. Shares `$item` semantics with `collection` so card partials are reusable across both. Domain-aware ordering, accordion group display, body zones for empty state.
  - **`{% aggregate %}`** (SPEC-076) — number-projecting sibling. No-body form (`{% aggregate type="work" filter="status:done" /%}`) renders a single inline integer; body-zoned form iterates groups with `$item` bound to `{ key, count, value, percent, total, shown }`. Optional `value` sub-filter (e.g. `value="status:done"`) drives `$item.percent` for progress-bar ratios without a second query.

  ### Site machinery

  - **Plugin-contributed routes** (SPEC-069) — new `contributePages` pipeline phase plus declarative `entityRoutes` in `refrakt.config.json` that generate one page per registered entity matching `type` + optional `filter`. `embed()` embeddability contract for cross-page composition.
  - **Plan site scaffolding** (SPEC-071) — refrakt's own plan site rebuilt from `plan/` via `entityRoutes` + the registry-query runes. The bespoke `plan build` / `plan serve` commands are retired. Dashboard composition (aggregate header summary + per-status `collection` panels + empty-state `hint` runes) shipped as the canonical scaffold template.

  ### Chrome and polish

  - **Theme toggle** (SPEC-073) — light / dark / auto toggle as both a chrome slot and a `{% theme-toggle /%}` rune, with shared behavior and prod-build CSS parity for the Cloudflare-style no-runes-bundle.
  - Accordion polish — leading rotating chevron via SVG mask, native `<details>` slide animation via `::details-content` + `interpolate-size`, dividers-only outer treatment.
  - Badge restyle to a compact sentiment-tinted chip; sentiment via `color-mix(in srgb, var(--meta-color) X%, transparent)`.
  - New "Registry" category in the rune catalog for the cross-page-query runes (`xref` / `expand` / `collection` / `relationships` / `aggregate`); seven previously-missing runes added to the catalog (`xref`, `badge`, `gallery`, `showcase`, `bg`, `tint`, `blog`).

  ### Schema and docs corrections

  - `refrakt.config.json` schema — `theme` is now `string | SiteThemeConfig` (was just `string`); new `SiteThemeConfig` definition with `package`, `presets`, `tokens`, `modes`, and `code.colorScheme`. `highlight` flagged as legacy in favour of `theme.presets` (Lumina syntax presets contributing `--rf-syntax-*` overrides) + `theme.code.colorScheme` (forced light/dark code).
  - `site/content/runes/aggregate.md` — full reference page with live previews; sites.md updated for the theme object form.

  ### Bug fixes

  - Nav items containing an inline `{% badge %}` now sit as a flex row so the badge rides alongside the link instead of wrapping under it (link's `display: block` was claiming the full row).
  - Mobile docs toolbar long page titles now ellipsise instead of forcing horizontal page scroll (`flex: 1 1 0` + `max-width: 100%; overflow: hidden;` on the toolbar).
  - Conversation rune's `speakers="A,B"` attribute now renders names as bold-inline prefix inside the bubble, matching the explicit `> **Name**:` form. Two related issues fixed: the extractor was missing the Markdoc `inline` wrapper around paragraph content, and the fallback path didn't inject a strong-prefix. The speaker-carrier span is now hidden via the correct `data-field="speaker"` selector.

### Patch Changes

- Updated dependencies [e5b9dc6]
  - @refrakt-md/types@0.16.0
  - @refrakt-md/transform@0.16.0
  - @refrakt-md/runes@0.16.0
  - @refrakt-md/content@0.16.0
  - @refrakt-md/html@0.16.0
  - @refrakt-md/behaviors@0.16.0
  - @refrakt-md/highlight@0.16.0

## 0.15.0

### Minor Changes

- 8a0a6fa: Plan plugin: unconditional scan of `plan.dir`, entity registration with `sourceFile` + `extract`, dynamic `plan:` file-root namespace (SPEC-064).

  The plan plugin's `register` pipeline hook now performs an unconditional scan of the project's `plan.dir` after processing site-loaded pages. Every parseable plan entity (`spec`, `work`, `bug`, `decision`, `milestone`) found on disk is registered into the `EntityRegistry`, regardless of whether the file is part of any site's content tree. This is what makes the `{% expand "SPEC-023" /%}` rune (SPEC-066) work for plan content that isn't published to the site.

  Each registration includes:

  - `sourceFile` — project-root-relative POSIX path to the source `.md` file.
  - `extract` — a closure that returns the top-level plan rune AST node from a freshly-parsed source file, or `null` if the file's structure has been edited away from the expected shape. Consumed by `{% expand %}` for inline substitution.

  Site-load registrations win any duplicate (they have a real `sourceUrl`); the scan skips files whose entity is already in the registry. Files with no parseable plan rune (READMEs, notes) are silently skipped — the filename convention is a hint, not a filter, so files like `arbitrarily-named.md` still register if they contain a valid `{% spec id="..." %}` rune. Duplicate IDs across two plan files surface as an error naming both file paths.

  **New `EntityRegistration` fields** (`@refrakt-md/types`):

  - `sourceFile?: string` — project-root-relative path to the source `.md` file backing the entity. Populated by plugins that scan disk; consumed by content-embedding runes.
  - `extract?: (parsedSource) => Node | null` — extracts the entity's top-level AST node from a freshly-parsed source file. Paired with `sourceFile`.

  **New `PluginPipelineHooks.configure` lifecycle**:

  ```ts
  configure?: (opts: PluginConfigureOptions) => void | Promise<void>;

  interface PluginConfigureOptions {
    config: unknown;        // the full RefraktConfig
    configDir: string;      // directory containing refrakt.config.json
    registerFileRoot?: (namespace: string, absolutePath: string) => void;
  }
  ```

  Runs once per build before any other hook, giving plugins access to the user's config and the ability to register file-root namespaces dynamically (when the right path can't be statically declared on `Plugin.fileRoots`). The plan plugin uses both: it reads `plan.dir` from the config and registers `plan:` pointing at the user's actual plan directory.

  **`Plugin.fileRoots: { plan: '../../plan' }` was NOT added.** That static declaration would point at the wrong directory for npm-installed users (`node_modules/plan/` rather than the user's project-root `plan/`). The plan plugin doesn't ship plan content — users have their own — so the namespace path is fundamentally per-project. Dynamic registration via `configure` is the correct mechanism.

  The `register` hook still emits the existing site-load registrations for plan pages published to a site; the scan is additive.

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies [55de91d]
- Updated dependencies [f5fa9d5]
- Updated dependencies [8a0a6fa]
- Updated dependencies [ce36eac]
- Updated dependencies [8f8daec]
  - @refrakt-md/types@0.15.0
  - @refrakt-md/runes@0.15.0
  - @refrakt-md/behaviors@0.15.0
  - @refrakt-md/content@0.15.0
  - @refrakt-md/highlight@0.15.0
  - @refrakt-md/html@0.15.0
  - @refrakt-md/transform@0.15.0

## 0.14.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.4
  - @refrakt-md/content@0.14.4
  - @refrakt-md/html@0.14.4
  - @refrakt-md/highlight@0.14.4
  - @refrakt-md/runes@0.14.4
  - @refrakt-md/behaviors@0.14.4
  - @refrakt-md/types@0.14.4

## 0.14.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.14.3
  - @refrakt-md/transform@0.14.3
  - @refrakt-md/content@0.14.3
  - @refrakt-md/behaviors@0.14.3
  - @refrakt-md/highlight@0.14.3
  - @refrakt-md/html@0.14.3
  - @refrakt-md/types@0.14.3

## 0.14.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/highlight@0.14.2
  - @refrakt-md/transform@0.14.2
  - @refrakt-md/content@0.14.2
  - @refrakt-md/html@0.14.2
  - @refrakt-md/runes@0.14.2
  - @refrakt-md/behaviors@0.14.2
  - @refrakt-md/types@0.14.2

## 0.14.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.14.1
  - @refrakt-md/transform@0.14.1
  - @refrakt-md/runes@0.14.1
  - @refrakt-md/highlight@0.14.1
  - @refrakt-md/behaviors@0.14.1
  - @refrakt-md/content@0.14.1
  - @refrakt-md/html@0.14.1

## 0.14.0

### Patch Changes

- @refrakt-md/behaviors@0.14.0
- @refrakt-md/content@0.14.0
- @refrakt-md/highlight@0.14.0
- @refrakt-md/html@0.14.0
- @refrakt-md/runes@0.14.0
- @refrakt-md/transform@0.14.0
- @refrakt-md/types@0.14.0

## 0.12.0

### Minor Changes

- 7471ad8: Rename "rune packages" to "plugins" and unify with CLI plugins. Plugins now contribute runes, layouts, theme config, pipeline hooks, behaviors, **and** CLI commands through a single npm package.

  **Breaking changes:**

  - `RunePackage` interface → `Plugin`
  - `RunePackageEntry` → `PluginRune`
  - `RunePackageAttribute` → `PluginAttribute`
  - `RunePackageThemeConfig` → `PluginThemeConfig`
  - `PackagePipelineHooks` → `PluginPipelineHooks`
  - `loadRunePackage()` → `loadPlugin()`
  - `mergePackages()` → `mergePlugins()`
  - `discoverPackageFixtures()` → `discoverPluginFixtures()`
  - `LoadedPackage` → `LoadedPlugin`, `MergedPackageResult` → `MergedPluginResult`
  - `RuneProvenance.packageName` → `pluginName`; `source: 'package'` → `source: 'plugin'`
  - `RuneInfo.package` → `RuneInfo.plugin`; `SerializedRune.package` → `plugin`
  - Config field `site.packages[]` → `site.plugins[]`. The deprecated top-level shorthand `config.packages[]` is removed; use the existing `config.plugins[]` (which now covers both rune contributions and CLI commands).
  - `assembleThemeConfig` inputs renamed: `packageRunes` → `pluginRunes`, `packageIcons` → `pluginIcons`, `packageBackgrounds` → `pluginBackgrounds`.
  - `MergedPluginResult.packages` → `MergedPluginResult.plugins`
  - CLI: `refrakt package validate` removed; use `refrakt plugins validate` instead.
  - CLI: `refrakt reference list --package` flag is now `--plugin` (the old name still works as an alias).
  - Repo layout: `runes/{marketing,docs,…,plan}/` workspace globs moved to `plugins/{…}/`. npm package names (`@refrakt-md/marketing` etc.) are unchanged.

  **Migration:**

  - Rename `RunePackage` to `Plugin` and `loadRunePackage`/`mergePackages` to `loadPlugin`/`mergePlugins` in your code.
  - In `refrakt.config.json`, rename per-site `"packages": [...]` to `"plugins": [...]`. If you had a top-level `"packages"` shorthand under flat shape, move it to `"plugins"`.
  - Replace any calls to `refrakt package validate` with `refrakt plugins validate`.

### Patch Changes

- Updated dependencies [799583f]
- Updated dependencies [7471ad8]
- Updated dependencies [7537459]
- Updated dependencies [a733ec6]
  - @refrakt-md/transform@0.12.0
  - @refrakt-md/types@0.12.0
  - @refrakt-md/runes@0.12.0
  - @refrakt-md/content@0.12.0
  - @refrakt-md/html@0.12.0
  - @refrakt-md/highlight@0.12.0
  - @refrakt-md/behaviors@0.12.0

## 0.11.3

### Patch Changes

- 8cf7caf: Fix plan tools failing with `ENOENT: ... 'plan'` when the MCP server is launched from outside the project directory (e.g. via `scripts/start-mcp.sh`, which `cd`s to `/tmp` before exec).

  The MCP server already accepted `--cwd` and forwarded it to its core tools, but plugin-contributed tools dropped it: `buildPluginTool` called `command.mcpHandler(input)` without the cwd context, so `@refrakt-md/plan`'s handlers fell back to `process.cwd()` when resolving `refrakt.config.json` and the default `'plan'` directory.

  Changes:

  - `@refrakt-md/types`: `CliPluginCommand.mcpHandler` now takes an optional second `ctx?: McpHandlerContext` argument carrying the server's resolved cwd. New `McpHandlerContext` type is re-exported from the package entry. The change is non-breaking — existing handlers that ignore the second argument keep compiling.
  - `@refrakt-md/mcp`: `buildPluginTool` forwards the server's `ctx` to the plugin's `mcpHandler`. The argv-shimming fallback path is unchanged (it still uses `process.cwd()`); plugins that need project-cwd awareness should provide an explicit `mcpHandler`.
  - `@refrakt-md/plan`: every `*McpHandler` accepts the new `ctx`, threads it into `resolvePlanDir`, and absolutizes the resolved `dir` against `ctx.cwd` so relative paths from any source (flag, env, config, default) consistently resolve against the project root.

- Updated dependencies [8cf7caf]
  - @refrakt-md/types@0.11.3
  - @refrakt-md/content@0.11.3
  - @refrakt-md/highlight@0.11.3
  - @refrakt-md/html@0.11.3
  - @refrakt-md/runes@0.11.3
  - @refrakt-md/transform@0.11.3
  - @refrakt-md/behaviors@0.11.3

## 0.11.2

### Patch Changes

- @refrakt-md/behaviors@0.11.2
- @refrakt-md/content@0.11.2
- @refrakt-md/highlight@0.11.2
- @refrakt-md/html@0.11.2
- @refrakt-md/runes@0.11.2
- @refrakt-md/transform@0.11.2
- @refrakt-md/types@0.11.2

## 0.11.1

### Patch Changes

- @refrakt-md/behaviors@0.11.1
- @refrakt-md/content@0.11.1
- @refrakt-md/highlight@0.11.1
- @refrakt-md/html@0.11.1
- @refrakt-md/runes@0.11.1
- @refrakt-md/transform@0.11.1
- @refrakt-md/types@0.11.1

## 0.11.0

### Minor Changes

- 6a89ebe: v0.11.0 — unified config + multi-site + MCP server.

  - **Unified `refrakt.config.json`**. New `$schema`, `plugins`, `plan`, `site` / `sites` sections collapsed into a canonical sites map by `normalizeRefraktConfig()` in `@refrakt-md/transform/node`. Flat / singular / plural shapes all valid; single-site fields mirror to the top level for backwards compat. JSON Schema published from `@refrakt-md/transform` and referenced from a repo-root symlink for in-repo `$schema` references.
  - **Plugin discovery**. `discoverPlugins()` in `@refrakt-md/cli/lib/plugins` resolves `config.plugins` first, then falls back to scanning `package.json` deps + `node_modules/@refrakt-md/*`. CLI dispatch uses it for routing, "Did you mean?" suggestions on misspellings, and `--help` plugin listing. New `refrakt plugins list` command.
  - **Multi-site support**. New `--site <name>` flag on site-scoped commands (`inspect`, `contracts`, `scaffold-css`, `validate`, `package validate`). Resolves via `resolveSite()`; multi-site without `--site` errors with available names; unknown name errors with a suggestion. All five framework adapters (`sveltekit`, `astro`, `nuxt`, `next`, `eleventy`) accept a `site?: string` option.
  - **`@refrakt-md/mcp`** (new package). Model Context Protocol server wrapping the refrakt CLI. Stdio transport, six core tools (`refrakt.detect`, `refrakt.plugins_list`, `refrakt.reference`, `refrakt.contracts`, `refrakt.inspect`, `refrakt.inspect_list`), plugin-discovered tools registered as `<namespace>.<name>`, and read-only resources (`refrakt://detect`, `refrakt://plan/index`, `refrakt://plan/<type>/<id>`, etc.). Errors return structured envelopes with `errorCode` + `hint`. `--cwd <path>` overrides cwd. Long-running commands (`plan.serve`, `plan.build`) intentionally excluded.
  - **Plan + MCP integration**. New `inputSchema` / `outputSchema` / `mcpHandler` fields on `CliPluginCommand`. Plan commands ship MCP bindings (`next`, `update`, `create`, `status`, `validate`, `next-id`, `init`, `history`, `migrate`). Plan package consumes the unified config via `resolvePlanDir()` (precedence: flag → env → config → `'plan'`). `plan init` scaffolds `refrakt.config.json` by default (`--no-config` opts out).
  - **`refrakt config migrate`**. New subcommand. Default is dry-run with a line diff; `--apply` writes. `--to nested` (default) handles flat → singular; `--to multi-site --name <n>` handles singular → plural. Idempotent. Auto-populates `plugins` from `discoverPlugins()` on first migration.
  - **`.mcp.json` scaffolding**. `plan init` and `create-refrakt` (all six site scaffolds) drop a project-scoped `.mcp.json` registering `@refrakt-md/mcp` for MCP-aware agents (Claude Code, Cursor). Gated on agent detection; `--no-mcp` opts out.
  - **Site docs**. New `site/content/docs/configuration/` (overview, plugins, plan, sites, migration, schema) and `site/content/docs/mcp/` (overview, installation, tools, resources, errors). `packages/authoring.md` extended with an "Adding CLI Commands and MCP Tools" section. `CLAUDE.md` gains an MCP section directing agents to prefer MCP tools over the CLI when both are available.
  - **Path resolution semantics**. Nested-shape paths (`contentDir`, `sandbox.examplesDir`, `theme`, `overrides`, `runes.local`) now resolve relative to the config file's directory when a `configDir` is provided to `normalizeRefraktConfig()`. Flat-shape paths remain cwd-relative for legacy projects. `DEFAULT_SITE_NAME` exported as `'main'` (was `'default'`) so flat / singular configs promote to `sites.main` and match the `create-refrakt` scaffolds.

### Patch Changes

- Updated dependencies [6a89ebe]
  - @refrakt-md/transform@0.11.0
  - @refrakt-md/content@0.11.0
  - @refrakt-md/highlight@0.11.0
  - @refrakt-md/html@0.11.0
  - @refrakt-md/runes@0.11.0
  - @refrakt-md/behaviors@0.11.0
  - @refrakt-md/types@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [b04d001]
  - @refrakt-md/runes@0.10.1
  - @refrakt-md/content@0.10.1
  - @refrakt-md/behaviors@0.10.1
  - @refrakt-md/highlight@0.10.1
  - @refrakt-md/html@0.10.1
  - @refrakt-md/transform@0.10.1
  - @refrakt-md/types@0.10.1

## 0.10.0

### Minor Changes

- Adopt `{ID}-{slug}.md` as the canonical filename for plan items. `refrakt plan create` now emits e.g. `WORK-058-my-task.md` instead of `my-task.md` for every auto-ID type (work, bug, spec, decision). Milestones still use their semver names (`v1.0.0.md`).

  New command: `refrakt plan migrate filenames` renames legacy slug-only files in existing projects. Use `--apply --git` to apply with `git mv`.

  `refrakt plan validate` now emits `filename-missing-id` / `filename-id-mismatch` warnings when a file's name doesn't match its frontmatter `id`.

### Patch Changes

- `refrakt plan init` no longer scaffolds the root `index.md`, type-level `index.md` pages, or status filter pages. The plan site synthesises these dynamically.

## 0.9.9

### Patch Changes

- bcc1335: Expand `refrakt plan init` to fully wire the host project for agent use:

  - **AGENTS.md is now canonical** — full workflow content lives in `AGENTS.md` at the project root; tool-specific files (`CLAUDE.md`, `.cursorrules`, etc.) get one-line pointers to it.
  - **Host `package.json` wiring** — adds `@refrakt-md/cli` + `@refrakt-md/plan` to `devDependencies` (pinned to the running plan version) and `"plan": "refrakt plan"` to `scripts`. Walks up to find the install root (respects npm/pnpm/yarn/lerna workspaces). Never clobbers existing keys.
  - **Claude SessionStart hook** — writes `.claude/settings.json` with a hook that runs the detected package manager's install command if `node_modules/.bin/refrakt` is missing. Gated on Claude detection (explicit `--agent claude` or auto-detect seeing `CLAUDE.md`). PM detection happens at hook execution time by reading the lockfile, so switching package managers later just works.
  - **`./plan.sh` wrapper script** — POSIX script that installs deps on first run and defers to `npx refrakt plan "$@"`. Works in any agent environment where hooks aren't available.
  - **Opt-out flags** — `--no-package-json`, `--no-hooks`, `--no-wrapper`, and `--minimal` (all three) for users who want bare scaffolding.

  Also fixes the `esbuild` dependency leak in `@refrakt-md/plan`: the `bundleBehaviors` helper now lazy-imports `esbuild`, so non-build plan commands (`status`, `next`, `update`, etc.) no longer fail to load when esbuild isn't installed. `esbuild` is declared as an optional peer dependency.

  - @refrakt-md/behaviors@0.9.9
  - @refrakt-md/content@0.9.9
  - @refrakt-md/highlight@0.9.9
  - @refrakt-md/html@0.9.9
  - @refrakt-md/runes@0.9.9
  - @refrakt-md/transform@0.9.9
  - @refrakt-md/types@0.9.9

## 0.9.8

### Patch Changes

- Add edge-safe `./render` entry point for rendering plan entity Markdoc source to a serialized RendererNode. Works on Cloudflare Workers — no Node.js dependencies. Consumers apply their own theme's identity transform and render to HTML.
  - @refrakt-md/behaviors@0.9.8
  - @refrakt-md/content@0.9.8
  - @refrakt-md/highlight@0.9.8
  - @refrakt-md/html@0.9.8
  - @refrakt-md/runes@0.9.8
  - @refrakt-md/transform@0.9.8
  - @refrakt-md/types@0.9.8

## 0.9.7

### Patch Changes

- Plan package improvements: tool-agnostic `plan init` with `--agent` flag for multi-editor support, renamed plan directories to plural form (specs/, decisions/, milestones/), and refactored internals for edge runtime compatibility with new entry points (./diff, ./relationships, ./cards)
  - @refrakt-md/behaviors@0.9.7
  - @refrakt-md/content@0.9.7
  - @refrakt-md/highlight@0.9.7
  - @refrakt-md/html@0.9.7
  - @refrakt-md/runes@0.9.7
  - @refrakt-md/transform@0.9.7
  - @refrakt-md/types@0.9.7

## 0.9.6

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.6
  - @refrakt-md/content@0.9.6
  - @refrakt-md/highlight@0.9.6
  - @refrakt-md/html@0.9.6
  - @refrakt-md/runes@0.9.6
  - @refrakt-md/transform@0.9.6
  - @refrakt-md/behaviors@0.9.6

## 0.9.5

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.9.5
  - @refrakt-md/behaviors@0.9.5
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/content@0.9.5
  - @refrakt-md/types@0.9.5
  - @refrakt-md/html@0.9.5
  - @refrakt-md/highlight@0.9.5

## 0.9.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/content@0.9.4
  - @refrakt-md/runes@0.9.4
  - @refrakt-md/behaviors@0.9.4
  - @refrakt-md/html@0.9.4
  - @refrakt-md/highlight@0.9.4
  - @refrakt-md/transform@0.9.4
  - @refrakt-md/types@0.9.4

## 0.9.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.3
  - @refrakt-md/content@0.9.3
  - @refrakt-md/highlight@0.9.3
  - @refrakt-md/html@0.9.3
  - @refrakt-md/runes@0.9.3
  - @refrakt-md/transform@0.9.3
  - @refrakt-md/behaviors@0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.
- Updated dependencies
  - @refrakt-md/types@0.9.2
  - @refrakt-md/transform@0.9.2
  - @refrakt-md/runes@0.9.2
  - @refrakt-md/behaviors@0.9.2
  - @refrakt-md/content@0.9.2
  - @refrakt-md/highlight@0.9.2
  - @refrakt-md/html@0.9.2

## 0.9.1

### Patch Changes

- ### Transform engine enhancements (SPEC-033)

  - Named slots with ordering for structured element placement
  - Repeated element generation for multi-instance structures
  - Element projection (hide, group, relocate) for layout control
  - Value mapping and configurable density contexts
  - Migrate postTransform uses to declarative config

  ### Rune schema modernization

  - Replace legacy Model class with `createContentModelSchema` across all runes (WORK-099–102)
  - Replace `useSchema`/`Type` system with inline rune identifiers (ADR-005)
  - Remove legacy Model class, decorators, `createSchema`, and `NodeStream`

  ### Other improvements

  - File-derived timestamps for runes (SPEC-029)
  - Move extract command from CLI to `@refrakt-md/docs` package
  - Fix accordion item schema metadata duplication
  - Fix paragraph-wrapped images in juxtapose panels
  - Auto-assign IDs and detect duplicates in plan CLI
  - Inspect and contracts updated for structure slots

- Updated dependencies
  - @refrakt-md/behaviors@0.9.1
  - @refrakt-md/content@0.9.1
  - @refrakt-md/highlight@0.9.1
  - @refrakt-md/html@0.9.1
  - @refrakt-md/runes@0.9.1
  - @refrakt-md/transform@0.9.1
  - @refrakt-md/types@0.9.1

## 0.9.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/behaviors@0.9.0
  - @refrakt-md/highlight@0.9.0
  - @refrakt-md/html@0.9.0
  - @refrakt-md/runes@0.9.0
  - @refrakt-md/transform@0.9.0
  - @refrakt-md/types@0.9.0
