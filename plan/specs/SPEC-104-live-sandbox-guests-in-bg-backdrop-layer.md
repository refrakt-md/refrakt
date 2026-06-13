{% spec id="SPEC-104" status="draft" source="SPEC-088" tags="surfaces,runes,engine,bg,sandbox,lumina,layout,media" %}

# Live sandbox guests in the `bg` backdrop layer

`bg` ({% ref "SPEC-088" /%}) can fill its backdrop with an **image, video, or
gradient** — resources fully specified by a URL or token reference. It cannot host
a **live program** (a three.js / canvas visualizer in a `sandbox`). This spec adds a
**bg guest**: a `sandbox` rendered into the bg layer as a bare, presentational,
full-bleed backdrop — behind a rune's content, beneath its `tint`/`substrate`, never
in flow. It also adds a **named, transform-resolved `sandbox` preset** so a reusable
backdrop is applied by name (`bg="midnight-waves"`) like any other preset.

This is the missing layer that lets a surface carry **both** an animated backdrop **and**
a positioned subject media: the visualizer is the `bg`, the image/video is the in-flow
media guest. It is the general fix behind the music-blog hero (a playlist whose cover is
a live audio visualizer with a mood image), but it is a surface-model capability, not a
media-specific one.

Target: next minor.

## Motivation

Two limits collide:

- **`bg` hosts only URL/CSS fills.** The engine builds the bg layer from `bg-*` metas
  (`engine.ts` §1f): `--bg-image: url(…)` / a gradient, plus a hand-built `<video>` for
  `bg-video`, an overlay, and a scrim. Every fill is a passive resource the engine can
  synthesize from a string. A `sandbox` is not — see below.
- **`cover` consumes the single media zone.** {% ref "SPEC-089" /%} cover repurposes a
  rune's *media guest* as the backdrop ("media fills the interior, content overlays").
  That is why a rune can't have a cover backdrop **and** a positioned subject media at
  once — there is only one media zone and cover eats it ({% ref "SPEC-101" /%} got away
  with it because the sandbox was the *sole* media).

The surface model already distinguishes the two intents ({% ref "SPEC-087" /%} §4): the
**subject** media (in flow, framed/chromed, placed by `media-position`) vs **decorative
ambiance behind content** (`bg`, out of flow). A live visualizer behind a positioned mood
image is the textbook case of *ambiance + subject* — so the visualizer belongs in `bg`,
the image stays a media guest, and they stop competing for one slot.

## The decisive constraint: a sandbox can't be synthesized from a string

`bg video="url"` works because the engine can hand-build a `<video>`. A `sandbox`
**cannot** be built this way: resolving it means reading its source directory,
sanitising, and applying the security policy — all of which happen **inside the sandbox
rune's `transform`, at page-transform time**, using the `config.variables.__sandboxReadFile`
/ `__sandboxListDir` readers (`tags/sandbox.ts`). The identity engine runs *later*, on
serialized tags, with no file access. So a `bg sandbox="scene"` *attribute* the engine
expands is a dead end. The guest must be **rendered by the real sandbox rune** — i.e. it
must arrive as authored content (a body) or be expanded into one before transform.

## Design

### 1. The `bg` guest body

`bg` (today a directive with no body, `tags/bg.ts`) gains an **optional, constrained
body** holding a single media guest:

```markdoc
{% hero media-position="start" %}
{% bg %}
  {% sandbox src="midnight-waves" framework="three" dependencies="three" /%}
{% /bg %}
![Late-night haze](./moods/midnight.jpg)   <!-- positioned subject media -->
---
# Midnight Tape
{% /hero %}
```

- bg **transforms its body normally** (so the genuine sandbox rune runs, with full file
  resolution + sanitisation), then tags the rendered guest `data-bg-guest`, forces
  `height="fill"` (the {% ref "SPEC-101" /%} host-owned-height mode — iframe `height:100%`,
  no auto-resize negotiation), and marks it presentational.
- bg emits that tagged element **alongside its existing `bg-*` metas**, exactly as the
  unwrapped metas land among the host's children today.

### 2. Engine relocation (mirrors `bg-video`)

When `engine.ts` §1f raises the bg layer, it additionally **collects any `data-bg-guest`
descendant** of the host and pushes it into the bg `<div>`'s children — layered **above**
the `--bg-image` boot frame and **below** the overlay/scrim, a structural sibling of the
`bg-video` branch. The guest is marked consumed so it is **not** also rendered in the
content flow. The {% ref "SPEC-090" /%} demotion (`data-guest-posture="presentational"`,
`pointer-events: none`, behaviours skip enhancement) applies because it is in the bg
layer — a bg sandbox is inert by definition. No sandbox logic moves into the engine; bg
never has to understand sandboxes; the host rune never has to know either.

### 3. Bare-surface guardrail

The bg layer must stay **bare and inert**. The body therefore accepts a *presentational*
guest only (a `sandbox`). A **build warning** ({% ref "SPEC-084" /%}-style validation)
fires if a chromed content rune is placed there:

> `bg` backdrop guest must be presentational (a `sandbox`); a `video` carries player
> chrome ({% ref "WORK-018" /%}) — place it in the media zone as a positioned guest, or
> use `bg video="…"` for a bare video backdrop.

This stops the "any media rune" over-generalisation from dragging controls/captions
(`video`, `audio`, `figure`) into a decorative layer. The mechanisms stay right-sized:
**URL → attribute** (`bg src=`/`video=`); **rendered-bare → body** (sandbox). A bare
image/video backdrop keeps its existing attribute path; only the un-URL-able sandbox
needs the body.

### 4. Boot-frame composition

The meta facets are unchanged and layer *with* the guest: a `--bg-image` (image or
gradient) paints **behind** the guest as the {% ref "SPEC-101" /%} §5 boot frame (designed
first paint while the scene initialises); `overlay`/`scrim` sit **above** it for
legibility. When the host also carries a positioned image media guest, that image still
flows to `og:image` / structured-data `image` via the host's normal media extraction
(e.g. playlist's `extractMediaImage`) — the animated backdrop is decorative, the still
image is the crawlable/share/reduced-motion representation.

### 5. The `sandbox` preset — transform-resolved

`BgPresetDefinition` gains a **structured `sandbox` descriptor**, a sibling to the
engine-resolved `gradient`/`style`:

```ts
interface BgPresetDefinition {
  style?:    Record<string, string>;                  // engine-resolved (CSS)
  gradient?: { type?; direction?; stops: string[] };  // engine-resolved (CSS)
  sandbox?:  { src: string; framework?: string; dependencies?: string };  // NEW — transform-resolved
  extends?:  string;
}
```

- **Two resolution sites, one name namespace.** A new **transform-time expansion step**
  (where the sandbox readers live) sees `bg="name"`, finds a `sandbox`-typed preset, and
  injects the real `{% sandbox %}` guest into the bg body — producing the **same**
  `data-bg-guest` element the engine relocates (§2). The author sees `bg="midnight-waves"`
  behave like `bg="brand-fade"`; internally one resolves to CSS in the engine, the other
  to a rendered guest at transform time.
- **The preset is sugar over the §1 body**, not a parallel system: the body is the
  primitive, the preset is a named shorthand the expander turns into it.
- **Forced behaviours are not author-set.** `height: fill`, presentational posture, and
  eager activation come from the bg-guest mechanism; the preset describes only *what the
  scene is* (`src`/`framework`/`dependencies`). A preset may **also** carry a
  `gradient`/`style` for the boot frame (§4) — both land in the same `data-name="bg"` div.
- **Config home: project config.** A scene is *content* (its files live in the project,
  e.g. `site/examples/midnight-waves/`), so a sandbox preset belongs in
  `refrakt.config.json` `sites.<site>.backgrounds`, following the project-vs-theme split
  {% ref "SPEC-088" /%} set for the escape hatch; project `backgrounds` merge over theme.
  The `refrakt.config.schema.json` gains the `sandbox` key.

```jsonc
// refrakt.config.json → sites.main.backgrounds
{
  "surface-dark": { "style": { "border": "1px solid rgba(255,255,255,0.12)" } },
  "midnight-waves": {
    "sandbox": { "src": "midnight-waves", "framework": "three", "dependencies": "three" },
    "gradient": { "type": "linear", "direction": "to-b", "stops": ["surface", "ishi"] }
  }
}
```

### 6. Reuse: placement via the layout cascade, audio via SPEC-006

DRY reuse splits along two axes:

- **Value reuse** — the named preset (§5) defines the scene once.
- **Placement reuse** — the layout cascade applies it once. For "every blog post,"
  set `bg="midnight-waves"` in the `blog-article` layout's cover region (the route rule
  `blog/* → blog-article` already exists); every post inherits the backdrop with zero
  per-post authoring.
- **Per-page audio** — the {% ref "SPEC-006" /%} audio↔sandbox bridge (`audio.onFrame`,
  `audio.onTrackChange`, the `DATA.tracks` global, streaming lifecycle) binds each page's
  own player to the shared scene at runtime, so one named backdrop reacts to each post's
  mixtape. The bridge itself is SPEC-006's; this spec only ensures a bg-layer sandbox is a
  valid subscriber.
- **Memoisation** — a named scene's assembled source is byte-identical across pages, so
  the expander may build the bundle once and clone per page (an optimisation only the
  named path affords).

## Acceptance Criteria

- [ ] `bg` accepts an optional, constrained body holding one presentational guest
  (`sandbox`); bg transforms it (real sandbox rune — file resolution + sanitisation),
  tags it `data-bg-guest`, and forces `height="fill"` + presentational posture.
- [ ] The engine (§1f) relocates a `data-bg-guest` element into the `data-name="bg"`
  layer — above the `--bg-image` boot frame, below overlay/scrim, sibling to `bg-video` —
  and marks it consumed so it does not render in content flow; {% ref "SPEC-090" /%}
  `presentational` demotion applies.
- [ ] A chromed content rune (`video`/`audio`/`figure`) in the bg body produces a build
  warning redirecting to the media-guest slot or `bg video="…"`; bare image/video
  backdrops keep their existing `bg src=`/`video=` attribute path (unchanged).
- [ ] Boot frame composes: a preset/inline `gradient`/`image` paints behind the guest;
  `overlay`/`scrim` above it; a host's positioned image still flows to `og:image` /
  structured-data `image`.
- [ ] `BgPresetDefinition` gains a `sandbox` descriptor (`src`/`framework`/`dependencies`),
  resolved at **transform time** by an expansion step that injects the §1 body guest —
  not in the identity engine; `bg="name"` reaches author-parity with a gradient preset.
- [ ] A sandbox preset may also carry `gradient`/`style` (boot frame); `extends` resolves
  as for other bg presets; `refrakt.config.schema.json` documents the `sandbox` key;
  project `backgrounds` merge over theme.
- [ ] Docs: the `bg` reference documents the guest body, the bare-surface guardrail, the
  `sandbox` preset (with the `refrakt.config.json` example), and the boot-frame layering;
  contracts regenerated (`refrakt contracts --check` green) and CSS coverage passes for
  any new bg-guest selectors.

## Non-goals

- **Chromed runes as backdrops** — `video`/`audio` are subject media; they live in the
  media-guest slot, never `bg` (§3). A bare video backdrop uses `bg video="…"`.
- **The audio bridge itself** — `audio.onFrame`/`onTrackChange`, the streaming lifecycle,
  and the `DATA` global are {% ref "SPEC-006" /%}'s; this spec only makes a bg-layer
  sandbox a valid subscriber.
- **Playlist/hero cover parity** — porting cover-overlay modifiers onto leaner runes is a
  separate layout item; this spec is the `bg` layer only.
- **A first-party (non-sandbox) canvas backdrop** — a built-in visualizer component that
  shares the AudioContext without an iframe is a distinct, later option; here the guest is
  an author-editable `sandbox`.
- **Generalising the guest body to arbitrary content** — one presentational guest only,
  gated by the §3 guardrail.

## Work breakdown (provisional)

1. **bg guest body + engine relocation + guardrail** (§1–§4) — bg body, `data-bg-guest`
   tagging + `fill`/posture, engine §1f relocation, bare-surface validation, boot-frame
   layering.
2. **`sandbox` bg preset** (§5) — `BgPresetDefinition.sandbox`, the transform-time
   expansion step (sandbox readers), schema + project-config home, memoisation.
3. **Docs + showcase** (§6) — `bg` reference, `refrakt.config.json` example, the
   music-blog backdrop pattern cross-linked to {% ref "SPEC-006" /%}.

## References

- {% ref "SPEC-088" /%} — `bg` gradients + escape hatch; `BgPresetDefinition`, engine §1f resolution (`engine.ts`), `tags/bg.ts`, `bg.css`.
- {% ref "SPEC-087" /%} — surface-fill model; the subject-media-vs-ambiance boundary (§4) this builds on.
- {% ref "SPEC-089" /%} — cover layout (why cover consumes the single media zone); the subject/ambiance line.
- {% ref "SPEC-090" /%} — media-guest interaction posture: the `presentational` demotion a bg guest inherits.
- {% ref "SPEC-101" /%} — sandbox as a cover media guest (prior art): `height="fill"` host-owned height, the boot-frame guidance, production posture; `packages/behaviors/src/elements/sandbox.ts`.
- {% ref "SPEC-006" /%} — the audio↔sandbox bridge (`audio.onFrame`/`onTrackChange`, streaming lifecycle) the backdrop subscribes to.
- {% ref "WORK-018" /%} — the `video` rune's player chrome (why it is a subject, not a backdrop).
- {% ref "SPEC-084" /%} — rune validation (the bare-surface build warning).

{% /spec %}
