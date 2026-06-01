{% work id="WORK-309" status="ready" priority="medium" complexity="simple" source="SPEC-079" tags="docs,plugin,runes,migration,metafields,zones,phase-2" milestone="v0.18.0" %}

# Docs plugin migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the docs plugin's
meta-bearing runes (Api, Symbol) from the legacy `slots + structure`
config shape to the new `metaFields + zones + contentSlots` model.

## Acceptance Criteria

- [ ] **`plugins/docs/src/config.ts` rewritten.**
  - **Api**: method, path, auth. Eyebrow: method (left) + path
    (right) — the existing HTTP-method-+-route header pattern
    projected via `split`. Metadata: auth (when condition met).
    The `method` field's `sentimentMap` preserved verbatim (`GET:
    positive, POST: neutral, PUT: neutral, PATCH: caution,
    DELETE: negative`).
  - **Symbol**: kind, lang, since, deprecated. Eyebrow: kind +
    deprecated (when set, with `negative` sentiment from the
    existing `sentimentMap: { true: 'negative' }`). Metadata:
    lang + since.

- [ ] **Per-rune CSS updated.** Selectors in
  `plugins/docs/styles/{api,symbol}.css` referencing
  `__header-primary` / `__header-secondary` rewritten to
  `__eyebrow` / `__metadata`. API method-pill coloring quirks
  preserved.

- [ ] **Changelog / SymbolGroup / SymbolMember untouched.** Content
  containers without meta projection — stay on the existing path.

- [ ] **Plugin tests updated.** Tests in `plugins/docs/test/` that
  snapshot rune output reflect the new DOM shape.

- [ ] **Backwards-compat shim warning silent for docs.**

- [ ] **Docs.** Docs rune doc pages
  (`site/content/runes/docs/{api,symbol}.md`) — output-contract
  snippets updated.

## Approach

Two-rune migration. Api is the more interesting case (method+path
projected as split-eyebrow); Symbol is a trimmed variant. Land both
on one branch.

The `path` field's eyebrow rendering wants monospace (it's a
URL pattern) — that comes for free via `metaType: 'id'`, which
already carries the monospace typography hint.

## Dependencies

- {% ref "WORK-305" /%} — engine + layout primitives (done).
- {% ref "WORK-306" /%} — plan plugin migration reference (done).

## References

- {% ref "SPEC-079" /%} — the spec being implemented.

{% /work %}
