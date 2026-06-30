---
"@refrakt-md/types": minor
"@refrakt-md/content": minor
"@refrakt-md/runes": minor
"@refrakt-md/plan": minor
---

ProjectFiles seam (SPEC-113) — a virtual project filesystem for hosted and in-browser builds.

Consolidates the ad-hoc `node:fs` seams at the pipeline edges into one injectable, synchronous `ProjectFiles` interface (`read`/`list`/`exists` over normalized POSIX project-root-relative keys, with containment as part of the contract). Ships `fsProjectFiles`, `memoryProjectFiles`, and `recordingProjectFiles` providers via `@refrakt-md/types/project-files`.

- **Sandbox, snippet, expand, file-ref, fileRoots, and the plan scan** now read through the provider instead of calling `node:fs` directly. The previously-unguarded sandbox `src` directory join inherits containment, closing a path-traversal gap.
- **`loadContentFromTree`** accepts `projectFiles` and `gitTimestamps`, and the new `ContentTree.fromContentMap` assembles a page corpus from a normalized key→content map — so a complete site can build from a pure in-memory `Map` with zero filesystem access (the hosted-renderer path).
- Every consumer keeps an `fs` fallback, so self-hosted builds are unchanged; the only behavioural change is containment on previously-unguarded paths.
- Docs: a new "Hosted & In-Memory Builds" guide covers the contract and the fetch-then-build materialization pattern.
