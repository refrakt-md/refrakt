---
description: A deliberately broken shape, to exercise analysis
attributes:
  Kind: { type: strng }
content:
  sequence:
    lede: { match: paragraph, optional: true }
    rest: { match: paragraph|list, repeat: true }
---
