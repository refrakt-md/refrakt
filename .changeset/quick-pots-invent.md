---
'@refrakt-md/transform': minor
'@refrakt-md/runes': minor
'@refrakt-md/media': minor
---

**Breaking:** `reading` and `dropcap` gate on a declared prose capability, not the `body` section role (WORK-537, SPEC-125 Phase 4)

The `body` role carried two meanings that were merged by accident of timing. Structurally it means "the rune's main content region", and Lumina keys layout and density off it. SPEC-108 later reused that declaration as a *proxy* for an editorial fact it never stated — "prose that a reading register applies to".

The proxy holds for most of the 32 body-role runes and breaks for a real minority. A `datatable`'s body role is on its `<table>`; a `showcase`'s is on its viewport. Once schemas narrowed (WORK-534), `{% datatable reading="prose" dropcap=true %}` would have validated and stamped a drop cap onto a table.

**What changes.** `reading` and `dropcap` are no longer offered on **`Api`, `DataTable`, `Form`, `Showcase` and `Symbol`** — writing either is now a Markdoc validation error, and a value arriving by another route (a scoped default, an embed override) is dropped with a warning naming the reason. The other 27 body-role runes are unaffected: `Blog`, `Card`, `TextBlock`, `PullQuote`, `Sidenote`, `Lore`, the storytelling entities and sections, the plan runes, and the rest all declare prose and keep both attributes.

**Removing the role would have been the other fix, and it is the wrong one.** A datatable's table genuinely *is* its main content region, and Lumina styles that role — dropping it would change how the rune renders for a reason unrelated to rendering. Every one of the five keeps its `body` role and every `[data-section="body"]` stylesheet is untouched.

**The gate is declared, not inferred.** A facet states what it needs (`UniversalAxisFacet.requires`) and a rune states what it provides (`RuneConfig.provides`), so the next axis needing a content capability reuses this instead of inventing another bespoke field. `provides` is a non-overridable identity field for the same reason `sections` is: it decides what an author may write.

Default-off — a rune must say it bears prose. That is only safe because schema narrowing landed first: a forgotten declaration is no longer silent, because the attribute is not offered and `refrakt reference` names the reason.

**Also fixed:** `MusicPlaylist`, the schema.org alias of `Playlist`, was a bare `{ block }` config stub, so `{% music-playlist %}` rendered with none of the five `data-section` attributes its primary emits despite being the same schema and the same output tree. The audit surfaced it through the prose capability; the section drift was the same bug a layer down. It now carries the same join tables.

**Also fixed:** the facet warning collector deduped on a bare key, so two *different* diagnostics that both key on the rune name silenced each other — `frame` and `content-place` already collided this way, a warn-once swallowing an unrelated warning for the rest of a build. Keys are now namespaced by warning code.
