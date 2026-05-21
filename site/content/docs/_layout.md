---
# Docs is a reading surface — user/system preference wins. The toggle is
# visible here so visitors can pick their preferred mode for long sessions.
tint-mode: auto
tint-lock: false
---
{% layout %}
{% region name="nav" %}
{% nav collapsible=true %}
- [Documentation](/docs/getting-started)
- [Runes](/runes/rune-catalog)
- [Themes](/themes/themes-catalog)
- [Planning](/plan)

## Guide

- getting-started
- configuration/overview
- configuration/plugins
- configuration/plan
- configuration/sites
- configuration/migration
- configuration/schema
- content

## CLI

- cli/cli-overview
- cli/inspect
- cli/reference
- cli/write
- cli/theme-tools

## Theme authoring

- themes/overview
- themes/config-api
- themes/dimensions
- themes/css
- themes/creating-a-theme
- themes/components
- themes/layouts
- themes/tooling
- themes/tint-cascade

## Adapters

- adapters/adapters-overview
- adapters/sveltekit
- adapters/astro
- adapters/nextjs
- adapters/nuxt
- adapters/eleventy
- adapters/html

## Authoring

- authoring/authoring-overview
- authoring/content-models
- authoring/output-contract
- authoring/patterns
- authoring/partials
- authoring/page-sections
- authoring/nav-slug-resolution
- authoring/rich-menubar-panels

## Packages

- plugins
- plugins/authoring
- plugins/pipeline
- plugins/extending-core

## MCP Server

- mcp/overview
- mcp/installation
- mcp/tools
- mcp/resources
- mcp/errors

{% /nav %}
{% /region %}

{% region name="pagination" %}
{% pagination auto=true /%}
{% /region %}
{% /layout %}
