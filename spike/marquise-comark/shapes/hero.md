---
description: Full-width introduction at the top of a landing page
attributes:
  align:          { type: string, matches: [start, center, end], default: center, description: "Alignment of the text and actions" }
  media-position: { type: string, matches: [top, bottom, start, end], default: bottom, description: "Where the media sits" }
content:
  type: delimited
  delimiter: hr
  zones:
    - name: media
      fields:
        media: { match: image, optional: true }
    - name: content
      primary: true
      fields:
        eyebrow:  { match: paragraph, optional: true, as: text }
        headline: { match: heading, as: inline }
        blurb:    { match: paragraph, optional: true, as: inline }
        actions:
          match: list
          optional: true
          itemModel:
            fields:
              - { name: label, match: link }
              - { name: href,  from: label, extract: href }
---
