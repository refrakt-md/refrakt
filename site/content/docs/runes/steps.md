---
title: Steps
description: Step-by-step instructions with numbered indicators
---

# Steps

Step-by-step instructions with numbered indicators. Ordered list items become individual steps.

```markdoc
{% steps %}
1. Install the dependencies

   Run the install command for your package manager.

2. Create your content directory

   Add a `content/` folder with your Markdown files.

3. Start the dev server

   Run `npm run dev` and visit localhost.
{% /steps %}
```

### Example

{% steps %}
1. Install the dependencies

   Run the install command for your package manager.

2. Create your content directory

   Add a `content/` folder with your Markdown files.

3. Start the dev server

   Run `npm run dev` and visit localhost.
{% /steps %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Convert headings at this level into steps |
| `split` | `string` | — | Space-separated column sizes for split layout |
| `mirror` | `boolean` | `false` | Mirror the split layout direction |
