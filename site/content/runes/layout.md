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

A `_layout.md` file uses regions to place content into theme slots.

```markdoc
{% layout %}
	{% region name="header" %}
	# Site Title
	{% /region %}

	{% region name="nav" %}
		{% nav %}
		- page-one
		- page-two
		{% /nav %}
	{% /region %}
{% /layout %}
```

Layouts are inherited from parent directories. A `_layout.md` in a subdirectory can override or extend regions from the parent layout using the `mode` attribute.

### Extending a parent layout

A `{% region %}` names the region it fills (`header`, `nav`, `sidebar`, `footer`). By default it replaces the parent layout's region of that name; `mode="prepend"` or `mode="append"` adds to it instead. `extends` on the `{% layout %}` names the layout to build on, the parent directory's by default.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:layout"} /%}
