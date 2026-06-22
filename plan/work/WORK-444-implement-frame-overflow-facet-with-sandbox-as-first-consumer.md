{% work id="WORK-444" status="ready" priority="medium" complexity="moderate" source="SPEC-116" tags="frame,media,engine,behaviors,lumina,skeleton,sandbox" %}

# Implement frame-overflow facet with sandbox as first consumer

Build the `frame-overflow: clip | bleed` facet per {% ref "SPEC-116" /%} /
{% ref "ADR-023" /%} — a universal frame facet (policy) gated by a per-guest
runtime `data-overflowing` signal — and land `sandbox` as its first consumer by
reworking the held `bleed="crop"` PR (refrakt-md/refrakt#530).

## Scope

- **Facet plumbing (engine + types).** Add `frame-overflow` to
  `UNIVERSAL_ATTRIBUTE_NAMES`, the frame-facet meta list (`FRAME_FACET_META`), and
  `FramePresetDefinition`. `resolveFrameChrome` reads it and emits
  `data-frame-overflow` on the frame target (the host `[data-section="media"]`
  zone). Default `clip` emits nothing.
- **Hard build warning.** When `frame-overflow="bleed"` resolves on a host whose
  `config.guestFit` is `clip` (or otherwise has no bleed-capable media zone), emit
  a warn-once naming the rune and pointing to a bleed host — same shape as
  `warnFrameNoTarget`.
- **Shared CSS.** One guest-agnostic rule in the frame/split layer
  (`[data-frame-overflow="bleed"] > [data-overflowing]`, mobile breakpoint):
  inline-end → screen, inline-end corners squared, inline-start anchored. Remove
  the sandbox-specific bleed CSS.
- **Sandbox first consumer (rework #530).** Keep the `scrollWidth` measurement on
  the `rf-sandbox-resize` bridge and the `nextBleedState` hysteresis + tests. Set
  `data-overflowing` **unconditionally** when overflowing (policy now lives on the
  host, not the guest). Remove the `bleed` attribute from the sandbox rune schema
  (it never shipped — no deprecation needed).
- **Docs + contract.** `frame-overflow` reference (Surfaces / frame docs), the
  runtime-gate model, the clip-host warning; structure-contract/coverage updates.

## Acceptance Criteria

- [ ] `frame-overflow="bleed"` on a bleed host emits `data-frame-overflow="bleed"` on its `[data-section="media"]` zone; `clip`/unset emits nothing; resolved via `resolveFrameChrome`.
- [ ] The shared CSS bleeds `[data-frame-overflow="bleed"] > [data-overflowing]` on a narrow viewport (inline-end to screen, inline-end corners squared, inline-start anchored); no per-rune bleed CSS remains.
- [ ] The sandbox behaviour sets `data-overflowing` from measured content width with hysteresis, independent of host policy; the sandbox `bleed` attribute is removed.
- [ ] `frame-overflow="bleed"` on a clip host (`guestFit: 'clip'`) is inert and emits a hard build warning naming the rune and a bleed host; covered by an engine test.
- [ ] Default (`clip`/unset) output is byte-identical to today for every rune (regression-safe); a guest that fits stays inset and rounded.
- [ ] Engine tests for facet emission + the clip-host warning; the sandbox detection/hysteresis tests carry over; docs updated.

## Approach

- Mirror `frame-displace` end-to-end: it is the closest existing facet (meta read
  → `data-displace` on the frame target → CSS), so `frame-overflow` follows the
  same read/emit path in `resolveFrameChrome`.
- The warning needs `config.guestFit` in scope at frame-resolution time — it
  already is (the displace-mode default added in the guestFit work reads
  `config.guestFit` there).
- Keep policy (host) and signal (guest) decoupled: the sandbox reports overflow
  regardless of whether the host bleeds, so a too-wide sandbox in a clip slot is a
  harmless no-op (well clips) and the warning catches the author error.

## Risks / Open

- **Mobile geometry needs a real device pass.** The reach-to-screen
  `width: calc(100% + gutter)` assumes the full-width host's mobile padding equals
  the gutter (true with `contentMeasure` anchoring), and rounded-iframe corner
  clipping is historically finicky in Safari. Verify on mobile Safari/Chrome.
- **Guest-self route deferred** ({% ref "ADR-023" /%}) — host-set only for now.
- **Generalisation deferred** — a shared `data-overflowing` signal for
  `codegroup`/`table`/`datatable` is follow-on work, not in this item.
- **Bleed direction deferred** — v1 is **inline-end only**. Direction (via
  `frame-anchor`'s inline keyword: start→end, end→start, center→both) is
  {% ref "SPEC-116" /%} §4 follow-on. Keep v1's emitted `data-frame-overflow="bleed"`
  forward-compatible (no rename when direction lands).
- **Side-by-side bleed deferred** — v1's trigger is the **collapsed/stacked**
  viewport only; bleeding the outer edge of a side-by-side media column
  ({% ref "SPEC-116" /%} §4) is the heavier-geometry follow-on.

## References

- Spec: {% ref "SPEC-116" /%}. Decision: {% ref "ADR-023" /%}.
- Frame facets / `resolveFrameChrome`: {% ref "SPEC-086" /%}.
- Warning precedent: {% ref "SPEC-090" /%}.
- Held PR to rework: refrakt-md/refrakt#530 (`packages/behaviors/src/elements/sandbox.ts` `nextBleedState` + measurement, `packages/runes/src/tags/sandbox.ts`, `packages/lumina/styles/runes/sandbox.css`).

{% /work %}
