---
# Plan-system documentation is a reading surface like /docs and /runes.
# /plan/* (without /docs) is marketing for the plan system and inherits
# the root layout's locked-dark default.
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

## Getting Started

- plan-overview
- plan-workflow

## Publishing

- plan-site
- plan-integrate

## Reference

- plan-entities
- plan-cli

{% /nav %}
{% /region %}

{% region name="pagination" %}
{% pagination auto=true /%}
{% /region %}
{% /layout %}
