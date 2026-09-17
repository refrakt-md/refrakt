{% spec id="SPEC-135" status="draft" tags="validation, cli, mcp, dx, diagnostics, plan" %}

# Validation surfaces beyond the build

{% ref "SPEC-132" /%} connected `Markdoc.validate()` to site content. The
findings now exist. **Nobody can reach them.**

An error-severity diagnostic fails nothing anywhere, the dev server prints none
at all, `refrakt validate` validates something else entirely, there is no MCP
tool, and the repository has no pre-merge check for any of it to run in.

This spec is about the other half: making a finding land somewhere a person or
an agent will see it, before the thing it describes ships.

## Problem

### The findings reach nobody

{% ref "WORK-554" /%} established this by planting a synthetic error-severity
`PipelineWarning` and observing every surface:

| Surface | Exit code | What appeared |
|---|---|---|
| `vite build` in `site/` | **0** | `✗  Build complete (1 error, 35 warnings)` on stderr |
| `vite build` in `plan-site/` | **0** | same |
| `npx vitest run` (4,402 tests) | **0** | nothing — no test observes the count |
| `vite dev` | n/a | **nothing at all** |

`formatPipelineSummary` computes `errorCount`, uses it to pick `✗` over `✓`, and
returns a string. Six adapters `process.stderr.write(…)` it and discard the
return.

The dev-server row is the damaging one. `packages/sveltekit/src/plugin.ts:171`
returns early on `if (!isBuild)`, and that guard wraps the whole content-loading
block. Content in dev comes from `virtual:refrakt/content` →
`createRefraktLoader`, which calls `loadContent` internally — so
`site.pipelineWarnings` **is** fully populated in dev, sitting on the cached site
object, and is never read. The pipeline does the work of producing diagnostics on
every content edit and throws them away.

### `refrakt validate` validates the wrong thing

The command whose name promises this checks theme config and manifest. Worse,
its zero-argument path (`packages/cli/src/commands/validate.ts:35`) validates
**`baseConfig`** — refrakt's own built-in theme config. It does not read
`refrakt.config.json`, does not look at the user's site, and never touches
content. In a user's project it is a self-test of the library, reported as if it
were a check of their work.

The {% ref "SPEC-132" /%} milestone named the fix and deferred it: *"Renaming
`refrakt validate`. Real, and a follow-up."*

The seam is already cut. `bin.ts:913` parses `--site` and discards it, with a
comment reserving it for exactly this.

### There is no pre-merge surface at all

One workflow, `release.yml`, triggered on `push` to `main`. The site build runs
at `:56` inside the deploy step, gated on `published == 'true'`. So even if
errors did fail a build, a content error merged to `main` would not fail a PR
check — it would break the **release deploy**, after merge, on the job that
publishes the site.

`content:check-links` and `runes:check-docs` are npm scripts nothing invokes.
This is {% ref "SPEC-126" /%}'s finding for the third time in this repo.

### Duplicate IDs pass validation silently

A concrete instance, found while writing {% ref "SPEC-131" /%}: three ID
collisions in two days between a branch and `main` — `SPEC-133`, then `BUG-015`,
then `BUG-019`.

CLAUDE.md says duplicate IDs "are rejected at create time". Nothing re-checks
afterwards, so a collision introduced by a **merge** passes `plan validate` with
zero errors. The `BUG-019` case had already corrupted the rollups before a human
noticed: {% ref "SPEC-130" /%} and {% ref "SPEC-131" /%} each claimed a different
entity under the same ID, and `plan status` emitted the same no-milestone
warning twice.

This belongs in this spec rather than beside it, because it is the same disease:
a check that would have caught it is cheap and absent, and even present it would
not have helped without somewhere pre-merge to run.

## What already exists

| Piece | State |
|---|---|
| `Markdoc.validate()` wired to content | {% ref "SPEC-132" /%} — `WORK-556`, `WORK-558` |
| `PipelineWarning` — severity, phase, `pluginName`, url, message | `packages/types/src/pipeline.ts:156` |
| `formatPipelineSummary` — counts errors, returns a string | `packages/content/src/format.ts:35` |
| `loadContent` — the one function every adapter and both modes call | `packages/content/src/site.ts` |
| Per-site / per-error-id disable | {% ref "SPEC-132" /%} — `WORK-559` |
| `refrakt validate` with a reserved-but-ignored `--site` | `packages/cli/src/bin.ts:913` |
| `plan validate` with findings that name their own fix command | `plugins/plan/src/commands/validate.ts:548` |
| `plan migrate <filenames\|pr-attrs\|dependencies>` with `--dry-run` / `--apply` / `--git` | `plugins/plan/src/commands/migrate.ts` |
| `extractRefs` — every `{% ref %}` / `{% xref %}` ID in a file | `plugins/plan/src/scanner-core.ts:175` |
| MCP tool surface, including `plan_validate` | `plugins/plan/src/mcp-bindings.ts` |

Every piece of the machinery exists. What is missing is callers.

## Proposal

### One validation function, four callers

The fix for every surface is the same shape, and it is the shape
{% ref "WORK-573" /%} currently gets wrong by asking each adapter to change.
`loadContent` is the single function that dev (via `createRefraktLoader`) and
build (via each adapter's plugin) both go through. A `reporter` option there,
defaulting to stderr, serves all of them at once.

```
                 ┌── build   → stderr, and an exit code (D4)
loadContent ──── ├── dev     → stderr on each HMR reload
  (reporter)     ├── CLI     → refrakt validate
                 └── MCP     → structured findings
```

Divergence between adapters stops being something a checklist polices and starts
being impossible to express.

### `refrakt validate` validates the site

```bash
refrakt validate                      # config resolution, then content, for every site
refrakt validate --site main          # one site
refrakt validate --only content       # narrow
refrakt validate --only config
refrakt validate --deep               # add cross-page checks — D3
refrakt validate --format json
```

| Flag | Meaning |
|---|---|
| `--site <name>` | Restrict to one site from `refrakt.config.json`. Already parsed and ignored today. |
| `--only <content\|config>` | Narrow. Both run when absent. |
| `--deep` | Run the cross-page tier. Off by default — D3. |
| `--format json` | Machine-readable findings. |

Exit non-zero when anything at error severity is found. This is the pre-merge
gate — D4.

**Two layers, in order** — D1. Config resolution runs first because its failures
*cause* content findings; content validation runs against a config already known
to resolve.

### The command surface this lands in

`refrakt validate` gets its name back for the site author. The theme-authoring
checks it carries today move to the noun group that already exists for them:

```bash
refrakt validate              # site: config resolution, then content
refrakt config validate       # just the config layer — beside `config migrate`
refrakt theme validate        # ThemeConfig + manifest — beside `theme install/info/list`
refrakt plugins validate      # unchanged
```

No new groups. `theme`, `config`, `plugins` and `template` are all existing
dispatch targets (`bin.ts:23-29`) — D12.

### Two tiers, and the default is the fast one

| Tier | Needs | Catches |
|---|---|---|
| **Per-page** (default) | config + assembled tag set + each page's AST | `tag-undefined`, `attribute-*` — everything {% ref "SPEC-132" /%} enables |
| **Cross-page** (`--deep`) | register + aggregate phases | broken `{% ref %}`, missing entities, nav slug resolution |

The per-page tier is where {% ref "SPEC-132" /%}'s whole value sits and it needs
no pipeline at all. Making it the default is what makes the command fast enough
to run on every save — D3.

### An MCP tool

`refrakt_validate`, mirroring the CLI and returning findings as structured data:
file, line, severity, error id, message. Not scraped text.

There is a `plan_validate` tool and no content equivalent, which is precisely
the gap an agent falls into. This repository's plan directory is agent-authored
and its documentation is agent-edited; an agent that can check its own content
in a second is a materially different authoring loop from one that must run a
build and parse stderr.

### Diagnostics in the dev loop

Print the summary after each dev content load. The data is already there; this
is a reporter call, not a new pipeline.

### Duplicate ID detection, and what to do about it

`plan validate` gains a duplicate-ID check — error severity, naming both files
(D7). Plus two things that make it useful rather than merely correct:

```bash
refrakt plan validate --against origin/main   # collisions with a base ref, pre-merge
refrakt plan migrate ids --apply --git        # renumber and rewrite every reference
```

`--against` is the one that matters, because it catches the collision while
resolution is still unambiguous — see D8.

## Design decisions

**D1 — `refrakt validate` is site-scoped, and its two layers run in order.**
"Validate my project" is the obvious reading of the command, and it is what
`plan validate` already means for its own root. The change is cheap to justify
because the current zero-argument behaviour is close to a no-op: it validates
refrakt's own `baseConfig` and reports it as though it were the user's.

**Three different things are called "config" here**, and only one of them
belongs in this command:

| Artifact | Who writes it | Checked today by |
|---|---|---|
| `refrakt.config.json` | site author | a published JSON Schema — editors only, nothing in a build |
| `ThemeConfig` (`prefix`, rune configs) | theme author | `validateThemeConfig` — what `--config <path>` calls |
| Theme manifest | theme author | `validateManifest` — what `--manifest` calls |

So the command validates the two **theme-authoring** artifacts under a name that
reads like a **site-authoring** one. Those go to `theme validate` (D12).

**And the site half checks resolution, not shape.** Shape-checking
`refrakt.config.json` is the JSON Schema's job and it already does it. What
nothing covers is whether the config's *names resolve*: does `theme.package`
exist, does every entry in `plugins[]` load, do `routeRules` layout names exist,
do `entityRoutes` types match a registered type. None of that is expressible in
JSON Schema.

That layer is not optional garnish — it is load-bearing for the content layer.
`packages/sveltekit/src/plugin.ts:166` catches a failed package load, warns to
console, and continues with that plugin's runes **absent**. Post-
{% ref "SPEC-132" /%} every use of those runes is now a `tag-undefined` finding:
dozens of errors against content that is perfectly correct, when the cause is
one line of config. Running resolution first, and letting it annotate or
suppress the findings it would cause, is what stops the symptom drowning the
cause.

This is a behaviour change to a public CLI. Pre-1.0 under fixed-mode Changesets
it is a minor, but it is the kind of change that deserves saying out loud in the
milestone rather than appearing in a changelog line.

**D2 — the scope flag is `--only`, and `--config <path>` leaves the command.**
An earlier draft kept `--config <path>` on `refrakt validate` and avoided the
name collision by calling the scope flag `--only`. The collision is now moot:
under D12 the theme-config path moves to `theme validate`, so the bare command
has no `--config` at all.

`--only content|config` stays the scope flag regardless — it reads as a filter
rather than an input, which is what it is.

Retire `--config` / `--manifest` from the bare command rather than aliasing
them through a deprecation window. Pre-1.0, and today's zero-argument behaviour
is close to a no-op, so nobody can be meaningfully depending on it.

**A validation command must never report success on nothing.** Standing in a
theme package with no `refrakt.config.json` and no content should say exactly
that, not print a checkmark. This is the real defect in today's command: it
validates `baseConfig`, reports success, and tells the user nothing while
looking like it told them something.

**D3 — the per-page tier is the default; cross-page is opt-in.**
{% ref "SPEC-132" /%} puts validation where the tag set is assembled, inside
`loadContent`. A CLI that simply calls `loadContent` pays for the full four-phase
cross-page pipeline and is not meaningfully faster than a build — which would
defeat the reason for having a CLI at all.

The naive implementation is the slow one, so the split has to be stated. Default
to parse-and-validate; put register/aggregate behind `--deep`.

**D4 — the CLI is the pre-merge gate, not the build.** Getting a PR check today
otherwise requires {% ref "WORK-573" /%}'s exit-code half — a behaviour change
for every downstream adapter, which is why it is still `ready` and not done.

`refrakt validate --format json` is a command with its own exit code and no
downstream consumers. It gives a gate without touching build semantics for
anyone, and it gives it sooner. Whether a *build* should fail becomes a separate
and still legitimate question, no longer the blocker for catching errors before
merge.

**D5 — the reporter goes at `loadContent`, not at six adapter call sites.**
{% ref "WORK-573" /%} AC 5 asks that "the other adapters either get the same
treatment or the divergence is recorded with a reason" — six places to keep in
sync and six places to drift. One injection point at the function they all call
makes divergence unrepresentable. Same argument as
{% ref "SPEC-132" /%}'s decision to validate where the tag set is assembled.

**D6 — MCP returns findings, not a rendered report.** The point of the tool over
the CLI is that a caller can filter, count and act on individual findings without
parsing text. A tool that returns the CLI's formatted output is a worse CLI.

**D7 — a duplicate ID is an error, not a warning.** It is not a style
preference: it silently corrupts the rollups. `plan status` builds
`implementedBy` by ID, so two entities sharing one ID produce a graph where each
spec claims whichever file was scanned last. That is wrong data presented
confidently, which is the failure class this repository keeps deciding not to
tolerate.

The check itself is trivial — group by ID, report groups larger than one. What
makes it worth a decision is the severity, and that the absence was invisible:
three collisions passed `plan validate` with zero errors.

**D8 — collisions are resolved only when resolution is provable, and prevented
in preference to being resolved.**

The mechanical half is easier than it looks. The scanner already extracts every
ID reference (`extractRefs`, `scanner-core.ts:175`) because the rollups need
them, and `plan migrate` is an established family — `filenames`, `pr-attrs`,
`dependencies` — with `--dry-run`/`--apply`/`--git` and a precedent of
`plan validate` naming the migration that fixes a finding. `migrate ids` reuses
all of it: pick the next free ID, rewrite the `id=` attribute, `git mv` the file
to match the `{ID}-{slug}` convention, and rewrite every `{% ref %}`, `source=`,
`supersedes=` and `## Blocked by` / `## Blocks` entry pointing at the old ID.

**The hard part is not rewriting references. It is knowing which entity a
reference meant.** Once two files share `BUG-019`, every `{% ref "BUG-019" /%}`
in the repository is ambiguous, and getting it wrong repoints a reference at the
wrong entity — silently, and in a file nobody is looking at.

So:

- **Detect always.** Cheap, and always correct.
- **Prevent early.** `plan validate --against origin/main` compares IDs against a
  base ref. On a branch, before a merge, every reference to the branch's own
  entity is unambiguously the branch's. That is the moment resolution is free,
  and it is the moment a PR check would fire.
- **Resolve only when provable.** `migrate ids` renumbers when it can establish
  what each affected reference meant — and **refuses, naming the references it
  cannot resolve**, rather than guessing. A tool that guesses here reintroduces
  exactly the silent-wrong class that {% ref "SPEC-131" /%} exists to remove.

Post-merge resolution is possible with line-level `git blame` on each ambiguous
reference. It is deliberately out of scope: more machinery, for the case that
prevention removes, with a silent-wrong failure mode if the blame heuristic is
wrong.

**D9 — sequential human-readable IDs stay.** Content-hashed or ULID-style IDs
would eliminate collisions outright, and they are the wrong trade here. `SPEC-131`
appears in prose, in commit messages, in branch names and in conversation; the
readability *is* the feature. A scheme that cannot collide but that nobody can
say out loud costs more than three collisions did.

An allocation ledger (`plan/ids.json`) is the other structural fix: it moves the
claim out of "a file with this name exists" — which two branches can both do
without git noticing, because different filenames never conflict — and into one
file, so git's own conflict detection does the work.

Its shape decides whether it works at all, and the obvious shape does not:

| Shape | Two branches both take WORK-575 | Two branches take 575 and 576 |
|---|---|---|
| Counter (`{"work": 575}`) | both write the same line → **merges clean** | different values → conflict |
| Append-only list | same insertion point → conflict | same insertion point → **false conflict** |
| **Sorted ID-keyed map** | same line, different value → **conflict** | different lines → merges clean |

A counter conflicts on the case that is fine and merges the case that is broken,
exactly backwards. An append-only list is correct but fires on every parallel
plan addition, most of which collide with nothing. Only a sorted map keyed by ID
(`{"WORK-575": "<slug>", …}`, one entry per line) puts the conflict surface on
the ID itself.

Rejected for now: `--against` catches the same collisions with no false
positives and no standing friction, and the ledger's advantage — working when
nobody runs a check — is the condition this spec exists to end. It also
introduces a second source of truth needing its own drift check against the
filesystem, and it binds only callers that go through `plan create`.

Revisit if collisions continue after `--against` has somewhere to run, or if
parallel plan authoring makes a pre-merge check too late in the loop. If it is
ever built, build the sorted-map shape; the other two are traps.

**D10 — advisory findings do not fail `--check` by default.**
{% ref "SPEC-134" /%}'s review markers are a review prompt, not a defect
(SPEC-134 D7). Folding them into a pass/fail command would muddy both: a build
that fails because a paragraph *might* be stale trains people to re-stamp
reflexively.

`validate` reports them as a distinct category, with an opt-in flag to make them
failing. One command and one CI job for all content health, without one
category's semantics leaking into another's.

**D11 — `plan validate` and `plugins validate` stay siblings.** Three commands
already share the word. `plan validate` runs semantic checks — dependency
cycles, status lag, and now duplicate IDs — over a different content root;
`plugins validate` is about authoring a plugin package. Folding either into
`refrakt validate` would make it mean "everything", which is less useful than
"this site".

**D12 — theme validation moves to the `theme` group, which already exists.**
`bin.ts:23-29` dispatches five noun groups — `theme`, `template`, `plugins`,
`config`, `reference` — so subcommands are this CLI's general shape for "acting
on a named thing", not a plugin convention. `theme` already holds `install`,
`info` and `list`; `theme validate` slots in beside them.

Being a *core* concern does not argue against a group: `config` is as core as
anything in the product and has one. The grouping tracks what you are acting on,
not whether it is first- or third-party.

The alternatives considered, and why not:

| Option | Why not |
|---|---|
| Keep `--config` / `--manifest` on `refrakt validate` | Zero migration, but permanently mixes two audiences and leaves `--only config` ambiguous — the thing D1 exists to fix |
| Generalise to `refrakt extension validate` | Themes, plugins and templates are one family ({% ref "SPEC-118" /%}), but this invents a noun where three concrete ones already exist, and nobody thinks "I am validating my extension" |
| `refrakt validate --only theme` | Keeps one command, at the cost of it meaning different things depending on what kind of project you are standing in — the ambiguity D1 removes |
| Drop theme validation | Theme authoring loses its only check |

The same reasoning gives the config layer a focused entry point for free:
`refrakt config validate`, beside the `config migrate` that already exists. It
does not replace running resolution inside `refrakt validate` — D1's ordering
still holds — it is the same function with a second caller, per D5.

**D13 — the pre-merge gate is a PR job that builds.** `format.yml` runs on
`pull_request:` and establishes the shape: checkout → setup-node 24 →
`npm ci` → one check command. A validate job follows it, with one addition —
`npm run build` — because there is no build-free route:

- `format.yml` escapes it only because Biome reads source.
- `fixture-corpus.test.ts` imports `../src/index.js`, so it needs no build
  *within* one package; validating site content needs the assembled tag set
  across `runes`, nine plugins and `content`, which resolves through
  `node_modules` to `dist`.
- `release.yml` confirms the ordering: `npm ci` → `npm run build` → `npm test`.

**The build is not a tax this spec imposes — it closes a second gap.** Nothing
builds the monorepo on a PR today, so a type error merges clean and breaks the
release job. A building PR job gates validation *and* that, which is most of its
justification.

Two notes. The cost is **ours, not users'** — in a consumer project the CLI is
installed from npm and starts instantly, so the monorepo's build time must not
shape the command's design. And a `paths:` filter is tempting and near-useless:
a rune schema change can invalidate content anywhere, so the filter would have
to include `packages/**`.

## Non-goals

- **Making a build fail.** {% ref "WORK-573" /%}'s exit-code half stays its own
  decision. D4 exists so that this spec does not depend on it.
- **Changing what the release workflow does.** D13 adds a PR job; `release.yml`
  is untouched.
- **Shape-validating `refrakt.config.json`.** The published JSON Schema does
  that and editors already enforce it. This spec's config layer checks
  resolution — D1.
- **Post-merge collision resolution.** D8.
- **New error ids.** The set is {% ref "SPEC-132" /%}'s; this spec changes only
  where findings are reported and who can ask for them.
- **Validating the docs' fenced examples.** Deferred from the
  {% ref "SPEC-132" /%} milestone and still its own work item — a repo script
  over `site/content`, not a pipeline feature.

## Acceptance Criteria

- [ ] `loadContent` accepts a reporter; build, dev, CLI and MCP all report through it, with no per-adapter diagnostic handling left behind
- [ ] A dev-server content load prints its pipeline diagnostics, on first load and on each HMR reload
- [ ] `refrakt validate` with no arguments validates the project's content and config, for every site in `refrakt.config.json`
- [ ] `refrakt validate` never validates `baseConfig` as a stand-in for the user's project, and never reports success when it validated nothing — it says what it found no input for
- [ ] `--site`, `--only content|config`, `--deep` and `--format json` behave as specified
- [ ] The config layer checks resolution — `theme.package`, every `plugins[]` entry, `routeRules` layout names, `entityRoutes` types — not the shape the JSON Schema already covers
- [ ] Config resolution runs before content validation, and a resolution failure annotates or suppresses the `tag-undefined` findings it causes rather than reporting both as peers
- [ ] `refrakt theme validate` carries `validateThemeConfig` and `validateManifest`; `--config` and `--manifest` are gone from the bare command
- [ ] `refrakt config validate` runs the config layer alone, through the same function `refrakt validate` calls
- [ ] A PR workflow runs `npm ci` → `npm run build` → `refrakt validate`, and fails the PR on an error-severity finding
- [ ] The default run does not execute the register/aggregate phases, demonstrated by a timing test against a `--deep` run on the same site
- [ ] `refrakt validate` exits non-zero when any finding is at error severity, and zero otherwise
- [ ] An `refrakt_validate` MCP tool returns structured findings — file, line, severity, error id, message — not formatted text
- [ ] `plan validate` reports duplicate entity IDs at error severity, naming every file claiming each ID
- [ ] A test reproduces the observed case: two files claiming one ID pass today and fail after
- [ ] `plan validate --against <ref>` reports IDs that collide with those on the given git ref
- [ ] `plan migrate ids` renumbers a colliding entity, rewrites its filename, and rewrites every `{% ref %}`, `source`, `supersedes` and dependency-section reference to it
- [ ] `plan migrate ids` refuses rather than guessing when it cannot establish which entity a reference meant, and names those references
- [ ] `plan migrate ids` follows the family's conventions: dry-run by default, `--apply` to write, `--git` to stage
- [ ] Advisory-category findings do not affect the exit code unless explicitly opted in
- [ ] Docs cover the redefined `refrakt validate`, including that its default changed

## Approach

Four phases. The first two are independent of every open question.

1. **The reporter seam and the dev loop.** The `loadContent` reporter option, and
   the dev-server print. No behaviour change for any existing consumer, no
   dependency on the exit-code debate, and it closes the most damaging half of
   {% ref "WORK-554" /%}'s finding. {% ref "WORK-573" /%} should be split, with
   its dev-visibility half re-sourced to this spec.
2. **`refrakt validate`.** The redefinition, the two tiers, the flags, the exit
   code. This is the phase that gives CI something to run.
3. **The MCP tool.** Thin over phase 2, and the phase that changes the agent
   authoring loop.
4. **Duplicate IDs.** The `plan validate` check, `--against`, and
   `plan migrate ids`. Last because it is the smallest and the most separable —
   but the check alone is an afternoon and could be pulled forward if collisions
   keep happening.

**Budget the tiering, not the command.** Wiring a CLI to an existing function is
straightforward. Making the default tier genuinely skip the cross-page pipeline —
and proving it did — is the work, and getting it wrong produces a command that
nobody runs on save because it costs a build.

## Open questions

- ~~**Where does `refrakt validate --format json` actually run?**~~ **Answered —
  a PR job that builds.** `format.yml` landed on `pull_request:` and supplies the
  shape; every route pays a build, so there is no cleverness to find; and the
  build closes a second gap, since nothing builds the monorepo on a PR today.
  D13.
- ~~**Does `--only config` still mean anything useful?**~~ **Answered — yes, but
  it was the wrong question.** The issue is *which* config: three artifacts share
  the word, shape is already covered by the JSON Schema, and the uncovered half
  is resolution — which is load-bearing, because a failed plugin load degrades
  into dozens of misattributed `tag-undefined` findings. D1, with the theme
  artifacts moving out under D12.
- **Should `plan validate` be reachable from `refrakt validate --deep`?** D11
  keeps them siblings, which is right for scoping. It does mean a project with a
  plan directory needs two commands in CI. Acceptable, possibly worth a
  convenience wrapper later.

## References

- {% ref "SPEC-132" /%} — wired validation to content; its milestone deferred the `refrakt validate` rename to here
- {% ref "WORK-554" /%} — measured that an error-severity diagnostic fails nothing, and that the dev server prints nothing at all
- {% ref "WORK-573" /%} — the exit-code and dev-visibility work this spec re-homes and splits
- {% ref "WORK-559" /%} — the per-site / per-error-id disable this spec reuses rather than duplicating
- {% ref "SPEC-126" /%} — guards that nothing runs; this is its third instance in this repository
- {% ref "SPEC-134" /%} — review markers, the advisory category D10 accommodates
- {% ref "SPEC-131" /%} — the branch whose ID collisions produced the duplicate-ID half of this spec
- `packages/cli/src/commands/validate.ts` — the `baseConfig` default
- `packages/cli/src/bin.ts` — the reserved-but-ignored `--site`
- `packages/content/src/format.ts` — `formatPipelineSummary`, where `errorCount` is computed and dropped
- `packages/sveltekit/src/plugin.ts` — the `isBuild` guard
- `plugins/plan/src/scanner-core.ts` — `extractRefs`, the reference index a renumber would reuse
- `plugins/plan/src/commands/migrate.ts` — the migration family `migrate ids` joins

{% /spec %}
