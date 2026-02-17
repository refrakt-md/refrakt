---
title: Organization
description: Structured business or organization information
---

# Organization

Structured business or organization information. Headings become the organization name, images become the logo, and links become website/social profiles.

## Local business

A local business listing with address, hours, and contact info.

{% preview source=true %}

{% organization type="LocalBusiness" %}
# Acme Coffee Shop

Your neighborhood coffee shop since 2015. We serve locally roasted coffee and fresh pastries every day.

- **Address:** 123 Main St, Portland, OR 97201
- **Hours:** Mon–Fri 7am–6pm, Sat–Sun 8am–5pm
- **Phone:** (503) 555-0123
- [Website](https://acme.coffee)
{% /organization %}

{% /preview %}

## Corporation

A corporation profile with structured data.

{% preview source=true %}

{% organization type="Corporation" %}
# Acme Inc.

Enterprise solutions for the modern web.

- **Founded:** 2018
- **Headquarters:** San Francisco, CA
- [Website](https://acme.example.com)
- [GitHub](https://github.com/acme)
{% /organization %}

{% /preview %}

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `string` | `Organization` | Organization type: `Organization`, `LocalBusiness`, `Corporation`, `EducationalOrganization`, `GovernmentOrganization`, `NonProfit` |
