{% spec id="SPEC-115" status="draft" version="0.1" tags="mcp,migration,changelog,validation,dx" %}

# AI-assisted migration via MCP: bundled changelog, generic content validation, and repo migration scanner

Make upgrading a refrakt project across versions a task an AI agent can drive end-to-end, using only what ships inside the installed packages — no need to clone the refrakt repo or scrape the docs site. Three layers: a machine-readable changelog bundled into the package and exposed over MCP, a generic content validator that checks a user's `.md` and config against the live schemas, and a migration scanner that combines the two to report (and ultimately apply) concrete per-file edits.

-----

## Problem

Upgrading a refrakt project today is only smooth if you happen to have the refrakt monorepo checked out next to your project, so an agent can read the full changelog and diff schemas directly. That was the originating observation: the migration "goes smoothly because I have both that repo and the refrakt repo checked out locally so Claude can just read through the whole changelog and figure out what needs to update."

Every other user is stuck. To get the same help they would have to open the docs site, copy the rendered changelog as HTML, and paste it into their agent — losing structure, version boundaries, and any link to codemods. The agent then has no way to check its work against the actual schemas the installed version ships, because nothing in the installed packages exposes "what changed" or "is this content still valid."

Meanwhile the raw materials already exist in the repo, just not in a form a consumer can reach:

- **The changelog is aggregated at release time but only into site content.** `scripts/generate-changelog.mjs` collects every `packages/*/CHANGELOG.md` and `plugins/*/CHANGELOG.md` (Changesets format, fixed mode) and writes a single rendered `site/content/releases.md`. Nothing machine-readable is emitted, and nothing is bundled into the published packages.
- **The MCP server already knows the installed version.** `@refrakt-md/mcp` is installed in the user's project pinned to the same version as their `@refrakt-md/cli`, and reads its own version via `readPackageVersion()` (`packages/mcp/src/server.ts:145`). A newer package's `CHANGELOG.md` contains the *entire cumulative history* back to the start — so the version a user upgrades *to* already carries every entry they need to migrate *from* an older version.
- **Content validation exists but is not exposed.** `packages/language-server/src/parser/markdoc.ts` wraps `Markdoc.validate()` against the live rune tag/node config, but it is used only by the language server and fixture-corpus tests. The CLI `refrakt validate` command validates *theme config and manifest JSON only* (`packages/cli/src/commands/validate.ts`) — never `.md` content.
- **Deprecation handling is partial and silent to consumers.** Rune schemas can declare attribute deprecations (`deprecations: { oldName: { newName, transform } }`, e.g. `packages/runes/src/tags/grid.ts`), and the engine emits `console.warn` for things like `elevation` aliases (`packages/transform/src/engine.ts`). There is no way to mark a *rune* as deprecated, and the warnings vanish into stderr rather than being collected and reported.
- **Codemods are ad hoc.** `refrakt migrate elevation` is the only content codemod and is hard-coded; `refrakt config migrate` handles the config-shape migration (ADR-010). There is no registry tying "this breaking change" to "this codemod command."

The result: the data needed for a clean AI-assisted upgrade is scattered across CHANGELOG files, schema deprecation maps, and codemod commands, none of it reachable from a consumer's installed packages. This spec closes that gap.

-----

## Goals & Non-Goals

**Goals**

- An agent working in a freshly upgraded project can ask refrakt — over MCP *or* the CLI — "what changed since version X" and get structured, version-bounded entries with breaking changes called out and codemods linked — entirely offline.
- An agent can validate the project's `.md` content and `refrakt.config.json` against the installed version's schemas and get a structured list of errors, unknown runes, invalid attributes, and deprecated usage with the replacement.
- An agent can run a single "scan this repo for migration work" operation that combines the two and returns concrete, per-file findings it can act on.
- Everything works from the installed packages alone; nothing depends on network access, the docs site, or a checkout of the refrakt repo.

**Non-Goals**

- Automatically *applying* every migration without review. Auto-fix (`--fix`) is in scope for mechanical, schema-backed transforms (deprecated attribute renames, config-shape migration); judgement-heavy edits remain agent/human-driven.
- Prose-level or visual diffing of rendered output. This spec is about schema- and changelog-level migration, not output comparison.
- A general-purpose linter for content style. Validation is scoped to *correctness against the installed schemas* and *deprecation*, not opinions.
- Replacing the docs-site changelog. `releases.md` stays; the structured artifact is generated alongside it from the same source.

-----

## Design Principles

**The installed package is the source of truth.** A consumer's agent should never need to fetch anything. The version they upgraded to carries the full cumulative changelog, the live schemas, and the deprecation maps. Bundling, not fetching, is the rule — it is offline, version-accurate by construction, and immune to the docs site drifting from a given release.

**Structured first, rendered second.** The changelog artifact is JSON with explicit version boundaries, change kinds, and codemod references. Human-readable rendering is derived from it, not the other way around. An agent filtering "breaking changes between 0.11 and 0.24" should never have to parse Markdown prose to do it.

**Validation reuses the live schemas, never a copy.** The validator runs `Markdoc.validate()` against the same tag/node config the transform pipeline uses. There is no second schema to keep in sync — if a rune's attributes change, validation tracks it automatically because it reads the same definitions.

**The scanner orchestrates; it does not re-implement.** The migration scanner is a thin coordinator over the generic validator, the changelog/migration-guide data, the existing attribute-deprecation transforms, and the config migrator. Its job is to point at the right primitives and aggregate findings, not to encode migration logic of its own.

**Every query capability is a CLI command first; MCP wraps it.** Agents fall back to the CLI when MCP is unavailable, so no migration capability may be MCP-only. Each read/query surface (changelog, migration guide, content validation, scan) is implemented as a CLI command with a `--json` mode, and the corresponding MCP tool shells out to it. This guarantees a single source of behaviour, keeps the two surfaces from drifting, and makes the whole feature usable in MCP-less environments.

**Mechanical fixes are owned by the tool; judgement is owned by the agent.** Anything the schema can transform deterministically (a renamed attribute with a `transform` handler, a config-shape bump) the tool can apply. Anything requiring interpretation is reported with enough context for the agent to act, never silently rewritten.

-----

## Architecture Overview

Four components, layered so each depends only on the ones below it:

```
                 ┌─────────────────────────────────────────────┐
   Layer 4       │  refrakt.migrate_scan  (MCP tool + CLI)      │
   Scanner       │  orchestrates 1–3 over the user's repo       │
                 └───────────────┬─────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
 ┌───────▼────────┐   ┌──────────▼─────────┐   ┌──────────▼─────────┐
 │ Layer 2        │   │ Layer 3            │   │ existing primitives │
 │ Content        │   │ Changelog +        │   │ - attr deprecations │
 │ validator      │   │ migration guide    │   │ - config migrate    │
 │ (Markdoc.      │   │ over MCP           │   │ - migrate <codemod> │
 │  validate)     │   │                    │   │                     │
 └───────┬────────┘   └──────────┬─────────┘   └─────────────────────┘
         │                       │
         │            ┌──────────▼─────────────────────────────┐
         │  Layer 1   │ changelog.json bundled in the package  │
         │  Artifact  │ (generated at release from CHANGELOGs) │
         │            └────────────────────────────────────────┘
   live rune tag/node config (shared with the transform pipeline)
```

The pieces are independently useful (the validator is valuable on its own; the changelog tool is valuable on its own) but compose into the full migration story at Layer 4.

-----

## Layer 1 — Bundled, machine-readable changelog

### Artifact

Extend `scripts/generate-changelog.mjs` — which already runs during `npm run version-packages` and already parses every per-package CHANGELOG — to additionally emit a structured `changelog.json`:

```typescript
interface ChangelogArtifact {
  generatedAt: string;            // ISO timestamp
  latest: string;                 // version this artifact ships with
  releases: ChangelogRelease[];   // sorted semver descending
}

interface ChangelogRelease {
  version: string;                // "0.24.0"
  date?: string;                  // when present in the source heading
  changes: ChangelogChange[];
}

interface ChangelogChange {
  kind: 'breaking' | 'minor' | 'patch';
  summary: string;                // single-line, the bold lead-in where present
  detail?: string;                // remaining prose
  packages?: string[];            // which packages the entry came from
  spec?: string;                  // referenced SPEC/ADR id, when parseable ("SPEC-086")
  codemod?: CodemodRef;           // when the entry references a migration command
}

interface CodemodRef {
  command: string;                // e.g. "refrakt migrate elevation" or "refrakt config migrate --apply"
  description?: string;
}
```

Change-kind classification reuses what the generator already distinguishes (Changesets `### Major/Minor/Patch Changes` sections map to `breaking`/`minor`/`patch`). Codemod detection is a heuristic over the entry text (the Changesets entries already say things like "Run the codemod to migrate…"); where the heuristic can't extract a command, `codemod` is simply absent — the prose is still in `detail`.

### Bundling

The artifact must live in a package the MCP server can read at runtime without extra dependencies. The MCP server already depends on `@refrakt-md/cli`, `@refrakt-md/runes`, and `@refrakt-md/transform`. **Decision needed at breakdown time** (see Open Questions): ship `changelog.json` from `@refrakt-md/cli` (natural home — it owns the migration commands) or from `@refrakt-md/mcp` itself. Either way it is added to the package's `files` whitelist and written by the release script, so it is regenerated on every version bump and always describes exactly the version it ships with.

-----

## Layer 2 — Generic content validation

A reusable validator plus a CLI surface and an MCP tool, all built on the language server's existing `Markdoc.validate()` wrapper.

### Reusable module

Promote the validation logic out of `packages/language-server` into a place the CLI and MCP can both consume (the language server then re-exports it, so its behaviour is unchanged). It parses a `.md` string, validates the AST against the live tag/node config, and returns structured diagnostics:

```typescript
interface ContentDiagnostic {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning';
  code:
    | 'unknown-rune'
    | 'invalid-attribute'
    | 'missing-required-attribute'
    | 'invalid-attribute-value'
    | 'deprecated-attribute'
    | 'deprecated-rune'
    | 'malformed';
  message: string;
  rune?: string;
  attribute?: string;
  replacement?: string;           // for deprecated-* codes: the new name/value
  fixable: boolean;               // true when an attribute deprecation transform exists
}
```

Two enrichments over raw `Markdoc.validate()`:

1. **Deprecation surfacing.** Walk resolved rune attributes against each rune's `deprecations` map so deprecated-but-still-working attributes are reported as `deprecated-attribute` warnings with the `replacement` filled in — turning today's silent `console.warn` into structured, actionable output. Mark them `fixable: true` when a `transform` handler exists.
2. **Rune-level deprecation.** Today only attributes can be deprecated. Add an optional `deprecated?: { replacement?: string; removeIn?: string; note?: string }` field to the rune schema definition so an entire rune can be marked deprecated and surfaced as `deprecated-rune`. (Small schema addition; see Decisions.)

### CLI surface

Add a content mode to validation. Given the existing `refrakt validate` validates config/manifest, the cleanest shape is a subcommand or flag that targets content:

```bash
refrakt validate content [path]      # default path: the site's content dir from config
refrakt validate content --json      # structured ContentDiagnostic[] for tooling/agents
refrakt validate content --fix       # apply attribute-deprecation transforms in place
```

Batch over a directory, summarise errors/warnings, exit non-zero on errors (matching the config validator's behaviour). `--fix` applies only `fixable` diagnostics, using the same `deprecations.transform()` handlers the engine already runs at transform time, and reports what it changed.

### MCP tool

`refrakt.validate_content` wrapping the CLI (the established pattern — `invokeCli` in `packages/mcp/src/tools/core.ts`), with `{ path?, fix? }` input and `ContentDiagnostic[]` structured output.

-----

## Layer 3 — Changelog & migration guide over MCP

### Detection

Extend `refrakt.detect` / the `DetectionResult` (`packages/mcp/src/detect.ts`) to surface the installed refrakt version. The agent then knows the migration *target* automatically and only needs the *from* version (stated by the user, or detected — see Open Questions).

### CLI surface

The CLI command is the primitive; the MCP tools wrap it. Both read the same bundled artifact, so the two surfaces can never disagree.

```bash
refrakt changelog [--since <v>] [--until <v>] [--kind breaking] [--json]
refrakt migration-guide --from <v> [--to <v>] [--json]
```

`--json` emits the structured `ChangelogRelease[]` / migration-plan shapes below; without it the command renders a readable summary. Because the changelog ships inside `@refrakt-md/cli`, these work in any environment where the CLI works — no MCP client required. This matters as the fallback path: an agent in an MCP-less environment (CI, a bare shell, a misconfigured client) can still run the complete migration flow. There is precedent — `refrakt reference` exists explicitly for authors and AI agents with a `--json` mode.

### Tools

The MCP tools shell out to the CLI commands above via the established `invokeCli` pattern (`packages/mcp/src/tools/core.ts`):

- **`refrakt.changelog`** — input `{ since?, until?, kind? }`, wraps `refrakt changelog --json`, returns the filtered `ChangelogRelease[]`. `since`/`until` bound the version range; `kind` filters to e.g. `breaking`. No network.
- **`refrakt.migration_guide`** — input `{ from, to? }` (`to` defaults to installed version), wraps `refrakt migration-guide --json`. Returns an *ordered* migration plan: every breaking change between the two versions, oldest first, each with its prose and any `codemod` command to run. This is the agent's checklist for an upgrade.

### Resources

Mirroring the existing `refrakt://` resource pattern (`packages/mcp/src/resources.ts`), exposed when a site/config is detected:

- `refrakt://changelog` — the full bundled artifact.
- `refrakt://changelog/<version>` — a single release.

The existing config-shape migration guide (`site/content/docs/configuration/migration.md`) can also be referenced from `migration_guide` output where the config codemod applies.

-----

## Layer 4 — Repo migration scanner

The piece that turns passive data into action. A single operation an agent invokes after (or to plan) an upgrade.

### Behaviour

`refrakt.migrate_scan` (MCP) / `refrakt migrate scan` (CLI), input `{ from?, to? }`:

1. Resolve `from` (argument, or detected) and `to` (installed version).
2. Pull the ordered breaking changes between them from the Layer 1 artifact (via Layer 3's logic).
3. Run the Layer 2 content validator across the project's content dir, collecting `deprecated-*`, `unknown-rune`, and `invalid-attribute` diagnostics.
4. Run the config migrator in dry-run / check mode against `refrakt.config.json`.
5. Aggregate into a single structured report keyed by file, where each finding carries: what changed (changelog entry / diagnostic), where (file + line), whether it is auto-fixable, and the command or edit to resolve it.

```typescript
interface MigrationScanReport {
  from: string;
  to: string;
  breakingChanges: ChangelogChange[];          // version-range, ordered
  findings: MigrationFinding[];                 // per-file, actionable
  autoFixable: number;                          // count the tool can apply
  summary: string;                              // human-readable headline
}

interface MigrationFinding {
  file: string;
  line?: number;
  origin: 'validator' | 'changelog' | 'config';
  message: string;
  fixable: boolean;
  fix?: { kind: 'codemod' | 'attribute-rename' | 'config-migrate'; command?: string };
}
```

### Auto-fix

`--fix` (CLI) / `{ fix: true }` (MCP) applies the mechanical subset: attribute-deprecation transforms (Layer 2 `--fix`), the config-shape migration (`refrakt config migrate --apply`), and any registered codemods whose breaking change appears in range. Everything else is reported for the agent to handle, with the changelog prose as context. The division is the principle stated above: the tool owns deterministic, schema-backed edits; the agent owns judgement.

### Codemod registry (enabling work)

For the scanner to map a breaking change to a runnable fix, codemods need to be discoverable rather than hard-coded. Today `refrakt migrate <name>` knows only `elevation`. A registry — `{ name, appliesToVersions, description, run() }` entries the `migrate` command and the scanner both read — lets new codemods be added over time and lets the changelog artifact's `codemod` refs resolve to real, runnable commands. This is the connective tissue between Layers 1 and 4.

Two properties are load-bearing:

- **Codemods are self-contained and outlive the schema.** A codemod does its rewrite without consulting the live rune schema (the existing `elevation` codemod is a self-contained regex). This is what lets a codemod survive a major release that *removes* the deprecated functionality it migrates — see "Deprecation transform / codemod lifecycle" below.
- **The registry is cumulative.** Codemods are never deleted, only version-tagged via `appliesToVersions`. The newest package must be able to migrate from arbitrarily old versions, so it retains every codemod ever shipped. They are cheap (small functions), so retention is effectively free, and it is what makes "bundle in the installed package" deliver on "migrate from *any* older version."

### Deprecation transform / codemod lifecycle

A schema attribute-deprecation (`deprecations: { … transform }`) and a registered codemod are the **same migration logic at different stages of a deprecation's life**, not two unrelated mechanisms:

1. **While deprecated** — the logic lives as a `deprecations.transform` in the rune schema. The engine runs it live and automatically (old content keeps working, upgraded at transform time), and Layer 2's validator reports it as a `deprecated-attribute` warning carrying the `replacement`.
2. **At the major release that removes the alias** — the schema entry is deleted, so the live transform disappears. The same logic is **promoted into a standalone registered codemod**, keyed to the version range where migration became mandatory. Because codemods are self-contained, this one survives the removal and is still bundled by the new major.

The consequence for validation: once the alias is gone from the schema, the validator can no longer emit `deprecated-attribute` with a replacement — it now reports the old syntax as a hard `invalid-attribute` / `unknown-rune` error with no hint. That is correct (it precisely flags content that must change), but the *fix* now comes from the registry rather than the schema. The scanner joins the two — pairing the validator's error against the registered codemod whose `appliesToVersions` covers the jump — so the end-to-end migration flow keeps working across a major boundary precisely *because* the codemod was decoupled from the deprecation.

-----

## Open Questions

Resolve these during breakdown into work items / decisions; they don't block the spec's shape.

1. **Where does `changelog.json` ship — `@refrakt-md/cli` or `@refrakt-md/mcp`?** CLI owns the migration commands and is a dependency of MCP, which argues for CLI. MCP shipping it keeps the consumer surface self-contained. Likely CLI.

2. **How is the *from* version determined?** Options: (a) the user/agent states it; (b) detect it from the project — but the installed version *is* the target, so the "from" isn't directly recoverable from `node_modules`. A lightweight project marker (e.g. a `refraktVersion` field written into `refrakt.config.json` or a `.refrakt/` stamp on build) could record the last-built version. Worth a decision; the simplest first cut is "agent states from, tool defaults to defaulting to=installed."

3. **Rune-level deprecation schema shape.** Adding `deprecated?` to the rune definition is small, but where exactly (the `defineRune` catalog entry vs the plugin `PluginRune` shape vs the engine config) needs to be pinned so core and plugin runes share one mechanism.

4. **Codemod registry location and interface.** Does it live in `packages/cli`, or in `transform` so codemods can be schema-driven? How do plugins contribute codemods for their own runes (parallel to how they contribute CLI commands via `cli-plugin`)?

5. **Changelog classification fidelity.** Changesets `### Minor/Patch` sections don't always mean "non-breaking" in practice, and `### Major` is rare in 0.x. Should the generator trust the section heading, or also scan entry text for breaking-change markers? A misclassified breaking change is the worst failure mode for a migration tool.

6. **Granularity of the scanner's content pass on large sites.** Validating every `.md` on a big site may be slow as an interactive MCP call. Does the scanner need incremental / changed-files-only modes, or is a one-shot full pass acceptable for the first cut?

7. **Mechanics of promoting a deprecation transform into a codemod.** The lifecycle (Layer 4 → "Deprecation transform / codemod lifecycle") says the same logic moves from schema to registry at the removing major. Is that promotion manual (the author copies the transform into a registered codemod when deleting the deprecation), or can a deprecation declaration be authored once and *generate* both the live transform and the standalone codemod, so the two cannot diverge? The latter is more robust but needs the deprecation declaration to be expressible without a live-schema dependency.

-----

## Decisions

### 1. Bundle the changelog; never fetch it

A newer package's CHANGELOG contains the complete history, so the version a user upgrades to already carries everything needed to migrate from any older version. Bundling a generated `changelog.json` makes the migration story work offline, keeps it version-accurate by construction, and avoids any coupling to the docs site or npm being reachable. Fetching was explicitly rejected in the originating discussion.

### 2. Validation reuses the live `Markdoc.validate()` path, not a parallel schema

The language server already validates content against the real tag/node config. Promoting that into a shared module (rather than writing a new validator) guarantees validation can never drift from the schemas the transform pipeline actually uses — there is exactly one definition of what a rune accepts.

### 3. The scanner orchestrates existing primitives

The migration scanner is deliberately thin: it composes the changelog artifact, the content validator, the attribute-deprecation transforms, and the config migrator. It encodes no migration logic of its own beyond aggregation and ordering. This keeps the migration knowledge colocated with the things that already own it (rune schemas own their deprecations; the config command owns config migration) and avoids a second place to maintain.

### 4. Auto-fix is limited to deterministic, schema-backed transforms

The tool applies only what the schemas can transform unambiguously — deprecated-attribute renames with `transform` handlers, the config-shape migration, registered codemods. Judgement-heavy changes are reported with full changelog context for the agent, never rewritten silently. This matches the existing engine behaviour (deprecation `transform` handlers already run deterministically) and keeps the blast radius of `--fix` predictable.

### 5. CLI and MCP are dual surfaces; the CLI is the primitive

No migration capability is MCP-only. Agents routinely fall back to the CLI when an MCP client is missing or misconfigured, so every query surface — changelog, migration guide, content validation, scan — ships as a CLI command with a `--json` mode, and the MCP tool wraps it via `invokeCli`. Since the MCP tools already shell out to `@refrakt-md/cli` for almost everything, the CLI command is the cheaper, more fundamental unit to build, and there is precedent in `refrakt reference` (an agent-facing command with `--json`). This keeps a single source of behaviour and makes the full migration flow usable in CI and bare-shell environments.

### 6. A codemod registry replaces hard-coded codemods

`refrakt migrate` currently hard-codes `elevation`. A registry of codemods (name, applicable version range, runnable handler) is the connective tissue that lets the changelog artifact reference real commands and lets the scanner offer to run them. It also gives plugins a path to ship codemods for their own runes, paralleling how they ship CLI commands.

### 7. Codemods are self-contained, cumulative, and outlive the deprecations they replace

A codemod and a schema attribute-deprecation are the same migration logic at different stages: the deprecation runs live while the alias still exists; at the major release that removes the alias, the logic is promoted into a standalone registered codemod. For that to work, codemods must not depend on the live schema (so they survive the removal), and the registry must be cumulative — codemods are never deleted, only version-tagged — so the newest package can still migrate content authored against arbitrarily old versions. This is what keeps the migration flow working across major boundaries and is the reason a codemod cannot simply *be* a schema deprecation lookup. After removal, the validator downgrades the old syntax from a `deprecated-attribute` warning to a hard error; the scanner re-pairs that error with the registered codemod to keep the fix actionable.

{% /spec %}
