{% spec id="SPEC-108" status="shipped" tags="theme,reading,prose,typography,editorial,css,architecture" released-in="v0.26.0" %}

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

**Decision — dropcap is prose-gated, not rune-gated.** `dropcap` is neither a truly global
attribute (it is meaningless on a `nav`/`form`/`card` body) nor restricted to a hardcoded rune
allowlist (which the register vocabulary exists to replace, and which could never reach the
article body — the most important prose surface is not a rune). Instead it is honoured on **any
body whose resolved reading register is `prose`** and is a no-op (ideally a dev-time warning)
elsewhere. Mechanically it is plumbed centrally like the container axes rather than re-declared
on each rune schema, but its *applicability* is gated dynamically on the resolved register, not
on rune identity. The article-body case (a non-rune region) reaches dropcap by wrapping the
opening passage in `textblock` — `textblock` becomes the canonical "opening passage" block, the
region itself stays markup-free at `reading="prose"`. (A region-level "drop-cap the first
paragraph" flag is a different, more magical feature and is explicitly out of scope here.)

**Editor consequence — the toggle is register-derived, not listed.** A visual editor (e.g. the
block editor) decides whether to surface a `dropcap` toggle by asking the *same* question the
CSS asks (`[data-reading="prose"]`): does this block's body resolve to `reading="prose"`? It
resolves the register from the three sources below (rune `defaultReading` + layout/region
default + author override) — the same data the editor already reads from `RuneConfig` for
`editHints` — and shows the toggle iff the effective register is `prose`. This carries no
per-rune list (new prose-defaulting runes get the toggle for free), is correctly reactive
(flipping a block to `reading="prose"` makes the toggle appear; back to `ui` removes it), and
reaches the non-rune article body via the `textblock` wrapper under the identical rule. Two
things must be exposed for this without duplicating engine logic: (a) the register resolution as
shared/derivable data the editor can read, and (b) a small declarative capability mapping that
`prose` is the register which enables the `dropcap` opt-in (rather than hardcoding the rule in
the editor). Note this is a distinct affordance class from today's `editHints`, which maps
`data-name` *sections* to edit modes and does not cover boolean attribute toggles.

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

### 6. Register resolution — the data shape

The register is resolved by a single pure function shared by the engine, validation, and the
editor (so none re-implement the cascade). It is the contract the rest of the work hangs off.

**The vocabulary type** (ordered, tightest-UI → most-editorial; the array fixes the order for
validation and any future magnitude math):

```ts
export const READING_REGISTERS = ['fine', 'ui', 'prose'] as const;
export type ReadingRegister = (typeof READING_REGISTERS)[number];
```

**The three sources**, each living beside its sibling axis:

- **Author override** — a universal block attribute `reading` (the `width`/`elevation` tier),
  validated against `READING_REGISTERS` by the schema's `matches`. Also settable as a region
  override in a layout/frontmatter for the bare body.
- **Per-rune default** — `RuneConfig.defaultReading?: ReadingRegister`, mirroring
  `defaultWidth` / `defaultElevation`. Present only on runes; editorial runes
  (`pullquote`/`lore`/`blockquote`/`textblock`) set `prose`, chrome runes omit it (→ `ui`),
  captions set `fine`.
- **Region default** — `reading?: ReadingRegister` on the `content` `LayoutSlot` (the
  `source: 'content'` slot — the page's top-level markdown). `blog-article` sets `prose`;
  `docs` omits it. This is the source that reaches the article body, which is not a rune.

**The resolver** — precedence author ▸ rune ▸ region ▸ `ui`:

```ts
export interface ReadingResolutionInput {
  authorAttr?: string;          // `reading=` on the block/region (validated, else ignored)
  runeDefault?: ReadingRegister; // RuneConfig.defaultReading — undefined for the bare body
  regionDefault?: ReadingRegister; // content-slot default of the active layout
}
export function resolveReading(i: ReadingResolutionInput): ReadingRegister {
  return coerceRegister(i.authorAttr) ?? i.runeDefault ?? i.regionDefault ?? 'ui';
}
```

**Decision — the region default seeds only the bare body, not nested runes.** A rune resolves
from its *own* `defaultReading ?? 'ui'`, independent of the region; the region default applies
only to the region's top-level markdown (the body that has no rune). So a `card` dropped into a
`blog-article` stays `ui` (a card is chrome even inside an article), while a `pullquote` reads
`prose` anywhere because it self-declares — and the bare article paragraphs read `prose` from
the region. This avoids prose leaking into every nested chrome rune that simply forgot to set a
default. (The considered alternative — runes with no `defaultReading` inheriting the region
register — was rejected for that leakage; editorial runes self-declaring `prose` makes
inheritance unnecessary.)

**Emission** — the engine emits `data-reading="<value>"` on the element carrying
`data-section="body"`, and — like `width`'s `!== 'content'` guard — **suppresses emission when
the resolved register is `ui`**, so unmarked content stays byte-identical (AC 1). Each
`data-section="body"` resolves independently.

**Capability mapping** — the `prose → dropcap` relationship lives in one declarative table that
both the editor (which toggle to surface) and the engine (validate: warn if `dropcap` is set
off-register) import, rather than hardcoding the rule in either:

```ts
export const READING_CAPABILITIES: Record<ReadingRegister, { dropcap: boolean }> = {
  fine:  { dropcap: false },
  ui:    { dropcap: false },
  prose: { dropcap: true },
};
```

**What the editor consumes** — it already reads the merged `RuneConfig` map (for `editHints`),
giving `runeDefault`; it additionally needs the active layout's content-slot `reading`
(`regionDefault`) exposed, plus the block's `reading=` (`authorAttr`). It then calls the same
`resolveReading()` + `READING_CAPABILITIES` — no duplicated cascade, no per-rune list.

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
- [ ] Assignment resolves from layout/region default → per-rune `defaultReading` → author override; a `blog-article` content region defaults to `prose` and a `docs` region does not. A single pure `resolveReading()` (precedence author ▸ rune ▸ region ▸ `ui`) and the `READING_CAPABILITIES` table are the shared contract imported by engine, validation, and editor — not re-implemented in any of them. The region default seeds only the bare body; nested runes resolve from their own `defaultReading ?? 'ui'`.
- [ ] `dropcap` is a per-instance opt-in available on any `prose` body (generalised from `textblock`); the theme owns the glyph treatment. It is gated on the resolved `prose` register (not a rune allowlist) and is a no-op elsewhere; the non-rune article body reaches it via a `textblock` wrapper.
- [ ] A visual editor surfaces the `dropcap` toggle by deriving it from the resolved reading register (rune `defaultReading` + layout/region default + author override), not a per-rune list: the toggle appears iff the body resolves to `reading="prose"` and reacts to changing the register. The register resolution and a `prose → dropcap` capability mapping are exposed to the editor rather than hardcoded.
- [ ] `measure` and `width` remain independent — a `width: full` block can hold `reading: prose` text at a capped measure (the editorial-header composition renders correctly in the gallery, light + dark).
- [ ] Docs: a reading-role section in the surfaces / theme-authoring docs, and the `fine`/`ui`/`prose` registers documented for content authors.

## Work breakdown (provisional)

1. **Engine** — the shared resolver (`READING_REGISTERS`, `ReadingRegister`, `resolveReading()`, `READING_CAPABILITIES`; see §6), `data-reading` emission refining `data-section` with the `ui` suppression guard, `defaultReading` in `RuneConfig`, the universal `reading` block attribute, and a `reading` default on the content `LayoutSlot`.
2. **Per-rune + layout defaults** — assign editorial-body runes to `prose`, UI runes to `ui`, captions to `fine`; `blog-article` content region → `prose`.
3. **Lumina interpretation** — measure, paragraph style, lede, drop-cap glyph, running-text niceties keyed off `[data-reading]`; generalise `textblock`'s `dropcap` to a prose-register-gated opt-in.
4. **Editor affordance** — expose register resolution + a `prose → dropcap` capability mapping so the block editor derives the dropcap toggle from the resolved register rather than a per-rune list.
5. **Gallery + docs** — a prose subject in the gallery; a reading-role docs section; author-facing register reference.

## References

- Parent / reserved candidate: {% ref "SPEC-094" /%} §8 ("Reserved candidate — a prose/reading classification").
- Composes with: {% ref "SPEC-107" /%} (the container axes; the editorial-header combination).
- Existing seed: `textblock` (`dropcap` / `columns`) · `packages/transform/src/engine.ts` (`data-section` emission) · `packages/lumina/styles/dimensions/sections.css`.

{% /spec %}
