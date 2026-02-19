---
title: Design Context
description: Unified design token card composing palette, typography, and spacing runes with automatic sandbox injection
---

# Design Context

Wraps palette, typography, and spacing runes into a unified token card. Automatically extracts design tokens and injects them as CSS custom properties into any sandbox in the same document or chat conversation.

## Basic usage

Compose child design runes inside a design-context block.

{% preview source=true %}

{% design-context title="Brand Tokens" %}

{% typography %}
- heading: Inter (400, 600, 700)
- body: Source Sans Pro (400, 600)
- mono: Fira Code (400)
{% /typography %}

{% palette %}
## Brand
- Primary: #2563EB
- Secondary: #7C3AED
- Accent: #F59E0B

## Neutral
- Gray: #F9FAFB, #E5E7EB, #9CA3AF, #374151, #111827
{% /palette %}

{% spacing %}
## Spacing
- unit: 4px
- scale: 4, 8, 12, 16, 24, 32, 48, 64

## Radius
- sm: 4px
- md: 8px
- lg: 12px
- full: 9999px
{% /spacing %}

{% /design-context %}

{% /preview %}

## Attributes

| Attribute | Type   | Default | Description                    |
| --------- | ------ | ------- | ------------------------------ |
| title     | string |         | Optional card title            |

## Token injection

When a design-context appears above a sandbox in the same document, the sandbox automatically receives:

- **Google Fonts** `<link>` tags for all typography fonts
- **CSS custom properties** on `:root` (`--font-heading`, `--color-primary`, `--spacing-unit`, etc.)
- **Base typography rules** mapping `body`, heading, and code elements to font variables
- **Tailwind config extension** (when `framework="tailwind"`) mapping tokens to Tailwind theme values

## Chat integration

In the chat app's **Design** mode, a design-context in any message makes its tokens available to all subsequent sandboxes in the conversation. The AI also receives a compact token summary so it uses variable names like `--color-primary` instead of hardcoded values.
