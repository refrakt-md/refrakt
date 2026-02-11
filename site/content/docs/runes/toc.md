---
title: Table of Contents
description: Auto-generated table of contents from page headings
---

# Table of Contents

Auto-generated table of contents from the headings on the current page.

```markdown
{% toc /%}
```

Control how deep the heading hierarchy goes with `depth`:

```markdown
{% toc depth=2 /%}
```

### Example

The table of contents below is generated from this page's own headings:

{% toc /%}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `depth` | `number` | `3` | Maximum heading depth to include (e.g., `2` includes h2 and h3) |
| `ordered` | `boolean` | `false` | Use an ordered list instead of unordered |
