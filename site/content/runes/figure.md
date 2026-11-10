---
title: Figure
description: A captioned container for images, code, tables and diagrams, with sizing and alignment
category: Sections & blocks
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:figure"} /%}

A captioned container. A figure holds an image most often, but it accepts any block content (a code block, a table, a diagram, another rune) and captions it, with sizing and alignment controls. To set an image beside a passage of text, use [mediatext](/runes/mediatext); to present a screenshot or product shot in a framed viewport with decorative chrome, use [showcase](/runes/showcase).

## How Markdown is read

Everything in the body is kept, in the order you wrote it.

| You write | It becomes |
|-----------|------------|
| An image, a video, or a [`placeholder:` / `icon:` image](/docs/concepts/image-schemes) | The figure's media; an image in a paragraph of its own is unwrapped, so it sits directly in the figure |
| The first paragraph that holds no image, when `caption` is not set | The caption, shown last, below the content |
| Anything else (a code block, a table, a list, a nested rune, another paragraph) | Kept as written |

## With caption attribute

Set the caption directly on the rune.

{% preview source=true %}
	{% figure caption="A coral reef teeming with life beneath turquoise waters" size="large" align="center" %}
	![Coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)
	{% /figure %}
{% /preview %}

## With paragraph caption

If no `caption` attribute is provided, the first paragraph inside the rune is used as the caption.

{% preview source=true %}
	{% figure size="medium" %}
	![Hot springs](https://assets.refrakt.md/figure-hot-springs.jpg)

	Steam rising from volcanic hot springs in the Icelandic highlands.
	{% /figure %}
{% /preview %}

## Captioning code, tables and diagrams

A figure captions whatever it holds. Use it to caption a code block, a [snippet](/runes/snippet), a table, or a diagram.

{% preview source=true %}
	{% figure caption="The request handler and its retry policy" %}
	```ts
	export async function handler(req: Request) {
		return fetch(req, { retry: 3 });
	}
	```

	| Option  | Default |
	|---------|---------|
	| `retry` | `3`     |
	{% /figure %}
{% /preview %}

[Codegroup](/runes/codegroup) is the other way to label code: it puts a title bar *above* the block, where figure puts a caption *below* it. Use codegroup when the label is a filename and figure when it describes what the reader is looking at.

## Structured data

A figure whose body is only media publishes an [`ImageObject`](https://schema.org/ImageObject), with the image as `contentUrl` and the caption as `caption`. Once it holds anything else, it publishes no schema.org type at all: its caption then describes more than the image, so calling the figure an `ImageObject` would be a false claim. `refrakt inspect figure` shows the row, and the selection rule as `by field body`.

## Elevation & frame

A figure *is* a frame around its image, so it sets `frameTarget: "self"` ([surface model](/docs/concepts/surfaces)): `frame` chrome lands on the figure itself. `elevation` floats the figure as a box (`box-shadow`); `frame-shadow` is the image's silhouette `drop-shadow`; `frame-aspect` crops it to a ratio.

{% preview source=true %}
	{% figure elevation="floating" frame-aspect="4/3" caption="Framed at 4/3 with a lifted figure" %}
	![Coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)
	{% /figure %}
{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:figure"} /%}
