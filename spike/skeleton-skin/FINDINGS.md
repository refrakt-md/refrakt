# WORK-410 — skeleton/skin split spike: findings

A working `@layer skeleton, skin` split of a representative slice — **`card`**
(a card-surface rune), **`hint`** (an inline rune carrying icon data), and the
**`surfaces.css`** dimension file — re-skinned with a deliberately un-Lumina
"editorial" look. Artifacts in this directory:

| File | Role |
|------|------|
| `skeleton.css` | The shared structural layer (`@layer skeleton`). |
| `skin.lumina.css` | Lumina's aesthetic layer (`@layer skin`); surface treatment keyed off `[data-elevation]` (SPEC-107 preview). |
| `skin.editorial.css` | A drop-in alternate skin — serif/flat/paper. |
| `layers.css` | The one-line order declaration + imports. |
| `icons.json` | The hint glyphs lifted out of CSS (the "content" category). |
| `demo.html` | Same markup under either skin. |

## 1. The cut-line rule (the per-declaration contract)

The cut is **correctness, not taste**, with a **third category** the original
§8 framing implied but didn't name:

- **Skeleton** — the rune *breaks without it*: content overlaps, collapses,
  loses a zone, or loses an interaction mechanism. Concretely: `display` /
  `grid-*` / `flex-*` / `position` / `inset` / `z-index` / `overflow`, gap and
  margin **resets**, the stretched-link mechanism, the media↔content split
  geometry, height-fill rules. Skeleton **references** tokens by name
  (`var(--rune-padding)`) but never sets their values, and never sets colour,
  border style/presence, radius, shadow, or font.
- **Skin** — a different theme would plausibly want it different and the rune
  does **not** break without it: colour, background, **border presence/style**,
  `border-radius`, `box-shadow`, font family/size/weight/tracking/transform,
  and the **values** of spacing/type tokens.
- **Content (data)** — neither skeleton nor skin: embedded *assets* and the
  rune→treatment **assignment**. The hint icon `data:image/svg+xml` masks and
  the `surfaces.css` rune-name buckets are both data masquerading as CSS. They
  leave the stylesheet entirely → engine/theme config (§4, §5).

**The three gray-zone calls, resolved:**

1. **padding / margin / gap.** Structure decides *that* they exist and *where*;
   the **magnitude is skin**. Resolution: skeleton writes `var(--token)`, skin
   sets the token. Caveat — this only works once spacing is tokenized; `card.css`
   still hardcodes `0.5rem` / `0.375rem`. **Spacing-token coverage is a
   prerequisite**, exactly as type-token coverage (WORK-405) was for the type
   split. The single biggest "more work first" finding.
2. **border presence.** A card without a border still *works* → border is
   **skin**. (This is what lets the editorial skin drop to a hairline rule.)
3. **the padding *pattern* per surface** (`card` = all-round, `inline` =
   vertical-only, `banner` = vertical-xl). This co-varies with the surface
   identity, so it is **skin keyed off `[data-elevation]`** — not skeleton.

## 2. Packaging decision

**Recommendation: a dedicated, versioned `@refrakt-md/skeleton` package** that
ships only `@layer skeleton` (structure + the `@layer skeleton, skin;` order
declaration), plus the token *contract* (names, not values). Every theme
depends on it and ships only its skin layer.

- *Why a package over a neutral `base.css` export:* the skeleton is the public
  contract every future theme builds on; it must be independently versionable
  from any one skin, and a breaking structural change should bump *its* version,
  not Lumina's. A `base.css` buried in `@refrakt-md/transform` blurs that
  ownership.
- *Lumina becomes* `@refrakt-md/skeleton` + a Lumina skin layer; the skeleton is
  no longer "Lumina's structure other themes inherit."

## 3. Layer order is guaranteed, loader-agnostically

The whole split rests on **one line loaded first**: `@layer skeleton, skin;`.
Once the order is declared, layer *contents* may arrive in any source order or
from different packages and the skin still wins where it overlaps skeleton —
with single-class/attribute selectors and **zero `!important`** (verified: the
editorial skin overrides purely by layer order). So the SvelteKit virtual-module
loader's only obligation is to **emit the order declaration before any layer
content** — which falls out of importing the `@refrakt-md/skeleton` entry first.
It does *not* need to guarantee skeleton-import-before-skin-import, which removes
the fragile ordering constraint the work item worried about.

> Caveat: confirmed by construction + the cascade rules, not by a rendered
> before/after diff — that step needs the WORK-409 harness, blocked on Chromium
> download in this environment. The pixel diff is the one deferred AC.

## 4. Icon-from-config (the "content" category)

`hint.css` embeds 5 `data:image/svg+xml` mask-images (note/warning/caution/check
+ base). Repo-wide that's **9 occurrences across 2 files** (`hint`, `accordion`).
Lifted into `icons.json`, the skeleton's `::before` just reads
`mask-image: var(--rf-hint-icon)`, and the glyph comes from the theme icon
registry (the same source the `{% icon %}` rune + `icon:` scheme use). A theme
swaps glyph sets without touching CSS. Small surface, clean win — do it
alongside the surface change.

## 5. `data-surface` probe (ties to SPEC-107)

`surfaces.css` is the clearest case: **49 rune-name selector lines** across four
buckets are pure *assignment*, plus two `:where(.rf-card, …)` media-chrome lists.
Under SPEC-107 + WORK-423 the engine emits `data-elevation` from per-rune
`defaultElevation` config, and the four buckets collapse to **~5
`[data-elevation="…"]` rules** (demonstrated in `skin.lumina.css`). The slice
confirms the SPEC-107 vocabulary maps cleanly onto the real treatments:
`card`/`inset` buckets → `raised`/`flat`/`sunken`, `inline` → `flush`, `banner`
→ `flush` + `width: full`. **No vocabulary gaps surfaced.**

## 6. Scope estimate for v0.23.0

Measured: **114 CSS files** (92 rune + 12 dimension + 10 layout), **~13,532
lines / ~6,058 declarations**. Extrapolating the slice's cut (a small, comment-
heavy sample — treat as ±10%):

- **~40% skeleton / ~55% skin / ~5% content+assignment.**
- The mechanical work is **re-bucketing declarations into two `@layer` blocks
  per file** across ~114 files — large but low-risk and parallelizable.
- The non-mechanical, gating work, in order:
  1. **Spacing-token coverage** (like WORK-405 for type) — the prerequisite for
     a clean spacing skin/skeleton split. *Probably its own work item.*
  2. **`data-surface`/`data-elevation` engine emission** — WORK-423 (already in
     v0.23.0); removes the 49-selector enumeration + media lists.
  3. **icon-from-config** — 9 URIs / 2 files; small.
  4. The bucket-and-layer pass itself, file by file.
  5. The `@refrakt-md/skeleton` package + the loader's order-declaration emit.

Suggested v0.23.0 additions (beyond the SPEC-107 axis items already there):
a spacing-token work item (gate), the `@refrakt-md/skeleton` extraction +
layer-order loader change, the icon-from-config change, and the per-layer
re-bucketing (likely split across a few work items by file group).

## 7. What the editorial re-skin surfaced (leaks)

Re-skinning to serif/flat/paper hit **no specificity walls** — the split holds.
The leaks it exposed were all **un-tokenized values**, not mis-placed structure:
hardcoded `0.5rem`/`0.375rem` spacings and `0.8125em` font-size in `card.css`
that the skin can only override by restating, not retune. That reinforces §1's
prerequisite: tokenize spacing before the wholesale split, or the skin layer
can't cleanly own magnitudes.

## 8. Deferred

The before/after **visual diff** (WORK-409 harness) is the one acceptance step
not closeable here — Chromium download is blocked by the environment's network
policy. The split is validated by construction, the cascade rules, and the
isolated demo; the pixel diff should run once a browser env is available.
