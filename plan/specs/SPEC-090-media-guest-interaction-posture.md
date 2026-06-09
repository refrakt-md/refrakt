{% spec id="SPEC-090" status="draft" tags="composability,runes,engine,a11y,dx" %}

# Media-guest interaction posture: presentational guests, clickable containers, cover backdrops

A media-slot guest can be interactive (a `codegroup`'s tabs, a live pannable `map`, a
`form`, a `sandbox`) and its container can *also* be an interaction target — a `card`
or `bento-cell` with `href`, rendered as a stretched whole-tile link. Today these
collide with **undefined behaviour**: the link is a stretched overlay
(`.rf-bento-cell__link { position:absolute; inset:0; z-index:0 }`) and only
`a:not(.link)` is lifted above it (`z-index:1`), so a guest's *buttons* sit under the
link and their clicks are mostly eaten — the tabs look clickable but aren't. Layering an
interaction target over interactive controls is also the classic
nested-interactive-in-a-link **accessibility antipattern** (ambiguous focus and
activation). This isn't a style preference; the model has to pick a defined posture.

## Overview

### One interaction target per tile

The governing rule: **a media guest is presentational by default, and an interactive
guest is mutually exclusive with a clickable container.** "Media slot" means *display* —
image, chart, diagram, a map-as-illustration — so interactivity is the exception, not
the norm. When the container is itself an interaction target, the guest yields:

- **`href` wins.** A linked tile is one link; its media guest is demoted to
  presentational. (Chosen over the inverse — guest suppresses `href` — because the
  linked tile is the more common intent and the safer a11y default: one unambiguous
  target.)
- The rule scopes to the **media guest**, not to authored content controls (a "Follow"
  button in the body stays clickable — see §3).

## Design

### 1. Guests are presentational by default

- A media guest renders for display. Interactivity is an explicit guest capability — the
  behaviour-driven runes (`codegroup`, `tabs`, `datatable`, `form`, plus `map`,
  `sandbox`, `juxtapose`) and any guest that declares it. The engine therefore knows
  which guests are interactive.
- Each interactive guest defines a **presentational fallback**: `codegroup` → its default
  tab shown statically (no tab strip interaction); `tabs` → first panel; `map` → a static
  snapshot/first frame; `juxtapose` → a fixed split. Most media already has a static form.

### 2. A clickable container demotes its media guest

- When a `card`/`bento-cell` has `href` (the stretched whole-tile link), its media guest:
  - renders its **presentational fallback** (§1), and
  - is `pointer-events: none`, so the whole tile links reliably with no dead zones.
- A genuinely-interactive guest in a linked tile emits a **build warning** (SPEC-084
  validation): *"interactive guest in a linked tile — its controls are inert; drop `href`
  or the interactivity."* It still renders (presentationally); the warning is
  informative, not fatal.

### 3. The demotion is scoped to the media guest only

- **Content-overlay controls stay interactive.** Body/footer links and buttons (the
  "Follow" button, inline links) are the lifted `z-index:1` layer above the stretched
  link and keep working. The DOM boundary is clean: the **media zone**
  (`[data-section="media"]`) is presentational under `href`; the **content zone** is
  interactive. Demotion never touches authored content controls.

### 4. A cover guest is an inert backdrop

- In `media-position="cover"` ({% ref "SPEC-089" /%}) the guest sits *behind* the content
  overlay, so it is **`pointer-events: none` regardless of `href`** — you don't pan the
  map behind the title. Interaction belongs to the overlay (and the card link, if any).
- An interactive full-bleed guest with overlaid UI controls (a pannable map with floating
  buttons, a video player with overlaid chrome) is an **app/dashboard widget, explicitly
  out of scope** for a content card — that is where the z-index/pointer ambiguity this
  spec removes would otherwise return.

### 5. A non-clickable container hosts interactive guests normally

- A `card`/`bento-cell` **without** `href` (and not in `cover`) is a plain container: the
  guest's interactivity works as authored. This is the only configuration in which a
  media guest is interactive.

## Acceptance Criteria

- [ ] Media-slot guests are presentational by default; interactivity is an explicit guest capability (`codegroup`/`tabs`/`datatable`/`form`/`map`/`sandbox`/`juxtapose`/declared), and each interactive guest defines a static presentational fallback.
- [ ] A clickable container (`card`/`bento-cell` with `href`) demotes its media guest: the guest renders its static fallback and is `pointer-events: none` so the whole tile links reliably; a genuinely-interactive guest emits a build warning.
- [ ] The demotion is scoped to the **media guest** only — content-overlay controls (body/footer links & buttons, the lifted `z-index:1` layer) stay interactive in a linked tile.
- [ ] In `cover` mode ({% ref "SPEC-089" /%}) the media guest is a non-interactive backdrop (`pointer-events: none`) regardless of `href`; interactive full-bleed guests with overlaid UI are out of scope.
- [ ] A container **without** `href` (and not `cover`) hosts interactive guests normally.
- [ ] Docs: `card`/`bento` reference + composability docs document the posture (presentational-by-default, `href`-wins demotion, cover backdrop) and the build warning.

## Work breakdown (provisional)

1. **Guest interaction model** — presentational default + an `interactive` capability flag (behaviour-driven runes + declarable); a static fallback per interactive guest.
2. **`href` demotion** — detect a clickable container, set the media guest `pointer-events: none` + render its fallback, emit the build warning.
3. **Cover backdrop** — `pointer-events: none` on the `cover` media guest unconditionally.
4. **Validation + docs** — build warnings; reference-doc posture section.

## References

- Composability + validation philosophy: {% ref "SPEC-084" /%}.
- Cover layout (the inert-backdrop case): {% ref "SPEC-089" /%}.
- Current link model: stretched `.rf-bento-cell__link` + `a:not(.link)` z-index lift in `packages/lumina/styles/runes/bento.css` and `card.css`; whole-cell `href` in `plugins/marketing/src/tags/bento.ts` / card schema.
- Behaviour-driven (interactive) runes: `@refrakt-md/behaviors`; media-zone contract {% ref "WORK-339" /%}.

{% /spec %}
