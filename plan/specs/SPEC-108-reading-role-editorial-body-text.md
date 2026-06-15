{% spec id="SPEC-108" status="draft" tags="theme,reading,prose,typography,editorial,css,architecture" %}

# Reading role: an editorial treatment for body text

Builds the **reserved candidate from {% ref "SPEC-094" /%} §8** — a prose/reading
classification for body content. Every theme axis to date (`elevation`, `prominence`,
`width`, density, tint, frame) governs a rune's **container**; none touch how the
**running text inside** reads. For the magazine / editorial / business themes the
{% ref "SPEC-094" /%} epic targets, the reading treatment of body copy — measure,
paragraph rhythm, drop-cap, the styled opening — is arguably the single largest
differentiator between a product/docs theme and an editorial one, and today there is no
attribute to hang it on.

## Problem evidence

- The distinction between **long-form editorial prose** (an article body, `pullquote`,
  `lore`, `blockquote`) and **UI text** (a `card` body, a `nav`, form help) is today
  implicit in `[data-section="body"]` line-height plus scattered per-rune CSS. There is no
  classification to drive measure, paragraph rhythm, drop-cap eligibility, or a styled first
  paragraph.
- The one editorial feature that exists — `textblock`'s `dropcap` / `columns` — is locked to
  a single rune. Nothing else can be read as prose, and the article body (the top-level
  markdown of a content page) is not a rune at all, so it can't opt in.
- The seam {% ref "SPEC-094" /%} §8 named: *"which runes' bodies are long-form editorial
  prose versus UI text … may be better modeled as a refinement of `data-section` (e.g. a
  `prose` body role) than a new top-level axis; the shape is deferred to whenever an
  editorial theme first needs it."* This spec settles that shape.

## Design

A **`reading` role** on body content, emitted as a refinement of `data-section="body"` —
`data-reading="<value>"` — not a new top-level rune axis. It classifies a body's *reading
register*; the register drives the editorial-text cluster. Like the
{% ref "SPEC-107" /%} axes it is a small **semantic** vocabulary: the author (or layout, or
rune default) picks the register; the **theme owns the magnitude**.

### 1. The register vocabulary

Ordered from tightest-UI to most-editorial:

| Value | Intent | Typical bodies |
|-------|--------|----------------|
| `fine` | Fine print — captions, footnotes, asides | figure caption, sidenote, fine metadata |
| `ui` *(default)* | Interface text — terse, container-width, no measure cap | card body, nav, form help, hint |
| `prose` | Long-form reading — measure-capped, editorial rhythm, drop-cap / lede eligible | article body, `pullquote`, `lore`, `blockquote`, `textblock` |

`ui` is the current implicit default, so unmarked content is unchanged. `fine` earns a rung
because captions/footnotes genuinely want a distinct smaller, tighter treatment they get
today only through scattered per-rune CSS.

### 2. What the register *enables* — owned by the theme, not the author

The register is the author's single choice; everything below is the **skin's**
interpretation of `reading="prose"` (a docs theme and a magazine theme paint it very
differently — that is the point):

- **measure** — the line-length cap (`--rf-measure`, ~60–72ch). **Distinct from `width`**: a
  prose block may be `width: default` (full content column) yet cap its text at 66ch and
  centre it. `width` is the block's footprint in the layout track; `measure` is the
  line-length *inside* it. Conflating them loses "full-bleed frame, contained text" (see §4).
- **paragraph style** — spaced (web/docs) vs indented-first-line (book/magazine). A single
  choice that is one of the strongest tells between a docs theme and an editorial one.
- **lede / standfirst** — the opening paragraph rendered larger; the theme may auto-apply it
  to the first prose paragraph.
- running-text niceties — hanging punctuation, link underline style, widow/orphan control,
  hyphenation.

### 3. One author opt-in: `dropcap`

Drop-cap is *eligible* in `prose` but not automatic — you cap the opening of an article, not
every prose block. So it stays an explicit per-instance boolean (generalising `textblock`'s
existing `dropcap` so any prose body can opt in). The theme owns the glyph treatment; the
author owns where.

### 4. Assignment is layout-aware (like `width`)

Reading-role has the same two-source shape as `width` ({% ref "SPEC-107" /%} §2) — and the
**layout source is the dominant one**, because the most important body text is not a rune:

1. **Layout / region default.** The article body of a page is the top-level markdown of the
   content region. A `blog-article` layout declares its content region `reading: prose`, so
   running paragraphs read as an article with **zero author markup**; a `docs` layout
   declares its content region `ui` (or a docs-tuned prose). This is the path that matters
   most.
2. **Per-rune default.** `pullquote` / `lore` / `blockquote` / `textblock` default to
   `prose`; `card` / `nav` / `form` to `ui`; captions to `fine`. So a pullquote reads as
   prose in any context with no author action.
3. **Author / region override** for the exceptions.

Per-rune defaults live in the theme's `RuneConfig` (a `defaultReading`, mirroring
`defaultElevation` / `defaultWidth`); the layout default lives in the layout config.

### 5. Composition with the SPEC-107 axes

Reading-role is the missing piece of the editorial-article header. The combination
{% ref "SPEC-107" /%} was careful to keep reachable — a full-bleed frame with a contained,
readable body — only actually reads as editorial once the body has a reading register:

```md
{% recipe elevation="flush" width="full" prominence="display" reading="prose" %}
```

`prominence="display"` gives the headline, `width="full"` bleeds the frame, and
`reading="prose"` holds the body to measure underneath it — the canonical magazine spread,
and exactly the `display` + contained off-diagonal {% ref "SPEC-107" /%} §3 used to argue
width and prominence must stay independent. The two specs are complementary: SPEC-107
governs the container, this governs the text inside it.

## Implications

- **Additive, not breaking.** `ui` is the current default, so unmarked content is unchanged;
  prose treatment appears only where a layout/rune defaults to it or an author opts in.
- **`textblock` generalises.** Its `dropcap` becomes the cross-body opt-in; `textblock` keeps
  `columns` as its own feature but its body is now just `reading="prose"`.
- **Modeled as a `data-section` refinement** ({% ref "SPEC-094" /%} §8's preferred shape), so
  it composes with — and never collides with — the container axes.
- **Latin-first for now.** Measure/rhythm assume horizontal Latin text; RTL / vertical
  writing-mode editorial is out of scope (flagged separately as a cross-cutting concern).
- The gallery should grow a prose subject (a long body rendered at each register) so the
  reading treatment is visually regression-guarded like the rest.

## Acceptance Criteria

- [ ] A `reading` role with the ordered set `fine | ui | prose` is emitted as `data-reading` refining `data-section="body"`; `ui` is the default and unmarked content is byte-unchanged.
- [ ] `reading="prose"` drives a theme-owned editorial treatment in Lumina: capped measure (distinct from `width`), a paragraph style, lede eligibility, and running-text niceties — selected by `[data-reading="prose"]`, not rune-name lists.
- [ ] Assignment resolves from layout/region default → per-rune `defaultReading` → author override; a `blog-article` content region defaults to `prose` and a `docs` region does not.
- [ ] `dropcap` is a per-instance opt-in available on any `prose` body (generalised from `textblock`); the theme owns the glyph treatment.
- [ ] `measure` and `width` remain independent — a `width: full` block can hold `reading: prose` text at a capped measure (the editorial-header composition renders correctly in the gallery, light + dark).
- [ ] Docs: a reading-role section in the surfaces / theme-authoring docs, and the `fine`/`ui`/`prose` registers documented for content authors.

## Work breakdown (provisional)

1. **Engine** — `data-reading` emission refining `data-section`, the `fine | ui | prose` set, `defaultReading` in `RuneConfig`, and a layout/region default.
2. **Per-rune + layout defaults** — assign editorial-body runes to `prose`, UI runes to `ui`, captions to `fine`; `blog-article` content region → `prose`.
3. **Lumina interpretation** — measure, paragraph style, lede, drop-cap glyph, running-text niceties keyed off `[data-reading]`; generalise `textblock`'s `dropcap`.
4. **Gallery + docs** — a prose subject in the gallery; a reading-role docs section; author-facing register reference.

## References

- Parent / reserved candidate: {% ref "SPEC-094" /%} §8 ("Reserved candidate — a prose/reading classification").
- Composes with: {% ref "SPEC-107" /%} (the container axes; the editorial-header combination).
- Existing seed: `textblock` (`dropcap` / `columns`) · `packages/transform/src/engine.ts` (`data-section` emission) · `packages/lumina/styles/dimensions/sections.css`.

{% /spec %}
