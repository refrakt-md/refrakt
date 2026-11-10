{% work id="WORK-719" status="done" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, getting-started, adapters" milestone="v0.49.0" pr="refrakt-md/refrakt#792" %}

# Getting started is rewritten, and the adapter pages share one setup

SPEC-193 D8. Getting started never says `npm run dev` and contradicts its own scaffold step; the six
adapter pages repeat each other across about 2,400 lines.

## Acceptance Criteria
- [x] Getting started is scaffold, `cd`, `npm run dev`, edit `index.md`; manual setup is its own page; nothing points to a sidebar that does not exist
- [x] `adapters-overview.md` holds the shared setup (tokens, behaviors, SEO, dependencies); each adapter page keeps install, configuration, a minimal setup and what differs
- [x] The scaffold command and target names are the same on every page

## References
- {% ref "SPEC-193" /%}: D8, F5, F7.

## Resolution

Completed: 2026-11-10

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- `docs/getting-started.md` rewritten: scaffold, `cd`, `npm install`, `npm run dev`, edit `content/index.md`; new `docs/manual-setup.md` in the Guide group.
- `adapters-overview.md` holds the shared setup (CSS, site-level token overrides, behaviors, SEO, dependencies); each adapter page keeps install, configuration, a minimal setup and its own APIs, linking the shared sections (2,294 → 1,328 lines across the six). Adapter facts checked against source and corrected.
- `npx create-refrakt`, the `--target` names, `color` and "Internationalization" throughout docs, runes, extend, themes and plan pages.

### Notes
- Fixed BUG-052 (`--framework svelte` in create-refrakt's help) here; filed BUG-051 (Eleventy `createDataFile` skips the identity transform).

{% /work %}
