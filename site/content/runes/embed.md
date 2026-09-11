---
title: Embed
description: Embed external content like videos, tweets, and code demos
category: Content
plugin: core
status: stable
type: rune
---

# Embed

Embed external content from popular platforms. URLs are automatically detected and converted to the appropriate embed format. Supports YouTube, Vimeo, Twitter/X, CodePen, and Spotify.

## Basic usage

Pass a URL and optional title to embed content from a supported provider.

{% preview source=true %}

{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Example video" /%}

{% /preview %}

## With fallback content

Children become fallback content displayed when the embed cannot load.

{% preview source=true %}

{% embed url="https://example.com/video" %}
Video could not be loaded. [Watch on the original site](https://example.com/video).
{% /embed %}

{% /preview %}

### Supported providers

| Provider | Example URL |
|----------|------------|
| YouTube | `https://www.youtube.com/watch?v=...` or `https://youtu.be/...` |
| Vimeo | `https://vimeo.com/...` |
| Twitter/X | `https://twitter.com/.../status/...` |
| CodePen | `https://codepen.io/.../pen/...` |
| Spotify | `https://open.spotify.com/...` |
| Generic | Any other URL (rendered as iframe) |

### Attributes

{% include file="rune-attributes.md" variables={r: "rune:embed"} /%}

