---
title: Sandbox
description: Isolated HTML/CSS/JS rendering in an iframe with optional framework loading
---

# Sandbox

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
    <h2>Pico CSS card</h2>
    <p>Loaded via the dependencies attribute.</p>
    <button>Click me</button>
  </article>
</main>
{% /sandbox %}
{% /preview %}

## With JavaScript

Scripts run inside the sandboxed iframe, fully isolated from the host page.

{% preview source=true %}
{% sandbox %}
<style>
  .counter {
    font-family: system-ui;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }
  .counter button {
    padding: 6px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 16px;
  }
  .counter button:hover { background: #f3f4f6; }
  .counter span { font-size: 24px; font-weight: 600; min-width: 3ch; text-align: center; }
  @media (prefers-color-scheme: dark) {
    .counter button { background: #374151; border-color: #4b5563; color: #f3f4f6; }
    .counter button:hover { background: #4b5563; }
  }
</style>
<div class="counter">
  <button onclick="update(-1)">−</button>
  <span id="count">0</span>
  <button onclick="update(1)">+</button>
</div>
<script>
  let count = 0;
  function update(delta) {
    count += delta;
    document.getElementById('count').textContent = count;
  }
</script>
{% /sandbox %}
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
</style>
<div class="wrapper" style="padding: 24px;">
  <div data-source="HTML" class="card">
    <h3>Card Title</h3>
    <p>Card content goes here.</p>
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

## Tailwind card grid

A more complete example using Tailwind's utility classes for a responsive card layout.

{% preview source=true responsive="mobile,tablet,desktop" %}
{% sandbox framework="tailwind" %}
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
    <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-4">
      <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    </div>
    <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Fast</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">Built for speed with zero runtime overhead.</p>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
    <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4">
      <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
      </svg>
    </div>
    <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Flexible</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">Works with any content structure.</p>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
    <div class="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mb-4">
      <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    </div>
    <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Secure</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">Fully isolated in a sandboxed iframe.</p>
  </div>
</div>
{% /sandbox %}
{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `framework` | `string` | — | Framework preset to load: `tailwind`, `bootstrap`, `bulma`, `pico` |
| `dependencies` | `string` | — | Comma-separated URLs of scripts/stylesheets to load |
| `label` | `string` | — | Label for the sandbox (used when inside compare) |
| `height` | `number` | auto | Fixed height in pixels (auto-sizes by default) |
