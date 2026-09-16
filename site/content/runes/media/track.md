---
title: Track
description: Standalone track or recording with metadata
category: Media
plugin: media
status: stable
type: rune
---

{% hint type="note" %}
This rune is part of **@refrakt-md/media**. Install with `npm install @refrakt-md/media` and add `"@refrakt-md/media"` to the `plugins` array in your `refrakt.config.json`.
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

## Inside a playlist

A `{% track %}` written inside a `{% playlist %}` becomes one of that playlist's tracks — in the listing, in the HTML, and in the structured data. Use it when the list format is too limited: body content, per-track links, or cue points with prose.

It costs nothing to switch. A nested track that states no `type` takes the playlist's kind, and inherits the playlist's `artist` the way a list item does, so **the same track written either way produces the same structured data**. The longer form may carry more; it never carries less.

{% preview source=true %}

{% playlist type="podcast" artist="Tech Weekly" %}
# Design Systems Weekly

- **Token Architecture** (38:15) — February 2025

{% track duration="45:30" date="March 2025" url="https://example.com/ep-12" %}
# Component Libraries at Scale

Why component libraries stall at the second team, and what to do about it.
{% /track %}
{% /playlist %}

{% /preview %}

Both forms can be mixed, and document order is preserved. Two things worth knowing:

- **Tracks must be consecutive.** The track listing is collected as one run, so prose written between two tracks ends it — anything after that becomes the playlist's body rather than another track.
- **An explicit `type` always wins.** A `{% track type="song" %}` inside a podcast stays a song. The attribute means what it says; the playlist only supplies a kind when the track states none.

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:track"} /%}
