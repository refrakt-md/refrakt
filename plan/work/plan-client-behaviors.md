{% work id="WORK-041" status="done" priority="medium" complexity="simple" tags="plan, behaviors" %}

# Add client behaviors to plan site

Wire `@refrakt-md/behaviors` into the plan site via `initPage()` from `@refrakt-md/html/client`. This enables copy-to-clipboard buttons on code blocks and provides the foundation for future interactive behaviors.

## Acceptance Criteria

- [ ] Behaviors JS bundle is served at `/__plan-behaviors.js` (serve) or written to `behaviors.js` (build)
- [ ] `initPage()` is called on page load via a `<script>` tag
- [ ] Copy-to-clipboard button appears on all `<pre>` code blocks
- [ ] Plan theme CSS includes `.rf-code-wrapper`, `.rf-copy-button`, `.rf-copy-button--copied` selectors
- [ ] Behaviors work in both `serve` and `build` modes

## Approach

The behaviors bundle is loaded client-side — `@refrakt-md/behaviors` is a runtime dependency, not a build-time package dependency. The script tag is injected via the `scripts` option on `renderFullPage()`. Add the copy button CSS selectors to the plan theme stylesheets.

## References

- SPEC-014 (Plan Site via HTML Adapter)
- WORK-039 (the refactored pipeline)
- WORK-040 (syntax highlighting — copy buttons are most useful on highlighted code)

{% /work %}
