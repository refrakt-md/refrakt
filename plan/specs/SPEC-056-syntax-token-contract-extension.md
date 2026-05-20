{% spec id="SPEC-056" status="draft" tags="theme, tokens, syntax-highlighting, lumina, presets, shiki" %}

# Syntax token contract extension

Widen the `SyntaxTokens` contract from its current 9 roles to a tiered shape that can faithfully carry palettes derived from well-known Shiki / VS Code themes (Nord, Dracula, Solarized, Tokyo Night, Catppuccin, GitHub, …) as refrakt presets. Adds a small set of optional roles with documented fallbacks to existing core roles, so simple presets (e.g. `niwaki`) keep their current minimal shape and richer presets gain the headroom they need.

Builds on SPEC-048 (design tokens contract & the `--rf-syntax-*` highlighter-agnostic surface). Required before importing third-party syntax palettes as refrakt presets — the first such preset (Nord) is the validation case.

## Problem

The current `SyntaxTokens` contract (defined in `packages/types/src/token-contract.ts`) exposes 9 roles:

```ts
interface SyntaxTokens {
  keyword: string;
  function: string;
  string: string;
  constant: string;
  comment: string;
  punctuation: string;
  variable: string;
  link?: string;              // falls back to function
  'string-expression'?: string; // falls back to string
}
```

This vocabulary matches what Shiki's css-variables theme emits in its minimal form, and is enough for refrakt's own preset (`niwaki`). It is *not* enough to faithfully import palettes that were designed against the full TextMate scope surface.

Three concrete gaps surface as soon as you try to map a real palette onto these 9 roles:

**1. Palettes intentionally split roles refrakt collapses.** Nord uses one Frost hue (`nord9`) for keywords and a different Frost hue (`nord7`) for class/type names, and yet another (`nord8`) for function names. Mapping into refrakt today forces all three into `keyword` + `function`, losing the distinction the palette author made on purpose. Dracula does the same with `Pink` (keywords) vs `Cyan` (types & class names). Tokyo Night, One Dark, and Catppuccin all split `type` from `function`.

**2. Some roles already exist in Shiki's css-variables theme but aren't surfaced by the contract.** Shiki's `createCssVariablesTheme` already emits variables for several token roles beyond the 9 — at minimum `parameter` and `property`, and the broader TextMate scope map distinguishes `tag`, `attribute`, `operator`, `number`, and `regex`. These are *free fidelity*: the highlighter already routes scopes to them; the contract just doesn't name them. Every preset is currently leaving distinctions on the table.

**3. The 9-role floor is the wrong abstraction for documentation.** When documenting a Nord preset with a `{% palette %}` block, the reader wants to see "Frost (keyword), Frost (type)" as distinct rows — that *is* the palette's design intent. With 9 roles those two rows are the same color in the role map, even though they're different colors in Nord. The doc loses information the palette has.

The naive fix — expose all of TextMate's hundreds of scopes — is the wrong direction. It would force every alternative highlighter to honour refrakt's mini-grammar, force preset authors to copy scope tables, and inflate the contract surface a hundredfold for marginal gain. Real palettes use 8–16 distinct hues, not 100.

## Design Principles

**Tier the contract: required core + optional extended.** Required roles cover everything a *theme* (chrome theme) must define to render code at all. Extended roles are optional, with documented fallbacks to core roles. This is the pattern already used for `link` → `function` and `string-expression` → `string`; the spec generalises it.

**Roles, not scopes.** The contract enumerates *roles* (keyword, function, type, tag, …), not TextMate scopes (`entity.name.type.class.python`). Mapping scopes → roles is the highlighter integration's job. A future Prism or Starry Night integration maps its own taxonomy into the same role set; the contract stays portable.

**Fallback is explicit and lossy by design.** If a preset doesn't set `type`, generated CSS resolves `--rf-syntax-token-type` to the value of `--rf-syntax-token-function`. Preset authors opt into more fidelity by setting more roles; they never opt into *less* than what's possible — the floor is always renderable.

**Only add roles real palettes already distinguish.** The extended set isn't aspirational. Every role added in this spec must be backed by at least three well-known palettes (Nord, Dracula, Solarized, GitHub, One Dark, Tokyo Night, Catppuccin, Monokai) that intentionally route a distinct hue to it. Roles that no real palette splits don't earn a slot — the contract isn't a TextMate clone.

**Niwaki stays untouched.** A scoped, hand-crafted preset with 9 hues should remain valid with no changes. Adding roles must not be a breaking change for `niwaki` or any other existing preset.

## Authoring Surface

### Extended `SyntaxTokens` shape

```ts
export interface SyntaxTokens {
  // ── Required core (unchanged) ──
  keyword: string;
  function: string;
  string: string;
  constant: string;
  comment: string;
  punctuation: string;
  variable: string;

  // ── Optional, existing ──
  /** URL/link tokens. Falls back to `function`. */
  link?: string;
  /** Interpolation inside template literals. Falls back to `string`. */
  'string-expression'?: string;

  // ── Optional, extended (new) ──
  /** Type names, class names, interface names, generic params.
   *  Falls back to `function`. */
  type?: string;
  /** Object property access (`foo.bar`), object literal keys.
   *  Falls back to `variable`. */
  property?: string;
  /** Function/method parameters in declaration position.
   *  Falls back to `variable`. */
  parameter?: string;
  /** JSX/HTML/XML element tag names.
   *  Falls back to `keyword`. */
  tag?: string;
  /** JSX/HTML/XML attribute names.
   *  Falls back to `function`. */
  attribute?: string;
  /** Arithmetic, comparison, logical operators.
   *  Falls back to `punctuation`. */
  operator?: string;
  /** Numeric literals — split out when a palette colours numbers
   *  distinctly from booleans/null/Symbol-style constants.
   *  Falls back to `constant`. */
  number?: string;
  /** Regular expression literals.
   *  Falls back to `string`. */
  regex?: string;
}
```

Total: 7 required + 9 optional = 16 roles.

### Fallback resolution

Implemented at CSS generation time, not at the preset shape. For each optional role, the generator emits:

```css
:root {
  --rf-syntax-token-type: var(--rf-syntax-token-type-explicit, var(--rf-syntax-token-function));
}
```

…with `--rf-syntax-token-type-explicit` set only when the preset supplies a value. This keeps the cascade transparent (downstream CSS can still override `--rf-syntax-token-type` directly) and lets *layered* presets override the fallback chain (e.g. a chrome preset sets `function`; a syntax preset can then set `type` distinctly without re-stating `function`).

### Preset author experience

A minimal preset (niwaki today) is unchanged:

```ts
const niwaki: ThemeTokensConfig = {
  syntax: {
    keyword: '#5e7d2a',
    function: '#b54a6b',
    /* …7 more required + 2 optional… */
  },
};
```

A richer preset (Nord, derived from the Nord palette spec) can set extended roles:

```ts
const nord: ThemeTokensConfig = {
  syntax: {
    keyword:  '#81a1c1', // Frost nord9
    function: '#88c0d0', // Frost nord8
    type:     '#8fbcbb', // Frost nord7  ← now distinct from function
    string:   '#a3be8c', // Aurora nord14
    /* … */
  },
};
```

### Palette documentation

`{% palette %}` blocks in preset docs can now show the role split honestly:

```markdoc
{% palette title="Nord — light" showContrast=true %}
- Frost nord7 (type): #8fbcbb
- Frost nord8 (function): #88c0d0
- Frost nord9 (keyword): #81a1c1
- Aurora nord14 (string): #a3be8c
- ...
{% /palette %}
```

## Highlighter integration

### Shiki css-variables theme

The default highlighter path (`createCssVariablesTheme` with `variablePrefix: '--rf-syntax-'` in `packages/highlight/src/highlight.ts`) emits a fixed token set. Two outcomes per role:

- **Already emitted by Shiki's css-variables theme** (e.g. `parameter`, `property`): zero highlighter work — surfacing the role in the contract is enough.
- **Not emitted by stock css-variables theme** (e.g. `type`, `tag`, `attribute`, `regex`): ship a custom css-variables theme in `@refrakt-md/highlight` that extends Shiki's with the additional scope → variable mappings. This is configuration, not a fork.

The spec includes an investigation step to enumerate which extended roles are free vs. require the extended theme; that determines implementation order.

### Alternate highlighters

Future Prism / Starry Night / server-side integrations map their own token taxonomy onto the same 16 roles. If they can't distinguish a role, they emit nothing for it and the fallback chain takes over — the user gets the same colour they would have got at the lower fidelity tier, never a broken page.

## Out of scope

- **TextMate-scope authoring.** Presets remain role-keyed objects. We do not expose `tokenColors` with raw scopes; that's the highlighter's responsibility.
- **Theme-specific fontStyle (italic/bold) per role.** Some palettes ship "italic comments" or "bold keywords" as part of their identity. Worth a follow-up spec, but contracts cleanly so deferring.
- **A preset registry / discovery mechanism.** Presets are still plain modules imported by path. Adding more presets doesn't require a registry; cataloguing them in docs is a separate concern.
- **Niwaki migration.** Niwaki is correct at the 9-role tier and stays as-is.

## Validation

This spec is validated by importing **Nord** as the first non-refrakt syntax preset. Success criteria:

1. Nord's 16 named hues map onto the extended contract with no loss of intent — every distinct hue in the official Nord palette spec lands on a distinct role, *or* lands on the same role as another hue because that's what Nord intends (e.g. punctuation and operators share `nord4` in the Nord spec).
2. The Nord preset doc renders palette blocks that match the original Nord swatch names (Polar Night, Snow Storm, Frost, Aurora).
3. CSS coverage tests for Lumina pass unchanged — no rune CSS regresses because new variables exist.
4. A consumer of the default Shiki integration sees richer colouring without changing any config.

If any of these fail on Nord, the contract shape is wrong and this spec is revised before adding further presets.

## Acceptance Criteria

- `SyntaxTokens` interface in `packages/types/src/token-contract.ts` carries the 7 required + 9 optional roles described above, with JSDoc fallback documentation on each optional field.
- CSS variable generator emits `--rf-syntax-token-*` for all 16 roles, with each optional role falling back via `var()` to its documented core role when unset.
- Shiki integration in `packages/highlight/src/highlight.ts` either uses Shiki's existing css-variables theme (where each role is already emitted) or ships an extended css-variables theme that wires the additional scope mappings. Documented in the package README.
- Niwaki preset (`packages/lumina/src/presets/niwaki.ts`) is unchanged.
- A Nord preset is added under the same directory, sets at least one extended role distinctly (proving the fidelity gain is real), and has a `{% palette %}`-documented page.
- CSS coverage tests for Lumina continue to pass.
- SPEC-048 is updated with a one-line pointer to this spec for the syntax tier extension.

{% /spec %}
