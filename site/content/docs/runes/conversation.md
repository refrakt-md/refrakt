---
title: Conversation
description: Chat and dialogue display with alternating speaker messages
---

# Conversation

Chat-style dialogue display. Blockquotes become alternating speaker messages with a chat bubble UI.

## Basic usage

Use blockquotes with bold speaker names to create a conversation.

{% preview source=true %}

{% conversation %}
> **Alice:** Hey, have you tried refrakt.md yet?

> **Bob:** Not yet — what makes it different?

> **Alice:** You write plain Markdown and runes decide how it renders. Same list can be nav links, feature cards, or action buttons.

> **Bob:** That sounds really flexible. I'll check it out!
{% /conversation %}

{% /preview %}

## Named speakers

Use the `speakers` attribute to automatically alternate between named speakers without inline bold markup.

{% preview source=true %}

{% conversation speakers="Support, Customer" %}
> How can I help you today?

> I'm having trouble with the installation.

> Have you tried running npm install with the --legacy-peer-deps flag?

> That fixed it — thank you!
{% /conversation %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `speakers` | `string` | — | Comma-separated speaker names for automatic alternation |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `tight`, `default`, or `loose` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
