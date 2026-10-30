---
rune: testimonial
title: Comma-separated attribution
role: edge-case
notes: >
  Probes the attribution parser with a comma instead of the em dash the docs use.
  WORK-562's brief names a `jobTitle: ", CTO at Acme"` defect; this fixture records
  whatever the comma form actually produces, so the parser's behaviour is pinned
  either way rather than assumed.
---
{% testimonial rating=4 %}
> The semantic approach just makes sense.

**Alex Rivera**, CTO at Acme
{% /testimonial %}
