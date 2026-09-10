---
'@refrakt-md/lumina': minor
---

Make `prominence` reach every rune, and ramp it relative to the rune's resting title size (WORK-538)

`prominence` re-points `--rf-title-size`, which `[data-section="title"]` reads. Eight rune stylesheets set `font-size` on their title element **directly** — and rune CSS is imported after `dimensions/` at equal specificity, so the rune rule won and the variable never arrived. On those runes the axis did nothing at all: measured in a browser, a `section` headline moved 20→24→30→40px across the scale while a `hero` headline sat at 52px at every value. `{% hero prominence="display" %}` was a silent no-op, on the rune an author is most likely to write it on.

Two changes fix it.

**The chain is split.** `prominence` now publishes `--rf-prominence-size` and the title reads `var(--rf-prominence-size, var(--rf-title-size, …))`. One variable used to carry both the density default and the author's override, which meant a rune could not state its own resting size without also silencing `prominence`. Now it can: the eight runes declare `--rf-title-size` on their root, and the override still wins. `density.css` clears `--rf-prominence-size` at every rune root so an ancestor's `prominence` cannot leak into a nested rune's title.

**The ramp is relative, not an absolute type scale.** Fixed steps (`xl` / `3xl` / `4xl`) only read as a register when a rune rests at the density default — on a hero, which rests above the whole scale, `display` made the title *smaller*; on a bento cell, which rests below it, `quiet` made it *larger*. The steps are now the ratios those fixed sizes had to the `2xl` resting size (×5/6, ×5/4, ×5/3), so the axis always moves in the direction its name implies.

**What changes on screen.** No rune's resting size moves — nothing that never asked for `prominence` is restyled. At full density the ramp is byte-identical for the 28 runes where the axis already worked (20/24/30/40) and newly effective on the eight where it was inert. At compact and minimal density the ramp now scales with the density rather than ignoring it: a compact rune's `display` is 33.3px rather than 40px. That is a visible change wherever `prominence` is set on a nested or compact-density rune, and it is the intended correction — a compact rune's display headline should not match a full-density one.

`hero`'s raw `3.25rem` is now a named resting size rather than an inline magic number. It stays a Lumina-local value rather than becoming a `--rf-text-5xl` token: the type scale is a typed contract every theme must satisfy (SPEC-048), and one rune's one-off does not belong in it.

A new test derives the title-role selectors from config and fails if any rune stylesheet pins a title `font-size` outside the chain, so the axis cannot silently go inert again.
