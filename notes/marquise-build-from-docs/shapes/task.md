---
description: A unit of work
summary: [title, status]
attributes:
  status:     { type: string, matches: [open, doing, done], required: true }
  priority:   { type: string, matches: [high, medium, low], default: medium }
  owner:      { type: ref, to: [person] }
  blocked-by: { type: ref, to: [task], list: true }
  formerly:   { type: string, list: true }
content:
  sequence:
    title:   { match: heading, as: inline }
    summary: { match: paragraph, optional: true, as: inline, shadows: [notes] }
    notes:   { match: any, repeat: true, optional: true }
riviere:
  rules:
    high-for-intern:
      when: 'priority:high owner.role:intern'
      severity: warning
      message: "A high-priority task is assigned to an intern"
---

{% example #canonical title="An open task" role="canonical" %}
{% task #TASK-0 status="open" %}
# Write the loader

Reads every file once.
{% /task %}
{% /example %}

{% example #no-status title="Missing status" role="edge-case" expect="attribute-missing" %}
{% task #TASK-0 %}
# Write the loader
{% /task %}
{% /example %}
