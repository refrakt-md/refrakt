---
title: Embed
description: Embed external content like videos, tweets, and code demos
---

# Embed

Embed external content from popular platforms. URLs are automatically detected and converted to the appropriate embed format. Supports YouTube, Vimeo, Twitter/X, CodePen, and Spotify.

## Basic usage

Pass a URL and optional title to embed content from a supported provider.

```markdoc
{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Example video" /%}
```

{% embed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Example video" /%}

## With fallback content

Children become fallback content displayed when the embed cannot load.

```markdoc
{% embed url="https://example.com/video" %}
Video could not be loaded. [Watch on the original site](https://example.com/video).
{% /embed %}
```

{% embed url="https://example.com/video" %}
Video could not be loaded. [Watch on the original site](https://example.com/video).
{% /embed %}

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

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `string` | **required** | URL to embed |
| `type` | `string` | — | Content type (auto-detected from URL if omitted) |
| `aspect` | `string` | `16:9` | Aspect ratio: `16:9`, `4:3`, `1:1`, or `auto` |
| `title` | `string` | — | Accessible title for the iframe |
