---
'@refrakt-md/behaviors': patch
---

**Menubar navs get their keyboard and ARIA support back.** The menubar behaviour looked for each group's list as a direct child of the group, but `nav-group` wraps it in a `data-name="panel"` element, so every group was skipped: no `role="button"` or `aria-expanded` on the headings, no arrow-key navigation, and no Escape. Mouse users still saw working dropdowns, through the hover fallback. The behaviour now finds the panel by its `data-name`.
