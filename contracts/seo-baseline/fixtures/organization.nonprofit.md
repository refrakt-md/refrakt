---
rune: organization
title: Non-profit organization
role: edge-case
notes: >
  Records D2 as it stands: `type="NonProfit"` is accepted by the rune's curated
  six-value enum and published verbatim, but schema.org has no `NonProfit` type
  (it has `NGO`). WORK-568 corrects this, and the correction must show as a diff here.
---
{% organization type="NonProfit" %}
# Rivers Trust

A conservation charity restoring freshwater habitats across the region.

- **Address:** 8 Mill Lane, Bristol, BS1 4TR
- [Website](https://rivers.example)
{% /organization %}
