{% work id="WORK-482" status="ready" priority="high" complexity="moderate" source="SPEC-113" milestone="v0.27.0" tags="content,runes,sandbox,security,pipeline" %}

# Migrate sandbox reads to `ProjectFiles` + close the `src` traversal gap

Move the sandbox example read seam (`__sandboxReadFile` family + preprocess `sandbox` hooks)
onto the {% ref "WORK-481" /%} `ProjectFiles` provider, and route the sandbox `src` directory
join through it so it inherits containment — closing the unguarded `examplesDir + '/' + src`
path-traversal gap.

## Scope

- **Hook family → provider** — the transform-time `__sandboxReadFile`/`__sandboxListDir`/`__sandboxDirExists` variables and the preprocess-context `sandbox` hooks become a `ProjectFiles` (the hook shape is already identical — a rename + containment upgrade). Keep null-provider behaviour in tree mode when no provider is supplied.
- **`src` join containment** — `packages/runes/src/tags/sandbox.ts` (`examplesDir + '/' + src`, currently unguarded string concat → `assembleFromDirectory`) resolves through the provider, so `src="../…"` is rejected by the provider's containment and surfaces the in-band sandbox error.
- **Regression test** — `{% sandbox src="../escape" %}` resolves to the in-band error message in both `fsProjectFiles` and `memoryProjectFiles`.

## Acceptance Criteria

- [ ] Sandbox example resolution (transform `__sandboxReadFile` family + preprocess hooks) consumes `ProjectFiles`.
- [ ] The sandbox `src` directory join inherits containment; `{% sandbox src="../…" %}` resolves to the in-band error message, with a regression test, in both providers.
- [ ] Existing sandbox tests/showcases pass unchanged for well-formed `src` values.

## Dependencies

- {% ref "WORK-481" /%} — the `ProjectFiles` interface + providers.

## References

- {% ref "SPEC-113" /%} §3 (sandbox examples) — the unguarded join: `packages/runes/src/tags/sandbox.ts`, `packages/runes/src/sandbox-sources.ts` (`assembleFromDirectory`).

{% /work %}
