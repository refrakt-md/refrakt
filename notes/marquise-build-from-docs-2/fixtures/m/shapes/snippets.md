---
description: A group of code samples, one tab per fence
attributes:
  title: { type: string, required: true }
content:
  sequence:
    intro:  { match: paragraph, optional: true, as: inline }
    panels:
      match: fence
      repeat: true
      items:
        language: { as: text }
        label:    { as: text, optional: true }
        content:  { as: text }
    notes:  { match: blockquote, repeat: true, optional: true }
---

{% example #two title="Two panels" role="canonical" %}
{% snippets title="Install" %}
```sh
npm i x
```
{% /snippets %}
{% /example %}
