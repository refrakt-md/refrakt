---
"@refrakt-md/transform": minor
"@refrakt-md/lumina": minor
---

Composability foundation (SPEC-084) — v0.19.0 batch B.

- **Media-zone guest adaptation.** Replaced Lumina's name-enumerated media allow-list with one **name-agnostic** rule: any visual rune dropped into a `[data-section="media"]` slot is sized, clipped, rounded, and given a container-query context (so intrinsically responsive guests like `mockup` auto-scale). Guests that manage their own bleed (`preview`, `juxtapose`, a bleeding `showcase`) self-declare an opt-out. Covers `card`/`feature`/`hero`/`recipe` with one rule.
- **`requiresParent` nesting validation.** New self-declared `RuneConfig.requiresParent` (distinct from the advisory `parent`). The identity transform validates it at build time — a rune that opts in must have the named parent as its nearest ancestor rune, else it's reported: an **error** for structurally-meaningless children (accordion-item, tab, step, tier, map-pin, …), a **warning** otherwise. Opt-in, so standalone-capable runes (`track`) are never flagged. No container-side allow-list.
- **Context-modifier audit.** Removed the one nonsensical pairing (Hero `→ in-feature`); every remaining context modifier has CSS coverage. `refrakt inspect --audit` reports context-modifier coverage, and `inspect` now surfaces a rune's `requiresParent`.
- **Docs.** A new composability authoring guide documents the open-world contract.
