---
title: CLI Tooling
description: CLI tools for previewing transform output, auditing CSS coverage, and generating structure contracts
---

# CLI Tooling

The `refrakt` CLI includes tools for theme development: **inspect** to preview identity transform output, **audit** to check CSS coverage, and **contracts** to generate machine-readable structure documents.

## refrakt inspect

Shows the HTML that the identity transform produces for any rune — BEM classes, data attributes, structural elements, and consumed meta tags.

### Basic usage

```shell
refrakt inspect hint --type=warning
```

This outputs the fully transformed HTML for a Hint rune with `type="warning"`, showing exactly which classes, data attributes, and structural elements the engine generates. Use this to understand what CSS selectors you need to write.

### Variant expansion

Use `=all` to see every variant of an attribute at once:

```shell
refrakt inspect hint --type=all
```

This expands the `type` attribute across all its allowed values (note, warning, tip, etc.), so you can see the full set of BEM modifier classes and data attributes your CSS needs to cover.

### Setting multiple attributes

Pass any rune attribute as a flag:

```shell
refrakt inspect api --method=POST --path="/users" --auth="Bearer token"
```

### Listing runes

```shell
# Human-readable list
refrakt inspect --list

# JSON for scripting
refrakt inspect --list --json
```

### Other options

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON instead of HTML |
| `--items <n>` | Number of repeated children to generate (default: 3) |
| `--theme <name>` | Theme to use (default: base) |

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

### Typical workflow

1. Add or modify a rune config in your theme's `config.ts`
2. Run `refrakt inspect <rune>` to see the generated HTML structure
3. Write CSS targeting the selectors you see
4. Run `refrakt inspect <rune> --audit` to verify coverage
5. Run `refrakt inspect --all --audit` before committing to catch any gaps

## refrakt contracts

Generates a JSON document describing all BEM selectors, data attributes, and HTML structure the identity transform produces — derived purely from your theme config, no engine execution needed.

### Generate contracts

```shell
# Print to stdout
refrakt contracts

# Write to file
refrakt contracts -o contracts/structures.json
```

The output includes, for every rune:

- **root** — the root BEM selector (e.g., `.rf-hint`)
- **modifiers** — modifier class patterns, data attributes, sources, and defaults
- **elements** — injected structural elements with their selectors and conditions
- **inlineStyles** — CSS custom properties set via the `styles` config
- **childOrder** — the order of structural and content children

### CI validation

Use `--check` to verify an existing contracts file is up to date:

```shell
refrakt contracts --check -o contracts/structures.json
```

This exits with code 1 if the file is stale (config has changed since last generation). Add this to your CI pipeline to catch config-contract drift.

### Use cases

- **CSS validation** — compare contract selectors against your CSS to find gaps
- **Cross-team contracts** — share the structure document with designers or other teams so they know exactly what HTML to expect
- **Snapshot testing** — commit the contracts file and use `--check` in CI to detect unintended config changes
