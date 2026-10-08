---
tag: aside
description: A relationship between two entities, composed over `hint`. SPEC-145's small worked example, kept beside the storytelling plugin's `bond` rather than shipped in place of it (SPEC-147 D1).
attributes:
  from:          { type: string, required: true, description: "Name of the first character or entity in this bond." }
  to:            { type: string, required: true, description: "Name of the second character or entity in this bond." }
  type:          { type: string, description: "Kind of relationship (e.g. ally, rival, mentor, sibling)." }
  status:        { type: string, matches: [active, broken, strained], default: active }
  bidirectional: { type: boolean, default: true }
provides: [prose]
content:
  type: sequence
  fields:
    body: { match: any, optional: true, greedy: true }
registers:
  edge:
    from: from
    to: to
    kind: { field: bondType }
    bidirectional: { field: bidirectional }
    data: [{ bondType: type }, status, bidirectional]
---

{% hint type="note" %}
**{% $attrs.from %}** {% if $attrs.bidirectional %}↔{% else /%}→{% /if %} **{% $attrs.to %}**

{% slot name="body" /%}
{% /hint %}
