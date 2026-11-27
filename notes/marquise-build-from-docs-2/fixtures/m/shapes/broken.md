---
description: Broken on purpose
sumary: [title]
attributes:
  title:    { type: strng }
  colour:   { matches: [red, blue] }
  mediaPos: { type: string }
content:
  sequence:
    intro: { match: paragraph, optional: true }
    body:  { match: any, repeat: true, optional: true }
    outro: { match: paragraph, optional: true }
---

Loose prose in the body.
