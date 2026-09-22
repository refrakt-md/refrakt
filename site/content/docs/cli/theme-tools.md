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

Validates **your project's sites** — config resolution first, then content — for every site in `refrakt.config.json`. Exits non-zero when any finding is at error severity.

{% hint type="warning" %}
**This changed in v0.36.0.** `refrakt validate` used to validate refrakt's own built-in theme config and print a checkmark — a self-test of the library, reported as though it were a check of your work. The theme-authoring checks moved to [`refrakt theme validate`](#refrakt-theme-validate), and `--config` / `--manifest` moved with them.
{% /hint %}

```shell
# Every site: config resolution, then content
refrakt validate

# One site
refrakt validate --site main

# Narrow to one layer
refrakt validate --only content
refrakt validate --only config

# Add the cross-page tier (broken refs, missing entities)
refrakt validate --deep

# Machine-readable findings
refrakt validate --format json
```

### Two layers, in order

**Config resolution runs first, because its failures cause content findings.** A plugin that fails to resolve takes its runes with it, and every use of them would then be reported as an undefined tag — dozens of errors against content that is perfectly correct, when the cause is one line of config. When that happens, `validate` reports the config failure and *skips* the content layer rather than listing both as peers:

```
main
  ✗ error   sites.main.plugins[0]: plugin "@acme/runes" cannot be resolved …
  content: skipped: 1 unresolved dependency would report every affected rune
           as an undefined tag. Fix the config findings above first.
```

The config layer checks **resolution, not shape**. Shape is the published JSON Schema's job, and your editor already enforces it. What nothing else covers is whether the names resolve: `theme`, every entry in `plugins[]`, and `entityRoutes` types.

### Two tiers

The default tier parses and validates each page. It does not resolve layouts, read git history, run the identity transform, or run the cross-page pipeline — which is what makes it fast enough to run on every save.

`--deep` adds the cross-page phases (broken `{% ref %}` targets, missing entities, nav slug resolution). That is a full pipeline run, so it costs about what a build costs.

### Warnings never fail

Only error-severity findings affect the exit code, and there is no `--strict`. A gate that goes red on day one is a gate someone turns off; severity already says which findings are worth stopping for.

One exception, by design: `critical` findings — a document that could not be understood, such as an undefined tag — are always reported at error severity. No `validation` setting silences them.

### Options

| Flag | Description |
|------|-------------|
| `--site <name>` | Restrict to one site from `refrakt.config.json` |
| `--only <content\|config>` | Narrow to one layer (both run when absent) |
| `--deep` | Add the cross-page tier (costs a full pipeline run) |
| `--format <text\|json>` | Output format (default: `text`) |
| `--config-path <path>` | Path to `refrakt.config.json` (default: `./refrakt.config.json`) |

### refrakt config validate

The config layer on its own, beside the `config migrate` that already exists. Useful when you want the cheap check without paying for content.

```shell
refrakt config validate
refrakt config validate --site main
refrakt config validate --format json
```

It is the same layer `refrakt validate` runs first — narrowed, not reimplemented — so the two always agree.

### refrakt theme validate

The theme-authoring checks, for people writing a theme rather than a site.

```shell
refrakt theme validate --config ./my-theme/config.json
refrakt theme validate --manifest ./my-theme/manifest.json
refrakt theme validate --config ./config.json --manifest ./manifest.json
```

Currently supports JSON config files via CLI; TypeScript configs require the module to be built first.

| Flag | Description |
|------|-------------|
| `--config <path>` | Path to a `ThemeConfig` (JSON) |
| `--manifest <path>` | Path to `manifest.json` |

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
