---
title: Preview
description: Component showcase with theme toggle and responsive viewports
category: Design
plugin: design
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:preview"} /%}

A component showcase wrapper that renders content in a framed environment with a theme toggle toolbar and responsive viewport simulation. Useful for documentation sites, design systems, and theme demonstrations.

## Basic usage

Wrap content in `{% preview %}` … `{% /preview %}` to give it a frame with a theme toggle. With `source=true`, the Markdoc you wrote is shown beside it, as in every example on this site:

{% preview source=true %}

	{% hint type="note" %}
	Prices include VAT. Shipping is calculated at checkout.
	{% /hint %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| The first fenced code block | The source shown in the code view; it is not rendered in the canvas |
| A `{% snippet %}` beside other content | The source, read from the file |
| A `{% snippet %}` on its own | The rendered content; with `source=true`, the code view shows the tag |
| Everything else | The rendered content inside the frame |

## Theme modes

The toolbar toggle lets users switch between auto (system preference), light, and dark modes. The `theme` attribute sets the initial mode; this preview is written `{% preview theme="dark" source=true %}`:

{% preview theme="dark" source=true %}

	{% hint type="check" %}
	Your order has shipped. Track it from your account page.
	{% /hint %}

{% /preview %}

The theme toggle scopes CSS custom properties to the preview canvas, so child content inherits the selected theme without affecting the rest of the page.

## Responsive viewports

The `responsive` attribute adds a viewport simulation toolbar that lets users switch between device sizes. Specify a comma-separated list of presets: `mobile` (375px), `tablet` (768px), `desktop` (full width). This preview is written `{% preview source=true responsive="mobile,tablet,desktop" %}`:

{% preview source=true responsive="mobile,tablet,desktop" %}

	{% hint type="warning" %}
	Checkout closes at midnight. Orders placed after that ship on Monday.
	{% /hint %}

{% /preview %}

The preview starts at the last preset in the list (`desktop` above). Switching viewports wraps the canvas in a constrained frame with a dashed border and a width label. Any subset of presets works: `responsive="mobile,tablet"` offers no desktop option.

## Source code toggle

The preview rune supports two ways to show source code alongside rendered output.

### Auto-inferred source

Add `source=true` to extract the children's Markdoc text as the code view, as most examples on this page do. No duplication needed — the preview infers the source from what it renders. This is ideal for Markdoc documentation sites where the preview content IS the source code.

### Explicit source

Add a fenced code block as a direct child for full control over what the code view shows. The fence can be in any language — JSX, Vue, HTML, or Markdoc. This is useful when documenting external frameworks where the source differs from the rendered preview:

{% preview title="ProfileCard" %}

	```jsx
	<ProfileCard
	  name="Sarah Johnson"
	  handle="sarahjohnson"
	  bio="Product designer passionate about crafting delightful user experiences."
	/>
	```

	{% sandbox src="profile-card" /%}

{% /preview %}

The source can also be read from a file: put a [`{% snippet %}`](/runes/snippet) where the fence would go, beside the content, and the code view shows the file as it is now. A snippet alone in a preview is the content instead, as on the snippet page.

If both a fence and `source` are present, the fence takes priority.

## Sandbox embedding

Preview pairs naturally with the [sandbox](/runes/sandbox) rune. Nest a sandbox inside a preview to get live HTML rendering with theme toggling, responsive viewports, and source code panels — all in one component.

{% preview source=true responsive="mobile,tablet,desktop" %}

	{% sandbox framework="tailwind" %}
	<button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
	  Save changes
	</button>
	{% /sandbox %}

{% /preview %}

The preview toolbar controls the sandbox iframe — theme toggles propagate into the iframe, and viewport presets constrain its width. Add `data-source` attributes inside the sandbox to extract specific elements as syntax-highlighted source panels:

{% preview source=true %}

	{% sandbox framework="tailwind" %}
	<style data-source="CSS">
	  .card { padding: 1.5rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; }
	</style>
	<div class="card" data-source="HTML">
	  <h3 class="font-semibold">Free returns</h3>
	  <p>Send it back within 30 days for a full refund.</p>
	</div>
	{% /sandbox %}

{% /preview %}

See the [sandbox rune docs](/runes/sandbox) for full details on framework presets, dependencies, and data-source panels.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:preview"} /%}
