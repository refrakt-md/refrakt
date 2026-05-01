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

**Proposed shape (single site, common case):**

```json
{
  "plugins": [
    "@refrakt-md/plan",
    "@refrakt-md/marketing",
    "@refrakt-md/docs"
  ],
  "plan": {
    "dir": "plan"
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

**Proposed shape (multiple sites in one repo):**

```json
{
  "plugins": ["@refrakt-md/plan", "@refrakt-md/marketing"],
  "plan": { "dir": "plan" },
  "sites": {
    "main": {
      "contentDir": "./site/content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "packages": ["@refrakt-md/marketing"]
    },
    "blog": {
      "contentDir": "./blog/content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "packages": ["@refrakt-md/marketing"]
    }
  }
}
```

`site` (singular) and `sites` (plural map) are mutually exclusive. The loader normalizes both into a single internal `sites: Record<string, SiteConfig>` shape — `site` becomes `sites.default`. Downstream consumers (SvelteKit plugin, MCP server, CLI commands) only ever see the normalized form.

**Resolution rules:**

- File absent → autodetect everything (current behavior preserved for planning-only repos).
- File present, only `plan` section → behaves like a planning-only project; site tools are unavailable.
- File present, only `site` (or flat shorthand) → single-site project; normalizes to `sites.default`.
- File present, only `sites` → multi-site project; CLI and SvelteKit plugin require a site identifier (or pick the only entry when there is exactly one).
- File present, both `site` and `sites` → configuration error; loader rejects with a clear message.
- File present, plan + site(s) → both contexts active; MCP exposes both tool groups.
- `plugins` is the canonical plugin list. If absent, fall back to scanning dependencies as today. If present, it is authoritative — the scanner does not look at `package.json`.
- `site(s).*.packages` and the top-level `plugins` array overlap intentionally: `packages` per site controls which rune packages are merged into that site's `ThemeConfig` (a SvelteKit-plugin concern); `plugins` controls which packages contribute CLI commands and MCP tools. Most users will list a package in both, but the split lets a CLI-only plugin (no runes) skip site merging, and lets two sites in the same repo merge different package subsets.

**Pros:**
- One file, one mental model. "Where do I tell refrakt about my plan?" has one answer.
- Plugin discovery becomes "read the array" for projects that opt in, eliminating heuristic ambiguity.
- Path overrides have a home — no more `--dir` on every plan invocation.
- Multi-site monorepos (docs + marketing, project + plan dashboard, multi-tenant) get a first-class story instead of needing separate repos or out-of-band orchestration.
- Backwards compatible via the flat-shape shorthand; no forced migration for existing sites.
- Sets up future sections (`docs`, `editor`, etc.) without further format churn.

**Cons:**
- Slight config tax for repos that want explicit control (mitigated: file is optional).
- Three ways to write site config (flat / `site` singular / `sites` plural) during the transition window — all collapse to the same normalized shape internally.
- The dual `plugins` / `site(s).packages` distinction needs documentation.
- Multi-site repos require a `--site <name>` flag on site-targeted CLI commands and a way for the SvelteKit plugin to be told which site it is building.

### 4. Autodetection-only, no config at all

Remove `refrakt.config.json` and infer everything from `package.json` and directory structure.

**Pros:**
- Maximum zero-config charm.

**Cons:**
- Site config is genuinely too rich to autodetect (`routeRules`, `icons`, `backgrounds`).
- No place for explicit overrides.
- Doesn't solve plugin discovery — same heuristic problem.

## Decision

Adopt option 3. `refrakt.config.json` becomes the unified root config with optional `plugins`, `plan`, and `site`/`sites` sections. The file remains optional. The current flat site shape and the new singular `site` form are both valid shorthands for `sites.default`; multi-site repos use the `sites` map. Existing projects keep working without changes.

## Consequences

**For SPEC-043 (MCP server):**

- `discoverPlugins()` reads `config.plugins` first and only falls back to dependency scanning when the field is absent.
- Autodetection still applies when no config exists, but consults the config when one is present (e.g., `plan.dir` overrides the default `plan/` lookup; declared sites confirm site context without sniffing the file system).
- `refrakt://detect` reports detected context, config source (`config-file` vs `autodetect`), and the list of sites (with names) so the agent knows whether the project is single- or multi-site.
- Site-scoped MCP tools (`refrakt.inspect`, `refrakt.contracts`, `refrakt.validate`) accept an optional `site` input. When the project has exactly one site, the field is optional; when there are multiple, it is required and the tool's input schema reflects that.

**For the CLI:**

- `loadRefraktConfigFile()` in `packages/cli/src/config-file.ts` gains a normalization layer that accepts the flat, singular-`site`, and plural-`sites` shapes and returns a normalized `RefraktConfig` with `plugins`, `plan`, and `sites: Record<string, SiteConfig>` always populated.
- `RefraktConfig` in `packages/types` grows the `plugins`, `plan`, `site`, and `sites` fields. The flat fields and singular `site` stay on the type for backwards compatibility but are marked deprecated in JSDoc as shorthand for `sites.default`.
- Site-targeted commands (`inspect`, `contracts`, `validate`, etc.) gain a `--site <name>` flag. When the project has exactly one site, the flag is optional and the lone site is selected automatically; when multiple sites are declared and no flag is passed, the command errors with the available names.
- `refrakt plugins list` (proposed in SPEC-043) shows the resolution source per plugin — `from refrakt.config.json` vs `discovered in package.json`.

**For the SvelteKit plugin:**

- The plugin accepts a `site` option naming which entry from the config to build. When omitted, it errors at config-load time for multi-site repos and selects the lone site for single-site repos.
- A monorepo wiring two SvelteKit apps to the same `refrakt.config.json` passes a different `site` name in each app's `vite.config.ts`. Content roots, themes, and package merges resolve from the chosen site's section.

**For users:**

- Existing site users: zero changes required. Their flat config keeps working.
- Existing planning-only users: zero changes required. Autodetection still runs.
- New users wanting both contexts in one repo: one file declares everything.
- Users wanting explicit plugin control: list packages under `plugins` and the heuristic scan is bypassed.
- Multi-site monorepos: declare each site under `sites.<name>` and pick the right one per app or per CLI invocation.

**For migration:**

- A `refrakt config migrate` command (small follow-up work item, not part of this ADR) can rewrite a flat site config into the nested shape on demand, and convert a singular `site` into `sites.default` when adding a second site. Not required — the flat and singular shapes stay valid indefinitely.
- The SvelteKit plugin's `loadContent()` reads from the normalized `sites[name]` entry so the runtime contract is unchanged for single-site users (they hit `sites.default` transparently).

**Open follow-up:**

- A separate spec should formalize the config schema (TypeScript interface, JSON Schema for editor tooling, validation rules, multi-site selection semantics). This ADR records the decision; the spec records the shape in detail.
- SPEC-043's "Plugin Discovery" section should be updated after this ADR is accepted to reference `config.plugins` as the primary source, with dependency scanning as fallback. The MCP tool input schemas for site-scoped tools should also be updated to include the `site` parameter for multi-site repos.

{% /decision %}
