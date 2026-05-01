{% decision id="ADR-010" status="proposed" date="2026-05-01" tags="config, cli, plugins, plan, mcp" source="SPEC-043" %}

# Unified root-level refrakt config

## Context

Refrakt's CLI surface is growing in three directions that all want answers from a single source of truth, and we don't have one yet.

**Plugin discovery.** {% ref "SPEC-043" /%} introduces an MCP server that needs to enumerate installed plugins at startup. The current CLI does this lazily — `runPlugin(namespace, args)` in `packages/cli/src/bin.ts` only attempts to import `@refrakt-md/<namespace>/cli-plugin` when the user types that namespace. There is no existing list. The natural fallback is scanning `package.json` for `@refrakt-md/*` dependencies, but that is heuristic: it can't tell a real plugin from a transitive dep, can't distinguish runes-only packages from CLI-extending ones, and forces every consumer (CLI dispatch, `--help`, MCP) to repeat the same scan.

**Path scattering.** Plan paths (`--dir`, `--specs`, `--out`, `--css`), site paths (`contentDir`), and theme paths are spread across CLI flags and ad-hoc defaults. A plan-only repo with files in `project/plan/` instead of the default `plan/` has to pass `--dir project/plan` to every command. There is no place to record "in this repo, plan lives here."

**Two lifecycles, one repo.** The current `site/refrakt.config.json` is site-shaped — `contentDir`, `theme`, `target`, `packages`, `routeRules`, `icons`. It assumes every refrakt user is building a SvelteKit site. Planning-only repos use `@refrakt-md/plan` with zero config, autodetecting `plan/`. Repos that want both end up with a site config plus implicit plan conventions, neither aware of the other.

The MCP spec's auto-detection + `discoverPlugins()` proposal mitigates these in the short term but doesn't resolve them — autodetection is heuristic, and the helper still has to scan dependencies because there is no declared list.

## Options Considered

### 1. Status quo — autodetection plus `package.json` scanning

Keep `refrakt.config.json` as a site-only file. MCP and `discoverPlugins()` scan `package.json` for `@refrakt-md/*` deps and attempt to load each one's `cli-plugin`.

**Pros:**
- Zero migration cost.
- Planning-only users stay zero-config.
- Already specified in SPEC-043.

**Cons:**
- Plugin list is heuristic — transitive deps and non-CLI packages can show up; opting out requires per-package metadata.
- Path overrides stay scattered across CLI flags forever.
- No single answer to "what is this refrakt project?" for tooling.
- The MCP server's "did you mean?" suggestions are only as good as the heuristic.

### 2. New root config alongside the site config

Add a fresh root file (`refrakt.json` or similar) that holds plugins/plan/site references. Leave `site/refrakt.config.json` alone.

**Pros:**
- Site config semantics are untouched.
- Clean separation between "project config" and "site config."

**Cons:**
- Two config files where there could be one. Authors have to learn which knob lives where.
- The existing `packages` field in the site config is conceptually a plugin reference too — duplicating it across files is worse than unifying.
- Naming collision risk (`refrakt.json` vs `refrakt.config.json` is a foot-gun).

### 3. Expand `refrakt.config.json` into a unified root config — **chosen**

Promote `refrakt.config.json` to be the project-level config, with explicit `plugins`, `plan`, and `site` sections. Keep the file optional so autodetection remains the fallback for zero-config repos. The current flat shape (`contentDir`, `theme`, `target`, `packages`, …) continues to work but is treated as shorthand for the `site.*` namespace.

**Proposed shape:**

```json
{
  "plugins": [
    "@refrakt-md/plan",
    "@refrakt-md/marketing",
    "@refrakt-md/docs"
  ],
  "plan": {
    "dir": "plan",
    "specsDir": "plan/specs"
  },
  "site": {
    "contentDir": "./content",
    "theme": "@refrakt-md/lumina",
    "target": "svelte",
    "packages": ["@refrakt-md/marketing", "@refrakt-md/docs"],
    "routeRules": [/* … */],
    "icons": {/* … */}
  }
}
```

**Resolution rules:**

- File absent → autodetect everything (current behavior preserved for planning-only repos).
- File present, only `plan` section → behaves like a planning-only project; site tools are unavailable.
- File present, only `site` section (or flat shorthand) → behaves like today's site config.
- File present, both → both contexts active; MCP exposes both tool groups.
- `plugins` is the canonical plugin list. If absent, fall back to scanning dependencies as today. If present, it is authoritative — the scanner does not look at `package.json`.
- `site.packages` and the top-level `plugins` array overlap intentionally: `site.packages` controls which rune packages are merged into the site's `ThemeConfig` (a SvelteKit-plugin concern); `plugins` controls which packages contribute CLI commands and MCP tools. Most users will list a package in both, but the split lets a CLI-only plugin (no runes) skip site merging.

**Pros:**
- One file, one mental model. "Where do I tell refrakt about my plan?" has one answer.
- Plugin discovery becomes "read the array" for projects that opt in, eliminating heuristic ambiguity.
- Path overrides have a home — no more `--dir` on every plan invocation.
- Backwards compatible via the flat-shape shorthand; no forced migration for existing sites.
- Sets up future sections (`docs`, `editor`, etc.) without further format churn.

**Cons:**
- Slight config tax for repos that want explicit control (mitigated: file is optional).
- Two ways to write site config (flat vs nested under `site.*`) during the transition window.
- The dual `plugins` / `site.packages` distinction needs documentation.

### 4. Autodetection-only, no config at all

Remove `refrakt.config.json` and infer everything from `package.json` and directory structure.

**Pros:**
- Maximum zero-config charm.

**Cons:**
- Site config is genuinely too rich to autodetect (`routeRules`, `icons`, `backgrounds`).
- No place for explicit overrides.
- Doesn't solve plugin discovery — same heuristic problem.

## Decision

Adopt option 3. `refrakt.config.json` becomes the unified root config with optional `plugins`, `plan`, and `site` sections. The file remains optional. The current flat site shape continues to be valid as shorthand for `site.*`, so existing projects keep working without changes.

## Consequences

**For SPEC-043 (MCP server):**

- `discoverPlugins()` reads `config.plugins` first and only falls back to dependency scanning when the field is absent.
- Autodetection still applies when no config exists, but consults the config when one is present (e.g., `plan.dir` overrides the default `plan/` lookup; `site.contentDir` confirms a site context without sniffing the file system).
- `refrakt://detect` reports both the detected context and the config source (`config-file` vs `autodetect`) so the agent knows whether values are explicit or inferred.

**For the CLI:**

- `loadRefraktConfigFile()` in `packages/cli/src/config-file.ts` gains a normalization layer that accepts both the flat shape and the new nested shape and returns a normalized `RefraktConfig` object with `plugins`, `plan`, and `site` always populated (with autodetected or default values when not declared).
- `RefraktConfig` in `packages/types` grows the `plugins`, `plan`, and `site` fields. The flat fields stay on the type for backwards compatibility but are marked deprecated in JSDoc and documented as shorthand.
- `refrakt plugins list` (proposed in SPEC-043) shows the resolution source per plugin — `from refrakt.config.json` vs `discovered in package.json`.

**For users:**

- Existing site users: zero changes required. Their flat config keeps working.
- Existing planning-only users: zero changes required. Autodetection still runs.
- New users wanting both contexts in one repo: one file declares everything.
- Users wanting explicit plugin control: list packages under `plugins` and the heuristic scan is bypassed.

**For migration:**

- A `refrakt config migrate` command (small follow-up work item, not part of this ADR) can rewrite a flat site config into the nested shape on demand. Not required — the flat shape stays valid indefinitely.
- The SvelteKit plugin's `loadContent()` reads from `site.*` (preferring nested, falling back to flat) so the runtime contract is unchanged.

**Open follow-up:**

- A separate spec should formalize the config schema (TypeScript interface, JSON Schema for editor tooling, validation rules). This ADR records the decision; the spec records the shape in detail.
- SPEC-043's "Plugin Discovery" section should be updated after this ADR is accepted to reference `config.plugins` as the primary source, with dependency scanning as fallback.

{% /decision %}
