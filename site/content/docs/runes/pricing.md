---
title: Pricing
description: Pricing tables with tier comparison
---

# Pricing

Pricing tables with tier comparison. Headings become the section headline, and `{% tier %}` tags define each pricing tier.

## Basic usage

A simple pricing table with two tiers.

```markdoc
{% pricing %}
# Plans

Pick the plan that fits your needs.

{% tier name="Free" priceMonthly="$0" %}
- 1 project
- Community support
- Basic analytics

[Get started](/docs/getting-started)
{% /tier %}

{% tier name="Pro" priceMonthly="$19" %}
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /tier %}
{% /pricing %}
```

{% pricing %}
# Plans

Pick the plan that fits your needs.

{% tier name="Free" priceMonthly="$0" %}
- 1 project
- Community support
- Basic analytics

[Get started](/docs/getting-started)
{% /tier %}

{% tier name="Pro" priceMonthly="$19" %}
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /tier %}
{% /pricing %}

## Featured tier

Use `featured=true` to highlight the recommended tier.

```markdoc
{% pricing %}
# Choose your plan

{% tier name="Free" priceMonthly="$0" %}
- 1 project
- Community support
{% /tier %}

{% tier name="Pro" priceMonthly="$19" featured=true %}
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /tier %}

{% tier name="Enterprise" priceMonthly="Custom" %}
- Custom integrations
- Dedicated support
- SLA guarantee

[Contact us](/docs/getting-started)
{% /tier %}
{% /pricing %}
```

{% pricing %}
# Choose your plan

{% tier name="Free" priceMonthly="$0" %}
- 1 project
- Community support
{% /tier %}

{% tier name="Pro" priceMonthly="$19" featured=true %}
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/docs/getting-started)
{% /tier %}

{% tier name="Enterprise" priceMonthly="Custom" %}
- Custom integrations
- Dedicated support
- SLA guarantee

[Contact us](/docs/getting-started)
{% /tier %}
{% /pricing %}

### Tier attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | **required** | Tier name |
| `priceMonthly` | `string` | **required** | Display price |
| `featured` | `boolean` | `false` | Highlight this tier as the recommended option |
