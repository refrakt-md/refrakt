---
# Themes catalog is a reading + browsing surface — same auto/unlocked
# treatment as docs and runes so users can pick their preferred mode.
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

## Themes

- themes-catalog

## Lumina

- lumina
- neutral-default

## Theme presets

- tideline

## Syntax presets

- niwaki
- nord
- dracula
- solarized
- catppuccin
- tokyo-night
- one-dark
- gruvbox

{% /nav %}
{% /region %}

{% region name="pagination" %}
{% pagination auto=true /%}
{% /region %}
{% /layout %}
