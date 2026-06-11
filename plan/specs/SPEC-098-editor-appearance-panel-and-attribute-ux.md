{% spec id="SPEC-098" status="draft" tags="editor,surface-model,attributes,frame,substrate,scrim,cover" %}

# Editor appearance panel and attribute UX

The surface-model wave (SPEC-086 frame chrome, SPEC-087 substrate fills,
SPEC-088 bg gradients + scrim, SPEC-089 cover layout, SPEC-090 guest
posture) added ~35 universal attributes to every content-model rune. The
editor's attribute UI predates all of it: a flat list with no grouping, no
enum widgets, no conditional applicability, and none of the engine's
soft-lints surfaced while authoring. This spec replaces the flat list with
a grouped, progressively disclosed Appearance panel and makes attribute
editing vocabulary-aware.

Target: editor-focused minor; depends on {% ref "WORK-395" /%} for the
warning channel.

## Motivation

- Every content-model rune now accepts `tint`/`tint-mode`, `bg` +
  `bg-gradient`/`bg-from`/`bg-to`/`bg-via`/`bg-gradient-type`, `width`,
  `spacing`, `inset`, `elevation`, eight `frame-*` facets, five
  `substrate-*` facets, five `scrim-*` facets, `media-position`
  (including `cover`), `content-place`, `height`, and `aspect`
  (`packages/runes/src/lib/index.ts`, `attribute-presets.ts`). A flat
  attribute list at that scale is unusable.
- The vocabulary has structure the UI ignores: named scales
  (`sm|md|lg|xl`), logical directions, semantic token names, and preset
  names (tints/bgs already injected into completion by the server).
- Applicability is conditional and currently invisible: `content-place`
  and scrim defaults only act in `media-position="cover"`;
  `scrim-strength` is gradient-only and `scrim-blur` frost-only;
  `frame-aspect` conflicts with `media-height`.
- Engine knowledge never reaches the author: SPEC-090 posture demotion
  (interactive guest inside `card href=`), SPEC-084 `requiresParent`
  nesting rules, and the escape-hatch soft-lints all warn at build time
  only.

## Design

### Grouped Appearance panel

Replace the flat attribute list on rune blocks with sections, collapsed by
default, showing a badge when any attribute in the section is non-default:

- **Surface** — `tint`, `tint-mode`, `bg`, `width`, `spacing`, `inset`,
  `elevation`.
- **Frame** — `frame` preset + the facet attributes.
- **Substrate** — pattern + size/opacity/fill/target.
- **Background** — gradient direction/type + `bg-from`/`bg-to`/`bg-via`.
- **Scrim** — direction, type, strength/blur, tone.
- **Media** — `media-position`, `content-place`, `height`, `aspect`.
- **Rune-specific** — everything from the rune's own schema, as today.

Widgets by vocabulary: dropdowns for enums and named scales, preset pickers
with swatches for `tint`/`bg`/`frame`, semantic-token autocomplete for
gradient stops, pattern swatches for `substrate`, and a 9-way placement
grid for `content-place`. Attribute metadata (names, enums, defaults) comes
from the served rune schemas — no hardcoded attribute lists in the editor.

### Conditional gating

- Cover-only attributes (`content-place`, scrim defaults, `height`/`aspect`
  emphasis) appear only when `media-position="cover"`.
- `scrim-strength` shows for `scrim-type="gradient"`, `scrim-blur` for
  `"frost"`.
- `frame-aspect` × `media-height` conflict flagged inline as you type.

### Authoring-time lints

Mirror the engine's soft-lints on the block being edited, via the warning
channel from {% ref "WORK-395" /%}:

- Interactive guest inside a linked tile (SPEC-090 posture demotion).
- A rune placed outside its `requiresParent` (SPEC-084).
- Escape-hatch / raw-value soft-lints (SPEC-088).

### Context-aware insertion

- The insert dialog derives its tabs from catalog/plugin categories instead
  of the hardcoded `TAB_ORDER` list
  (`packages/editor/app/src/lib/components/InsertBlockDialog.svelte`).
- Child runes (today hidden from the global palette via `parent`) are
  offered contextually inside their parent — e.g. an "+ item" affordance
  inside `accordion`, `steps`, `tabs` — driven by `requiresParent`/`parent`
  metadata.

## Acceptance Criteria

- [ ] Rune blocks show a grouped Appearance panel (Surface / Frame /
  Substrate / Background / Scrim / Media / rune-specific) with collapsed
  sections and non-default badges.
- [ ] Enum and scale attributes render as dropdowns; `tint`/`bg`/`frame`
  as preset pickers; `content-place` as a placement grid; gradient stops
  with semantic-token autocomplete — all metadata-driven from served
  schemas.
- [ ] Conditional attributes are gated: cover-only attributes hidden
  outside `media-position="cover"`; scrim strength/blur switch on
  `scrim-type`; `frame-aspect` × `media-height` conflict flagged inline.
- [ ] Posture, nesting, and escape-hatch lints from the engine surface on
  the offending block while editing.
- [ ] Insert dialog categories derive from the catalog/plugins (no
  hardcoded tab list); child runes are insertable contextually inside
  their parents.
- [ ] Attribute edits round-trip through the markdown source (attributes
  the panel doesn't model are preserved verbatim).

## Non-goals

- New engine attributes or vocabulary changes — this is pure editor UX
  over the existing contract.
- WYSIWYG drag-resize of surfaces; the panel edits attributes, the
  preview shows the result.
- Theme-level preset *definitions* (tints/bgs/frames) — that's the config
  studio ({% ref "SPEC-097" /%}).

## References

- SPEC-086 / SPEC-087 / SPEC-088 / SPEC-089 / SPEC-090 — the surface-model
  vocabulary this exposes. SPEC-084 — `requiresParent`.
  {% ref "WORK-395" /%} — warning channel prerequisite.
- `packages/runes/src/lib/index.ts` (universal attribute merge),
  `packages/runes/src/attribute-presets.ts`,
  `packages/editor/app/src/lib/components/RuneAttributes.svelte`,
  `packages/editor/app/src/lib/components/InsertBlockDialog.svelte`,
  `packages/editor/app/src/lib/editor/attribute-completion.ts`.

{% /spec %}
