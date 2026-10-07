---
rune: figure
title: Figure holding a code block
role: edge-case
notes: >
  BUG-028. A figure whose body is a fenced code block, a table and a nested
  rune, with no media at all. Recorded first against the pre-fix code, which
  drops all three children and still asserts `ImageObject` with only a
  caption. The fix keeps the children and emits no type: nothing in the figure
  is an image.
---
{% figure caption="The handler, its options, and a caveat" %}
```ts
export function handler(req: Request) {
	return new Response('ok');
}
```

| Option | Default |
|--------|---------|
| `retry` | `3` |

{% hint type="note" %}
Retries are idempotent.
{% /hint %}
{% /figure %}
