---
title: Details
description: Collapsible disclosure blocks for supplementary content
---

# Details

Collapsible disclosure block for supplementary content. Renders as a native `<details>` element.

```markdown
{% details summary="Implementation notes" %}
This section contains additional technical details that most readers can skip.
{% /details %}
```

Use `open` to have the block expanded by default:

```markdown
{% details summary="Changelog" open=true %}
- v0.2.0: Added accordion support
- v0.1.0: Initial release
{% /details %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `summary` | `string` | `"Details"` | The clickable summary text |
| `open` | `boolean` | `false` | Whether the block is initially expanded |
