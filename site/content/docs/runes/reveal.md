---
title: Reveal
description: Progressive disclosure where content appears step by step
---

# Reveal

Progressive disclosure. Headings become reveal steps, with content shown one step at a time.

## Basic usage

Set `headingLevel` to split content into reveal steps at that heading level.

```markdoc
{% reveal headingLevel=3 %}
### Step 1: Install the package

Run the install command to add refrakt.md to your project.

### Step 2: Configure your theme

Set up the lumina theme in your config file.

### Step 3: Write content

Create Markdown files with runes and watch them transform.
{% /reveal %}
```

{% preview %}

{% reveal headingLevel=3 %}
### Step 1: Install the package

Run the install command to add refrakt.md to your project.

### Step 2: Configure your theme

Set up the lumina theme in your config file.

### Step 3: Write content

Create Markdown files with runes and watch them transform.
{% /reveal %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `headingLevel` | `number` | — | Heading level to split content into steps |
| `mode` | `string` | `click` | Trigger mode: `click`, `scroll`, `auto` |
