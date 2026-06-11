{% work id="WORK-385" status="ready" priority="medium" complexity="moderate" source="SPEC-092" milestone="v0.21.0" tags="registry,docs,tooling,runes" %}

# Rune-page metadata backfill

The generated rune catalogue (WORK-386) needs every `/runes/<name>`
page to carry `category`, `plugin`, and `status` frontmatter. Hand-editing ~100+
pages is a slog and drifts — so backfill it with a **script**.

## Decisions (locked)
- **Backfill by script**, not by hand: derive `plugin` from the owning package,
  `category` from the rune's nav group, `status` default `stable`. Idempotent
  (re-runnable; only fills missing keys, never clobbers authored values).
- **`status` is a fixed vocabulary** — `stable | beta | experimental | deprecated`
  — chosen so it can later drive a sentiment-coloured nav badge (a *separate*,
  deferred nav feature; this item only lands the data, forward-compatibly).

## Acceptance Criteria
- [ ] A repeatable script writes `category` / `plugin` / `status` frontmatter to every rune reference page (core + plugin runes), idempotently.
- [ ] `status` uses the fixed four-value vocabulary, documented; default `stable`.
- [ ] With {% ref "WORK-383" /%} indexing, the fields are queryable — verified by a live `aggregate type="page" filter="url:/runes/*" group="category"`.

## Dependencies
- {% ref "WORK-383" /%} (so the frontmatter is indexed and queryable).

## References
- {% ref "SPEC-092" /%} · the rune catalogue (`defineRune` set + each plugin's `Plugin.runes`) · `site/content/runes/_layout.md` (nav groups → categories)

{% /work %}
