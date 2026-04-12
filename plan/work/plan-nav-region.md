{% work id="WORK-038" status="done" priority="high" complexity="moderate" tags="plan, html, pipeline" source="SPEC-014,SPEC-015" %}

# Build nav region builder for plan site

Convert the existing `buildNavigation()` output (`NavGroup[]`) into a renderable tag tree that can be passed as a layout region to `renderFullPage()`.

Currently the sidebar HTML is hand-rolled in the HTML shell template. This work item replaces that with a `buildNavRegion()` function that produces serialized tags with BEM classes matching the existing `.rf-plan-sidebar__*` selectors.

## Acceptance Criteria

- [x] `buildNavRegion(groups, activePath)` function exists in `@refrakt-md/plan`
- [x] Output is a serialized tag tree (plain `{$$mdtype:'Tag'}` objects)
- [x] Tags use correct BEM classes: `.rf-plan-sidebar`, `.rf-plan-sidebar__group`, `.rf-plan-sidebar__link`, `.rf-plan-sidebar__link--active`
- [x] Entity links include `data-status`, `data-id` attributes for future filtering (SPEC-015)
- [x] Existing sidebar visual appearance is preserved
- [x] Unit tests verify the tag tree structure

## Approach

Create `buildNavRegion()` alongside the existing `buildNavigation()` in `render-pipeline.ts`. It walks the `NavGroup[]` array and emits tags with appropriate BEM classes and data attributes. The output plugs directly into `LayoutPageData.regions.nav`.

## References

- {% ref "SPEC-014" /%} (Plan Site via HTML Adapter)
- {% ref "WORK-037" /%} (defines the layout that consumes this region)

{% /work %}
