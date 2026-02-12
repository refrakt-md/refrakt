---
title: HowTo
description: Step-by-step how-to guide with tools and instructions
---

# HowTo

Step-by-step how-to instructions. Unordered lists become tools/materials needed, ordered lists become steps.

```markdoc
{% howto estimatedTime="PT30M" difficulty="easy" %}
# How to Get Started

- Node.js 18+
- A code editor

1. Install dependencies
2. Create your first page
3. Start the dev server
{% /howto %}
```

### Example

{% howto estimatedTime="PT1H" difficulty="medium" %}
# How to Set Up a Development Environment

You will need these tools:

- Node.js 18+
- Git
- A code editor (VS Code recommended)

1. Install Node.js from the official website
2. Clone the repository with `git clone`
3. Run `npm install` to install dependencies
4. Start the dev server with `npm run dev`
{% /howto %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `estimatedTime` | `string` | — | Estimated time in ISO 8601 duration (e.g. "PT1H") |
| `difficulty` | `string` | — | Difficulty level: `easy`, `medium`, or `hard` |
| `headingLevel` | `number` | — | Heading level to convert into steps (auto-detected if omitted) |
