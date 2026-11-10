---
title: refrakt validate
description: Check your sites' config and content for errors
---

# refrakt validate

Validates **your project's sites** — config resolution first, then content — for every site in `refrakt.config.json`. Exits non-zero when any finding is at error severity.

{% hint type="warning" %}
`refrakt validate` checks your content, not a theme. To check a theme's config or manifest, use [`refrakt theme validate`](/extend/theme-authoring/tooling#refrakt-theme-validate), which takes `--config` and `--manifest`.
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

## Two layers, in order

**Config resolution runs first, because its failures cause content findings.** A plugin that fails to resolve takes its runes with it, and every use of them would then be reported as an undefined tag — dozens of errors against content that is perfectly correct, when the cause is one line of config. When that happens, `validate` reports the config failure and *skips* the content layer rather than listing both as peers:

```
main
  ✗ error   sites.main.plugins[0]: plugin "@acme/runes" cannot be resolved …
  content: skipped: 1 unresolved dependency would report every affected rune
           as an undefined tag. Fix the config findings above first.
```

The config layer checks **resolution, not shape**. Shape is the published JSON Schema's job, and your editor already enforces it. What nothing else covers is whether the names resolve: `theme`, every entry in `plugins[]`, and `entityRoutes` types.

## Two tiers

The default tier parses and validates each page. It does not resolve layouts, read git history, run the identity transform, or run the cross-page pipeline — which is what makes it fast enough to run on every save.

`--deep` adds the cross-page phases (broken `{% ref %}` targets, missing entities, nav slug resolution). That is a full pipeline run, so it costs about what a build costs.

## Warnings never fail

Only error-severity findings affect the exit code, and there is no `--strict`. A gate that goes red on day one is a gate someone turns off; severity already says which findings are worth stopping for.

One exception, by design: `critical` findings — a document that could not be understood, such as an undefined tag — are always reported at error severity. No `validation` setting silences them.

## Options

| Flag | Description |
|------|-------------|
| `--site <name>` | Restrict to one site from `refrakt.config.json` |
| `--only <content\|config>` | Narrow to one layer (both run when absent) |
| `--deep` | Add the cross-page tier (costs a full pipeline run) |
| `--format <text\|json>` | Output format (default: `text`) |
| `--config-path <path>` | Path to `refrakt.config.json` (default: `./refrakt.config.json`) |

## refrakt config validate

The config layer on its own, beside the `config migrate` that already exists. Useful when you want the cheap check without paying for content.

```shell
refrakt config validate
refrakt config validate --site main
refrakt config validate --format json
```

It is the same layer `refrakt validate` runs first — narrowed, not reimplemented — so the two always agree.

## refrakt theme validate

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

## refrakt theme coverage

A theme configures no rune, so it cannot promise each rune looks right. It covers the vocabulary instead: every meta type, sentiment, zone layout, sequence, section role, media kind and universal-axis value. Every rune that speaks the vocabulary then renders, including runes written after the theme shipped. `theme coverage` reports, for each value, whether the theme's CSS styles it, leaves it to the base stylesheet, or nothing does.

```shell
# The theme's CSS, read recursively; the base is @refrakt-md/skeleton
refrakt theme coverage styles

# One row per value, for a test of your own
refrakt theme coverage styles --json
```

```
Theme vocabulary: 105 values — 86 styled by the theme, 6 left to the base stylesheet, 13 unstyled.

  meta-type
    ✓ [data-meta-type="status"]
  …
  width
    · [data-width="compact"]  (base)
    ✗ [data-width="content"]
```

The values are read from the registries that define them, so a value added to refrakt appears in the report without anything to update. A `✗` is information, not a failure: a value at its default (`width="content"`, `prominence="normal"`) needs no rule. Any other `✗` is a gap to style, or a choice to record.

It is part of a theme's definition of done, beside `refrakt contracts --check`. Lumina runs it as a test, `packages/lumina/test/vocabulary-coverage.test.ts`. That test records its unstyled values, with a reason for each, as a set that may only shrink.

| Flag | Description |
|------|-------------|
| `<css path>...` | The theme's CSS files or directories (default: `.`) |
| `--base <dir>` | The base stylesheet (default: the installed `@refrakt-md/skeleton`) |
| `--no-base` | Read no base stylesheet |
| `--json` | Print one row per value as JSON |

