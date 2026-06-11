---
title: Codegroup
description: Tabbed code blocks and styled code chrome
category: "Code & Data"
plugin: core
status: stable
type: rune
---

# Codegroup

Display code blocks with terminal-style chrome. Multiple fences become a tabbed view with language-based tab names. A single fence without labels renders as a clean code block with just the chrome — no tabs.

## Basic usage

Tabs are automatically labeled by their code block language.

{% preview source=true %}

{% codegroup %}
```js
const x = 1;
```

```python
x = 1
```
{% /codegroup %}

{% /preview %}

## Custom labels

Use the `labels` attribute to override the default language-based tab names. Useful when multiple tabs share the same language.

{% preview source=true %}

{% codegroup labels="React, Vue, Svelte" %}
```jsx
export default function App() {
  return <h1>Hello</h1>;
}
```

```html
<template>
  <h1>Hello</h1>
</template>
```

```html
<h1>Hello</h1>
```
{% /codegroup %}

{% /preview %}

## With title

Use the `title` attribute to display a filename or label in the topbar. With a single code fence and no `labels`, the codegroup renders as chrome-only — the topbar and code block without any tabs.

{% preview source=true %}

{% codegroup title="app.js" %}
```js
import express from 'express';

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});
```
{% /codegroup %}

{% /preview %}

To force a tab bar on a single fence, provide the `labels` attribute.

{% preview source=true %}

{% codegroup title="server" labels="Express" %}
```js
import express from 'express';

const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});
```
{% /codegroup %}

{% /preview %}

## Tab labels from fence annotations

When neither `labels=` nor a per-fence `label` annotation is set, codegroup derives each tab label from the fence's `source` annotation — automatically populated when the panel is a `{% snippet %}`, and authorable on hand-written fences. SPEC-062 / WORK-304.

```markdoc
{% codegroup %}
{% snippet path="packages/runes/src/lang-map.ts" lines="3-7" linenumbers=true highlight="4-5" /%}
{% snippet path="packages/runes/src/tags/codegroup.ts" lines="7-14" linenumbers=true highlight="8-9" /%}
{% /codegroup %}
```

Renders with tabs `lang-map.ts:3-7` and `codegroup.ts:7-14`, each panel's gutter starting at the file's real line offset (3 and 7 respectively), and each panel's `highlight` range emphasized — all four annotations (`source`, `lines`, `linenumbers`, `highlight`) propagate through the snippet → fence → codegroup chain uniformly:

{% codegroup %}
{% snippet path="packages/runes/src/lang-map.ts" lines="3-7" linenumbers=true highlight="4-5" /%}
{% snippet path="packages/runes/src/tags/codegroup.ts" lines="7-14" linenumbers=true highlight="8-9" /%}
{% /codegroup %}

The label resolution chain (first match wins):

1. **Group-level `labels=`** — positional override (`labels="A, B, C"`).
2. **Per-fence `label` annotation** — `` ```ts {% label="SiteConfig" %} ``.
3. **Derived from `source`** — basename of the path, with `:lines` suffix when `lines=` is also set (e.g. `theme.ts:74-125`).
4. **Prettified language name** — today's default (`JavaScript`, `Python`, etc.).

Same composition story snippet has elsewhere, just propagated through the fence-annotation surface.

## Overflow control

Use the `overflow` attribute to control how long lines are handled. The default is `scroll` (horizontal scrollbar). Use `wrap` to wrap lines, or `hide` to clip without a scrollbar.

{% preview source=true %}

{% codegroup overflow="wrap" title="wrapped.ts" %}
```ts
const result = await fetchUserDataFromRemoteService(userId, { includeMetadata: true, resolveReferences: true, maxDepth: 3, timeout: 5000 });
```
{% /codegroup %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `labels` | `string` | — | Comma-separated custom tab names |
| `title` | `string` | — | Filename or label shown in the topbar |
| `overflow` | `string` | `scroll` | Line overflow: `scroll`, `wrap`, or `hide` |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
