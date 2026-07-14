---
"@refrakt-md/plan": minor
---

Close the spec → work → PR traceability loop (SPEC-049).

- **Spec lifecycle** — specs gain `implemented` (code in `main`) and `shipped` (released to npm) statuses beyond `accepted`, plus a `released-in="vX.Y.Z"` attribute. `plan validate` errors on a `shipped` spec that lacks `released-in`.
- **ADR `rejected`** — decisions gain a terminal `rejected` status for "considered and explicitly declined", distinct from `superseded`/`deprecated`.
- **First-class `pr` attribute** — `work` and `bug` accept a multi-valued `pr` (`<org>/<repo>#<number>`). `plan validate` errors on malformed values but does not warn on a missing `pr` (carrot before stick). The legacy `PR:` resolution line is still parsed as a fallback; the attribute wins.
- **`plan status` traceability rollups** — a per-spec PR rollup (deduped across `implemented-by` work) and an `implemented`-flip suggestion when every linked work item of an `accepted` spec is `done`. Exposed in `--format json`.
- **`refrakt plan migrate pr-attrs`** — backfills the `pr` attribute on legacy `done` work / `fixed` bug items by mining git merge-commit history (dry-run by default; `--apply`/`--git`). It attributes a commit to the PR whose topic branch actually introduced it, skips items whose history is ambiguous, and reports unresolved items without touching them.
- **Docs** — CLAUDE.md's completion checklist gains a standalone `pr` step; the `plan init` template, SPEC-021, and the site plan docs describe the new statuses, the `pr` attribute, and the `accepted → implemented → shipped` lifecycle.
