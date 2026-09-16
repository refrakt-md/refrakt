---
rune: organization
title: Non-governmental organization
role: edge-case
notes: >
  Was the D2 record: `type="NonProfit"` passed the rune's curated six-value enum
  and was published verbatim, though schema.org has no `NonProfit` type. WORK-568
  corrected the enum to `NGO` — a breaking change for any site writing the old
  value, which now fails Markdoc validation instead of publishing a type no
  consumer resolves. The fixture writes `NGO` so this row records the corrected
  vocabulary; the old one survives in this file's history.
---
{% organization type="NGO" %}
# Rivers Trust

A conservation charity restoring freshwater habitats across the region.

- **Address:** 8 Mill Lane, Bristol, BS1 4TR
- [Website](https://rivers.example)
{% /organization %}
