---
"@refrakt-md/behaviors": patch
"@refrakt-md/skeleton": patch
"@refrakt-md/lumina": patch
---

**Preview toolbar: surface the view toggle separately and hide preview-only controls in code view.** The view-mode toggle (preview ⇄ code) now sits in its own group on the left of the toolbar, visually distinct from the controls that *tune* the rendered preview. Those preview-only controls — the responsive viewport selector and the theme toggle — are hidden while the code view is active, since they act on a canvas that isn't shown. Their state is retained and reapplied when you switch back to the preview. Toolbar chrome is also tidied: the toolbar sits flush to the canvas edges (no horizontal inset), the left group has no inter-item gap, and the source/code panel is clipped to its rounded corners so the bottom corners round correctly (matching the canvas).
