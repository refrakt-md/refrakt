---
title: Compare
description: Side-by-side code comparison panels
category: Code
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:compare"} /%}

Each fenced code block becomes a labeled panel. Labels default to the code block's language.

## Basic usage

Panels are automatically labeled by their code block language.

{% preview source=true %}

	{% compare %}
	```javascript
	function greet(name) {
	  return `Hello, ${name}!`;
	}
	```

	```typescript
	function greet(name: string): string {
	  return `Hello, ${name}!`;
	}
	```
	{% /compare %}

{% /preview %}

## How Markdown is read

| You write | It becomes |
|-----------|------------|
| A code fence | A panel, labelled by the fence's language, or by the matching entry in `labels` |
| Anything that is not a fence | Left out |

## Custom labels

Use the `labels` attribute to override the default language-based labels.

{% preview source=true %}

	{% compare labels="Before, After" %}
	```javascript
	const data = fetch('/api').then(r => r.json());
	```

	```javascript
	const data = await fetch('/api').then(r => r.json());
	```
	{% /compare %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:compare"} /%}
