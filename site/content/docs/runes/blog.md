---
title: Blog
description: Display a list of blog posts from a content folder with sorting, filtering, and layout options
---

# Blog

Renders a list of blog posts from a specified content folder. Posts are automatically sorted by date and can be filtered, limited, and displayed in different layouts.

## Basic usage

Point the `folder` attribute at a content directory containing your blog posts.

{% preview source=true %}

{% blog folder="/blog" %}
{% /blog %}

{% /preview %}

## Grid layout

Use the `layout` attribute to switch between `list`, `grid`, and `compact` display modes.

{% preview source=true %}

{% blog folder="/blog" layout="grid" %}
{% /blog %}

{% /preview %}

## Section header

Blog supports an optional headline and blurb above the post list. See [Page sections](/docs/authoring/page-sections) for the full syntax.

{% preview source=true %}

{% blog folder="/blog" layout="grid" %}

# Latest Posts

Stay up to date with the newest updates and tutorials.

{% /blog %}

{% /preview %}

## Filtering and sorting

Use `filter` to match against frontmatter fields and `sort` to control ordering. Limit the number of displayed posts with `limit`.

{% preview source=true %}

{% blog folder="/blog" sort="title-asc" limit=3 %}
{% /blog %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `folder` | `string` | — | Content folder path to list blog posts from (required) |
| `sort` | `string` | `date-desc` | Sort order: `date-desc`, `date-asc`, `title-asc`, `title-desc` |
| `filter` | `string` | — | Filter expression to match against frontmatter fields (e.g. `tag:javascript`) |
| `limit` | `number` | — | Maximum number of posts to display |
| `layout` | `string` | `list` | Display layout: `list`, `grid`, or `compact` |

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
