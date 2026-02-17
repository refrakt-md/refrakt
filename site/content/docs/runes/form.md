---
title: Form
description: Accessible HTML forms from Markdown with smart field type inference
---

# Form

Transform Markdown into fully functional, accessible HTML forms. Lists become input fields with types inferred from their names, blockquotes introduce selection groups, and headings create fieldsets.

## Basic usage

List items are automatically mapped to the correct input types based on their names.

{% preview source=true %}

{% form action="https://formspree.io/f/example" %}
- Name
- Email
- Message

**Send**
{% /form %}

{% /preview %}

## Fieldset groups

Headings create `<fieldset>` sections with legends.

{% preview source=true %}

{% form action="/api/contact" %}
## Contact Info

- Name
- Email
- Phone (optional)

## Your Message

- Message

**Submit**
{% /form %}

{% /preview %}

## Selection fields

A blockquote followed by a list creates a selection group. With 4 or fewer options, it renders as radio buttons. Add `(multiple)` for checkboxes.

{% preview source=true %}

{% form action="/api/signup" %}
- Name
- Email

> What interests you? (multiple)

- Web Design
- Branding
- Consulting
- Development

> Preferred contact method

- Email
- Phone
- No preference

**Sign Up**
{% /form %}

{% /preview %}

## Style variants

Use the `style` attribute to change the layout.

{% preview source=true %}

{% form action="/api/subscribe" style="inline" %}
- Email (placeholder: "you@example.com")

**Subscribe**
{% /form %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | `string` | — | Form submission endpoint URL (required) |
| `method` | `string` | `POST` | HTTP method: `GET` or `POST` |
| `success` | `string` | — | Message shown on successful submission |
| `error` | `string` | — | Message shown on failed submission |
| `style` | `string` | `stacked` | Layout: `stacked`, `inline`, `compact` |
| `name` | `string` | — | Form identifier for multi-form pages |
| `honeypot` | `boolean` | `true` | Auto-generate honeypot spam field |

### Smart type inference

Field types are automatically inferred from the list item text:

| Field name contains | Input type |
|---------------------|------------|
| email | `<input type="email">` |
| phone, mobile, tel | `<input type="tel">` |
| website, url | `<input type="url">` |
| date, birthday | `<input type="date">` |
| number, amount, quantity | `<input type="number">` |
| password, pin | `<input type="password">` |
| message, comments, description | `<textarea>` |
| file, upload, attachment | `<input type="file">` |
| anything else | `<input type="text">` |

### Field modifiers

Add parenthetical modifiers to list items:

- `(optional)` — removes the required attribute
- `(placeholder: "hint text")` — adds placeholder text

Example: `- Phone (optional, placeholder: "+1 555-0100")`
