---
title: Table of Contents
description: Auto-generated table of contents from page headings
---

# Table of Contents

Auto-generated table of contents from the headings on the current page.

## Basic usage

Place the self-closing tag where you want the table of contents to appear.

```markdoc
{% toc /%}
```

The table of contents below is generated from this page's own headings:

{% preview %}

{% toc /%}

{% /preview %}

Control how deep the heading hierarchy goes with `depth`:

```markdoc
{% toc depth=2 /%}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `depth` | `number` | `3` | Maximum heading depth to include (e.g., `2` includes h2 and h3) |
| `ordered` | `boolean` | `false` | Use an ordered list instead of unordered |
