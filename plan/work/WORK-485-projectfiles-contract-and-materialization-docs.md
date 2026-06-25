{% work id="WORK-485" status="ready" priority="medium" complexity="simple" source="SPEC-113" milestone="v0.27.0" tags="content,docs,hosted" %}

# Docs — `ProjectFiles` contract + fetch-then-build materialization

Document the `ProjectFiles` contract and the fetch-then-build materialization pattern for
remote hosts, so plugin and adapter authors know the seam and how a hosted renderer feeds it.

## Scope

- **Contract** — the `ProjectFiles` interface (read/list/exists over normalized POSIX keys, containment as contract), the stock providers, and when a consumer should read through it.
- **Materialization** — the fetch-then-build recipe (tarball-at-SHA → `Map` → `ContentTree` by key-prefix → `memoryProjectFiles` + `loadContentFromTree`), the one-map/tree-derived-from-it point, and the warm-instance / incremental-fetch tradeoff (atomic snapshot vs single-key patch).
- Cross-link {% ref "ADR-025" /%} for the incremental-rebuild direction the recordable wrapper enables.

## Acceptance Criteria

- [ ] Plugin-authoring / adapter docs describe the `ProjectFiles` contract and the fetch-then-build materialization pattern for remote hosts.
- [ ] The warm-instance / incremental-fetch tradeoff and the "one map, tree derived from it" model are documented.

## Dependencies

- {% ref "WORK-484" /%} — the contract is stable once the consumers + `loadContentFromTree` plumb land.

## References

- {% ref "SPEC-113" /%} §4 + Acceptance Criteria (docs) · {% ref "ADR-025" /%} · `site/content/extend/plugin-authoring/`.

{% /work %}
