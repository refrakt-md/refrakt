{% work id="WORK-489" status="done" priority="medium" complexity="moderate" source="SPEC-100" tags="carousel,collapse,layout,container-queries,preview,css" milestone="v0.26.0" %}

# Container-query collapse-to-carousel + responsive-preview simulation

The shared `data-collapse` responsive contract ({% ref "WORK-469" /%}, {% ref "WORK-473" /%}) is
`@media`-based: beside→stack collapse (`split.css`), grid→1-column reflow (`feature.css`), and
collapse-to-carousel (`carousel.css`) all key off the **global viewport**. Two consequences:

1. A rune in a narrow column (e.g. a `feature` inside the docs layout beside a sidebar, or any
   nested context) collapses on *viewport* width, not its **own available width** — so it can stay
   in a multi-column grid while visibly cramped, or collapse while it actually has room.
2. The `preview` rune's responsive viewport selector (`responsive="mobile,tablet,desktop"`) only
   sets `max-width` on a plain `<div>` frame — it does **not** simulate `@media` breakpoints. So
   `collapse-to="carousel"` (and every other `data-collapse` flip) cannot be demonstrated via the
   selector; the frame just narrows and width-intrinsic layouts (auto-fit grids) reflow, but the
   media-query-gated flips never fire. This is why the `feature` carousel doc example first shipped
   as always-on `layout="carousel"` rather than the more representative grid + `collapse-to="carousel"`.

## Design: host-as-container (not frame-as-container)

The first sketch was to make `.rf-preview__viewport-frame` a container and convert all three contract
files to query `.rf-page-content`. Implementation found a cleaner, narrower design: **make the collapse-to host its own query container.** `@container (max-width:…)` on the item track
(`[data-name="items"]`, a descendant) then measures the rune's *own* width — correct on real pages
for every width variant (a full-bleed `feature` collapses on its full width; one in a narrow column
collapses on that column) **and** automatically faithful in the preview (the host fills the
constrained frame, so the selector shrinks the container and fires the breakpoint) with **no preview
wiring and no `.rf-page-content`-relative semantic shift**. The `container-type` lands only on hosts
that opted into `collapse-to="carousel"`, so the blast radius is exactly that opt-in surface.

## Scope (delivered)

- `packages/skeleton/styles/runes/carousel.css`: add `[data-collapse-to="carousel"] { container-type:
  inline-size }` and convert the sm/md/lg collapse-to-carousel blocks from `@media` to `@container`.
  Same breakpoints and `data-collapse` hook; `never` still opts out.
- `site/content/runes/marketing/feature.md`: add a `### Carousel on mobile only (collapse-to)`
  example — `layout="grid" collapse-to="carousel"` inside a `responsive="mobile,tablet,desktop"`
  preview — alongside the kept always-on `layout="carousel"` example. Prose explains the own-width flip.

## Non-goals / deferred

- No `matchMedia` mount/unmount in the behavior layer (SPEC-100 ruled this out; the responsive path
  stays CSS/touch-only — no JS nav on collapse).
- No change to the breakpoint *values* (sm/md/lg) or the `data-collapse` author API.
- **Deferred — the broader collapse-contract migration.** `split.css` (beside→stack) and
  `feature.css` (grid→1-col) stay `@media` for now. `split.css`'s rule targets the rune *root* (it
  cannot self-query — would need an ancestor container or a wrapper) and is shared by 8+ runes
  (card/recipe/hero/step/realm/faction/playlist), so converting it is a high-blast-radius,
  viewport-vs-column semantic shift that deserves its own work item + cross-layout visual review. The
  `feature` grid→1-col flip is moot under `collapse-to="carousel"` (the carousel flip overrides
  `display`), so it is not needed for this deliverable.

## Acceptance Criteria
- [x] `collapse-to="carousel"` is container-query driven: the host is a query container and the item-track flip keys off the rune's own width, not the global viewport (sm/md/lg breakpoints and `never` opt-out unchanged).
- [x] The flip is faithfully demonstrable in the `preview` viewport selector with no preview-side wiring (`mobile` flips to a swipe row; `tablet`/`desktop` keep the grid), because the previewed host fills the constrained frame.
- [x] `container-type` is scoped to `[data-collapse-to="carousel"]` hosts only (no site-wide container/breakpoint shift); split.css/feature-grid stay `@media` and are documented as deferred follow-up.
- [x] The `feature` doc page gains a grid + `collapse-to="carousel"` example in a responsive preview, with prose explaining the own-width flip; the always-on `layout="carousel"` example (which shows the nav buttons) is retained.
- [x] Build + existing tests green (skeleton, lumina css-coverage, marketing feature, behaviors carousel).

## Approach

Mechanical `@media`→`@container` swap of the collapse-to-carousel blocks in `carousel.css`, plus the
host `container-type`. `refrakt inspect feature --collapse-to=carousel` confirms the host carries
`data-collapse-to="carousel"` and the `<dl data-name="items">` track is its descendant, so the query
resolves host→track correctly. **Visual verification still recommended** in a real browser: confirm a
full-width `feature` with `collapse-to="carousel"` collapses sensibly on resize, and that
`container-type: inline-size` on the host does not disturb the full-bleed placement or anchored
content measure (containment establishes a containing block — low risk, but worth a look). Lives
behind the v0.26.0 carousel epic so it can be reverted independently.

## Dependencies

- {% ref "WORK-469" /%} — the `data-collapse` hook being converted.
- {% ref "WORK-473" /%} — the collapse-to-carousel CSS target being converted.
- {% ref "WORK-474" /%} — `feature` carousel adoption (the doc example extended here).

## References

- Spec: {% ref "SPEC-100" /%} (carousel as a shared layout mode), {% ref "SPEC-099" /%} §3 (`collapse` semantics).
- Prior art: existing `@container` usage in `default.css`, `split.css`, `bento.css`, `hero.css`, `mockup.css`, `docs.css`.
- Origin: discovered while fixing the `feature` carousel doc example — the preview viewport selector could not demonstrate `collapse-to="carousel"` because the flip is `@media`-gated and the frame is width-only.

## Resolution

Completed: 2026-06-26

Branch: `claude/feature-carousel-gap-nav-fix`

### What was done
- `packages/skeleton/styles/runes/carousel.css` — collapse-to-carousel is now container-query driven. Added `[data-collapse-to="carousel"] { container-type: inline-size }` (the host becomes its own query container) and converted the sm/md/lg `@media (max-width: …)` blocks to `@container (max-width: …)`. Breakpoints, the `data-collapse` hook, and the `never` opt-out are unchanged.
- `site/content/runes/marketing/feature.md` — added a `### Carousel on mobile only (collapse-to)` example: `layout="grid" collapse-to="carousel"` inside a `responsive="mobile,tablet,desktop"` preview, with prose explaining the own-width flip. Kept the always-on `layout="carousel"` example (it demonstrates the nav buttons).

### Design note
Chose **host-as-container** over the originally-sketched frame-as-container + 3-file conversion. Querying the host's own width is correct on real pages for every width variant AND makes the preview faithful for free (the host fills the constrained frame, so the viewport selector drives the breakpoint) — with no preview wiring and no `.rf-page-content`-relative semantic shift. `container-type` lands only on opted-in `[data-collapse-to="carousel"]` hosts, so the blast radius is exactly that surface.

### Verified
- `refrakt inspect feature --collapse-to=carousel --layout=grid` confirms the host `<section>` carries `data-collapse-to="carousel"` and the `<dl data-name="items">` track is its descendant (query resolves host→track).
- Build green (skeleton, lumina). Tests green: lumina css-coverage, marketing (all), behaviors (all) — 315 passed.

### Caveat / follow-up
- Browser visual verification not performed in this environment — recommend a manual pass: a full-width `feature` with `collapse-to="carousel"` collapsing sensibly on resize, and that `container-type: inline-size` on the host doesn't disturb full-bleed placement or the anchored content measure (low risk; containment establishes a containing block).
- Deferred (documented in Non-goals): the broader collapse-contract migration — `split.css` beside→stack (root-targeting, shared by 8+ runes, high blast radius) and `feature.css` grid→1-col (moot under collapse-to=carousel). Worth its own work item with cross-layout review.

{% /work %}
