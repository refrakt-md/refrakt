---
description: A unit of work
summary: [title, status]
attributes:
  status:   { type: string, matches: [ready, in-progress, done], default: ready }
  owner:    { type: ref, to: [person] }
  related:  { type: ref, to: [work], list: true }
  formerly: { type: string, list: true }
content:
  sequence:
    title: { match: heading:1, as: inline }
    body:  { match: any, repeat: true, optional: true }
---
