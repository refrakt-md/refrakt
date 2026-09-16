---
rune: timeline
title: Timeline from headings
role: canonical
notes: >
  Group C — ItemList whose ListItem positions come from the loop index, a value
  that exists nowhere in the content. Entries come from `## date - label`
  headings; the explicit `{% timeline-entry %}` form is a separate fixture.
---
{% timeline %}
## 2023 - Founded

The company was founded to simplify content authoring for developer teams.

## 2024 - Public launch

Released v1.0 with support for 15 semantic runes and two themes.

## 2025 - Community growth

Plugin authors shipped the first third-party rune packs.
{% /timeline %}
