---
title: Preview
description: Component showcase with theme toggle, responsive viewports, and adjustable width
---

# Preview

A component showcase wrapper that renders content in a framed environment with a theme toggle toolbar, responsive viewport simulation, and adjustable width. Useful for documentation sites, design systems, and theme demonstrations.

## Basic usage

Wrap any content in a preview to give it a visual frame with a theme toggle.

```markdoc
{% preview title="Hint variants" %}
{% hint type="note" %}
This is a note inside a preview.
{% /hint %}
{% /preview %}
```

## Width control

The `width` attribute controls how wide the preview renders. This is especially useful in narrow content layouts where components need more room.

- `narrow` -- stays within the parent container width
- `medium` -- slightly wider than the content area
- `wide` -- comfortably wider (default)
- `full` -- spans the full available width

```markdoc
{% preview title="Full width" width="full" %}
{% hero %}
# Welcome
Build something great.
{% /hero %}
{% /preview %}
```

## Theme modes

The toolbar toggle lets users switch between auto (system preference), light, and dark modes. The `theme` attribute sets the initial mode.

```markdoc
{% preview theme="dark" %}
Content rendered in dark mode by default.
{% /preview %}
```

The theme toggle scopes CSS custom properties to the preview canvas, so child content inherits the selected theme without affecting the rest of the page.

## Responsive viewports

The `responsive` attribute adds a viewport simulation toolbar that lets users switch between device sizes. Specify a comma-separated list of presets.

Available presets: `mobile` (375px), `tablet` (768px), `desktop` (full width).

```markdoc
{% preview source=true responsive="mobile,tablet,desktop" %}
{% hint type="note" %}
Resize me to see how this looks at different breakpoints.
{% /hint %}
{% /preview %}
```

The preview starts at the last preset in the list (e.g., `desktop` above). Switching viewports wraps the canvas in a constrained frame with a dashed border and a width label.

You can include any subset of presets:

```markdoc
{% preview responsive="mobile,tablet" %}
{% hint type="check" %}
Mobile and tablet only -- no desktop option.
{% /hint %}
{% /preview %}
```

## Source code toggle

The preview rune supports two ways to show source code alongside rendered output.

### Auto-inferred source

Add `source` to automatically extract the children's Markdoc text as the code view. No duplication needed -- the preview infers the source from what it renders.

```markdoc
{% preview source=true %}
{% hint type="note" %}
This is a note inside a preview.
{% /hint %}
{% /preview %}
```

This is ideal for Markdoc documentation sites where the preview content IS the source code.

### Explicit source

Add a fenced code block as a direct child for full control over what the code view shows. The fence can be in any language -- JSX, Vue, HTML, or Markdoc. This is useful when documenting external frameworks where the source differs from the rendered preview.

````markdoc
{% preview title="Button" %}
```jsx
<Button variant="primary">Click me</Button>
```

![button preview](button.png)
{% /preview %}
````

If both a fence and `source` are present, the fence takes priority.

## Sandbox embedding

Preview pairs naturally with the [sandbox](/docs/runes/sandbox) rune. Nest a sandbox inside a preview to get live HTML rendering with theme toggling, responsive viewports, and source code panels -- all in one component.

```markdoc
{% preview source=true responsive="mobile,tablet,desktop" %}
{% sandbox framework="tailwind" %}
<button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
  Click me
</button>
{% /sandbox %}
{% /preview %}
```

The preview toolbar controls the sandbox iframe -- theme toggles propagate into the iframe, and viewport presets constrain its width. Add `data-source` attributes inside the sandbox to extract specific elements as syntax-highlighted source panels.

```markdoc
{% preview source=true %}
{% sandbox framework="tailwind" %}
<style data-source="CSS">
  .card { padding: 1.5rem; border-radius: 0.5rem; }
</style>
<div class="card" data-source="HTML">
  <h3>Card Title</h3>
  <p>Card content goes here.</p>
</div>
{% /sandbox %}
{% /preview %}
```

See the [sandbox rune docs](/docs/runes/sandbox) for full details on framework presets, dependencies, and data-source panels.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | -- | Optional label displayed in the toolbar |
| `theme` | `"auto"` \| `"light"` \| `"dark"` | `"auto"` | Initial theme mode (user can toggle) |
| `width` | `"narrow"` \| `"medium"` \| `"wide"` \| `"full"` | `"wide"` | Canvas width control |
| `source` | `boolean` | `false` | Auto-infer source code from children's Markdoc text |
| `responsive` | `string` | -- | Comma-separated viewport presets: `mobile`, `tablet`, `desktop` |
