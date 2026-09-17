---
"@refrakt-md/runes": patch
"@refrakt-md/learning": patch
---

Declare `accordion`, `recipe` and `how-to`'s retype-and-wrap (WORK-570)

The last four runes building their schema.org data by hand. Each set `typeof` on
nodes it did not create and hand-wrote a `<div property="text">` wrapper to carry
the value; both are now declared, and the applier emits the wrapper.

**No output changes.** The rendered HTML is the same elements with the same
attributes and values in the same positions — only the attribute *serialisation
order* moves on eight of them, since the applier runs after the renderable is
built rather than before. The published JSON-LD is unchanged across the whole
baseline corpus.

The wrapper stays, and there is now a test saying why. RDFa Core 1.1 §7.5 step 11
fixes a property's object to the typed resource when an element carries both
`property` and `typeof`, so its own text is unreachable as a literal; deleting
the inner element looks like a simplification and silently drops a triple from
the RDFa while the JSON-LD keeps emitting it.

Two applier fixes this surfaced, both affecting published data:

- A source naming several nodes stamped only the first, so a recipe published
  one of its six ingredients and dropped the rest.
- Fixing that made name lookup reach into nested runes, so a character's `name`
  became the character plus each of its section headings. Name resolution now
  stops at another rune's node, matching the flat namespace's per-rune scope.

With this, no rune anywhere passes `schemaOrgType` or a `schema:` map to
`createComponentRenderable`, and no transform mutates `attributes.typeof` — the
declarative mapping SPEC-130 set out to build is the only form left, and a test
over the catalog keeps it that way.
