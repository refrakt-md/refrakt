---
description: A highlighted note that interrupts the reading flow
plain: { tag: aside }
attributes:
  tone: { type: string, matches: [neutral, info, warning, danger], default: neutral, description: "The meaning the note conveys" }
content:
  type: sequence
  fields:
    title: { match: heading, optional: true, as: text }
    body:  { match: paragraph|list, greedy: true }
---
