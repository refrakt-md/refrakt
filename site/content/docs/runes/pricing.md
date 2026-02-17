---
title: Pricing
description: Pricing tables with tier comparison
---

# Pricing

Pricing tables with tier comparison. Write natural markdown headings with `## Name — Price` to auto-generate tiers, or use explicit `{% tier %}` tags for full control.

## Heading-based

Write pricing tiers as headings with a `Name — Price` pattern. Content below each heading becomes the tier body.

```markdoc
{% pricing %}
# Plans

Pick the plan that fits your needs.

## Free — $0
- 1 project
- Community support
- Basic analytics

[Get started](/docs/getting-started)

## Pro — $19/mo
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /pricing %}
```

{% preview %}

{% pricing %}
# Plans

Pick the plan that fits your needs.

## Free — $0
- 1 project
- Community support
- Basic analytics

[Get started](/docs/getting-started)

## Pro — $19/mo
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /pricing %}

{% /preview %}

## Explicit tiers

Use `{% tier %}` tags when you need full control over attributes like `featured` or `currency`.

```markdoc
{% pricing %}
# Choose your plan

{% tier name="Free" price="$0" %}
- 1 project
- Community support
{% /tier %}

{% tier name="Pro" price="$19" featured=true %}
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /tier %}

{% tier name="Enterprise" price="Custom" %}
- Custom integrations
- Dedicated support
- SLA guarantee

[Contact us](/docs/getting-started)
{% /tier %}
{% /pricing %}
```

{% preview %}

{% pricing %}
# Choose your plan

{% tier name="Free" price="$0" %}
- 1 project
- Community support
{% /tier %}

{% tier name="Pro" price="$19" featured=true %}
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /tier %}

{% tier name="Enterprise" price="Custom" %}
- Custom integrations
- Dedicated support
- SLA guarantee

[Contact us](/docs/getting-started)
{% /tier %}
{% /pricing %}

{% /preview %}

### Tier attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | **required** | Tier name |
| `price` | `string` | **required** | Display price (e.g. `$19`, `€29/mo`, `Custom`) |
| `featured` | `boolean` | `false` | Highlight this tier as the recommended option |
| `currency` | `string` | — | ISO currency code for SEO (auto-inferred from price symbol if omitted) |
