{% work id="WORK-346" status="review" priority="medium" complexity="moderate" source="SPEC-084" milestone="v0.20.1" tags="composability,docs" %}

# Rune compositions docs category

The composability investigation surfaced ~25 meaningful rune combinations — far
more than fit in the authoring guide. Create a dedicated **"Compositions"** docs
category, **page-per-pattern**: each page shows the Markdown you write, the
rendered result (via `preview`), and a one-liner on which zone/mechanism makes it
work. Start with **Family A** (a visual rune in a container's media zone), the
set being made first-class this milestone.

## Family A — first batch (visual guest in a media zone)
- map in card media → location card
- chart in card media → metric card
- chart in bento cell → dashboard tile ({% ref "WORK-345" /%})
- gallery in feature/card media → visual feature
- diagram in card/feature media → architecture card
- embed in card media → video / Spotify card
- codegroup in card media → code-sample card
- audio / playlist in card → release card
- swatch / palette / typography / spacing in card → design-token card
- timeline in feature → roadmap feature

### Bento signature compositions (SPEC-085)
- showcase bleed in a bento cell → screenshot/mockup peeking out of a tile
- tinted bento cells → multi-coloured grid (per-cell `tint` / `tint-mode`)
- phone `mockup` in a tall bento tile → centered + auto-scaled out of the box (uniform row tracks + the media-zone container context); `showcase` variant for the capped-at-bottom bleed. Verify mobile collapse keeps it centered with side margins.

### Surface compositions (SPEC-086–089, shipped in v0.20.0)
The surface model adds a second composition axis — the *treatment* of the
container surface around/under the guest. Document these alongside Family A
(the per-axis live demos live in the gallery, {% ref "WORK-380" /%}):
- cover poster card (`media-position="cover"`) → overlaid title + default/frost scrim
- recipe poster (header-scope cover) → title band over media, body flows below
- framed media (`frame` + facets: aspect, `anchor` crop, `frame-shadow`, displaced/`oversize` peek)
- elevated card (`elevation`) vs framed photo (`frame-shadow`) — the two-shadow distinction
- tinted / `substrate`-patterned card → coloured or textured surface fill
- `bg` gradient hero → token-driven gradient fill behind content

## Acceptance Criteria
- [x] A new "Compositions" category exists under `site/content/` with its own index/landing page explaining the media-zone model (containers adapt the slot; guests are open).
- [ ] Each Family A pattern is its own page: authored Markdown + rendered `preview` + the mechanism note.
- [x] Only patterns that are actually styled/verified ({% ref "WORK-339" /%}, {% ref "WORK-345" /%}) ship as Family A pages; un-verified families (B/C/D/E) are scaffolded or deferred, not documented as working before they are.
- [x] The surface compositions (cover/frame/elevation/substrate/tint/gradient) are documented as patterns and cross-linked with the surface-model gallery ({% ref "WORK-380" /%}) and the `surfaces`/`card`/`bg` references.
- [x] The category is linked from the docs nav and cross-referenced from the rune-authoring composability guide ({% ref "WORK-338" /%}).

## Approach
Author as standard site content with the `preview` rune for live results. Keep one
pattern per page so the catalog grows incrementally as later families become
first-class. Family A pages depend on the media-zone work landing first.

## References
- Catalog source: the composability investigation (this milestone's discussion)
- `site/content/` structure; `preview` rune
- Mechanisms: {% ref "WORK-339" /%}, {% ref "WORK-345" /%}; contract {% ref "SPEC-084" /%}

## Resolution

Completed: 2026-06-10

Branch: `claude/work-346-compositions-docs` (stacked on `claude/work-380-surface-gallery`)

### What was done
- New **Compositions** category under `site/content/runes/`:
  - `runes/compositions.md` — landing page explaining the media-zone model (open containers adapt the slot name-agnostically; guests are open), a `grid` index of the starter patterns, a "Surface compositions" section framing the second axis, and a "Other families" note deferring B–E.
  - Curated Family-A starter (5 pages), each = authored Markdown + live `{% preview %}` + a "How it works" mechanism note: `codegroup-in-card` (code-sample card), `chart-in-card` (metric card), `map-in-card` (location card), `diagram-in-card` (architecture card), `chart-in-bento` (dashboard grid — same chart guest, different container).
- Wired into the runes sidebar nav (new "Compositions" group in `runes/_layout.md`).
- The composability guide's two forward-references (`extend/rune-authoring/composability.md`) now resolve to `/runes/compositions` instead of "forthcoming; WORK-346".

### Verification
- Full `vite build` green; all 6 pages emit. Structural checks on the output: each pattern's guest nests inside its `data-section="media"` zone (codegroup renders as `data-rune="code-group"`), `chart-in-bento` places both charts in both cell media zones (2/2/2), the landing grid renders 5 linked cards, and there are no error/unknown-tag markers.
- The build's lone error (SPEC-041 duplicate spec id) and 29 warnings are all pre-existing and unrelated.

### Cross-branch dependency (why stacked)
- Criterion 4 requires cross-linking the surface-model gallery (`/runes/surface-gallery`), which lives on the WORK-380 branch. SvelteKit prerender hard-fails on dangling internal links, so this branch is **stacked on `claude/work-380-surface-gallery`** to keep the strict link-check intact and the build green. Merge order: WORK-380 first (or together), then this. The `_layout.md` nav edits from both branches are additive and merged cleanly on rebase.

### Why review, not done
- **Visual pass pending** (same as WORK-380): no headless browser in this container, so the 5 new `preview` clusters are build-verified structurally but not eyeballed in light/dark/mobile. Worth a glance when running the dev server — `map-in-card` (interactive guest, live), `chart-in-bento` (cell media sizing / row-track alignment), and `diagram-in-card` (SVG fit) especially.
- **Curated starter, not the full Family A** — criterion 2 ("each Family A pattern is its own page") is intentionally left unchecked: 5 of the ~10 Family-A patterns ship now (the doc-grounded ones); the rest — `gallery`, `embed`, `audio`/`playlist`, design `swatch`/`palette`, `timeline` — are listed on the landing page and join the catalogue as they're verified. Decide at review whether to finish the remaining patterns here or split them into a follow-up item.

## Update — consolidated into "Media guests" (IA reorg)
The page-per-pattern "Compositions" category was reorganised into a single
consolidated **Media guests** page (`runes/media-guests.md`) under a renamed
**Essentials** nav group (was "Rune Catalog"). The 7 pattern pages + landing were
merged into one sectioned page (visual data guests / code & comparison / device &
presentation / interactive guests & posture); the separate `compositions/`
directory and the "Compositions" nav group were removed. Surface-treatment
patterns (the former "family D") now live only in `surfaces.md` and are
cross-linked, not duplicated; "Media guests" scopes this page to media-zone guests
so registry-fed and layout-signature recipes become their own concept-named
sibling pages later. Rationale: removing the duplication that was forming between
the surface docs and the composition docs.

