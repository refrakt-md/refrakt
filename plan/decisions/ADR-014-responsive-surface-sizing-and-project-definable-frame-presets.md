{% decision id="ADR-014" status="accepted" date="2026-06-10" source="SPEC-086" tags="surfaces,responsive,frames,architecture,sizing" %}

# Responsive surface sizing and project-definable frame presets

## Context

The v0.20.0 surface model (SPEC-086–090) gave media surfaces a `frame-aspect`
knob — `aspect-ratio: var(--frame-aspect)` on the media zone. It works well for
images, but two limitations surfaced in real use:

1. **Aspect is a single, fixed ratio.** Authors routinely want a different shape
   at different sizes — a hero that's `21/9` on a wide layout but `4/3` on a
   phone. A lone ratio can't express that.

2. **Aspect is the wrong tool for content guests.** `aspect-ratio` is
   width-driven: it derives height from width. That's right for media you *crop
   to a shape*, but wrong for a guest with an intrinsic **content extent** — a
   `codegroup`, `datatable`, or chart. The motivating case: a `codegroup` in a
   card should show a generous number of rows on a wide screen and only a few
   (scrolling the rest) on mobile. Forcing an aspect-ratio onto it produces a
   tall near-empty box on wide cards and a cramped sliver on narrow ones —
   neither tracks "show ~N rows."

What already exists in the codebase, and shapes this decision:

- **A `frames` preset registry exists at the theme layer** —
  `ThemeConfig.frames: Record<string, FramePresetDefinition>`
  (`packages/transform/src/types.ts`), engine-resolved with `extends`
  inheritance (`resolveFrameChrome`, `engine.ts`), and merged base-over-overrides
  (`merge.ts`). `FramePresetDefinition` already carries `aspect`, `shadow`,
  `displace`, `offset`, `oversize`, `place`, `anchor`, `extends`.
- **`tints` and `backgrounds` are already project-definable** in
  `refrakt.config.json` and merge project-over-theme, last wins
  (`packages/types/src/theme.ts`). `frames` is **not** exposed at the project
  level — the only gap in an otherwise-symmetric trio.
- **Named scales (`sm`/`md`/`lg`/`xl`) are an established vocabulary** but are
  currently fixed rems (e.g. `.rf-card[data-height="md"] { min-height: 18rem }`),
  not responsive.
- **`bento` already has an extent knob** — `content-height`/`row-height` (named
  scale → fixed rem, with `--cell-content-overflow: hidden`). It is bento-only
  and lives at the wrong layer to help `card`.
- **Guests already self-declare capabilities** — `interactive: true` in rune
  config; guests opt out of media-zone clipping by self-declaration. The
  knowledge sits with the guest (the composability contract's governing
  asymmetry).
- **The media zone already establishes a container context** (`container-type`
  is set on it), so container-query units (`cqi`) and `@container` rules are
  available without new plumbing.

## Options Considered

1. **Per-breakpoint values in content attributes** (e.g.
   `frame-aspect="16/9 sm:4/3"`, Tailwind-style). *Rejected.* Verbose; leaks
   breakpoint thinking into content (refrakt keeps content semantic);
   multiplies across every sizing knob; and — decisively — uses the **viewport**
   axis, which is wrong for a *composable* surface. The same card may be a 280px
   bento cell on a 1440px desktop, so it must respond to *its own* width, not the
   window.

2. **Raw fixed media height** (e.g. `media-height="240px"`). *Rejected as the
   primitive.* The extent intent is right, but a raw px value is unresponsive and
   off-philosophy (no raw values; reference tokens).

3. **A separate `aspects` registry in config.** *Rejected.* Registry
   proliferation — we already have `tints`, `backgrounds`, `frames`. A named
   aspect is just a frame preset with only `aspect` set, and presets usually want
   to bundle aspect + shadow + crop anyway.

4. **Arbitrary per-preset container thresholds in config.** *Rejected.* Maximally
   flexible but invites per-project breakpoint sprawl and unbounded `@container`
   codegen, and fragments the shared size vocabulary.

5. **Named tokens/presets resolved against the container, with a small fixed
   threshold set.** *Chosen* — see below.

## Decision

Adopt a coherent model with the following parts:

1. **Two named sizing intents, not one knob.**
   - **Proportional** — `frame-aspect` (width→height). For media cropped to a
     shape.
   - **Extent** — a media-zone height knob (working name `media-height`), bounded
     with overflow handling (scroll for code, fade/clip otherwise). For content
     guests.
   These are mutually exclusive on a given surface; setting both warns, extent
   wins. The extent knob is lifted into the **shared media-layout vocabulary**
   (alongside `media-position`/`media-ratio`, shared by `card`/`bento-cell`/
   `recipe`), generalising bento's `content-height` rather than reinventing it.

2. **Responsiveness lives in the named token/preset layer, resolved against the
   container — never as per-breakpoint values in content.** Named scales become
   responsive by construction via `clamp()` in container units (`cqi`), so
   `height="md"` / `media-height="md"` means "generous on a wide card, compact on
   a narrow one" with zero breakpoint authoring. The theme owns the curve.

3. **A small, fixed set of container thresholds, owned by the theme.** The
   responsive vocabulary reuses the existing named scale (`sm`/`md`/`lg`),
   expressed as a bounded set of **container-width** thresholds defined as theme
   tokens — *not* arbitrary per-preset thresholds in project config. This keeps
   `@container` codegen tractable and the size vocabulary consistent across every
   knob.

4. **Reuse the `frames` registry for named aspects; do not add an `aspects`
   registry.** A named aspect is a thin frame preset. The application grammar
   mirrors `bg` exactly: a raw value inline (`frame-aspect="16/9"`, like
   `bg-gradient="to-b"`) versus a named preset (`frame="hero"`, like
   `bg="brand-fade"`). One registry, one named-application verb.

5. **Expose the `frames` registry at the project level in `refrakt.config.json`,
   merged project-over-theme (last wins) — exactly as `tints`/`backgrounds`
   already are.** Frames stay **escape-hatch-free** (a bounded facet vocabulary,
   no raw-CSS `style` like `backgrounds` carry), so config-defined frames remain
   portable and theme-swappable.

6. **Guests self-declare their default sizing intent** (a capability,
   e.g. `mediaFit: 'aspect' | 'extent'`), read name-agnostically by the container
   — the same pattern as `interactive: true`. Image/`figure`/`gallery` default to
   aspect; `codegroup`/`datatable`/`chart`/text default to extent. So a
   codegroup-in-card "just works" (extent + scroll, responsive) with no authoring,
   and `frame-aspect`/`media-height` remain explicit overrides.

7. **Ship in two phases** (each independently useful):
   - **Phase 1 (small):** expose project-level `frames` with the existing
     `aspect: string`. Static named aspects/frames in config — pure data,
     consistent with `tints`/`backgrounds`, tiny diff.
   - **Phase 2:** the responsive layer — a container-keyed structured form for
     `aspect` (over the fixed threshold set) + `@container` codegen, responsive
     named `height`/`media-height` clamps, the generalised `media-height` extent
     knob, and guest `mediaFit` defaults.

## Rationale

- **Container, not viewport, is the only correct axis for a composable surface.**
  This is the load-bearing insight: it's *why* per-breakpoint content values are
  a trap rather than merely verbose, and why the named scales should resolve in
  `cqi`/`@container`.
- **Reuse over invention.** Frames already exist with `extends` and engine
  resolution; `tints`/`backgrounds` already prove the project-level registry
  pattern; bento already proves the extent-with-overflow concept; guests already
  self-declare capabilities. Each decision closes a gap in an existing pattern
  rather than adding a parallel one — minimal new surface area, maximal
  consistency.
- **A small fixed threshold set** keeps the responsive story bounded: codegen is
  finite, the `sm/md/lg` vocabulary stays uniform across height/aspect/extent,
  and projects can't drift into bespoke breakpoint systems. Flexibility lost is
  the long tail of arbitrary thresholds, which the named-preset + `extends`
  mechanism can usually approximate anyway.
- **Phasing** lets the cheap, high-value win (config-definable static frames)
  land immediately without waiting on the `@container` codegen.

## Consequences

- **Two specs follow** (to be drafted): **Spec A** — project-level `frames`
  registry + named static aspects (Phase 1); **Spec B** — responsive named
  scales (container-keyed `aspect` curves over the fixed threshold set,
  `@container` codegen, responsive `height` clamps, the `media-height` extent
  knob, and guest `mediaFit` defaults) (Phase 2). Likely targeted at v0.21.
- **New mechanism in Phase 2:** a responsive aspect cannot be a single custom-
  property value, so the build must emit `@container` rules per responsive preset
  — analogous to existing tint/background CSS generation, but new for frames.
- **A new guest capability** (`mediaFit`) must be threaded through core and
  plugin rune configs; guests that set neither inherit a sensible default by
  kind.
- **`FramePresetDefinition.aspect` grows** from `string` to `string | <container-
  keyed map>`; the scalar form stays valid (Phase 1 compatible).
- **Docs updates:** `runes/surfaces.md`, `runes/bg.md`, theme-authoring
  `config-api`/`surfaces`, and the new compositions catalogue (the
  codegroup-in-card pattern is the canonical extent example).
- **Escape-hatch-free frames** is now an explicit invariant to preserve: unlike
  `backgrounds`, frames must not gain a raw-CSS `style` field.

{% /decision %}
