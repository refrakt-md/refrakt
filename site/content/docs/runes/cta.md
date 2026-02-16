---
title: CTA
description: Focused call-to-action blocks with headlines, descriptions, and action buttons
---

# CTA

A focused call-to-action block. Headings become the headline, paragraphs become the subtitle, and list items with links become action buttons. Code fences become copyable command blocks. Use CTA for action prompts that can appear anywhere on a page — for full-width intro sections, use [Hero](/docs/runes/hero) instead.

## Basic usage

A headline with a description and action buttons.

```markdoc
{% cta %}
# Get Started with refrakt.md

Build structured content sites with semantic Markdown.

- [Quick Start](/docs/getting-started)
- [View on GitHub](https://github.com)
{% /cta %}
```

{% cta %}
# Get Started with refrakt.md

Build structured content sites with semantic Markdown.

- [Quick Start](/docs/getting-started)
- [View on GitHub](https://github.com)
{% /cta %}

## With command block

Code fences inside a CTA become copyable command blocks.

````markdoc
{% cta %}
# Install refrakt.md

Get up and running in seconds.

```shell
npm install @refrakt-md/runes
```
{% /cta %}
````

{% cta %}
# Install refrakt.md

Get up and running in seconds.

```shell
npm install @refrakt-md/runes
```
{% /cta %}
