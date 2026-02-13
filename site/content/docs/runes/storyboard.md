---
title: Storyboard
description: Comic and storyboard layouts from images and captions
---

# Storyboard

Comic/storyboard layout. Images become panels, following paragraphs become captions.

## Basic usage

Each image starts a new panel. Text after the image becomes that panel's caption.

```markdoc
{% storyboard columns=3 %}
![Panel 1](/images/panel1.jpg)

The journey begins.

![Panel 2](/images/panel2.jpg)

An unexpected discovery.

![Panel 3](/images/panel3.jpg)

The plot thickens...
{% /storyboard %}
```

## Style variants

Use the `style` attribute to change the visual presentation.

```markdoc
{% storyboard columns=2 style="polaroid" %}
![Summer](/images/summer.jpg)

Summer 2024

![Autumn](/images/autumn.jpg)

The leaves turn gold
{% /storyboard %}
```

Available styles: `clean` (default), `comic` (thick borders, tilted panels), `polaroid` (white frame with shadow).

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `columns` | `number` | `3` | Panels per row |
| `style` | `string` | `clean` | Visual style: `clean`, `comic`, `polaroid` |
