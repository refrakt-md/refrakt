---
title: Playlist
description: Curated playlist with track listing for albums, podcasts, audiobooks, and mixes
---

{% hint type="note" %}
This rune is part of **@refrakt-md/media**. Install with `npm install @refrakt-md/media` and add `"@refrakt-md/media"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Playlist

Curated track listings for albums, podcasts, audiobooks, and mixes. A heading becomes the playlist title, an image becomes the cover art, a paragraph becomes the description, and a list becomes the track listing. Bold text in each list item is the track name, parenthetical text is the duration, and italic text is the per-track artist.

## Basic usage

An album with an artist and track listing.

{% preview source=true %}

{% playlist type="album" artist="Pink Floyd" layout="split" %}
# The Dark Side of the Moon

A landmark progressive rock album exploring themes of time, death, and madness.

- **Speak to Me** (1:13)
- **Breathe** (2:43)
- **On the Run** (3:36)
- **Time** (7:05)
- **The Great Gig in the Sky** (4:44)

---

![The Dark Side of the Moon](https://assets.refrakt.md/playlist-dark-side-of-the-moon.png)
{% /playlist %}

{% /preview %}

## Podcast

Use `type="podcast"` for episodic content with dates.

{% preview source=true %}

{% playlist type="podcast" %}
# Design Systems Weekly

A podcast about building and scaling design systems.

- **Component Libraries at Scale** (45:30) — March 2025
- **Token Architecture** (38:15) — February 2025
- **Accessibility First** (42:00) — January 2025
{% /playlist %}

{% /preview %}

## Per-track artists

When tracks have different artists, use italic text for per-track attribution. Omit the `artist` attribute to avoid a default.

{% preview source=true %}

{% playlist type="mix" %}
# Summer Vibes 2025

- **Midnight City** (4:03) *M83*
- **Electric Feel** (3:49) *MGMT*
- **Do I Wanna Know?** (4:32) *Arctic Monkeys*
- **Intro** (4:18) *The xx*
{% /playlist %}

{% /preview %}

## With chapter markers

Tracks can include nested lists for chapter markers or lyrics. Use `content="chapters"` or `content="lyrics"` to force the display mode, or leave it as `auto` for automatic detection.

{% preview source=true %}

{% playlist type="podcast" content="chapters" %}
# Tech Talk: Web Components

- **Episode 42: Shadow DOM Deep Dive** (1:02:15)
  1. **Introduction** (0:00) Overview of today's topic
  2. **What is Shadow DOM?** (3:45) Core concepts explained
  3. **Styling strategies** (18:30) CSS custom properties and parts
  4. **Q&A** (45:00) Listener questions
{% /playlist %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `album` | Playlist type: `album`, `podcast`, `audiobook`, `series`, or `mix` |
| `artist` | `string` | — | Default artist applied to all tracks |
| `player` | `boolean` | — | Show an embedded audio player |
| `content` | `string` | `auto` | Cue point display: `auto`, `lyrics`, or `chapters` |
| `id` | `string` | — | Identifier for connecting an `audio` player rune |

## Section header

Playlist supports an optional eyebrow, headline, and blurb above the playlist content. Place a short paragraph or heading before the main content to use them. See [Page sections](/docs/authoring/page-sections) for the full syntax.

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
