---
title: Diff
description: Side-by-side or unified diff view between two code blocks
---

# Diff

Renders the difference between two code blocks. The first code block is the "before" state, the second is the "after" state.

## Split diff

Use `mode="split"` to show before and after side by side. Lines that match appear on both sides, removed lines are highlighted red on the left, and added lines are highlighted green on the right.

````markdoc
{% diff mode="split" language="javascript" %}
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
````

{% diff mode="split" language="javascript" %}
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

## Unified diff

The default mode shows changes in a single column with line numbers, `+`/`-` prefixes, and colored backgrounds.

````markdoc
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
````

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

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | `string` | `unified` | Display mode: `unified`, `split`, or `inline` |
| `language` | `string` | — | Language for syntax highlighting |
