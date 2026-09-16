---
rune: pricing
title: Single-tier pricing
role: minimal
notes: >
  D6 probe — one Offer. `appendToProperty` stores the first value as a scalar, so
  `offers` is an object here and an array in the multi-tier fixture. D6 makes both arrays.
---
{% pricing %}
# One plan

{% tier name="Pro" price="$19" %}
- Unlimited projects
{% /tier %}
{% /pricing %}
