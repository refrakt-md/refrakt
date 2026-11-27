---
description: Who made it, one person per list item
content:
  sequence:
    title: { match: heading, as: inline }
    people:
      match: list
      items:
        template: "{name}[| — | – | - ]{role}"
        name: { as: text }
        role: { matches: [engineer, designer, writer] }
---
