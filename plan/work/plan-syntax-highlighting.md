{% work id="WORK-040" status="done" priority="medium" complexity="moderate" tags="plan, highlight" source="SPEC-014" %}

# Add syntax highlighting to plan site

Apply `@refrakt-md/highlight` to the plan render pipeline so code fences in plan content get proper syntax coloring. Currently code blocks render as plain `<pre><code>` with no highlighting.

## Acceptance Criteria

- [x] `@refrakt-md/highlight` is added as a dependency of `@refrakt-md/plan`
- [x] `createHighlightTransform()` is applied after identity transform in the pipeline
- [x] Code fences with language annotations render with syntax highlighting
- [x] Highlight CSS is concatenated with the plan theme CSS
- [x] Light/dark mode works via CSS variables (inherited from plan theme)
- [x] Common plan content languages work: `bash`, `json`, `typescript`, `markdown`
- [x] Build output includes highlighted code (no client-side JS required)

## Approach

After serialization and identity transform, run the highlight transform on the tree before passing it to `renderFullPage()`. The highlight transform exposes a `.css` property — append this to the theme stylesheet.

## References

- {% ref "SPEC-014" /%} (Plan Site via HTML Adapter)
- {% ref "WORK-039" /%} (the refactored pipeline this plugs into)

{% /work %}
