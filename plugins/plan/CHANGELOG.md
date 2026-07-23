# @refrakt-md/plan

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
