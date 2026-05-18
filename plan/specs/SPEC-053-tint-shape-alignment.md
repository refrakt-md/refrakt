{% spec id="SPEC-053" status="draft" tags="theme, tint, tokens, lumina, v1, breaking-change" %}

# Tint shape alignment

Align the `TintDefinition` shape with the rest of the design token contract. The current tint vocabulary uses field names that are *inconsistent* with the token contract (`primary` in tints means body text; `primary` in tokens means the interactive accent — a direct collision) and a top-level `mode` field that's structurally awkward. This spec realigns tint field names to match the token contract, simplifies `mode`, adds an `extends` mechanism, and tightens the project-level type from `Record<string, unknown>` to a proper `TintDefinition`.

The CSS bridge implementation (`packages/lumina/styles/runes/tint.css`) is intentionally **not changed by this spec** — it's well-designed and only needs the rename applied. This is a vocabulary refactor, not a behaviour change.

Lands in v1.0 as a breaking-change cleanup. Depends on SPEC-048 being implemented.

## Problem

### 1. The vocabulary swaps `primary` and `accent` against the token contract

Today's `TintTokenSet`:

```ts
interface TintTokenSet {
  background?: string;
  surface?: string;
  primary?: string;     // → maps to --rf-color-text
  secondary?: string;   // → maps to --rf-color-muted
  accent?: string;      // → maps to --rf-color-primary
  border?: string;
}
```

A user writing a tint who is fluent in the token contract will write `primary` thinking they're setting the interactive primary colour — but they're actually setting body text. A user writing `accent` thinking they're setting an accent will actually be setting the interactive primary colour. These two are *swapped* between the two vocabularies, which is the worst kind of inconsistency — silently wrong rather than wrong-and-obviously-so.

Three of the six tint fields use different names from their target tokens:

| Tint field | Target token | Issue |
|---|---|---|
| `background` | `color.bg` | Synonym mismatch |
| `surface` | `color.surface.base` | Tint flattens contract's namespace |
| `primary` | `color.text` | **Collision: "primary" means different things** |
| `secondary` | `color.muted` | "secondary" isn't a token-contract concept |
| `accent` | `color.primary` | **Collision: see above** |
| `border` | `color.border` | Matches |

Only `border` is unambiguous. The cost is real every time someone moves between authoring a theme preset and authoring a tint.

### 2. The `mode` field is structurally awkward

The current `TintDefinition` has a top-level `mode?: 'auto' | 'dark' | 'light'`. In practice, `'auto'` is the absence of any forcing, so the three-way enum reduces to "set or unset." The lumina `dark` tint demonstrates the awkwardness:

```ts
dark: {
  mode: 'dark',
  dark: { background, primary, accent },
}
```

A tint *named* `dark`, with `mode: 'dark'`, that defines only the `dark` token set. The name, the mode, and the variant structure all repeat the same concept, and the field name `mode` is generic enough to read as either "this tint applies a dark colour scheme to its subtree" or "this tint is the dark variant of itself" — two different things.

### 3. No `extends` mechanism

`BgPresetDefinition` has `extends: 'particles'` for inheriting from a base preset. `TintDefinition` doesn't. A user who wants `tideline-warm` (the `warm` tint with one colour adjusted) must duplicate the entire definition. Not urgent — tints are small — but a small consistency gap with the parallel `BgPresetDefinition`.

### 4. `SiteConfig.tints` is untyped

```ts
tints?: Record<string, Record<string, unknown>>;
```

Project-level tint definitions in `refrakt.config.json` have no compile-time validation. The plugin-level definition is properly typed (`Record<string, TintDefinition>`), so this is a pure cleanup gap — and a meaningfully exposed one once SPEC-052 lands, since the frontmatter `tint: brand-warm` cascade implies users *will* define their own tints in site config when they want page-level branded tints. Today nobody has been pushed there because tint authoring has effectively lived in theme code; tomorrow it becomes a real surface.

-----

## Context — How tints are defined today

Worth being explicit about the current state, because it shapes the migration scope:

- **Theme-level definition is the canonical path.** Lumina defines its five tints (`base`, `subtle`, `warm`, `cool`, `dark`) in `packages/lumina/src/config.ts` via `mergeThemeConfig(baseConfig, { tints: { … } })`. `baseConfig` itself ships no tint definitions — it defines the `tint` *rune* but no named presets. Lumina is the source of every tint name a user can reference today.
- **Site-level definition exists but is unused.** `sites.<name>.tints` accepts project-level overrides; the deprecated top-level `tints` field is a shorthand for `sites.default.tints`. The repo's own `refrakt.config.json` doesn't define any tints, and no example sites in the ecosystem use the surface either. It works in principle but has effectively been a theme-author concern in practice.
- **The merge is shallow per tint name.** `mergeThemeConfig` does `{ ...base.tints, ...overrides.tints }`. A site-level tint with the same name as a theme tint *replaces* it entirely; it doesn't deep-merge per field. To tweak `warm.light.bg` from a site config today, a user has to re-declare all of `warm`.

**Why this matters for the spec.** The migration blast radius is small — the migration is for theme authors (lumina + plugins that ship tints), not for end users. But the *future* authoring surface is real: once SPEC-052's frontmatter `tint:` cascade lands, site-level tint definition becomes a path users actually walk. Two implications:

1. The untyped `SiteConfig.tints` is a forward-looking gap, not just a present cleanliness issue. Type it properly as part of this v1.0 cleanup so the surface is ready when SPEC-052 makes it relevant.
2. Shallow merge + no `extends` makes the "tweak one field of an existing tint" use case painful enough to discourage. The proposed `extends` field becomes the canonical idiom: `myWarm: { extends: 'warm', light: { primary: '#c2410c' } }` rather than a full re-declaration. Document `extends` as *the* way to derive variants — not as an advanced feature.

-----

## Design Principles

**Align tint vocabulary with the token contract, even at the cost of a breaking change.** v1.0 is the right window. A single coherent vocabulary across theme presets and tints is worth a one-line codemod for existing users.

**The CSS bridge is good. Don't touch it.** `packages/lumina/styles/runes/tint.css` uses `@property` for inheritance, `--cs-*` intermediaries for same-element selector cases, and a thought-through dark/light cascade. The spec only changes the names of the `--tint-*` custom properties that bridge to `--rf-color-*`. Internal CSS structure is preserved.

**Boolean-ish fields should be boolean-ish.** Replace the three-valued `mode` enum with `lockMode?: 'light' | 'dark'` — present means lock, absent means inherit. Removes the "what does `auto` mean here?" confusion.

**`extends` for parity with backgrounds, *and* as the canonical override idiom.** Small affordance technically (copies an existing pattern from `BgPresetDefinition`), but a real ergonomic improvement given the shallow-merge semantics. Documentation should present `extends` as *the* way to derive a tint variant — not as a power feature — so the "tweak one field" case never pushes users into full re-declarations.

**Hard break, not migration shim.** Don't accept both old and new field names during a transition. A short list of renames is easier to apply in one shot via codemod than to debug across a half-migrated codebase.

-----

## The Revised Shape

```ts
/** Set of colour tokens that a tint can override. Field names align with
 *  the token contract's color namespace (SPEC-048). */
interface TintTokens {
  bg?: string;        // → --rf-color-bg
  surface?: string;   // → --rf-color-surface (flattened from color.surface.base)
  text?: string;      // → --rf-color-text
  muted?: string;     // → --rf-color-muted
  primary?: string;   // → --rf-color-primary (the interactive accent)
  border?: string;    // → --rf-color-border
}

/** Named tint definition in theme config */
interface TintDefinition {
  /** Force a colour scheme on the tinted subtree, regardless of page mode.
   *  Present = lock to this scheme; absent = inherit page mode. */
  lockMode?: 'light' | 'dark';

  /** Light-mode token overrides */
  light?: TintTokens;

  /** Dark-mode token overrides */
  dark?: TintTokens;

  /** Extend another named tint by name, then layer this tint's overrides on top.
   *  Parallels BgPresetDefinition.extends. */
  extends?: string;
}
```

And in `SiteConfig`:

```ts
tints?: Record<string, TintDefinition>;
```

(Replacing `Record<string, Record<string, unknown>>`.)

### Field rename map

| Old | New | Rationale |
|---|---|---|
| `TintTokenSet` (type) | `TintTokens` | Parallel with `ThemeTokens` / token contract naming |
| `background` | `bg` | Matches `color.bg` |
| `surface` | `surface` | Unchanged |
| `primary` | `text` | Maps to `color.text` (body text), as it always did under the hood |
| `secondary` | `muted` | Matches `color.muted` |
| `accent` | `primary` | Maps to `color.primary` (interactive accent), as it always did under the hood |
| `border` | `border` | Unchanged |
| `TintDefinition.mode` | `TintDefinition.lockMode` | Two-value enum (present/absent); clearer semantic |

### Example: before and after

**Before** (today's lumina `warm`):

```ts
warm: {
  light: {
    background: 'var(--rf-color-surface-active)',
    primary: 'var(--rf-color-text)',
    accent: 'var(--rf-color-warning)',
    border: 'var(--rf-color-border)',
  },
  dark: {
    background: '#2a2018',
    primary: 'var(--rf-color-text)',
    accent: 'var(--rf-color-warning)',
    border: '#4a3f33',
  },
}
```

**After**:

```ts
warm: {
  light: {
    bg: 'var(--rf-color-surface-active)',
    text: 'var(--rf-color-text)',
    primary: 'var(--rf-color-warning)',
    border: 'var(--rf-color-border)',
  },
  dark: {
    bg: '#2a2018',
    text: 'var(--rf-color-text)',
    primary: 'var(--rf-color-warning)',
    border: '#4a3f33',
  },
}
```

**Before** (today's lumina `dark`):

```ts
dark: {
  mode: 'dark',
  dark: {
    background: 'var(--rf-color-primary-700)',
    primary: 'var(--rf-color-primary-50)',
    accent: 'var(--rf-color-danger)',
  },
}
```

**After**:

```ts
dark: {
  lockMode: 'dark',
  dark: {
    bg: 'var(--rf-color-primary-700)',
    text: 'var(--rf-color-primary-50)',
    primary: 'var(--rf-color-danger)',
  },
}
```

### Example: `extends`

```ts
tideline-warm: {
  extends: 'warm',
  light: { primary: '#c2410c' },  // override just one token
}
```

Resolves at config-merge time: `warm` is fully expanded, then `tideline-warm`'s `light` and `dark` overlays apply per token. Circular `extends` chains rejected at load time with a clear error.

-----

## CSS Bridge Implications

The `--tint-*` custom properties in `tint.css` get renamed to match the new field names:

| Old custom property | New custom property |
|---|---|
| `--tint-background` | `--tint-bg` |
| `--tint-primary` | `--tint-text` |
| `--tint-secondary` | `--tint-muted` |
| `--tint-accent` | `--tint-primary` |
| `--tint-surface` | `--tint-surface` (unchanged) |
| `--tint-border` | `--tint-border` (unchanged) |
| `--tint-dark-*` | Same mapping for dark variants |

The cascade structure (sections 2–4 of `tint.css`), the `@property` registrations, and the `--cs-*` intermediaries are all preserved. Only the property names change.

The transform engine (`packages/transform/src/engine.ts`) emits these properties; it gets a one-line rename to match the new vocabulary.

-----

## Migration

This is a v1.0 breaking change. Migration is mechanical:

1. **Migration recipe in the docs.** Rename five field names (`background → bg`, `primary → text`, `secondary → muted`, `accent → primary`) and one top-level field (`mode → lockMode`). Drop `mode: 'auto'` entries (now expressed as absence). A documented set of regex/`sed` rules in the migration guide handles it — given the small in-the-wild surface (essentially lumina and any plugin that ships tints; no end users have written their own), a dedicated `refrakt migrate tints` CLI command isn't worth the permanent surface.
2. **Codemod for CSS that reads `--tint-*` properties.** Only sites that have hand-written CSS reaching into the tint custom properties need adjustment — most users don't. Documented in the migration note.
3. **v1.0 release notes.** Document the renames in the migration guide with a before/after example. Note that the `tint=""` rune attribute and `data-tint` HTML attribute are unchanged — only the *internal* token names move.

The user-facing surface — `tint="warm"` on a rune, `tint: warm` in frontmatter (per SPEC-052) — is completely unaffected. The change is in the *authoring* surface for people who define new tints.

-----

## Implementation

1. **Update `TintDefinition` and `TintTokens` types** in `packages/transform/src/types.ts`. Drop `TintTokenSet`.
2. **Update `mergeThemeConfig`** in `packages/transform/src/merge.ts` to resolve `extends` chains during merge.
3. **Update `engine.ts`** (`packages/transform/src/`) to emit new `--tint-*` property names. The `TINT_TOKENS` array gets renamed entries.
4. **Update `tint.css`** in `packages/lumina/styles/runes/` to map the new custom properties. CSS cascade structure unchanged.
5. **Update lumina's tint configs** in `packages/lumina/src/config.ts` — apply the renames to `base`, `subtle`, `warm`, `cool`, `dark`.
6. **Type `SiteConfig.tints`** in `packages/types/src/theme.ts` as `Record<string, TintDefinition>`. Add the import.
7. **Update plugin tints.** Any plugins that ship their own tint definitions get the rename. (Likely scope: `packages/runes` and any plugin under `plugins/` that defines tints — a small audit pass.)
8. **Document the migration recipe** in the v1.0 migration guide — a small set of regex/`sed` rules covering the five field renames and the `mode → lockMode` swap. No dedicated CLI command.
9. **Drop the deprecated `RefraktConfig.tints` flat-shape field** in `packages/types/src/theme.ts`. Already marked `@deprecated`; v1.0 is the moment to remove rather than continue carrying it.
10. **Update tests.** The CSS coverage tests in `packages/lumina/test/css-coverage.test.ts` and any tint-specific unit tests get renamed selectors.

-----

## Acceptance Criteria

- [ ] `TintTokens` and `TintDefinition` types defined per the revised shape; `TintTokenSet` removed
- [ ] `SiteConfig.tints` typed as `Record<string, TintDefinition>` (no more `Record<string, unknown>`)
- [ ] `mergeThemeConfig` resolves `extends` chains and rejects cycles with a clear error
- [ ] `engine.ts` emits the renamed `--tint-*` properties
- [ ] `tint.css` updated with the new property names; CSS cascade behaviour identical to before (verified by visual diff against a baseline)
- [ ] Lumina's five built-in tints (`base`, `subtle`, `warm`, `cool`, `dark`) migrated to the new shape and render identically to before
- [ ] Every plugin under `plugins/` that ships tint definitions is migrated
- [ ] A documented migration recipe exists in the v1.0 migration guide (regex/`sed` rules; no CLI command)
- [ ] The deprecated `RefraktConfig.tints` flat-shape field is removed
- [ ] v1.0 migration guide documents the field renames with before/after examples
- [ ] Tint runtime tests pass with the new shape; CSS coverage tests updated
- [ ] At least one *site-level* user-defined tint example exists in the design-rune docs pages (per SPEC-051's acceptance criteria for `/docs/themes/lumina/presets/*`) — gives the site-author authoring surface visibility now that SPEC-052 makes it relevant

-----

## Out of Scope

- **Full structural unification with theme presets** — tints stay as inline `TintDefinition` entries in theme config, not separate preset modules. The vocabulary alignment is enough for v1.0; directory unification can be revisited if maintenance pressure justifies it.
- **Adding new tint surface tokens** — the six-token surface stays. This spec does not introduce e.g. `surface.raised` or status colours to the tint vocabulary.
- **Background preset alignment** — `BgPresetDefinition` is a CSS style bag, not a token override, so it doesn't have the same vocabulary issue. Out of scope here.
- **Per-tint typography** — tints stay colour-only. Fonts belong to theme presets (SPEC-051).
- **Runtime support for both old and new field names** — explicit hard break; no migration shim.
- **Multi-source `extends`** — `extends` accepts a single tint name, not an array. Composition across multiple tints belongs at a different level (frontmatter `presets: []` per SPEC-052); single-extend keeps the tint definition shape simple.
- **Per-elevation surface tokens in tints** — `TintTokens.surface` stays flat (single field, maps to `color.surface.base`). If a tint needs to vary hover/active/raised surfaces, that's a signal it should be a fuller preset, not a tint.
- **Deep-merging same-name tints** — `mergeThemeConfig` keeps the existing shallow merge: a site-level tint with a name that matches a theme tint *replaces* it. The `extends` field is *the* way to derive a variant. Deep-merging would feel ergonomic but hides what's actually being overridden; explicit `extends` keeps overrides legible.
- **A dedicated CLI migration command** — no `refrakt migrate tints`. The migration surface is small enough (lumina + plugins that ship tints; no end users in practice) that a documented regex/`sed` recipe in the v1.0 migration guide is the right weight. CLI surface is permanent; this migration is a one-time event.

{% /spec %}
