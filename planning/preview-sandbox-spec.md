# Preview & Sandbox Runes — Specification

> **Status:** Design proposal (refined)
> **Audience:** Internal spec addition

---

## Overview

Two runes that work independently and compose together to provide live, interactive code examples in refrakt.md content. Preview provides the chrome — toolbar, theme toggles, source panel, responsive viewport simulation. Sandbox renders raw HTML/CSS/JS in an isolated iframe. Together they cover the full spectrum from simple "here's what it looks like" documentation to full interactive sandboxes with framework support and multi-language source panels.

---

## Preview Rune

### Purpose

Show rendered content with controls for viewing source code, switching themes, and simulating responsive viewports. The preview rune is the chrome — the toolbar, the toggles, the source panel. It doesn't care what's inside it.

### Current State

Exists in the codebase. Supports `title`, `theme` (auto/light/dark), `width` (narrow/medium/wide/full), and `source` (boolean) attributes. Theme toggle toolbar with auto/light/dark modes. Source code inference from children's Markdoc text via `__source` variable and `node.lines`.

### Proposed Enhancement: Responsive Viewport Simulation

Add a `responsive` attribute that places viewport-width simulation toggles in the toolbar. This is orthogonal to `width` (which controls the preview's footprint on the page) and `theme` (which controls color scheme).

```markdoc
{% preview responsive="mobile,tablet,desktop" %}
{% nav style="horizontal" %}
- [Home](/)
- [About](/about)
- [Blog](/blog)
{% /nav %}
{% /preview %}
```

Built-in responsive presets:

| Preset | Viewport Width | Icon |
|---|---|---|
| `mobile` | 375px | Phone icon |
| `tablet` | 768px | Tablet icon |
| `desktop` | Full container width | Monitor icon |

When `responsive` is set, the toolbar gains a segmented control for switching between presets. The preview canvas constrains its inner width to the selected preset, with a visible frame showing the current dimensions. Content inside reflows naturally as the simulated viewport changes.

When `responsive` is not set (default), no viewport toggles appear — the preview renders at its `width` setting as today.

### Source Inference

When `source=true`, the preview rune infers the source code to display in the code tab:

- **Normal content:** The raw Markdoc text is extracted via `__source` + `node.lines` and shown
- **Sandbox child:** The sandbox's raw HTML content is extracted (see Sandbox section)

If `source` is omitted or `false`, the author provides source manually via a code fence as the last child (existing behavior).

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `title` | `String` | -- | Optional label displayed in the toolbar |
| `theme` | `"auto"` \| `"light"` \| `"dark"` | `"auto"` | Initial theme mode (user can toggle) |
| `width` | `"narrow"` \| `"medium"` \| `"wide"` \| `"full"` | `"wide"` | Canvas width on page |
| `source` | `Boolean` | `false` | Auto-infer source code from children |
| `responsive` | `String` (comma-separated) | -- | Viewport simulation presets: `mobile`, `tablet`, `desktop` |

---

## Sandbox Rune

### Purpose

Render raw HTML/CSS/JS in an isolated environment within the page. The sandbox handles isolation and framework loading. It produces rendered output that can be viewed standalone or wrapped in a preview rune for chrome.

### Content Handling

Markdoc cannot reliably parse raw HTML inside tags — `<style>`, `<script>`, and block-level HTML elements are not guaranteed to survive the Markdoc AST. The sandbox solves this by using **raw source extraction**: the schema reads `config.variables.__source` and `node.lines` to extract the raw text between the opening and closing tags, bypassing the Markdoc parser entirely.

The extracted raw HTML string is passed to the Svelte component as content. The schema does not attempt to parse or transform the HTML — it treats it as an opaque string.

### Isolation Strategy

All sandbox content renders inside an **iframe** using `srcdoc`. This provides:

- Complete CSS isolation from the host page
- Safe script execution in a sandboxed context
- Framework script loading via full document context
- Predictable behavior regardless of content complexity

One isolation path means one code path to maintain and test.

### Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `framework` | `String` | -- | Preset framework to load (see below) |
| `dependencies` | `String` (comma-separated URLs) | -- | Custom scripts/stylesheets to load |
| `label` | `String` | -- | Label shown when used inside compare |
| `height` | `Number` | `auto` | Fixed height for the sandbox iframe |

### Framework Presets

The `framework` attribute loads common CSS frameworks/libraries automatically:

| Preset | What's Loaded |
|---|---|
| `tailwind` | Tailwind Play CDN (`cdn.tailwindcss.com`) |
| `bootstrap` | Bootstrap 5 CSS |
| `bulma` | Bulma CSS |
| `pico` | Pico CSS |

Custom dependencies override or extend presets:

```markdoc
{% sandbox dependencies="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2/dist/shoelace.js" %}
<sl-button variant="primary">Shoelace Button</sl-button>
{% /sandbox %}
```

### Source Extraction with `data-source`

When the parent preview has `source=true`, the sandbox provides source code for the code tab. This is a **component-level feature** — the Svelte component parses the raw HTML string looking for `data-source` attributes at render time.

**Simple case — no markers:** Everything inside the sandbox becomes the source.

```markdoc
{% sandbox framework="tailwind" %}
<button class="bg-purple-600 text-white px-6 py-3 rounded-lg">
  Click me
</button>
{% /sandbox %}
```

Source tab shows the button HTML.

**With scaffolding — element markers:** Only elements marked with `data-source` appear in the source tab. The marker is stripped from the rendered output.

```markdoc
{% sandbox framework="tailwind" %}
<div class="min-h-[200px] flex items-center justify-center bg-gray-50">
  <button data-source class="bg-purple-600 text-white px-6 py-3 rounded-lg">
    Click me
  </button>
</div>
{% /sandbox %}
```

Source tab shows only the button. The centering wrapper is excluded.

**Multi-language — labelled markers:** Named `data-source` values create separate labelled panels in the source tab, auto-generating a codegroup-style tabbed view.

```markdoc
{% sandbox %}
<style data-source="CSS">
  .card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 24px;
  }
</style>
<div class="wrapper">
  <div data-source="HTML" class="card">
    <h2>Card Title</h2>
    <p>Card content goes here.</p>
  </div>
</div>
{% /sandbox %}
```

Source tab shows two panels: "CSS" and "HTML".

This extends naturally to JavaScript:

```markdoc
{% sandbox %}
<style data-source="CSS">
  .dropdown-menu { display: none; }
  .dropdown-menu.open { display: block; }
</style>
<div data-source="HTML" class="dropdown">
  <button onclick="toggle()">Menu</button>
  <ul class="dropdown-menu">
    <li>Option 1</li>
    <li>Option 2</li>
  </ul>
</div>
<script data-source="JavaScript">
  function toggle() {
    document.querySelector('.dropdown-menu').classList.toggle('open');
  }
</script>
{% /sandbox %}
```

Source tab shows three panels: CSS, HTML, JavaScript.

### Standalone Usage

The sandbox rune works without a preview wrapper. It simply renders isolated HTML inline with the content — no toolbar, no source toggle, no chrome. Useful for embedding a live widget or animation in the middle of a blog post.

```markdoc
Here's what the animation looks like in practice:

{% sandbox %}
<style>
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse-dot { width: 12px; height: 12px; border-radius: 50%;
    background: #7C3AED; animation: pulse 2s infinite; }
</style>
<div class="pulse-dot"></div>
{% /sandbox %}

As you can see, the easing creates a natural breathing effect.
```

### Static Rendering Fallback

The sandbox requires JavaScript to render its iframe. For static/SSR output:

- If inside a preview with `source=true`: render only the source code panels (graceful degradation)
- If standalone: render a static code block with the sandbox content
- The content is never lost — it's always available as readable source

This is progressive enhancement: the static output shows source code, and JS hydration adds the interactive sandbox.

---

## Composition Patterns

### Basic: Preview + Source

Rune documentation, Markdown tutorials. No sandbox needed — content renders through the normal pipeline.

```markdoc
{% preview source=true %}
{% callout type="warning" %}
This is a warning callout rendered by the rune system.
{% /callout %}
{% /preview %}
```

### Live Example: Preview + Sandbox

Design system docs, multi-language tutorials.

```markdoc
{% preview source=true %}
{% sandbox framework="tailwind" %}
<style data-source="CSS">
  .card-grid { container-type: inline-size; }
</style>
<div data-source="HTML" class="card-grid grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
  <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
    <h3 class="font-bold text-lg">Plan A</h3>
    <p class="text-gray-500">$10/month</p>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
    <h3 class="font-bold text-lg">Plan B</h3>
    <p class="text-gray-500">$25/month</p>
  </div>
</div>
{% /sandbox %}
{% /preview %}
```

### Responsive Preview

Layout documentation where the author wants to show how content reflows at different viewport widths.

```markdoc
{% preview source=true responsive="mobile,tablet,desktop" %}
{% sandbox framework="tailwind" %}
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  <div class="bg-white rounded-xl p-6 shadow">Card 1</div>
  <div class="bg-white rounded-xl p-6 shadow">Card 2</div>
  <div class="bg-white rounded-xl p-6 shadow">Card 3</div>
</div>
{% /sandbox %}
{% /preview %}
```

The toolbar shows mobile/tablet/desktop viewport toggles alongside the theme and source toggles.

### Standalone Sandbox

Blog posts, inline demos. No preview chrome.

```markdoc
The CSS `backdrop-filter` property creates frosted glass effects:

{% sandbox %}
<style>
  .glass {
    backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 24px;
    color: white;
  }
  .bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px; }
</style>
<div class="bg">
  <div class="glass">Frosted glass effect</div>
</div>
{% /sandbox %}

This works in all modern browsers and degrades gracefully.
```

### When to Use Which

| Scenario | Approach |
|---|---|
| Rune documentation, Markdoc examples | Preview with `source=true` |
| Simple HTML/CSS live example | Preview + Sandbox |
| Need scaffolding/centering wrapper | Sandbox with `data-source` markers |
| Multi-language (HTML + CSS + JS) | Sandbox with labelled `data-source` |
| Responsive layout demo | Preview with `responsive` + Sandbox |
| Standalone embedded widget | Sandbox without preview |

---

## Future Enhancements

These features are explicitly deferred from v1 but noted for future consideration:

### Annotated Code Fences

A lightweight syntax where a code fence annotation triggers live rendering — the fence content serves as both source and rendered preview. Currently blocked by Markdoc's fence parsing (only captures first word as language). Could be enabled via Markdoc's annotation syntax (`{% ... %}` on fences) if that proves ergonomic.

### Compare + Sandbox Composition

Extend the existing compare rune to support non-fence children (currently only handles `<pre>` code blocks). This would enable side-by-side sandbox comparisons:

```markdoc
{% preview source=true %}
{% compare labels="Before,After" %}
{% sandbox label="Before" %}
<button style="background: red; color: white;">Click</button>
{% /sandbox %}
{% sandbox label="After" framework="tailwind" %}
<button class="bg-purple-600 text-white px-6 py-3 rounded-lg">Click me</button>
{% /sandbox %}
{% /compare %}
{% /preview %}
```

This reuses compare's existing layout/label logic rather than duplicating it inside preview.

---

## Summary

| Rune | Purpose | Used For |
|---|---|---|
| **Preview** | Display chrome — toolbar, theme toggles, source panel, responsive simulation | Rune docs, any "show and tell" pattern |
| **Sandbox** | Isolated HTML/CSS/JS rendering via iframe | Live examples, embedded widgets, framework demos |

Both work independently. Preview + sandbox compose for full-featured interactive documentation. The author picks the right tool for the complexity of their example.
