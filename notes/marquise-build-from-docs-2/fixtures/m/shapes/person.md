---
description: A person on the team
summary: [name]
attributes:
  name:    { type: string, required: true }
  role:    { type: string, matches: [engineer, designer, manager] }
  tags:    { type: string, list: true }
  contact:
    fields:
      email: { type: string }
      phone: { type: string }
---
