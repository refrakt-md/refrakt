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
- [Planning](/plan)

## Guide

- getting-started
- overview
- plugins
- plan
- sites
- migration
- schema
- content

## CLI

- cli-overview
- inspect
- reference
- write
- theme-tools

## Themes

- overview
- config-api
- dimensions
- css
- creating-a-theme
- components
- layouts
- tooling
- tint-cascade

## Lumina

- lumina
- neutral-default
- tideline
- niwaki
- nord

## Adapters

- adapters-overview
- sveltekit
- astro
- nextjs
- nuxt
- eleventy
- html

## Authoring

- authoring-overview
- content-models
- output-contract
- patterns
- partials
- page-sections

## Packages

- packages
- authoring
- pipeline
- extending-core

## MCP Server

- overview
- installation
- tools
- resources
- errors

{% /nav %}
{% /region %}

{% region name="pagination" %}
{% pagination auto=true /%}
{% /region %}
{% /layout %}
