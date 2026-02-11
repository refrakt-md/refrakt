---
title: Feature
description: Feature showcases with name, description, and optional icons
---

# Feature

Feature showcases. List items become feature definitions — bold text is the feature name, the following paragraph is the description.

```markdown
{% feature %}
## Features

- **Fast builds**

  Static generation with incremental rebuilds.

- **Type-safe content**

  Every rune produces typed, validated output.

- **Zero config**

  Convention-based project structure.
{% /feature %}
```

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `split` | `string` | — | Space-separated column sizes for split layout |
| `mirror` | `boolean` | `false` | Mirror the split layout direction |
