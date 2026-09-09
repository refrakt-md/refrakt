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
- content

## Authoring

- authoring/variables
- authoring/partials
- authoring/page-sections
- authoring/entities
- authoring/tint
- authoring/nav-slug-resolution
- authoring/rich-menubar-panels

## Configuration

- configuration/overview
- configuration/sites
- configuration/plugins
- configuration/entity-routes
- configuration/search
- configuration/i18n
- configuration/plan
- configuration/migration
- configuration/schema

## CLI

- cli/cli-overview
- cli/inspect
- cli/reference
- cli/write
- cli/theme-tools

## Adapters

- adapters/adapters-overview
- adapters/sveltekit
- adapters/astro
- adapters/nextjs
- adapters/nuxt
- adapters/eleventy
- adapters/html

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
