---
rune: figure
title: Figure mixing an image and code
role: edge-case
notes: >
  BUG-028. An image followed by a fenced code block. Before the fix the code is
  dropped and the figure is an `ImageObject` whose `contentUrl` is the image.
  After it the code survives in body order, and since the image is no longer the
  figure's only content the figure asserts no type: an `ImageObject` captioned
  with a caption describing the image *and* the code would be a wrong claim.
---
{% figure caption="The reef, and the query that found it" %}
![Coral reef](https://assets.refrakt.md/figure-coral-reef.jpg)

```sql
select * from reefs where depth < 30;
```
{% /figure %}
