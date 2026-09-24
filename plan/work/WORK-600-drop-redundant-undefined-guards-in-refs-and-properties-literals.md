{% work id="WORK-600" status="ready" priority="medium" complexity="trivial" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dead-code" %}

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

- [ ] No `...(x ? { k: x } : {})` remains inside a `refs` or `properties` object literal
- [ ] The 20 equivalents on hand-built `Tag` attribute objects are **untouched** — there the guard is load-bearing
- [ ] `refrakt contracts --check` and `npm run seo:baseline:check` report no drift
- [ ] `npm test` passes unchanged

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

{% /work %}
