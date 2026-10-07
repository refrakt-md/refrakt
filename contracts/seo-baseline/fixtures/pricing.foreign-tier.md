---
rune: pricing
title: A tier the author nested inside another tier
role: edge-case
notes: >
  SPEC-146 Problem 1 / WORK-609. `pricing`'s schema row names its children
  `tier`, which is also a rune name. Before WORK-609 `findChildren` matched the
  `{% tier %}` inside the Pro tier's body and published it as one of the
  pricing table's offers, nested inside Pro by tree position. The table offers
  Pro alone; the nested tier is the author's own Offer.
---
{% pricing %}
# Plans

{% tier name="Pro" price="10" %}
Everything you need.

{% hint type="note" %}
Need more seats? Ask about:

{% tier name="Enterprise" price="99" %}
Custom terms.
{% /tier %}
{% /hint %}
{% /tier %}
{% /pricing %}
