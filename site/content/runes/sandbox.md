---
title: Sandbox
description: Isolated HTML/CSS/JS rendering in an iframe with optional framework loading
category: Code
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:sandbox"} /%}

Render raw HTML, CSS, and JavaScript in an isolated iframe, with an optional CSS framework loaded for you. Use it for live examples, embedded widgets, and framework demos. Inside a `{% preview %}` it gets the preview's chrome and source panel; on its own it renders inline with no chrome, so you can drop a live widget into prose.

## Basic usage

Write HTML directly inside the tag. Nothing in it can affect the rest of the page.

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

## Load code from files

Keep longer examples in their own files and point `src` at a directory of them:

```markdoc
{% sandbox src="login-form" /%}
```

### Directory structure

`src` names a subdirectory of the examples directory, which is `../examples` relative to your content root by default.

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

### What each file becomes

| Extension | Becomes |
|-----------|---------|
| `.html` | The body; `index.html` wins when there are several |
| `.css` | Styles, concatenated alphabetically |
| `.js` | Scripts, concatenated alphabetically |
| `.svg` | Inlined into the body |
| `.glsl-vert` / `.glsl-frag` | A `VERTEX_SHADER` / `FRAGMENT_SHADER` JavaScript constant |

In a preview's source panel, the HTML, CSS and JavaScript each get a tab. `src` combines with every other attribute, and anything you write between the tags is added to the files' content:

```markdoc
{% sandbox src="login-form" %}
<style data-source="Overrides">
  .form { border: 2px solid red; }
</style>
{% /sandbox %}
```

If the directory does not exist, the sandbox shows an error in place of the preview.

## Load a CSS framework

`framework` loads one from a CDN: `tailwind` (the Tailwind Play CDN), `bootstrap` (Bootstrap 5), `bulma`, or `pico`.

{% preview source=true %}
	{% sandbox src="profile-card" framework="tailwind" /%}
{% /preview %}

## Load any script or stylesheet

`dependencies` takes URLs, comma-separated, and loads each as a script or stylesheet.

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

## Run JavaScript

Scripts run inside the iframe. A `<script type="module">` can `import` straight from a CDN, with no bundler; here a version-pinned three.js draws a spinning cube:

{% preview source=true %}
	{% sandbox src="threejs-cube" height=300 /%}
{% /preview %}

Pin the version, honor `prefers-reduced-motion`, and give a fallback, as the [three.js scene in Media guests](/docs/concepts/media-guests#live-program) does.

## Delay heavy sandboxes until they are needed

A sandbox loads with the page by default. For a heavy scene, set `activation` so nothing downloads until it is needed; a `poster` image and a **Run** control stand in until then.

- `visible` loads it when it scrolls into view. Use it for scenes below the fold.
- `click` loads it only when the reader presses **Run**.

```markdoc
{% sandbox src="particle-field" activation="visible" poster="/img/scene-poster.png" height=400 /%}
```

A reader who prefers reduced motion always gets the poster and the **Run** control, even with `visible`.

## Feed a sandbox your content

Set `data` to a query, in the same `field:value` form [collection](/runes/collection) uses, and the build hands the matching entities to your script as `window.RF_DATA`. `data-shape` picks the form:

- `flat` (the default): a list of records.
- `tree`: records nested by URL.
- `graph`: `{ nodes, edges }`, where each edge is `{ from, to, kind }` from the entities' [relationships](/runes/relationships). Only edges between selected entities are kept.

`data-fields` keeps only the fields you name, and `data-limit` caps the records (500 by default; the build warns when it cuts). Here the pages under `/runes/` become a 3D star map: drag to rotate, click a node to open it.

{% preview source=true %}

	{% sandbox src="sitemap-3d" data="type:page url:/runes/*" data-shape="tree" activation="visible" height=440 /%}

{% /preview %}

Give a data-bound visualization an accessible fallback: a `{% collection %}` or `{% aggregate %}` running the same query, so readers without JavaScript or WebGL, and screen-reader users, still get the data.

## Choose what the source panel shows

Inside `{% preview source=true %}`, mark elements with `data-source` to choose what the source panel shows. Unmarked elements, such as wrappers, still render but stay out of the panel. A named value (`data-source="CSS"`) gets its own tab.

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

## Fill the height of its container

`height` takes pixels, or sizes itself to the content when omitted. Set `height="fill"` when the container decides the height. A sandbox used as a [cover backdrop](/runes/marketing/hero#animate-the-backdrop) gets it automatically.

```markdoc
{% sandbox src="wireframe-waves" height="fill" /%}
```

Inside a filling sandbox, size a full-bleed canvas with `position: fixed; inset: 0`; `height: 100%` collapses.

## Use your design tokens

`context` names a `{% design-context %}` by its `scope`, and the sandbox receives its tokens as CSS custom properties (`--color-*`, `--font-*`, `--spacing-unit`, `--radius-*`, `--shadow-*`) along with its Google Fonts.

```markdoc
{% sandbox context="brand" %}
<div style="color: var(--color-primary); font-family: var(--font-body)">
  Styled with brand tokens
</div>
{% /sandbox %}
```

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:sandbox"} /%}
