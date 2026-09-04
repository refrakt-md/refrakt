---
title: Theme Tools
description: CLI commands for generating contracts, scaffolding CSS, validating configs, and managing themes
---

# Theme Tools

Commands for theme development and management: generating structure contracts, scaffolding CSS files, validating theme configuration, and installing themes.

## refrakt contracts

Generates a JSON document describing all BEM selectors, data attributes, and HTML structure the identity transform produces — derived purely from your theme config, no engine execution needed.

### Generate contracts

```shell
# Print to stdout (core runes only)
refrakt contracts

# Write to file (core runes only)
refrakt contracts -o contracts/structures.json

# Include plugins from refrakt.config.json
refrakt contracts -o contracts/structures.json --config .
```

The output includes, for every rune:

- **root** — the root BEM selector (e.g., `.rf-hint`)
- **modifiers** — modifier class patterns, data attributes, sources, and defaults
- **elements** — injected structural elements with their selectors and conditions
- **inlineStyles** — CSS custom properties set via the `styles` config
- **childOrder** — the order of structural and content children
- **universalAxes** — what the rune's config settles about the universal axes: resolved defaults, the surface each axis lands on, the block-substituted selectors it adds (`.rf-card--tinted`, `.rf-card--has-bg`), and the axes its config rules out entirely

### Universal axes

Above the per-rune entries, a top-level `universalAxes` section describes the axes the transform applies to *every* rune — `tint`, `width`, `content-measure`, `spacing`, `inset`, `density`, `reading`, `dropcap`, `elevation`, `prominence`, `motion`, `content-place`, `cover`, `frame`, `substrate` and `bg` — in the order the engine resolves them.

Each entry names the axis's author-facing inputs and where they are read from, its closed value vocabulary where the engine owns one, the data attributes and CSS custom properties it emits, any elements it injects, and the condition under which it applies at all.

It is stated once rather than repeated on all 130-odd runes, because an axis is the same everywhere except for its gates and defaults — and those are exactly what each rune's own `universalAxes` records. Selector patterns carry a `{block}` placeholder that the rune's own `block` substitutes:

```json
{
  "universalAxes": {
    "elevation": {
      "description": "The chrome/depth ladder (SPEC-107)…",
      "source": "attribute",
      "inputs": ["elevation"],
      "values": ["sunken", "flush", "flat", "raised", "floating", "overlay"],
      "dataAttributes": ["data-elevation"],
      "condition": "emitted only when the author sets it or the rune declares `defaultElevation`"
    }
  },
  "runes": {
    "Card": {
      "universalAxes": {
        "axes": {
          "tint": { "selectors": [".rf-card--tinted"] },
          "frame": { "target": "[data-section=\"media\"]" }
        },
        "unavailable": {
          "reading": "this rune declares no body section",
          "prominence": "this rune has no page-section header"
        }
      }
    }
  }
}
```

An axis absent from a rune's `axes` **and** from its `unavailable` behaves exactly as the top-level entry describes.

### CI validation

Use `--check` to verify an existing contracts file is up to date:

```shell
refrakt contracts --check -o contracts/structures.json --config .
```

This exits with code 1 if the file is stale (config has changed since last generation). Add this to your CI pipeline to catch config-contract drift.

### Use cases

- **CSS validation** — compare contract selectors against your CSS to find gaps
- **Cross-team contracts** — share the structure document with designers or other teams so they know exactly what HTML to expect
- **Snapshot testing** — commit the contracts file and use `--check` in CI to detect unintended config changes

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `--output <path>` | `-o` | Write contracts to a file (default: stdout) |
| `--check` | | Validate existing file is up to date (exit 1 if stale) |
| `--config <dir>` | | Directory containing `refrakt.config.json` (loads plugins) |

## refrakt scaffold-css

Generates CSS stub files for all runes in the base config. Each file includes the root block selector, modifier selectors, context modifiers, static modifiers, and element selectors with comments — ready for you to fill in styles.

```shell
# Default output to ./styles/runes
refrakt scaffold-css

# Custom output directory
refrakt scaffold-css -d ./styles/theme-runes

# Overwrite existing files
refrakt scaffold-css --force
```

Runes that share a block name (e.g., Tier and FeaturedTier both use `tier`) are merged into a single CSS file. Existing files are skipped unless `--force` is used.

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `--output-dir <dir>` | `-d` | Output directory (default: `./styles/runes`) |
| `--force` | | Overwrite existing files |

## refrakt validate

Validates theme configuration and manifest files for correctness. Reports errors and warnings, and exits with code 1 if validation fails.

```shell
# Validate the base config (sanity check)
refrakt validate

# Validate a custom theme config
refrakt validate --config ./my-theme/config.json

# Validate a theme manifest
refrakt validate --manifest ./my-theme/manifest.json

# Validate both
refrakt validate --config ./config.json --manifest ./manifest.json
```

Without options, validates the base theme config as a sanity check. Currently supports JSON config files via CLI; TypeScript configs require the module to be built first.

### Options

| Flag | Description |
|------|-------------|
| `--config <path>` | Path to theme config (JSON) |
| `--manifest <path>` | Path to manifest.json |

## refrakt theme

Manage themes in your project.

### theme install

Installs a theme package and updates `refrakt.config.json`:

{% tabs %}

{% tab name="npm" %}

```shell
refrakt theme install @my-org/my-theme
```

{% /tab %}

{% tab name="Local directory" %}

```shell
refrakt theme install ./my-theme
```

{% /tab %}

{% tab name="Tarball" %}

```shell
refrakt theme install /path/to/theme.tgz
```

{% /tab %}

{% /tabs %}

The command auto-detects your package manager (npm, yarn, or pnpm), installs the theme, updates `refrakt.config.json` with the new theme name, and validates that the theme exports the expected entry points (`./svelte`, `./transform`, rune CSS).

### theme info

Shows details about the currently configured theme:

```shell
refrakt theme info
```

Displays the theme name, version, install path, description, and available exports.
