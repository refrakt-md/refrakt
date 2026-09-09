---
'@refrakt-md/storytelling': minor
---

Fix: `character` dropped prose written directly in its body (BUG-003)

```md
{% character name="Veshra" %}
Prose about Veshra.
{% /character %}
```

The paragraph never reached the output. The body slot rendered as an empty `<div data-name="body">` — no warning, no error, the content simply gone. `realm` and `faction`, which share Character's exact shape, handled the same markup correctly.

Two things were wrong. The content model named its greedy prose field `header` and `transform` never read it, so the prose was resolved and discarded. And the body slot was built from the *items* cursor, and only when the character had no sections — so even that path could not produce lead prose alongside sections. Character now uses `buildStoryContent`, the same helper its two siblings use.

**What changes on screen.** Prose that currently vanishes starts rendering, in the character's body slot above its sections. A character that has only sections is unaffected — no body slot is emitted, as before. The `body` slot also moves ahead of `sections` in the content column, matching `realm` and `faction`: the two were previously mutually exclusive, so the order never mattered.

This also makes Character's `body` section role meaningful in practice. The role was declared correctly in 0.31.0 and `data-reading` / `data-dropcap` landed on the slot, but there was never any prose in it for a reading register to style.
