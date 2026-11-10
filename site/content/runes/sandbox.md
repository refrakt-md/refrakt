---
title: Sandbox
description: Isolated HTML/CSS/JS rendering in an iframe with optional framework loading
category: Code
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:sandbox"} /%}

Render raw HTML, CSS, and JavaScript in an isolated iframe. The sandbox handles isolation and optional framework loading — useful for live examples, embedded widgets, and framework demos.

## Basic usage

Write HTML directly inside the sandbox tag. The content is rendered in an iframe, completely isolated from the rest of the page.

{% preview source=true %}
	{% sandbox %}
	<style>
	  .badge {
	    display: inline-block;
	    padding: 4px 12px;
	    background: #7C3AED;
	    color: white;
	    border-radius: 9999px;
	    font-family: system-ui;
	    font-size: 14px;
	  }
	</style>
	<span class="badge">Live HTML</span>
	{% /sandbox %}
{% /preview %}

## Framework presets

The `framework` attribute loads a CSS framework from CDN automatically.

{% preview source=true %}
	{% sandbox framework="tailwind" %}
	<div class="flex gap-3 p-4">
	  <button class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
	    Primary
	  </button>
	  <button class="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
	    Secondary
	  </button>
	</div>
	{% /sandbox %}
{% /preview %}

Available presets:

| Preset | What's loaded |
|--------|--------------|
| `tailwind` | Tailwind Play CDN |
| `bootstrap` | Bootstrap 5 CSS |
| `bulma` | Bulma CSS |
| `pico` | Pico CSS |

## Custom dependencies

Load any script or stylesheet by URL with the `dependencies` attribute.

{% preview source=true %}
	{% sandbox dependencies="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" %}
	<main class="container">
	  <article>
	    <h2>Join the beta</h2>
	    <p>Early access to offline sync, shipping to testers this spring.</p>
	    <button>Request an invite</button>
	  </article>
	</main>
	{% /sandbox %}
{% /preview %}

## With JavaScript

Scripts run inside the sandboxed iframe, fully isolated from the host page.

{% preview source=true %}
	{% sandbox src="counter" /%}
{% /preview %}

## ES modules from a CDN

Because scripts run for real, you can `import` an ES module straight from a CDN inside a `<script type="module">` — no bundler, no install. Here a version-pinned three.js draws a spinning cube:

{% preview source=true %}
	{% sandbox src="threejs-cube" height=300 /%}
{% /preview %}

Pin the version for reproducibility; for production also honour `prefers-reduced-motion` and provide a fallback — see the polished [three.js scene in Media guests](/docs/concepts/media-guests#live-program).

## Host-owned height — `height="fill"`

`height` normally takes pixels (or auto-sizes to the content). Set `height="fill"` when a **host element owns the height** — the iframe is pinned to `100%` of the host and the auto-resize negotiation is disabled. The flagship case is a sandbox serving as a [cover backdrop](/runes/marketing/hero#animated-background-a-live-program-as-the-backdrop) (a hero or card with `media-position="cover"`): there the engine applies `fill` automatically, so you only need it explicitly for custom fixed-height containers.

```markdoc
{% sandbox src="wireframe-waves" height="fill" /%}
```

Inside a filling sandbox, size a full-bleed canvas with `position: fixed; inset: 0` rather than `height: 100%`: the content sits in a wrapper of automatic height, so percentage heights collapse.

## Deferred activation — keep heavy sandboxes off the critical path

A sandbox is **eager** by default: its iframe and every dependency download as the page renders. That's fine for a small demo, but a heavy scene — a three.js render, a large framework playground — shouldn't tax a perf-sensitive page (a landing page, a long article) before the visitor has even scrolled to it.

Set `activation` to defer the mount. The sandbox shows a `poster` (and an explicit **Run** control) in the iframe's place; nothing downloads until it activates:

- **`visible`** — mounts when scrolled into view (via `IntersectionObserver`). Best for below-the-fold scenes.
- **`click`** — mounts only when the visitor presses the control. Best for the heaviest cases.

```markdoc
{% sandbox activation="visible" poster="/img/scene-poster.png" height=400 %}
<canvas id="c"></canvas>
<script type="module">
  import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  // … heavy scene; nothing here loads until the sandbox scrolls into view
</script>
{% /sandbox %}
```

Under `prefers-reduced-motion`, a non-eager sandbox does **not** auto-activate even in `visible` mode — the poster and Run control stay, so motion-sensitive visitors opt in deliberately. Eager sandboxes are unaffected.

## Data binding — `window.RF_DATA`

A sandbox can be **fed data from your registry**. Set a `data` query — the same field-match grammar [`collection`](/runes/collection) uses — and the build resolves it, serializes the result, and exposes it to the iframe as a frozen `window.RF_DATA`. Your code renders *anything* from your own content: the registry's third render target, after `collection` (HTML) and `aggregate` (SVG) — bring your own renderer.

`data-shape` decides the form it arrives in: `flat`, a list of records (the default); `tree`, nested by URL; or `graph`, entities and the relationships between them. `data-fields` keeps only the fields you name, and `data-limit` caps the number of records (500 by default; the build warns when it cuts).

Here a `data-shape="tree"` binding feeds this site's own rune-section page tree to a three.js scene — a live, navigable **3D star-map**: each section is a star and its pages orbit it as a little planetary system, nested by URL depth (drag to rotate, click a node to open it). It's a heavy WebGL scene, so it's set `activation="visible"` — the scene (and three.js) only loads once you scroll it into view:

{% preview source=true %}

	{% sandbox src="sitemap-3d" data="type:page url:/runes/*" data-shape="tree" activation="visible" height=440 /%}

{% /preview %}

**Always pair a data-bound visualization with an accessible fallback** — the 3D view is progressive enhancement, not the only representation. Author a `{% collection %}` (or `{% aggregate %}`) running the same query in the sandbox's fallback slot so no-JS, no-WebGL, and screen-reader users still get the data as an honest list. (The fallbacks for the sandboxes on this page are omitted to keep it short.)

### `data-shape="graph"` — nodes and edges

`data-shape="graph"` projects the queried entities as **nodes** and walks their [relationship edges](/runes/relationships) into a node-link payload — `window.RF_DATA = { shape: "graph", nodes, edges }`, where each edge is `{ from, to, kind }`. Only edges whose *both* endpoints are in the selection are kept, so the graph is closed: ready for a node-link or force-directed layout.

Here a single `data="type:spec type:work type:decision type:milestone" data-shape="graph"` binding feeds this project's **own plan** — every spec, work item, decision, and milestone, wired by their relationships — to a three.js force-directed graph. Specs, decisions, and milestones glow brightest; work items cluster around the specs they implement. Drag to rotate, hover a node for its title and status. Like the star-map, it's a heavy scene, so it mounts on `activation="visible"`:

{% preview source=true %}

	{% sandbox src="plan-graph-3d" data="type:spec type:work type:decision type:milestone" data-shape="graph" data-fields="title,status" data-limit=600 activation="visible" height=520 /%}

{% /preview %}

## Source code panels with data-source

When used inside a preview with `source=true`, you can mark elements with `data-source` to control what appears in the source tab. Unmarked elements (scaffolding, wrappers) are excluded from the source view but still render in the preview.

{% preview source=true %}
	{% sandbox framework="tailwind" %}
	<div class="min-h-[120px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
	  <button data-source class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium transition-colors">
	    Click me
	  </button>
	</div>
	{% /sandbox %}
{% /preview %}

Named `data-source` values create labelled tabs in the source panel.

{% preview source=true %}
	{% sandbox %}
	<style data-source="CSS">
	  .card {
	    font-family: system-ui;
	    border: 1px solid #e5e7eb;
	    border-radius: 12px;
	    padding: 24px;
	    max-width: 300px;
	  }
	  .card h3 { margin: 0 0 8px; }
	  .card p { margin: 0; color: #6b7280; }
	  @media (prefers-color-scheme: dark) {
	    .card { border-color: #374151; }
	    .card p { color: #9ca3af; }
	  }
	  [data-theme="dark"] .card { border-color: #374151; }
	  [data-theme="dark"] .card p { color: #9ca3af; }
	</style>
	<div class="wrapper" style="padding: 24px;">
	  <div data-source="HTML" class="card">
	    <h3>Weekly digest</h3>
	    <p>Every Monday: new releases, open issues and the week's top threads.</p>
	  </div>
	</div>
	{% /sandbox %}
{% /preview %}

## Standalone usage

Without a preview wrapper, the sandbox renders inline with no chrome — useful for embedding a live widget in the middle of prose.

{% sandbox %}
<style>
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse-dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: #7C3AED; animation: pulse 2s infinite;
  }
</style>
<div class="pulse-dot"></div>
{% /sandbox %}

```markdoc
{% sandbox %}
<style>
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse-dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: #7C3AED; animation: pulse 2s infinite;
  }
</style>
<div class="pulse-dot"></div>
{% /sandbox %}
```

## Tailwind card grid

A more complete example using Tailwind's utility classes for a responsive card layout.

{% preview source=true responsive="mobile,tablet,desktop" %}
	{% sandbox src="tailwind-feature-cards" framework="tailwind" /%}
{% /preview %}

## Design token context

When your site uses `{% design-context %}` runes to define tokens, a sandbox can receive those tokens automatically at build time. Use the `context` attribute to reference a named design context by its `scope`.

```markdoc
{% sandbox context="brand" %}
<div style="color: var(--color-primary); font-family: var(--font-body)">
  Styled with brand tokens
</div>
{% /sandbox %}
```

Tokens are injected into the iframe as CSS custom properties and Google Fonts links, using the same names the design-context defines (`--color-*`, `--font-*`, `--spacing-unit`, `--radius-*`, `--shadow-*`). If `context` is omitted or no matching design context exists for the default scope, no tokens are injected.

## External source files

Instead of writing HTML inline, load sandbox content from a directory of source files. The `src` attribute points to a named subdirectory inside your project's examples directory.

```markdoc
{% sandbox src="login-form" /%}
```

### Directory structure

By default, the examples directory is `../examples` relative to your content root. Each example is a subdirectory containing the files for that sandbox.

```
project/
├── content/
│   └── docs/
│       └── components.md
└── examples/
    └── login-form/
        ├── index.html
        ├── styles.css
        └── app.js
```

### File discovery

The sandbox scans the directory and assembles content from these file types:

| Extension | Role | Behavior |
|-----------|------|----------|
| `.html` | HTML body | If multiple exist, `index.html` is preferred |
| `.css` | Stylesheet | Multiple files concatenated alphabetically |
| `.js` | Script | Multiple files concatenated alphabetically |
| `.svg` | SVG asset | Injected into the HTML body |
| `.glsl-vert` | Vertex shader | Exposed as a `VERTEX_SHADER` JavaScript constant |
| `.glsl-frag` | Fragment shader | Exposed as a `FRAGMENT_SHADER` JavaScript constant |

Discovered content is automatically wrapped in `data-source` annotated elements, so source panels appear when used inside `{% preview source=true %}`.

### Combining with frameworks

The `src` attribute works alongside other sandbox attributes. For example, load files from a directory and apply a CSS framework:

{% preview source=true %}
	{% sandbox src="profile-card" framework="tailwind" /%}
{% /preview %}

### Merging with inline content

You can combine file-sourced and inline content. Write additional HTML, CSS, or JavaScript between the tags — it merges with the file content.

```markdoc
{% sandbox src="login-form" %}
<style data-source="Overrides">
  .form { border: 2px solid red; }
</style>
{% /sandbox %}
```

### Error handling

If the named directory does not exist, the sandbox displays an error message in place of the preview.

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:sandbox"} /%}
