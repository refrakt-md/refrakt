{% work id="WORK-485" status="done" priority="medium" complexity="simple" source="SPEC-113" milestone="v0.27.0" tags="content,docs,hosted" %}

# Docs — `ProjectFiles` contract + fetch-then-build materialization

Document the `ProjectFiles` contract and the fetch-then-build materialization pattern for
remote hosts, so plugin and adapter authors know the seam and how a hosted renderer feeds it.

## Scope

- **Contract** — the `ProjectFiles` interface (read/list/exists over normalized POSIX keys, containment as contract), the stock providers, and when a consumer should read through it.
- **Materialization** — the fetch-then-build recipe (tarball-at-SHA → `Map` → `ContentTree` by key-prefix → `memoryProjectFiles` + `loadContentFromTree`), the one-map/tree-derived-from-it point, and the warm-instance / incremental-fetch tradeoff (atomic snapshot vs single-key patch).
- Cross-link {% ref "ADR-025" /%} for the incremental-rebuild direction the recordable wrapper enables.

## Acceptance Criteria

- [x] Plugin-authoring / adapter docs describe the `ProjectFiles` contract and the fetch-then-build materialization pattern for remote hosts.
- [x] The warm-instance / incremental-fetch tradeoff and the "one map, tree derived from it" model are documented.

## Dependencies

- {% ref "WORK-484" /%} — the contract is stable once the consumers + `loadContentFromTree` plumb land.

## References

- {% ref "SPEC-113" /%} §4 + Acceptance Criteria (docs) · {% ref "ADR-025" /%} · `site/content/extend/plugin-authoring/`.

## Resolution

Completed: 2026-06-30

Branch: `claude/milestone-v0-27-0-yqiu8v`

### What was done
- New page `site/content/extend/plugin-authoring/hosted-builds.md` — "Hosted & In-Memory Builds":
  - The `ProjectFiles` contract: the interface, keys-not-paths + containment-as-contract, `readdir`-shaped `list`, why it's synchronous (the boundary sits in front of the pipeline), the three stock providers (`fsProjectFiles` / `memoryProjectFiles` / `recordingProjectFiles`), and when a consumer (preprocess `ctx.sandbox`, configure `projectFiles`) should read through it.
  - The fetch-then-build materialization recipe (tarball-at-SHA → `Map` → `ContentTree.fromContentMap` by key-prefix → `memoryProjectFiles` + `loadContentFromTree`), with a worked code example.
  - The "one map, tree derived from it" model and the warm-instance / incremental-fetch tradeoff (atomic snapshot vs single-key patch).
  - A "towards incremental rebuild" section cross-linking ADR-025 (the recordable-wrapper groundwork), plus a plugin-author checklist.
- Registered the page in the Extend nav (`extend/_layout.md`) and linked it from `extend/index.md`.

### Notes
- ADR cross-links use the `{% ref "ADR-025" /%}` rune, matching the existing convention (`{% ref "ADR-018" /%}` in rune-authoring/patterns); the main docs site doesn't register plan entities, so these render as tolerated unresolved xrefs exactly like the existing ones.
- Verified with a full `vite build` of the site (exit 0) — the page parses and renders; the only warnings are the same pre-existing unresolved-xref / duplicate-id ones unrelated to this change.

{% /work %}
