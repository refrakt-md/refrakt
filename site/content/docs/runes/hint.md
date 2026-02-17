---
title: Hint
description: Callouts and admonitions for supplementary information
---

# Hint

Callouts and admonitions. Supports four types: `note`, `warning`, `caution`, and `check`.

## Basic usage

Display supplementary information with a visual callout.

{% preview source=true %}

{% hint type="note" %}
This is a note with helpful information.
{% /hint %}

{% /preview %}

## All hint types

Use different types to convey different levels of importance.

{% preview source=true %}

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

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `"note"` | One of `note`, `warning`, `caution`, `check` |
