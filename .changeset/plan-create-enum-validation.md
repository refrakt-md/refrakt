---
"@refrakt-md/plan": patch
---

**Fix: `plan create` now validates enum attributes at write time.** `plan update` rejected invalid `status`/`priority`/`complexity`/`severity` values, but `plan create` passed any `attrs` straight into the scaffolded file unchecked — so a stray `complexity="small"` (or `status="todo"`) landed silently and only surfaced later as a `plan validate` error. `create` (and the `plan.create` MCP tool) now run the same validation as `update`, rejecting unknown attributes and out-of-vocabulary enum values with a message listing the valid set, before any file is written. The vocabularies (`VALID_STATUS`, `VALID_PRIORITY`, `VALID_COMPLEXITY`, `VALID_SEVERITY`, allowed-attr lists) are consolidated into a single shared `enums` module so `create`, `update`, and `validate` can no longer drift apart, and the `plan.create` MCP schema documents the accepted enum values.
