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

### Example

{% details summary="Click to reveal more information" %}
This content is hidden by default. The details rune wraps content in a native disclosure element that the user can toggle open and closed.
{% /details %}

{% details summary="This one starts open" open=true %}
Since `open=true` is set, this block is expanded when the page loads.
{% /details %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `summary` | `string` | `"Details"` | The clickable summary text |
| `open` | `boolean` | `false` | Whether the block is initially expanded |
