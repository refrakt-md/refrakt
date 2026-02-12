---
title: Organization
description: Structured business or organization information
---

# Organization

Structured business or organization information. Headings become the organization name, images become the logo, and links become website/social profiles.

```markdoc
{% organization type="LocalBusiness" %}
# Acme Coffee Shop

Your neighborhood coffee shop.

- **Address:** 123 Main St, Portland, OR
- **Hours:** Mon–Fri 7am–6pm
- [Website](https://acme.coffee)
{% /organization %}
```

### Example

{% organization type="LocalBusiness" %}
# Acme Coffee Shop

Your neighborhood coffee shop since 2015. We serve locally roasted coffee and fresh pastries every day.

- **Address:** 123 Main St, Portland, OR 97201
- **Hours:** Mon–Fri 7am–6pm, Sat–Sun 8am–5pm
- **Phone:** (503) 555-0123
- [Website](https://acme.coffee)
{% /organization %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `Organization` | Organization type: `Organization`, `LocalBusiness`, `Corporation`, `EducationalOrganization`, `GovernmentOrganization`, `NonProfit` |
