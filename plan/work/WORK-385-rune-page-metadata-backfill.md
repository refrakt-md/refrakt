{% work id="WORK-385" status="done" priority="medium" complexity="moderate" source="SPEC-092" milestone="v0.21.0" tags="registry,docs,tooling,runes" %}

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
- [x] A repeatable script writes `category` / `plugin` / `status` frontmatter to every rune reference page (core + plugin runes), idempotently.
- [x] `status` uses the fixed four-value vocabulary, documented; default `stable`.
- [x] With {% ref "WORK-383" /%} indexing, the fields are queryable — verified by a live `aggregate type="page" filter="url:/runes/*" group="category"`.

## Dependencies
- {% ref "WORK-383" /%} (so the frontmatter is indexed and queryable).

## References
- {% ref "SPEC-092" /%} · the rune catalogue (`defineRune` set + each plugin's `Plugin.runes`) · `site/content/runes/_layout.md` (nav groups → categories)

## Resolution

Completed: 2026-06-11

Branch: `claude/work-385-rune-catalogue` (catalogue track: WORK-385/386/387).

### What was done
- `scripts/backfill-rune-metadata.mjs` — derives and writes `type: rune`, `category`, `plugin`, `status` frontmatter to every rune reference page. `plugin` = `core` or the owning subdirectory; `category` = the page's nav group in `runes/_layout.md`; `status` defaults `stable`. Idempotent (fills missing keys only, never clobbers). Gates "is this a rune page" by matching the basename against the active package set (`refrakt inspect --list --site main --json`), so concept/overview/guide pages (surfaces, media-guests, rune-catalog, `*/index.md`, cli/workflow) are correctly skipped. `--dry-run` previews.
- Ran it: **94 rune pages** backfilled, 16 non-rune pages skipped. Re-run is a no-op (idempotency verified).
- `type: rune` is written per-page rather than via an `entityRules` glob: the script already identifies exactly the real runes, so concept pages a `runes/**` rule would wrongly capture stay `page`-only.
- `npm run runes:metadata` alias added.
- Documented the `status` vocabulary (`stable`/`beta`/`experimental`/`deprecated`, default `stable`) in `runes/rune-catalog.md`.

### Verification
- Site build green; the inline `aggregate type="rune"` reads **94**, and `collection type="rune" group="category"` + `aggregate ... group="plugin"` both resolve — proving `category`/`plugin` are indexed and queryable. The `rune` entity reuses the `page` entity's reserved-filtered data (page-entities.ts), so the literal `aggregate type="page" filter="url:/runes/*" group="category"` query reads the same indexed fields by construction.

### Notes
- Reserved keys (`type`/`id`/layout plumbing) are excluded from query data by WORK-383/384, so `type: rune` doesn't leak into `data`.

{% /work %}
