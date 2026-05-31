---
title: Diff
description: Side-by-side or unified diff view between two code blocks
---

# Diff

Renders the difference between two code blocks. The first code block is the "before" state, the second is the "after" state.

## Split diff

Use `mode="split"` to show before and after side by side. Lines that match appear on both sides, removed lines carry a red edge on the left, and added lines carry a green edge on the right — the column they sit in disambiguates direction, so no per-column label is needed. Pass an optional `title` to render a filename or context line as a full-width header above the diff.

{% preview source=true %}

{% diff mode="split" language="javascript" title="src/server.js" %}
```javascript
import express from 'express';

const app = express();

app.get('/users', (req, res) => {
  const users = db.query('SELECT * FROM users');
  res.json(users);
});

app.listen(3000);
```

```javascript
import express from 'express';

const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const users = await db.query('SELECT * FROM users LIMIT ? OFFSET ?', [limit, (page - 1) * limit]);
  res.json({ users, page, limit });
});

app.listen(3000);
```
{% /diff %}

{% /preview %}

## Unified diff

The default mode shows changes in a single column with line numbers, `+`/`-` prefixes, and colored backgrounds.

{% preview source=true %}

{% diff mode="unified" language="css" %}
```css
.button {
  display: inline-block;
  padding: 8px 16px;
  background: blue;
  color: white;
  border: none;
  cursor: pointer;
}
```

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}
```
{% /diff %}

{% /preview %}

## Header from fence `source`

When no `title=` is set, diff derives the header from each panel's fence `source` annotation (auto-populated when the panel is a `{% snippet %}`, authorable on hand-written fences). Matching paths collapse to a single label; differing paths render as `before → after`. SPEC-062 / WORK-304.

{% diff %}
```js {% source="src/server.js" %}
const app = express();
app.get('/users', (req, res) => {
  res.json(db.query('SELECT * FROM users'));
});
```

```js {% source="src/server.js" %}
const app = express();
app.use(express.json());
app.get('/users', async (req, res) => {
  res.json(await db.query('SELECT * FROM users LIMIT 20'));
});
```
{% /diff %}

The fence on each side annotates the diff header with `src/server.js`. Explicit `title=` always wins when you'd rather pin the label; differing source paths between sides render as `before → after`.

## Line numbers using file coordinates

`linenumbers=true` on each panel's fence shifts that side's gutter to start at the fence's `lines` offset rather than `1` — so a diff between two slices of the same file shows the actual file line numbers per side.

{% diff mode="split" %}
```ts {% source="theme.ts" lines="74-78" linenumbers=true %}
contentDir: string;
theme: string | SiteThemeConfig;
target?: string;
overrides?: Record<string, string>;
routeRules?: RouteRule[];
```

```ts {% source="theme.ts" lines="74-79" linenumbers=true %}
contentDir: string;
theme: string | SiteThemeConfig;
target?: string;
overrides?: Record<string, string>;
routeRules?: RouteRule[];
entityRoutes?: EntityRoute[];
```
{% /diff %}

Both gutter columns start at 74 (matching the file's real coordinates), the header reads `theme.ts`, and the added line shows in the right column with `entityRoutes` highlighted as the new value.

{% hint type="note" %}
`highlight=` on a fence inside `{% diff %}` is **silently ignored**. Diff's add/remove channel is the primary line-level signal; a separate highlight layer on top would muddy the +/- semantics. Use a standalone `{% snippet highlight="..." /%}` instead when you want emphasis.
{% /hint %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | `string` | `unified` | Display mode: `unified`, `split`, or `inline` |
| `language` | `string` | — | Language for syntax highlighting |
| `title` | `string` | — | Optional title or filename rendered as a full-width header above the diff |

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
