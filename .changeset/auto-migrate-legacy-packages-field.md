---
"@refrakt-md/transform": patch
---

Auto-migrate the legacy `packages` config field to `plugins` and emit a one-time deprecation warning. The field was renamed in v0.12.0 when rune packages and CLI plugins were unified, but the parser was silently ignoring the legacy field rather than warning, which broke sites that still used `sites.X.packages`. The legacy field now auto-migrates with a console warning and will be removed in v1.0.
