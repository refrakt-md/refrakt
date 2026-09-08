---
'@refrakt-md/runes': patch
---

Documentation: move author-facing pages out of the Extend handbook, and give the entity registry an author-facing home

The `/docs` vs `/extend` split was drawn by subsystem rather than by audience, so several pages describing what you type in a Markdown file lived in a handbook whose own introduction tells content authors to go elsewhere. `extend/variables.md` was the clearest case — its description reads "The author-facing variable surface", and it wasn't in the Extend sidebar at all.

Moved to `/docs/authoring/`, with redirect stubs at the old URLs: **content variables**, **partials**, **page sections** (linked from ~19 rune reference pages), **nav slug resolution**, and **rich menubar panels**. The i18n overview moved to `/docs/configuration/i18n`, next to the `locale` and `strings` fields it documents.

**New: [Entities](https://refrakt.md/docs/authoring/entities).** `collection`, `aggregate`, `relationships`, and `expand` all used to link into the plugin-authoring pipeline reference to explain what an entity *is* — a page that opens by describing itself as a build-time plugin mechanism. Authors needed the concept, not the implementation. The four runes now link to a page that covers what the registry holds, where entities come from (including `type` in frontmatter, which is how the rune catalog works), and how the query runes relate.

**New: [Entity routes](https://refrakt.md/docs/configuration/entity-routes).** `entityRoutes` is site configuration, but it was documented only inside the pipeline hook reference — so the field was invisible to anyone reading the configuration docs. It now has a full reference there, and the pipeline page points at it.

**Split rather than moved:** the tint cascade is now [frontmatter semantics for authors](https://refrakt.md/docs/authoring/tint) and [the resolution function and SSR contract for theme developers](https://refrakt.md/extend/theme-authoring/tint-cascade). Both audiences genuinely need it, at different depths.

No content was duplicated — each page has exactly one home, and the two handbooks cross-link at their boundaries. Every internal link was verified against the built site.
