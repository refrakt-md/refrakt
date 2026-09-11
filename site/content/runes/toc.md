---
title: Table of Contents
description: Auto-generated table of contents from page headings
category: Site
plugin: core
status: stable
type: rune
---

# Table of Contents

Auto-generated table of contents from the headings on the current page.

## Basic usage

Place the self-closing tag where you want the table of contents to appear.

The table of contents below is generated from this page's own headings:

{% preview source=true %}

{% toc /%}

{% /preview %}

Control how deep the heading hierarchy goes with `depth`:

```markdoc
{% toc depth=2 /%}
```

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:toc"} /%}

