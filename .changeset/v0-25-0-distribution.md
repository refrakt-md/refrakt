---
"@refrakt-md/types": minor
"@refrakt-md/transform": minor
"@refrakt-md/cli": minor
"@refrakt-md/lumina": minor
"@refrakt-md/sveltekit": minor
"create-refrakt": minor
---

v0.25.0 — Distribution & onboarding

Make the refrakt stack distributable and cut the blank-page activation cost.

**Authoring scaffolds (`create-refrakt`).** New `--type plugin | theme | preset-pack | template` scaffolds, each ADR-023-compliant (`@refrakt-md/*` as `peerDependencies` with a minor range + matching devDeps + a `refrakt` compat range) and buildable on day one. Themes now scaffold **framework-agnostic by default** (ADR-024) — tokens + `./transform` + `./layouts` configs, no `svelte/` — with `--target svelte` opting into a component layer. The framework axis is `--framework`; `--template <name|dir>` composes a site template.

**Install robustness (`refrakt theme` / `refrakt template`).** A shared source resolver handles directories, `.tgz` tarballs (read up front, no dead-end), and registry packages with `--registry` passthrough. `--site` targets multi-site projects (with singular→plural migration). New `theme list`, `theme presets list|validate|install`, and `template install` (add-a-site). Post-install validation is framework-aware (`./transform` required, a framework export optional) and checks each distributable's `refrakt` compatibility range.

**Preset packs (SPEC-111).** Presets are a first-class distributable pack (`presets.json`) with `scope` (`syntax` | `palette`) and advisory `tunedFor` compatibility. A declarative **JSON carrier** (no build step) is the default, validated by a published token-contract **JSON Schema**. Lumina now also ships as a preset pack.

**Config.** Sandbox runtime directory renamed `sandbox.examplesDir` → `sandbox.dir` (ADR-022); the old name is still accepted with a deprecation warning. New `TemplateManifest` / `PresetPackManifest` types and a dependency-free `checkRefraktCompat` helper.

Authoring docs for all four distributable layers live under `extend/distributing/`.
