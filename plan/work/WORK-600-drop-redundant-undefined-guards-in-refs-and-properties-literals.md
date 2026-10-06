{% work id="WORK-600" status="done" priority="medium" complexity="trivial" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dead-code" pr="refrakt-md/refrakt#656" %}

# Drop redundant `undefined` guards in `refs` and `properties` literals

`createComponentRenderable` opens both slot loops with
`if (v === undefined) continue` (`component.ts:77` and `:98`), so inside `refs`
and `properties`:

```ts
...(captionTag ? { caption: captionTag } : {})   // is exactly
caption: captionTag                               // this
```

59 sites. Verified on `packages/runes/src/tags/figure.ts` — identical output.

## Acceptance Criteria

- [x] No `...(x ? { k: x } : {})` remains inside a `refs` or `properties` object literal
- [x] The 20 equivalents on hand-built `Tag` attribute objects are **untouched** — there the guard is load-bearing
- [x] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [x] `npm test` passes unchanged

## Approach

The sweep is bounded to the two slot literals. Guards on `Tag` attribute objects
must stay: `diff.ts:138`, `form.ts:165/203/204/215/229/230`, `sandbox.ts:253/254`
and the rest write into an attributes record where an `undefined` value would be
emitted as an attribute.

`null` and `''` are also safe to pass through, not just `undefined`:
`Markdoc.Tag.isTag(null)` is false, so a null slot value is a no-op in both
loops. The guard is redundant for every falsy value a rune actually produces.

## References

- {% ref "SPEC-140" /%} — Tier 1
- {% ref "ADR-008" /%} — the flat namespace the slot loops enforce, which must keep working

## Resolution

Completed: 2026-10-06

Branch: `claude/v0-37-post-release-plan-dc3va1`

### What was done
- 52 `...(x ? { k: x } : {})` → `k: x` inside `properties` / `refs` literals across 23 files, via a brace-matching rewrite scoped to the two slot literals and to sites where condition and value are the same expression.
- `component.ts`: slot types admit `null`, and the loops skip `v == null`. They already treated `null` as a no-op (`Tag.isTag(null)` is false); widening the type avoided retyping every `Tag | null` declaration (plan-history's `idMeta` was the first to fail the build).

### Notes
- Six guards stay — condition ≠ value, so they are load-bearing: drawer `footer ? footer.tag('footer')` (would throw), figure `imgs.length > 0`, budget `hasPerDay`, character/realm/faction `hasSections`.
- Converting a guard makes the key present-with-undefined, which `Object.keys` in the ADR-008 collision check would see. A static scan of every converted call found no key in both maps.
- Attribute-object guards (`diff.ts`, `form.ts`, `sandbox.ts`, …) untouched.

{% /work %}
