---
title: Track
description: Standalone track or recording with metadata
---

{% hint type="note" %}
This rune is part of **@refrakt-md/media**. Install with `npm install @refrakt-md/media` and add `"@refrakt-md/media"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Track

A standalone track or recording with metadata. A heading becomes the track name. Use attributes for artist, duration, and other metadata. Tracks can be used independently or inside a `playlist` rune.

## Basic usage

A single track with artist and duration.

{% preview source=true %}

{% track artist="Radiohead" duration="4:01" type="song" %}
# Everything in Its Right Place
{% /track %}

{% /preview %}

## Podcast episode

Use `type="episode"` for podcast episodes with a date.

{% preview source=true %}

{% track type="episode" artist="Tech Weekly" duration="42:30" date="March 2025" %}
# The Future of Web Standards
{% /track %}

{% /preview %}

## With body content

Tracks can include additional body content like descriptions or show notes.

{% preview source=true %}

{% track artist="Miles Davis" duration="9:22" type="song" %}
# So What

The opening track from *Kind of Blue*, featuring the iconic two-chord modal structure that changed jazz forever.
{% /track %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | `string` | — | Audio file URL |
| `artist` | `string` | — | Artist or creator name |
| `duration` | `string` | — | Track duration in `m:ss` or ISO 8601 (`PT4M1S`) |
| `number` | `number` | — | Track number in a sequence |
| `date` | `string` | — | Release or publish date |
| `url` | `string` | — | Link to the track's page |
| `type` | `string` | `song` | Track type: `song`, `episode`, `chapter`, `talk`, or `video` |
