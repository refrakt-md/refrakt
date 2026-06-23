{% spec id="SPEC-116" status="draft" tags="create-refrakt,scaffolding,distribution,plugins,templates,presets,dx" %}

# Authoring scaffolds for distributable extensions

v0.25.0 makes refrakt's stack distributable — site templates ({% ref "SPEC-109" /%}), preset packs
({% ref "SPEC-111" /%}), and the install surface that resolves them ({% ref "SPEC-110" /%}) — and
sets a versioning/compatibility policy for the things people publish ({% ref "ADR-023" /%}). But
all of that is **consume**-side. The one tool that produces a refrakt package, `create-refrakt`,
only scaffolds `site`, `theme`, and `plan` (`--type <site|theme|plan>` in
`packages/create-refrakt/src/bin.ts`). There is **no on-ramp to author** the new distributables —
a **plugin** (custom runes), a **template package**, or a **preset pack** — even though
{% ref "ADR-023" /%} explicitly assumes "the scaffold and authoring docs prescribe `peerDependencies`."

So an ecosystem author has to hand-assemble a package's `package.json` exports, its manifest
(`template.json` / `presets.json` / a `Plugin` export), and — critically — the **`peerDependencies`
ranges and the `refrakt` compatibility range** that {% ref "ADR-023" /%} requires. Getting those
wrong is exactly the failure mode ADR-023 exists to prevent (exact-pinned deps that double-install
and break type identity). This spec gives each distributable a `create-refrakt` authoring scaffold
that emits a correct, ADR-023-compliant skeleton.

## Problem evidence

- **`create-refrakt` produces only consumers.** `--type` accepts `site`, `theme`, `plan`
  (`bin.ts`); `scaffold.ts` exports `scaffoldTheme`/`scaffoldPlan`/site scaffolding. There is no
  `scaffoldPlugin`, `scaffoldTemplate`, or `scaffoldPresetPack`.
- **The new distributable formats have no generator.** {% ref "SPEC-109" /%} defines `template.json`
  + `content/`; {% ref "SPEC-111" /%} defines `presets.json` + preset modules; plugins implement
  `Plugin` (`packages/types/src/package.ts`). All are authored by hand today.
- **ADR-023 references scaffolds that don't exist.** Its peerDeps/compat-range conventions are
  meant to be *embodied* by the scaffold so authors get them for free; without the scaffold, the
  policy is documentation an author must remember to follow.

## Design

### 1. Extend `--type` with the distributable kinds

`create-refrakt --type <site | theme | plan | plugin | template | preset-pack>`. The three new
kinds each emit a publishable package skeleton (name/scope handling reuses the existing `--scope`
plumbing that `theme` already uses). `site` remains the default; existing behaviour is unchanged.

### 2. Each scaffold emits the correct format + a working starter

- **`plugin`** — a package implementing `Plugin`: a `runes/` dir with one example rune
  (`createContentModelSchema` + `createComponentRenderable`), its `theme.runes` config entry, a
  fixture, and the `package.json` wiring (exports, `cli-plugin` entry stub if relevant). The
  example rune builds and renders under the identity transform out of the box.
- **`template`** — a `template.json` (`kind: "site"`, metadata, a `site` `SiteConfig` partial, and a
  `refrakt` range) + a small `content/` tree (+ optional `sandboxes/`), wired to a recommended
  theme and any required plugins via `site.theme`/`site.plugins`. Mirrors the in-repo reference
  template ({% ref "SPEC-109" /%} §6).
- **`preset-pack`** — a `presets.json` (with a `refrakt` range + one example preset entry: `id`,
  `title`, `scope`, `module`) + a `src/<preset>.ts` exporting a `ThemeTokensConfig`. Scaffolds a
  `syntax`-scoped example by default (universal, the safest starting point).

### 3. ADR-023 compliance is baked in, not documented

Every scaffolded extension package ships:

- `@refrakt-md/*` build-time deps declared as **`peerDependencies` with a minor range** (e.g.
  `">=0.25 <0.26"`), never exact ordinary deps — so the package resolves against the consuming
  site's refrakt ({% ref "ADR-023" /%} §1).
- A **`refrakt` compatibility range** in its manifest (`template.json`/`presets.json`/
  `ThemeManifest`), matching the peer range ({% ref "ADR-023" /%} §2).
- The range pinned to the **current** refrakt version at scaffold time (single source: the
  `create-refrakt` package's own version, mirroring how the site scaffold already derives versions).

This is where ADR-023's conventions become real: the author starts compliant instead of being
asked to remember the policy.

### 4. Authoring affordances

- A **build** script and a **manifest-validate** script (the validation from {% ref "SPEC-110" /%}
  §5 / {% ref "SPEC-111" /%} §4, runnable locally and in CI).
- For `template`, the **scaffold-build CI hook** ({% ref "SPEC-109" /%} §3) so the author catches
  rune-syntax drift in their own template.
- An `AGENTS.md`/README seeded with the format's authoring guide pointer, consistent with the site
  scaffold's existing AGENTS.md behaviour (RELEASING.md).

## Non-goals

- **No publish/registry flow.** The scaffold produces a package skeleton; publishing it (npm,
  private registry) is the author's normal package-manager step. Consuming/installing it is
  {% ref "SPEC-110" /%}.
- **No new distributable formats.** The formats are defined by {% ref "SPEC-109" /%} /
  {% ref "SPEC-111" /%} / `Plugin`; this spec only *generates* them.
- **`--type theme` is realigned, not just re-wired.** It already exists, but it emits a
  Svelte-coupled theme (a `svelte/` folder, `SvelteTheme` export, `target: 'svelte'`) that
  doesn't match the framework-agnostic reference theme (Lumina). This spec adds the three missing
  kinds, the ADR-023 peerDeps/compat wiring (which `theme` also adopts), and the
  {% ref "ADR-024" /%} realignment: `--type theme` defaults to a **framework-agnostic** theme, with
  the framework component layer opt-in via `--target`.
- **No MCP surface.** The scaffolds stay CLI-only. `@refrakt-md/mcp` deliberately wraps only the
  *read/introspection* surface (`inspect`, `plugins_list`, `reference`, `contracts`, `detect`,
  `plan.*`) and excludes one-shot, interactive, filesystem-mutating commands — `refrakt write`,
  `refrakt edit`, `plan serve`/`build`. Scaffolding a package skeleton is the same category and
  belongs with them, not in MCP. (The *read* surfaces other v0.25.0 specs add — listing
  distributables, manifest validation — are a separate, legitimate MCP-parity question, out of
  scope here.)

## Acceptance Criteria

- [ ] `create-refrakt --type plugin|template|preset-pack` scaffolds a publishable package skeleton for each, alongside the existing `site|theme|plan`; `site` stays the default.
- [ ] The `plugin` scaffold emits a `Plugin` package with one example rune that builds and renders under the identity transform; `template` emits a `template.json` (`kind: "site"` + `site` SiteConfig + `refrakt` range) and a `content/` tree; `preset-pack` emits a `presets.json` + an example `syntax`-scoped `ThemeTokensConfig` module.
- [ ] Every scaffolded extension declares `@refrakt-md/*` as `peerDependencies` with a minor range and a matching `refrakt` compatibility range in its manifest, pinned to the scaffolding `create-refrakt` version ({% ref "ADR-023" /%}); no exact ordinary deps on `@refrakt-md/*`.
- [ ] Each scaffold includes build + manifest-validate scripts; the `template` scaffold includes the {% ref "SPEC-109" /%} scaffold-build CI hook.
- [ ] `--type theme` is updated to the same peerDeps/compat-range convention, and defaults to a **framework-agnostic** theme per {% ref "ADR-024" /%} — mirroring the reference theme (tokens + `./transform` config + `./layouts` configs + manifest + per-rune CSS + `css-coverage` test), with no `svelte/`, `SvelteTheme`, or `target`; a `--target <framework>` flag opts into the framework component layer (adds `svelte/`, the `./svelte` export, and framework layout components).
- [ ] Authoring docs cover producing each distributable via the scaffold.

## References

- Scaffolder + CLI surface: `packages/create-refrakt/src/scaffold.ts`
  (`scaffoldTheme`, `scaffoldPlan`), `packages/create-refrakt/src/bin.ts` (`--type`, `--scope`).
- Distributable formats: {% ref "SPEC-109" /%} (`template.json`), {% ref "SPEC-111" /%}
  (`presets.json`), `Plugin` in `packages/types/src/package.ts`.
- Versioning/compat conventions the scaffold embodies: {% ref "ADR-023" /%}.
- Install/validation of the produced packages: {% ref "SPEC-110" /%}.
- AGENTS.md generation precedent: `RELEASING.md`.

{% /spec %}
