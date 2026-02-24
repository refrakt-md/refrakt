---
title: refrakt inspect
description: Preview identity transform output for any rune and audit CSS coverage
---

# refrakt inspect

Shows the HTML that the identity transform produces for any rune — BEM classes, data attributes, structural elements, and consumed meta tags. Use this to understand exactly what CSS selectors you need to write.

## Basic usage

```shell
refrakt inspect hint --type=warning
```

This outputs the fully transformed HTML for a Hint rune with `type="warning"`, showing the classes, data attributes, and structural elements the engine generates.

## Variant expansion

Use `=all` to see every variant of an attribute at once:

```shell
refrakt inspect hint --type=all
```

This expands the `type` attribute across all its allowed values (note, warning, tip, etc.), so you can see the full set of BEM modifier classes and data attributes your CSS needs to cover.

## Setting multiple attributes

Pass any rune attribute as a flag:

```shell
refrakt inspect api --method=POST --path="/users" --auth="Bearer token"
```

## Listing runes

```shell
# Human-readable list
refrakt inspect --list

# JSON for scripting
refrakt inspect --list --json
```

## Options

| Flag | Description |
|------|-------------|
| `--list` | List all available runes |
| `--json` | Output as JSON instead of HTML |
| `--items <n>` | Number of repeated children to generate (default: 3) |
| `--theme <name>` | Theme to use (default: base) |
| `--<attr>=<value>` | Set a rune attribute (e.g., `--type=warning`) |
| `--<attr>=all` | Expand all variants for that attribute |

## CSS audit

The `--audit` flag checks which generated selectors have matching rules in your CSS files.

### Audit a single rune

```shell
refrakt inspect hint --audit
```

This generates all possible selectors for the Hint rune (root, modifiers, elements, data attributes) and checks each one against your CSS files. Each selector is reported as:

- **covered** — a matching CSS rule exists
- **partial** — some but not all selectors for the rune are covered
- **missing** — no matching CSS rule found

### Full-theme audit

```shell
refrakt inspect --all --audit
```

Audits every rune in the config at once. Useful for catching gaps after adding new rune configs or refactoring CSS.

### Custom CSS directory

By default, the audit auto-detects your CSS directory. To specify one explicitly:

```shell
refrakt inspect hint --audit --css packages/my-theme/styles/runes
```

### Audit options

| Flag | Description |
|------|-------------|
| `--audit` | Enable CSS coverage checking |
| `--all` | Audit all runes (use with `--audit`) |
| `--css <dir>` | CSS directory for audit (default: auto-detected) |

## Typical workflow

{% steps %}

### Modify the config

Add or modify a rune config in your theme's `config.ts`.

### Preview the output

Run `refrakt inspect <rune>` to see the generated HTML structure.

### Write CSS

Target the selectors you see in the inspect output.

### Verify coverage

Run `refrakt inspect <rune> --audit` to confirm your CSS covers all generated selectors.

### Audit before committing

Run `refrakt inspect --all --audit` to catch any gaps across all runes.

{% /steps %}
