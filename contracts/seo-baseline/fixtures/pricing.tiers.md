---
rune: tier
title: Explicit tier tags
role: canonical
notes: >
  The `tier` rune's own authorable form. The heading-based fixture exercises the
  same Offer mapping via `pricing`'s item model; this one exercises `tier` itself.
---
{% pricing %}
# Choose your plan

{% tier name="Free" price="$0" %}
- 1 project
{% /tier %}

{% tier name="Pro" price="$19" featured=true %}
- Unlimited projects
{% /tier %}
{% /pricing %}
