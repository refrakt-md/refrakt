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

{% audio src="/audio/demo.mp3" title="Demo Track" artist="Artist Name" /%}

{% /preview %}

## With waveform

Enable waveform visualisation with the `waveform` attribute.

{% preview source=true %}

{% audio src="/audio/interview.mp3" title="Interview Clip" waveform=true /%}

{% /preview %}

## With inline chapters

Add a list inside the rune to define chapter markers. Bold text is the chapter label and parenthetical text is the timestamp.

{% preview source=true %}

{% audio src="/audio/podcast-ep1.mp3" title="Episode 1: Getting Started" %}

An introduction to the series covering setup, basics, and first steps.

1. **Introduction** (0:00) Welcome and overview
2. **Setup** (2:30) Installing dependencies
3. **First steps** (8:45) Writing your first component
4. **Wrap-up** (22:10) Summary and next episode preview
{% /audio %}

{% /preview %}

## Connected to a playlist

Use the `playlist` attribute to connect the player to a named playlist rune via its `id`.

{% preview source=true %}

{% playlist type="album" artist="Nils Frahm" id="felt" %}
# Felt

- **Keep** (3:45)
- **Less** (2:18)
- **Familiar** (5:42)
{% /playlist %}

{% audio playlist="felt" /%}

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
