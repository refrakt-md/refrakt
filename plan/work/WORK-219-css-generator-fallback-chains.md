{% work id="WORK-219" status="ready" priority="high" complexity="small" tags="tokens, css-generation, syntax-highlighting" source="SPEC-056" milestone="v0.14.1" %}

# CSS generator fallback chains for optional syntax roles

Extend the CSS variable generator (the function that compiles `ThemeTokensConfig` → `:root { --rf-* }` stylesheet at build time, established by SPEC-048) so that each optional `SyntaxTokens` role emits a `var()` fallback chain to its documented core role when the preset doesn't supply an explicit value. The pattern from SPEC-056:

```css
:root {
  --rf-syntax-token-type: var(--rf-syntax-token-type-explicit, var(--rf-syntax-token-function));
}
```

…with `--rf-syntax-token-type-explicit` set only when the preset supplies a value. This keeps fallbacks transparent (downstream CSS can override `--rf-syntax-token-type` directly), lets layered presets override the fallback chain independently, and ensures a preset that doesn't set extended roles never produces broken-looking code.

## Acceptance Criteria

- [ ] Each optional `SyntaxTokens` role (`link`, `string-expression`, `type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`) emits a `var()` chain matching the SPEC-056 fallback table
- [ ] When a preset *supplies* a value for an optional role, generator emits `--rf-syntax-token-{role}-explicit: {value};` AND the chained `--rf-syntax-token-{role}: var(--rf-syntax-token-{role}-explicit, var(--rf-syntax-token-{fallback}));`
- [ ] When a preset *doesn't* supply a value, generator emits only the chained line (no `-explicit` variable), so the fallback resolves to the core role's value
- [ ] Fallback targets match SPEC-056's table exactly: `link`→`function`, `string-expression`→`string`, `type`→`function`, `property`→`variable`, `parameter`→`variable`, `tag`→`keyword`, `attribute`→`function`, `operator`→`punctuation`, `number`→`constant`, `regex`→`string`
- [ ] Niwaki preset's generated CSS shows the fallback chains resolving to its existing 9 roles (no explicit values for the new 7) — verified by a generator test
- [ ] A unit test in the appropriate package covers: (a) preset with no optional roles set, (b) preset with a subset of optional roles set, (c) preset with all optional roles set
- [ ] Existing CSS coverage tests (`npx vitest run packages/lumina/test/css-coverage.test.ts`) pass unchanged

## Approach

Locate the generator function established by SPEC-048's WORK-187 (config-driven token stylesheet generation). The change is contained: add a fallback map keyed by role name, and during syntax-section emission, output the `-explicit` + `-chained` line pair for each optional role.

The `-explicit` indirection is the key — using `--rf-syntax-token-type: var(--rf-syntax-token-type-explicit, …)` rather than just `--rf-syntax-token-type: var(--rf-syntax-token-function)` lets downstream CSS still set `--rf-syntax-token-type` directly without competing with the fallback. This matters for layered presets (e.g. a syntax preset layered over a chrome preset can set `type` distinctly without re-stating `function`).

Keep the fallback map declarative — a single `const SYNTAX_FALLBACKS: Record<OptionalSyntaxRole, RequiredSyntaxRole>` table — so future contract extensions (e.g. SPEC-XYZ adds `decorator`) are a one-line edit.

## Dependencies

- {% ref "WORK-217" /%} — needs the extended `SyntaxTokens` interface so the generator knows which roles to emit fallbacks for
- Coordinates with {% ref "WORK-218" /%} but does not strictly depend on it — the generator produces the CSS regardless of whether Shiki currently emits the matching variables

## References

- {% ref "SPEC-056" /%} — "Authoring Surface" → "Fallback resolution" section
- {% ref "SPEC-048" /%} and {% ref "WORK-187" /%} — original token stylesheet generator (locate its source file from the WORK-187 resolution)

{% /work %}
