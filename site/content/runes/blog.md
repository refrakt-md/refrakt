---
title: Blog
description: Display a list of blog posts from a content folder with sorting, filtering, and layout options
category: Site
plugin: core
status: stable
type: rune
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

{% include file="rune-attributes.md" variables={r: "rune:blog"} /%}

