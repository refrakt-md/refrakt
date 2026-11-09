---
title: Blog
description: Display a list of blog posts from a content folder with sorting, filtering, and layout options
category: Site
plugin: core
status: stable
type: rune
---

{% include file="rune-intro.md" variables={r: "rune:blog"} /%}

Renders a list of blog posts from a specified content folder. Posts are automatically sorted by date and can be filtered, limited, and displayed in different layouts.

## Basic usage

Point the `folder` attribute at a content directory containing your blog posts.

{% preview source=true %}

	{% blog folder="/blog" %}
	{% /blog %}

{% /preview %}

## How Markdown is read

The posts come from `folder`; the body only adds a header above them.

| You write | It becomes |
|-----------|------------|
| A heading | The headline above the post list ([Page sections](/docs/authoring/page-sections)) |
| A paragraph after it | The blurb |

{% preview source=true %}

	{% blog folder="/blog" layout="grid" %}

	# Latest Posts

	Stay up to date with the newest updates and tutorials.

	{% /blog %}

{% /preview %}

## Grid layout

Use the `layout` attribute to switch between `list`, `grid`, and `compact` display modes.

{% preview source=true %}

	{% blog folder="/blog" layout="grid" %}
	{% /blog %}

{% /preview %}

## Filtering and sorting

Use `filter` to match against frontmatter fields and `sort` to control ordering. Limit the number of displayed posts with `limit`.

{% preview source=true %}

	{% blog folder="/blog" sort="title-asc" limit=3 %}
	{% /blog %}

{% /preview %}

## Attributes

{% include file="rune-attributes.md" variables={r: "rune:blog"} /%}
