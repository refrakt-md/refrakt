---
rune: blog
title: Blog index
role: canonical
notes: >
  Group A, resolved — no longer emits Blog. The rune resolves its posts
  from a folder at build time, so the container is empty here; `name`,
  `url` and `blogPost` are page-level facts SPEC-130 puts out of scope
  (WORK-567).
---
{% blog folder="/blog" %}
{% /blog %}
