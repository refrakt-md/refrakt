---
title: Distributing extensions
description: Author and publish plugins, themes, templates, and preset packs
---

# Distributing extensions

refrakt's stack is built from four distributable layers. Each is a normal npm
package you scaffold with `create-refrakt --type <kind>` and publish however you
like — there is no registry or catalog to opt into.

| Layer | What it is | `--type` | Distribution |
|-------|------------|----------|--------------|
| **Plugin** | Custom runes (vocabulary) | `plugin` | live dependency |
| **Theme** | Tokens, CSS, transform config (look) | `theme` | live dependency |
| **Preset pack** | Token-override presets (data) | `preset-pack` | live dependency |
| **Template** | A purpose-built site (content + wiring) | `template` | scaffold-copied |

```bash
npx create-refrakt my-plugin   --type plugin   --scope @acme
npx create-refrakt my-theme    --type theme                 # framework-agnostic
npx create-refrakt my-presets  --type preset-pack
npx create-refrakt my-template --type template --scope @acme
```

## Versioning & compatibility (ADR-023)

Every scaffold bakes in the compatibility convention so you start correct:

- `@refrakt-md/*` are declared as **`peerDependencies`** with a minor range
  (e.g. `">=0.25 <0.26"`), never exact ordinary deps — so your extension
  resolves against the **consuming site's** refrakt, with no duplicate install
  and no broken type identity.
- The same scaffold seeds matching **`devDependencies`** so your package still
  builds in isolation (`npm install && npm run build`).
- Manifests (`template.json`, `presets.json`, a theme's `manifest.json`) carry a
  **`refrakt`** range, validated at install — a mismatch fails with a clear
  message rather than a build crash.

## Installing extensions

| Kind | Command | Effect |
|------|---------|--------|
| Theme | `refrakt theme install <src> [--site]` | add dependency, point the site's `theme` |
| Preset pack | `refrakt theme presets install <src> [--use <id>]` | add dependency, optionally append to `theme.presets` |
| Template | `create-refrakt <name> --template <src>` | **copy** content + wire the site |

`<src>` may be a directory, a `.tgz` tarball, or a registry package name; theme
and preset-pack installs honour `--registry <url>` and your package manager's
`.npmrc`. refrakt stores no credentials.

See the per-layer guides: [templates](/extend/distributing/templates) ·
[preset packs](/extend/distributing/preset-packs) ·
[themes](/extend/theme-authoring/overview) ·
[plugins](/extend/plugin-authoring/authoring).
