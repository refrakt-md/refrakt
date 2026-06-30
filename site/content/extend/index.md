---
title: Extend refrakt
description: Build custom runes, themes, and plugins on top of refrakt's core
---

# Extend refrakt

This handbook is for developers extending refrakt — writing custom runes, building themes, shipping plugins, or hooking into the build pipeline. If you're here to author content with refrakt's existing runes, head to the [Docs handbook](/docs/getting-started) instead.

## What lives here

{% nav layout="columns" %}
- [Rune authoring](/extend/rune-authoring/authoring-overview)

  Mental model, content models, output contract, and canonical patterns for writing new runes.

- [Plugin authoring](/extend/plugin-authoring/authoring)

  Package your runes, theme config, behaviors, and CLI commands as a `Plugin`. Hook into the cross-page pipeline.

- [Theme authoring](/extend/theme-authoring/overview)

  Build a theme from scratch or extend Lumina: design tokens, BEM CSS, identity-transform config, and dimensions.

---

- [Pipeline](/extend/plugin-authoring/pipeline)

  Cross-page register / aggregate / post-process hooks. Build site-wide indexes from page content.

- [Hosted & in-memory builds](/extend/plugin-authoring/hosted-builds)

  The `ProjectFiles` seam and the fetch-then-build materialization pattern for rendering a repo with no local filesystem.

- [Content variables](/extend/variables)

  The author-facing variable surface: `$frontmatter`, `$page`, `$file`, and the conventions that separate public variables from pipeline internals.

- [Security](/extend/security)

  Threat model for runes that surface raw author HTML/CSS/JS, plus the `ResolvedSecurityPolicy` contract.

- [Contributing](/extend/contributing)

  How this repo runs — branches, the plan workflow, releases, and where to file issues.
{% /nav %}

## Before you start

A few things worth knowing before you write your first rune:

- **Read [Authoring overview](/extend/rune-authoring/authoring-overview) first.** It introduces `createContentModelSchema`, `createComponentRenderable`, and the identity-transform engine. Everything else in Extend assumes that mental model.
- **Runes almost always belong in a plugin**, not in the core rune library. See the [community package rune checklist](/extend/rune-authoring/authoring-overview#community-package-rune).
- **The author-facing rune reference catalog is at [`/runes`](/runes/rune-catalog).** Both audiences use it for different reasons — authors copy snippets, developers verify their own rune output.

## Useful CLI commands

Even if your day-to-day is writing TypeScript and CSS, a few CLI commands are worth knowing:

- [`refrakt inspect <rune>`](/docs/cli/inspect) — see the HTML the identity transform produces for any rune. Indispensable when wiring up BEM CSS or debugging modifier classes.
- [`refrakt contracts`](/docs/cli/inspect) — generate the full structure contract (every BEM selector, data attribute, structural element) for the active rune set.
- [`refrakt reference dump`](/docs/cli/reference) — emit the full rune syntax reference for the active plugin set. Used to regenerate `AGENTS.md`.
