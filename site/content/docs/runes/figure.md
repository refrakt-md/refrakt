---
title: Figure
description: Enhanced images with captions, sizing, and alignment
---

# Figure

Enhanced image display with caption, sizing, and alignment controls.

```markdown
{% figure caption="Architecture overview" size="large" align="center" %}
![Diagram](/images/architecture.png)
{% /figure %}
```

If no `caption` attribute is provided, the first paragraph inside the rune is used as the caption.

```markdown
{% figure size="medium" %}
![Photo](/images/photo.jpg)

Photo taken at the summit.
{% /figure %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `caption` | `string` | — | Caption text (falls back to first paragraph) |
| `size` | `string` | — | One of `small`, `medium`, `large`, `full` |
| `align` | `string` | — | One of `left`, `center`, `right` |
