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
riviere:
  inverse:
    work: { of: work.owner }
  rules:
    idle:
      when: 'role:engineer,designer -has:work'
      severity: warning
      message: "Nobody has given this person any work"
---
