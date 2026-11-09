---
title: Playlist
description: Curated playlist with track listing for albums, podcasts, audiobooks, and mixes
category: Media
plugin: media
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:playlist"} /%}

A list of tracks with its cover art: an album, a podcast's episodes, a mix. For a single song or episode, use [track](/runes/media/track); to play one file with chapters or a waveform, [audio](/runes/media/audio).

## Basic usage

An album with an artist and track listing.

{% preview source=true %}

	{% playlist type="album" artist="Pink Floyd" media-position="start" %}
	![The Dark Side of the Moon](https://assets.refrakt.md/playlist-dark-side-of-the-moon.png)

	---

	# The Dark Side of the Moon

	A landmark progressive rock album exploring themes of time, death, and madness.

	- **Speak to Me** (1:13)
	- **Breathe** (2:43)
	- **On the Run** (3:36)
	- **Time** (7:05)
	- **The Great Gig in the Sky** (4:44)
	{% /playlist %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A heading | The playlist's title |
| The paragraph after it | Its description |
| A list item | A track: bold text is its name, `(3:45)` its running time, italic text its artist, a link its audio file, and text after `—` its date |
| A list inside a track's item | That track's chapter markers or lyrics |
| An image, then `---`, before the rest | The cover art ([Place the cover](#place-the-cover)) |

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

## Byline

`meta="byline"` sets each track's artist, date and running time beneath its name rather than along its row. It suits long titles, and narrow columns, where the row form hides the artist and date. A track's own `meta` wins over the playlist's.

{% preview source=true %}

	{% playlist type="podcast" artist="Tech Weekly" meta="byline" %}
	# Design Systems Weekly

	- **Component Libraries at Scale** (45:30) — March 2025
	- **Token Architecture** (38:15) — February 2025
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

## Place the cover

The body splits on `---` into **media (cover art) → content (tracks)** zones (media-first in source). `media-position` controls visual placement independently of source order.

`media-ratio`, `valign` and `collapse` tune a side-by-side split, as on [card](/runes/card#place-the-media).

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:playlist"} /%}
