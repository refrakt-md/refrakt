---
"@refrakt-md/skeleton": patch
---

Fix mobile docs layout where the secondary toolbar covered the top of the open side-nav panel, hiding its first link. The nav panel's `top` override had the same specificity as the base `.rf-mobile-panel` rule and lost on import order, so the panel docked under the site header instead of the toolbar. The override is now a two-class selector that wins regardless of order, and the toolbar is pinned to a known height the panel offsets against exactly.
