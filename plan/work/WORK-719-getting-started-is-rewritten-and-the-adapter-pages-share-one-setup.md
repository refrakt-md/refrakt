{% work id="WORK-719" status="ready" priority="medium" complexity="moderate" source="SPEC-193" tags="docs, getting-started, adapters" milestone="v0.49.0" %}

# Getting started is rewritten, and the adapter pages share one setup

SPEC-193 D8. Getting started never says `npm run dev` and contradicts its own scaffold step; the six
adapter pages repeat each other across about 2,400 lines.

## Acceptance Criteria
- [ ] Getting started is scaffold, `cd`, `npm run dev`, edit `index.md`; manual setup is its own page; nothing points to a sidebar that does not exist
- [ ] `adapters-overview.md` holds the shared setup (tokens, behaviors, SEO, dependencies); each adapter page keeps install, configuration, a minimal setup and what differs
- [ ] The scaffold command and target names are the same on every page

## References
- {% ref "SPEC-193" /%}: D8, F5, F7.

{% /work %}
