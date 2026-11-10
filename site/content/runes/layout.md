---
title: Layout & Region
description: Structural runes for defining page layouts and named content regions
category: Site
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:layout"} /%}

Structural runes that define page layout. `{% layout %}` wraps the entire layout file. `{% region %}` defines named content areas (header, nav, sidebar, footer) that render in specific positions within the theme's layout component.

## Defining regions

A `_layout.md` file uses regions to place content into theme slots. A layout describes every page beneath it rather than rendering where it is written, so it is shown here as the file you write:

```markdoc
{% layout %}
	{% region name="header" %}
	# Trail Guide
	{% /region %}

	{% region name="nav" %}
		{% nav %}
		- getting-started
		- day-hikes
		- overnight-routes
		{% /nav %}
	{% /region %}
{% /layout %}
```

Layouts are inherited from parent directories: a page gets every `_layout.md` from the content root down to its own directory, in that order. [Content & Routing → Layout cascade](/docs/content#layout-cascade) walks through the inheritance. A `_layout.md` in a subdirectory can override or extend regions from the parent layout using the `mode` attribute.

### Extending a parent layout

A `{% region %}` names the region it fills (`header`, `nav`, `sidebar`, `footer`). The `mode` attribute decides how it combines with the parent layout's region of the same name:

| Mode | Behavior |
|------|----------|
| `replace` | The child region replaces the parent's (default) |
| `prepend` | The child content goes before the parent's |
| `append` | The child content goes after the parent's |

```markdoc
{% region name="nav" mode="append" %}
## Extra Section
- new-page
{% /region %}
```

This appends navigation items to the inherited nav region. `extends` on the `{% layout %}` names the layout to build on, the parent directory's by default.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:layout"} /%}
