{% work id="WORK-040" status="done" priority="medium" complexity="moderate" tags="plan, highlight" source="SPEC-014" %}

# Add syntax highlighting to plan site

Apply `@refrakt-md/highlight` to the plan render pipeline so code fences in plan content get proper syntax coloring. Currently code blocks render as plain `<pre><code>` with no highlighting.

## Acceptance Criteria

- [ ] `@refrakt-md/highlight` is added as a dependency of `@refrakt-md/plan`
- [ ] `createHighlightTransform()` is applied after identity transform in the pipeline
- [ ] Code fences with language annotations render with syntax highlighting
- [ ] Highlight CSS is concatenated with the plan theme CSS
- [ ] Light/dark mode works via CSS variables (inherited from plan theme)
- [ ] Common plan content languages work: `bash`, `json`, `typescript`, `markdown`
- [ ] Build output includes highlighted code (no client-side JS required)

## Approach

After serialization and identity transform, run the highlight transform on the tree before passing it to `renderFullPage()`. The highlight transform exposes a `.css` property — append this to the theme stylesheet.

## References

- {% ref "SPEC-014" /%} (Plan Site via HTML Adapter)
- {% ref "WORK-039" /%} (the refactored pipeline this plugs into)

{% /work %}
