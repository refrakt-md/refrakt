{% work id="WORK-481" status="ready" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,types,pipeline,hosted,security,architecture" %}

# `ProjectFiles` interface + fs/memory providers

The foundation of {% ref "SPEC-113" /%}: one synchronous `ProjectFiles` interface in
`@refrakt-md/types`, with filesystem and in-memory providers, that replaces the four ad-hoc fs
seams. Containment becomes an interface contract, so no consumer re-implements path-safety.
Also lands the recordable-read wrapper that {% ref "ADR-025" /%} names as the one piece of
groundwork for future incremental rebuild.

## Scope

- **Interface** — `ProjectFiles { read(path): string | null; list(path): string[]; exists(path): boolean }` in `@refrakt-md/types`, over normalized POSIX project-root-relative keys. Containment (absolute reject, traversal reject after normalization) is part of the contract. Foundational package so `runes`/`content`/plugins consume it without new dependency edges.
- **`fsProjectFiles(rootDir)`** — wraps `node:fs`, promoting the containment rules `read-file.ts` already implements for snippets (absolute reject, traversal reject, symlink-escape reject via realpath) up to the provider so every consumer inherits them.
- **`memoryProjectFiles(files: Map<string,string>)`** — map-backed; traversal structurally impossible (dictionary keys, one project). `list` derived from key prefixes. May back a mutable/refreshable map (warm hosted instances — {% ref "SPEC-113" /%} §4).
- **`recordingProjectFiles(inner, onRead)`** — a thin wrapper that forwards to an inner provider and reports each `read`/`list`/`exists` key. The per-page read-set capture point {% ref "ADR-025" /%} requires; no behaviour change, pure instrumentation.
- **Unit tests** — read/list/exists on both providers; containment cases (absolute, `../` traversal, symlink-escape for fs); `recordingProjectFiles` captures the expected key set.

## Acceptance Criteria

- [ ] `ProjectFiles` (read/list/exists over normalized POSIX project-relative keys; containment as interface contract) is defined in `@refrakt-md/types`.
- [ ] `fsProjectFiles` rejects absolute paths, `..` traversal, and symlink-escape (rules promoted from `read-file.ts`), with unit tests for each.
- [ ] `memoryProjectFiles` is map-backed with `list` derived from key prefixes; traversal cases return null/empty, with tests.
- [ ] `recordingProjectFiles(inner, onRead)` forwards to the inner provider unchanged and reports every accessed key; covered by a test.
- [ ] No new dependency edges introduced (interface lives in `@refrakt-md/types`); existing package builds stay green.

## Dependencies

- None — this is the foundation the rest of {% ref "SPEC-113" /%} builds on.

## References

- {% ref "SPEC-113" /%} §1–2 — interface + providers.
- {% ref "ADR-025" /%} — the recordable-read wrapper groundwork.
- `packages/runes/src/lib/read-file.ts` — containment logic promoted into `fsProjectFiles`.
- `packages/content/src/file-roots.ts` (`validateNamespacedReference`) — the parallel containment impl this consolidates.

{% /work %}
