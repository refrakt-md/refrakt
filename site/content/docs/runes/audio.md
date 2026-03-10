---
title: Audio
description: Audio player with optional waveform and chapter markers
---

{% hint type="note" %}
This rune is part of **@refrakt-md/media**. Install with `npm install @refrakt-md/media` and add `"@refrakt-md/media"` to the `packages` array in your `refrakt.config.json`.
{% /hint %}

# Audio

An audio player element. Supports waveform visualisation, inline chapter markers, and connection to a named `playlist` rune. A paragraph becomes the description, and a list becomes inline chapter markers with timestamps.

## Basic usage

A simple audio player with a source file.

{% preview source=true %}

{% audio src="https://archive.org/download/musopen-chopin/Nocturne%20Op.%209%20no.%202%20in%20E%20flat%20major.mp3" title="Nocturne Op. 9 No. 2 in E-flat major" artist="Frederic Chopin" /%}

{% /preview %}

## With waveform

Enable waveform visualisation with the `waveform` attribute.

{% preview source=true %}

{% audio src="https://archive.org/download/musopen-chopin/Mazurka%20Op.%207%20no.%204%20in%20A%20flat%20major.mp3" title="Mazurka Op. 7 No. 4 in A-flat major" artist="Frederic Chopin" waveform=true /%}

{% /preview %}

## With inline chapters

Add a list inside the rune to define chapter markers. Bold text is the chapter label and parenthetical text is the timestamp.

{% preview source=true %}

{% audio src="https://archive.org/download/musopen-chopin/Ballade%20no.%201%20-%20Op.%2023.mp3" title="Ballade No. 1 in G minor, Op. 23" artist="Frederic Chopin" %}

A sweeping narrative arc from brooding introduction through lyrical themes to a fiery conclusion.

1. **Introduction** (0:00) Largo opening over a Neapolitan chord
2. **First Theme** (0:45) Principal theme in G minor
3. **Second Theme** (2:50) Lyrical melody in E-flat major
4. **Development** (4:30) Thematic transformation and modulation
5. **Recapitulation** (7:00) Themes return in reverse order
6. **Coda** (8:30) Presto con fuoco to the dramatic finish
{% /audio %}

{% /preview %}

## Connected to a playlist

Use the `playlist` attribute to connect the player to a named playlist rune via its `id`.

{% preview source=true %}

{% playlist type="album" artist="Frederic Chopin" id="nocturnes" %}
# Chopin Nocturnes

- **Nocturne Op. 15 No. 1 in F major** [play](https://archive.org/download/musopen-chopin/Nocturne%20Op.%2015%20no.%201%20In%20F%20major.mp3) (5:06)
- **Nocturne Op. 27 No. 1 in C-sharp minor** [play](https://archive.org/download/musopen-chopin/Nocturne%20Op.%2027%20no.%201%20in%20C%20sharp%20minor.mp3) (5:52)
- **Nocturne Op. 32 No. 1 in B major** [play](https://archive.org/download/musopen-chopin/Nocturne%20Op.%2032%20no.%201%20in%20B%20major.mp3) (5:01)
{% /playlist %}

{% audio playlist="nocturnes" /%}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | `string` | — | Audio file URL |
| `playlist` | `string` | — | ID of a playlist rune to connect to |
| `title` | `string` | — | Track title displayed in the player |
| `artist` | `string` | — | Artist name displayed in the player |
| `waveform` | `boolean` | — | Show waveform visualisation |
| `chapters` | `string` | — | URL to an external chapters file |
