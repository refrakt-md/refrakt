---
title: Timeline
description: Chronological events displayed as a timeline
---

# Timeline

Chronological events. Headings with a `date - label` pattern are automatically converted into timeline entries.

## Heading-based timeline

Headings are parsed into date and label parts, with content below becoming the description.

```markdoc
{% timeline %}
## 2023 - Founded

The company was founded with a mission to simplify content authoring for developer teams.

## 2024 - Public launch

Released v1.0 with support for 15 semantic runes and two themes. Open-sourced the core framework.

## 2025 - Community growth

Reached 10,000 users and launched the plugin marketplace for custom runes.
{% /timeline %}
```

{% timeline %}
## 2023 - Founded

The company was founded with a mission to simplify content authoring for developer teams.

## 2024 - Public launch

Released v1.0 with support for 15 semantic runes and two themes. Open-sourced the core framework.

## 2025 - Community growth

Reached 10,000 users and launched the plugin marketplace for custom runes.
{% /timeline %}

## Explicit entries

Use `{% timeline-entry %}` tags for more control over date and label values.

```markdoc
{% timeline %}
{% timeline-entry date="Q1 2024" label="Alpha release" %}
Initial release to early testers.
{% /timeline-entry %}

{% timeline-entry date="Q3 2024" label="Beta release" %}
Public beta with full documentation.
{% /timeline-entry %}
{% /timeline %}
```

{% timeline %}
{% timeline-entry date="Q1 2024" label="Alpha release" %}
Initial release to early testers.
{% /timeline-entry %}

{% timeline-entry date="Q3 2024" label="Beta release" %}
Public beta with full documentation.
{% /timeline-entry %}
{% /timeline %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Heading level to convert into entries (auto-detected if omitted) |
| `direction` | `string` | `vertical` | Timeline orientation |

### Entry attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | `string` | — | Date or time period |
| `label` | `string` | — | Entry label |
