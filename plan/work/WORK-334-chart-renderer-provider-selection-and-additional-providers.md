{% work id="WORK-334" status="draft" priority="low" complexity="unknown" source="SPEC-083" tags="runes,chart,providers,rendering,theme" %}

# Chart renderer provider selection and additional providers

Build out the {% ref "SPEC-083" /%} provider story on top of the seam from
{% ref "WORK-333" /%}: a defined selection model (author vs theme vs default)
and the contract for adding renderers beyond the built-in `svg` (e.g. a charting
library).

**Status: draft — blocked on the provider-selection model.** The design
questions below are deliberately open; this item is a placeholder to be fleshed
out once that model is settled. Do not start until the open questions in
{% ref "SPEC-083" /%} are resolved.

## Open design questions (resolve first)

- **Selection precedence** — author `provider=` vs theme default vs built-in
  fallback; how a theme sets/overrides the default.
- **Provider contract** — what a provider receives (parsed data + options) and
  returns (DOM / canvas / SVG); registration/lookup shape.
- **SSR vs client** — per-provider, and the default.
- **Home** — does chart (and the provider zoo + optional library deps) move to a
  plugin.
- **Which providers** to actually ship beyond built-in `svg`.

## Acceptance Criteria (provisional — finalize after design)

- [ ] A documented provider-selection model with defined precedence.
- [ ] A provider registration/lookup contract additional renderers implement.
- [ ] At least the built-in `svg` provider conforms; a second provider validates
  the contract (only if a concrete need exists — otherwise prove the seam with
  a stub and defer real libraries).
- [ ] Theme can set a default provider; author can override per chart.
- [ ] Docs; full suite green.

## Dependencies

- {% ref "WORK-333" /%} — the single-provider seam this generalizes.

## References

- {% ref "SPEC-083" /%} — semantic chart data + pluggable renderer providers.

{% /work %}
