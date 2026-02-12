---
title: Steps
description: Step-by-step instructions with numbered indicators
---

# Steps

Step-by-step instructions with numbered indicators. Ordered list items become individual steps.

## Basic usage

Each ordered list item becomes a numbered step.

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

{% steps %}
1. Install the dependencies

   Run the install command for your package manager.

2. Create your content directory

   Add a `content/` folder with your Markdown files.

3. Start the dev server

   Run `npm run dev` and visit localhost.
{% /steps %}

## Heading-based steps

Use `headingLevel` to convert headings into steps instead of list items.

```markdoc
{% steps headingLevel=3 %}
### Clone the repository

Fork and clone the repo to your local machine.

### Install dependencies

Run `npm install` to set up all packages.

### Run the tests

Verify everything works with `npm test`.
{% /steps %}
```

{% steps headingLevel=3 %}
### Clone the repository

Fork and clone the repo to your local machine.

### Install dependencies

Run `npm install` to set up all packages.

### Run the tests

Verify everything works with `npm test`.
{% /steps %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Convert headings at this level into steps |
| `split` | `string` | — | Space-separated column sizes for split layout |
| `mirror` | `boolean` | `false` | Mirror the split layout direction |
