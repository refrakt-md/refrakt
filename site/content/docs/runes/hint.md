---
title: Hint
description: Callouts and admonitions for supplementary information
---

# Hint

Callouts and admonitions. Supports four types: `note`, `warning`, `caution`, and `check`.

```markdoc
{% hint type="note" %}
This is a note with helpful information.
{% /hint %}
```

### Types

{% hint type="note" %}
This is a **note** — useful for supplementary information.
{% /hint %}

{% hint type="warning" %}
This is a **warning** — something to be careful about.
{% /hint %}

{% hint type="caution" %}
This is a **caution** — a serious potential issue.
{% /hint %}

{% hint type="check" %}
This is a **check** — a success or completion message.
{% /hint %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `"note"` | One of `note`, `warning`, `caution`, `check` |
