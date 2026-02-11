---
title: Pricing
description: Pricing tables with tier comparison
---

# Pricing

Pricing tables with tier comparison. Headings become the section headline, and `{% tier %}` tags define each pricing tier.

```markdown
{% pricing %}
# Choose your plan

Pick the plan that fits your needs.

{% tier name="Free" priceMonthly="$0" %}
- 1 project
- Community support
- Basic analytics

[Get started](/signup/free)
{% /tier %}

{% tier name="Pro" priceMonthly="$19" featured=true %}
- Unlimited projects
- Priority support
- Advanced analytics

[Start trial](/signup/pro)
{% /tier %}

{% tier name="Enterprise" priceMonthly="Custom" %}
- Custom integrations
- Dedicated support
- SLA guarantee

[Contact us](/contact)
{% /tier %}
{% /pricing %}
```

### Example

{% pricing %}
# Choose your plan

Pick the plan that fits your needs.

{% tier name="Free" priceMonthly="$0" %}
- 1 project
- Community support
- Basic analytics

[Get started](/docs/getting-started)
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
