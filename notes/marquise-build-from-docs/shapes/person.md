---
description: A member of the team
summary: [name]
attributes:
  name:   { type: string, required: true }
  role:   { type: string, matches: [engineer, designer, intern], required: true }
  skills: { type: string, list: true }
riviere:
  inverse:
    tasks: { of: tasks.owner }
  rules:
    engineer-idle:
      when: 'role:engineer -has:tasks'
      severity: warning
      message: "An engineer with no task assigned"
---
