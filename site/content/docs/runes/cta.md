---
title: CTA
description: Call-to-action sections with headlines, descriptions, and action buttons
---

# CTA

Call-to-action sections. Headings become the hero headline, paragraphs become the subtitle, and list items with links become action buttons.

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

## With code showcase

Code fences inside a CTA become copyable command blocks.

```markdoc
{% cta %}
# Install refrakt.md

Get up and running in seconds.

\`\`\`shell
npm install @refrakt-md/runes
\`\`\`
{% /cta %}
```

{% cta %}
# Install refrakt.md

Get up and running in seconds.

```shell
npm install @refrakt-md/runes
```
{% /cta %}
