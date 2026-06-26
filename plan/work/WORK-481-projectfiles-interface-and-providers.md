{% work id="WORK-481" status="done" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,types,pipeline,hosted,security,architecture" %}

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

- [x] `ProjectFiles` (read/list/exists over normalized POSIX project-relative keys; containment as interface contract) is defined in `@refrakt-md/types`.
- [x] `fsProjectFiles` rejects absolute paths, `..` traversal, and symlink-escape (rules promoted from `read-file.ts`), with unit tests for each.
- [x] `memoryProjectFiles` is map-backed with `list` derived from key prefixes; traversal cases return null/empty, with tests.
- [x] `recordingProjectFiles(inner, onRead)` forwards to the inner provider unchanged and reports every accessed key; covered by a test.
- [x] No new dependency edges introduced (interface lives in `@refrakt-md/types`); existing package builds stay green.

## Dependencies

- None — this is the foundation the rest of {% ref "SPEC-113" /%} builds on.

## References

- {% ref "SPEC-113" /%} §1–2 — interface + providers.
- {% ref "ADR-025" /%} — the recordable-read wrapper groundwork.
- `packages/runes/src/lib/read-file.ts` — containment logic promoted into `fsProjectFiles`.
- `packages/content/src/file-roots.ts` (`validateNamespacedReference`) — the parallel containment impl this consolidates.

## Resolution

Completed: 2026-06-26

Branch: `claude/milestone-v0-27-0-yqiu8v`

### What was done
- Added `packages/types/src/project-files.ts` — the `ProjectFiles` seam (SPEC-113):
  - `ProjectFiles` interface (`read`/`list`/`exists`) over normalized POSIX project-root-relative keys; containment (absolute reject, `..`-escape reject, symlink-escape reject) is part of the contract — a violation reads as an absent file (`null`/`[]`/`false`).
  - `normalizeProjectKey(input)` — the shared containment primitive: rejects absolute (POSIX/Windows/drive) and root-escaping `..`, accepts either separator, emits forward slashes, maps `''`/`.` to the root key.
  - `fsProjectFiles(rootDir)` — wraps `node:fs`; promotes the snippet sandbox's containment rules (absolute/traversal/symlink-escape via `realpathSync`, fail-open on ENOENT) up to the provider so every consumer inherits them. `list` returns readdir-style basenames (matching how the sandbox consumer joins `dir + '/' + name`).
  - `memoryProjectFiles(files)` — map-backed; reads through to the **live** map (warm-instance refresh per SPEC-113 §4); `list`/`exists` derived from key prefixes; query path normalized so traversal/absolute return null/empty.
  - `recordingProjectFiles(inner, onRead)` — thin pass-through that reports every `{op, key}` access (ADR-025's per-page read-set capture point); records the key even when the inner read is denied/absent.
- `packages/types/src/index.ts` — re-exports `ProjectFiles`/`ProjectFilesAccess` as **type-only**, so the package root stays free of `node:fs` (verified: `dist/index.js` has zero `project-files`/`node:fs` references).
- `packages/types/package.json` — added `./project-files` subpath export so the (Node-only) providers are reached explicitly, never pulled into a browser bundle via the root.
- `packages/types/test/project-files.test.ts` — 19 unit tests: normalization, fs read/list/exists, fs containment (absolute, `..`, symlink-escape against a real out-of-root symlink), memory provider incl. live-map refresh, and the recording wrapper.

### Notes
- Interface in `@refrakt-md/types` keeps the consumers (`runes`/`content`/plugins) edge-free. node builtins (`node:fs`/`node:path`) are not package dependency edges; isolating them behind the subpath preserves the root's browser-safety.
- This is purely additive — no existing file behaviour changed. The consumer migration (sandbox `src` join, snippet/expand/file-ref delegation, fileRoots/plan scan, `loadContentFromTree` plumb) lands in WORK-482/483/484; this only builds the foundation + tests.
- `types`/`transform`/`runes` all build green; full `packages/types` suite passes (46 tests).

{% /work %}
