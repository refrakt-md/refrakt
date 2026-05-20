{% spec id="SPEC-056" status="draft" tags="theme, tokens, syntax-highlighting, lumina, presets, shiki" %}

# Syntax token contract extension

Widen the `SyntaxTokens` contract from its current 9 roles to a tiered shape that can faithfully carry palettes derived from well-known Shiki / VS Code themes (Nord, Dracula, Solarized, Tokyo Night, Catppuccin, GitHub, …) as refrakt presets. Adds a small set of optional roles with documented fallbacks to existing core roles, so simple presets (e.g. `niwaki`) keep their current minimal shape and richer presets gain the headroom they need.

Beyond the syntax foreground, the spec also formalises **two adjacent surfaces** that fall out of importing integrated palettes:

1. **Code-surface tokens** (`color.code.*`) become an *optional* part of what a syntax preset module may set, so palettes designed as integrated bg+fg bundles (Nord against Polar Night, Dracula against its canonical dark canvas, …) can ship their canvas alongside their tokens without forcing every code block on the site to repaint.
2. **Tint as a scoped projection of preset modules.** The existing tint mechanism gains the ability to reference a preset module via `extends`, projecting a scope-eligible subset of that preset's tokens into a CSS class. This lets a site expose Nord (or any other preset) as a named tint without making it the active theme, which is the foundation for live-rendered preset showcases in documentation. No new authoring rune; same `{% tint preset="nord" %}` surface authors already know.

Builds on SPEC-048 (design tokens contract & the `--rf-syntax-*` highlighter-agnostic surface) and SPEC-053 (tint shape alignment). Required before importing third-party syntax palettes as refrakt presets — the first such preset (Nord) is the validation case for all three extensions.

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

**Syntax presets may optionally claim the code surface.** A syntax preset is no longer strictly "foreground only." Code-surface tokens (`color.code.bg`, `color.code.text`, `color.code.border`) are part of what a syntax preset *may* set when its source palette was designed as an integrated bg+fg bundle. They remain *optional* — niwaki (a scoped Japanese-garden palette) deliberately doesn't set them, so it continues to compose with whatever chrome sits beneath. Nord (an integrated Arctic palette tuned against `nord0`) does set them. The preset author decides whether their palette claims the code surface; the contract just permits the claim and bounds it to the code surface, never the wider chrome.

**Tints scope colour identity; presets scope structural identity.** A scoped override mechanism (tint) and a global override mechanism (preset) are not parallel. They have a deliberate division of labour: tints can change how a section *looks* (colour, syntax colour, code-surface colour); only presets can change how the site is *structured* (typography, spacing, radius, shadow, status). The tint mechanism's *vocabulary* extends in this spec to include syntax and code-surface namespaces; the *scope-eligibility* of typography/spacing/radius/shadow is explicitly denied. This line lives in the generator's filter, not in convention.

**Palettes are named artefacts; accents are inline.** The tint rune body accepts the chrome accent vocabulary (bg, surface, primary, etc.) inline because a one-section colour decision is a sensible thing to author on the spot. The tint rune *does not* accept inline syntax overrides — those reach the rune through `preset` references to named tints. The friction of having to name a palette is the right friction to prevent ad-hoc 10-hex-code listings from proliferating across content.

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

### Code-surface (canvas) tokens

A syntax preset module may also set the code-surface tokens already defined by SPEC-048:

```ts
const nord: ThemeTokensConfig = {
  color: {
    code: {
      bg:     '#2e3440', // Polar Night nord0 — Nord's canonical dark canvas
      text:   '#d8dee9', // Snow Storm nord4
      border: '#3b4252', // Polar Night nord1
    },
  },
  syntax: { /* ... */ },
  modes: {
    dark: {
      color: { code: { /* Nord is dark-canonical; light overrides go here */ } },
      syntax: { /* ... */ },
    },
  },
};
```

These tokens are *optional*. A syntax-only preset like niwaki simply omits them and the chrome's code-surface tokens cascade through. A canvas-claiming preset like Nord sets them and the code blocks render on the preset's intended canvas; the rest of the page chrome (body bg, surfaces, buttons, borders) stays in whatever theme is active. The scoping is bounded to the code surface — a syntax preset cannot reach beyond `color.code.*` into the wider `color.*` namespace.

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

### Tint as scoped preset projection

The existing `theme.tints` registry from SPEC-053 gains the ability to reference preset modules via `extends`:

```jsonc
{
  "theme": {
    "package": "@refrakt-md/lumina",
    "presets": ["@refrakt-md/lumina/presets/niwaki"],
    "tints": {
      "nord":    { "extends": "@refrakt-md/lumina/presets/nord" },
      "dracula": { "extends": "@refrakt-md/lumina/presets/dracula" },

      "nord-warm-bg": {
        "extends": "@refrakt-md/lumina/presets/nord",
        "light":   { "bg": "#f5efe6" },
        "dark":    { "bg": "#1a221a" }
      },

      "garden-hero": {
        "extends": "warm",
        "light":   { "bg": "#f5efe6", "primary": "#3d6b3d" }
      }
    }
  }
}
```

`extends` resolves in one of two ways:

- **Tint name** (existing SPEC-053 behaviour) — inherit and override on the chrome-accent vocabulary.
- **Preset module path** (new) — read the preset's `ThemeTokensConfig`, apply the scope-eligible filter, then layer the tint's own `light` / `dark` overrides on top of the projection.

Either way, the lookup at author time is unchanged: `{% tint preset="nord" %}` and `{% tint preset="garden-hero" %}` both resolve to `class="rf-tint--<name>"`. The tint rune doesn't care whether the named tint's colours came from a preset module or from inline config.

A site can list a preset in `tints` *without* listing it in `presets` — that's the configuration for "expose Nord as a tintable palette but don't make it the active site theme." This is the foundation for live preset showcases on documentation pages.

### Scope-eligibility filter

When the generator projects a preset module into a scoped tint class, it emits only the **scope-eligible** token namespaces and drops the rest:

| Namespace | Scope-eligible? | Rationale |
|---|---|---|
| `color.bg`, `color.surface`, `color.text`, `color.primary`, `color.muted`, `color.border` | ✓ | Chrome colour identity — same vocabulary tint already covers |
| `color.code.*` (bg, text, border) | ✓ | Code surface is the bounded sub-canvas; canvas-claiming presets need this to project |
| `syntax.*` (all 16 roles) | ✓ | Whole point of the syntax-tint extension |
| `color.status.*` (sentiment colours) | ✗ | Status colours are semantic ("error means red"); scoping per-section would break the semantic contract |
| `font.*` | ✗ | Typography is structural identity — sectional typography overrides produce inconsistent reading rhythm |
| `radius.*`, `spacing.*`, `shadow.*` | ✗ | Structural identity — same reasoning as typography |

The filter is enforced at generation time. A preset author who writes `font.sans` in their module and lists it in `tints` does not get a font override in the projected tint — the key is silently dropped (with an optional dev-mode warning). This guarantees that the philosophical line between "tints scope mood" and "presets scope skeleton" cannot be crossed by accident.

### Tint body vocabulary stays at chrome accents

The tint rune body (the inline `- key: value` list authors write inside `{% tint %}...{% /tint %}`) remains restricted to the chrome accent vocabulary from SPEC-053. Specifically:

- **Body accepts**: `bg`, `surface`, `primary`, `secondary`, `accent`, `border`. (One-section colour decisions, sensibly inline.)
- **Body does not accept**: syntax tokens, code-surface tokens. Those reach the rune via the `preset` attribute referencing a named tint.

A site author who needs a syntax override on a specific section either references an existing named tint (`{% tint preset="nord" %}`) or defines one in `theme.tints` with an `extends` chain. The rune body never carries a syntax palette.

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
- **Extending the tint body vocabulary further.** Tints scope colour identity by deliberate design. Future requests to scope typography/spacing/radius/shadow per-section should be refused as out-of-scope under this spec's "tints scope mood; presets scope skeleton" commitment, and reopened only with a new spec that re-litigates the philosophical line.
- **Auto-exposing presets as tints.** Listing a preset in `theme.presets` does not automatically expose it as a tint. The site must declare it in `theme.tints` with `extends: <preset path>` to opt in. Explicit > implicit.

## Validation

This spec is validated by importing **Nord** as the first non-refrakt syntax preset. Success criteria:

1. Nord's 16 named hues map onto the extended contract with no loss of intent — every distinct hue in the official Nord palette spec lands on a distinct role, *or* lands on the same role as another hue because that's what Nord intends (e.g. punctuation and operators share `nord4` in the Nord spec).
2. The Nord preset module sets `color.code.*` so opting into Nord produces code blocks on Nord's canonical canvas without the user having to override chrome separately.
3. The Nord preset doc renders palette blocks (chrome tinted via `{% tint preset="nord" %}` so swatches sit on Nord's canvas) **and** live code blocks highlighted in Nord — on a documentation site whose *active* preset is niwaki, not Nord. This proves the scoped-tint projection mechanism end-to-end.
4. Palette swatches and code blocks on the Nord doc page show distinct colours for the role splits that motivated the spec (e.g. `type` vs `function` — Nord's Frost-7 vs Frost-8).
5. CSS coverage tests for Lumina pass unchanged — no rune CSS regresses because new variables exist.
6. A consumer of the default Shiki integration sees richer colouring without changing any config.
7. Niwaki's behaviour is unchanged at every layer: same preset module, same rendered output, same composition story.

If any of these fail on Nord, the contract shape is wrong and this spec is revised before adding further presets.

## Acceptance Criteria

- `SyntaxTokens` interface in `packages/types/src/token-contract.ts` carries the 7 required + 9 optional roles described above, with JSDoc fallback documentation on each optional field.
- `ThemeTokensConfig`'s `color.code.*` namespace is documented as optionally settable by syntax preset modules. The token contract type itself is unchanged — only the *authoring guidance* for syntax presets is widened.
- CSS variable generator emits `--rf-syntax-token-*` for all 16 roles, with each optional role falling back via `var()` to its documented core role when unset.
- Shiki integration in `packages/highlight/src/highlight.ts` either uses Shiki's existing css-variables theme (where each role is already emitted) or ships an extended css-variables theme that wires the additional scope mappings. Documented in the package README.
- `theme.tints[].extends` accepts a preset module path in addition to a tint name. When it resolves to a preset, the generator projects the preset's scope-eligible namespaces into the `.rf-tint--<name>` CSS class.
- The generator's scope-eligibility filter matches the table in "Scope-eligibility filter" above — `color.*` (including `color.code.*`) and `syntax.*` are scope-eligible; `font.*`, `radius.*`, `spacing.*`, `shadow.*`, and `color.status.*` are not. Non-eligible keys are dropped from the projection (with an optional dev-mode warning).
- The tint rune body parser is unchanged from SPEC-053 — it accepts the chrome accent vocabulary inline and ignores syntax / code-surface keys. Syntax overrides reach the rune via the `preset` attribute only.
- Niwaki preset (`packages/lumina/src/presets/niwaki.ts`) is unchanged and continues to behave as a syntax-only scoped preset that composes with any chrome.
- A Nord preset is added under the same directory, sets at least one extended syntax role distinctly (proving the fidelity gain is real), sets `color.code.*` for at least one mode (proving the canvas-claiming path works), and has a `{% palette %}`-documented page.
- The Nord doc page declares Nord in its site's `theme.tints` (via `extends`) and uses `{% tint preset="nord" %}` to render both palette swatches and a live code block, demonstrating the scoped-tint projection on a site whose active preset is something other than Nord.
- CSS coverage tests for Lumina continue to pass.
- SPEC-048 is updated with a one-line pointer to this spec for the syntax tier and tint-vocabulary extensions.

{% /spec %}
