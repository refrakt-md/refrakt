{% decision id="ADR-023" status="accepted" date="2026-06-22" source="SPEC-116" tags="frame,media,engine,composability,architecture,dx" %}

# Promote crop-bleed to a universal frame-overflow facet

## Context

The "crop a too-wide component to the screen on mobile" affordance
({% ref "SPEC-116" /%}) first shipped as a sandbox-only `bleed="crop"` attribute
(a held PR). The question is whether that declaration belongs as a one-off on the
`sandbox` rune or in the universal `frame-*` vocabulary, since the effect is a
generic media-guest framing behaviour we expect to extend to `codegroup`,
`table`, and others.

Three facts shape the decision:

- `frame-*` attributes (`frame-aspect`, `frame-displace`, `frame-oversize`,
  `frame-anchor`, …) are **universal** — auto-merged into every content-model
  schema (`UNIVERSAL_ATTRIBUTE_NAMES`) and resolved generically by
  `resolveFrameChrome` onto the frame target. They are the established
  guest-agnostic mechanism for "how a media guest relates to its frame."
- There is **direct precedent**: `showcase` shipped a bespoke `bleed` attribute
  that was later folded into `frame-displace` with a warn-once alias.
- The affordance has a part `frame-*` does not model today: a **runtime,
  per-guest overflow measurement** (the iframe bridge for `sandbox`; CSS overflow
  for `codegroup`/`table`). `frame-*` is otherwise build-time and declarative.

## Options Considered

1. **Keep `bleed="crop"` on `sandbox`; promote later.** Lowest effort now;
   ergonomic (guest-set). But it ships a rune-local attribute that becomes legacy
   the moment a second guest needs it, and fragments the `frame-*` vocabulary.
2. **Reframe to a universal `frame-overflow` facet now (chosen).** The declaration
   lives in the guest-agnostic `frame-*` family and is instantly available on
   every media-bearing rune; the runtime overflow signal stays per-guest. No
   future rune-local attribute to deprecate.
3. **Block on a general mechanism before shipping any guest.** Designs the facet
   against zero working consumers — high risk of over-fitting; rejected in favour
   of designing it with `sandbox` as the concrete first consumer.

## Decision

Adopt **`frame-overflow: clip | bleed`** as a universal frame facet, with a
**policy/signal split**:

- **Policy** — `frame-overflow` resolves (build-time, guest-agnostic) to
  `data-frame-overflow` on the host's `[data-section="media"]` frame target.
- **Signal** — the guest sets `data-overflowing` on itself at runtime when it
  measures its content as wider than the frame.
- A single shared CSS rule bleeds `[data-frame-overflow="bleed"] > [data-overflowing]`
  on a narrow viewport. `sandbox` is the first consumer; the held
  `bleed="crop"` PR is reworked, not merged as-is.

Sub-decisions:

- **Host-set is canonical.** The facet is authored on the host/slot
  (`{% hero frame-overflow="bleed" %}`), matching the rest of `frame-*`. The
  **guest-self route** (giving a guest `frameTarget: 'self'` so it can carry
  `frame-overflow` directly) is **deferred** — additive and non-breaking, but it
  also pulls the rest of the frame chrome onto the guest, so it should be a
  deliberate later step if host-set ergonomics prove awkward.
- **Hard build warning on clip hosts.** `frame-overflow="bleed"` is inert on a
  clip host (`guestFit: 'clip'`) because the media well's `overflow: hidden`
  clips the over-width. Rather than a silent no-op, the engine emits a hard
  warning naming the rune and pointing to a bleed host — same precedent as
  `warnFrameNoTarget` and the SPEC-090 interaction-posture warnings.
- **Name: `frame-overflow`** (values `clip` | `bleed`). Parallels CSS `overflow`;
  kept distinct from `frame-displace-mode`'s `peek|bleed` (which moves the whole
  guest) and from `showcase`'s deprecated `bleed` alias.
- **v1 is narrow; direction and side-by-side are deferred.** v1 ships the
  collapsed/stacked, inline-end case only. Two extensions are *designed* but out
  of v1:
  - **Bleed direction reuses `frame-anchor`.** When built, `frame-anchor`'s inline
    keyword chooses the anchored edge (`start` → bleed end, `end` → bleed start,
    `center` → bleed both), so `frame-anchor` means one thing — "the focal point
    kept" — across `object-fit` crop and overflow bleed. No new direction
    vocabulary on `frame-overflow`.
  - **Side-by-side bleeds the outer edge**, forced by `media-position`; deferred
    for its heavier geometry (escaping the grid track + page margin, interacting
    with `contentMeasure`).
  The author surface `frame-overflow="bleed"` is **stable across both** — the
  engine derives direction and edge; the attribute never changes — so the narrow
  v1 does not paint us into a corner.
- **The bleed boundary is layout-owned, never the raw viewport.** A bleed extends
  to the current layout's outermost content track — the viewport in the default
  layout, but only the **wide track** (inside the sidebar/TOC) in the docs layout,
  which has no viewport track. It is expressed as a layout-set inset
  (`--rf-bleed-room-*`, default page gutter), the same boundary `width="full"`
  honours. v1 adopts the variable seam even though its collapsed trigger (≤640px,
  where docs chrome is already hidden) does not expose the collision — so the
  deferred desktop / side-by-side / docs cases inherit a correct boundary.

## Rationale

`frame-overflow` is structurally the right home: the facet vocabulary is already
universal and resolved generically, so the declaration costs no per-rune plumbing
and any media host can express the policy. The policy/signal split keeps the frame
system declarative while letting a runtime layer activate the facet per guest —
the one new dimension this affordance needs. Designing it now (rather than
shipping a rune-local attribute) avoids a guaranteed future deprecation, and doing
it *with* `sandbox` as the first consumer (rather than purely on paper) keeps the
general shape honest. The clip/bleed gating falls out of the existing `guestFit`
axis for free, so the two facets compose without coupling.

## Consequences

- The held sandbox PR (refrakt-md/refrakt#530) is reworked: keep the measurement +
  `nextBleedState` hysteresis + tests; drop the `bleed` attribute; set
  `data-overflowing` unconditionally; move CSS to the shared frame layer.
- New engine surface: `frame-overflow` in `UNIVERSAL_ATTRIBUTE_NAMES` + the
  frame-facet meta list + `FramePresetDefinition`; `resolveFrameChrome` emits
  `data-frame-overflow` and warns on clip hosts.
- The runtime overflow signal (`data-overflowing`) is a new per-guest contract;
  generalising to `codegroup`/`table` is follow-on work (a shared overflow
  observer).
- Authoring moves from guest-set (`sandbox bleed="crop"`) to host-set
  (`hero frame-overflow="bleed"`); the guest-self ergonomic route remains open as
  a future `frameTarget` change.
- The mobile bleed geometry (reach-to-screen + rounded-iframe corners) still needs
  a real device/Safari pass — unchanged by this decision.

{% /decision %}
