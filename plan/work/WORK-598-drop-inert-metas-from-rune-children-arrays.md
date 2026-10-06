{% work id="WORK-598" status="done" priority="high" complexity="simple" milestone="v0.38.0" source="SPEC-140" tags="runes,transform,dead-code" %}

# Drop inert metas from rune children arrays

100 metas across 24 tag files are mapped in `properties` **and** emitted into
`children`, where `createComponentRenderable` filters them straight back out
(`packages/runes/src/lib/component.ts:127-131`). 133 other metas already omit
that emission and render identically.

Delete the emission. Nothing else.

## Acceptance Criteria

- [x] No meta mapped in `properties` is also listed in a `children` array or pushed onto one, in any of the 121 runes
- [x] `refrakt contracts --check` reports no drift, on both committed copies (`contracts/structures.json` and `packages/lumina/contracts/structures.json`)
- [x] `npm run seo:baseline:check` reports no drift
- [x] `npm test` passes unchanged
- [x] A meta that is *not* in `properties` and is deliberately rendered is left alone — the sweep is bounded to property-mapped metas

## Approach

The emission takes two forms and both must go: direct entries in a
`children: [...]` literal (63 sites) and `children.push(meta)` / multi-argument
pushes (37 sites).

Verified before filing by stripping all twelve from `plugins/plan/src/tags/work.ts`:
`refrakt inspect work --site plan --json` returned byte-identical output and
`npm run seo:baseline:check` reported no drift.

The deletion is safe by construction, not just by sample. `schemaTags`
(`component.ts:57`) is populated only from `result.schema`, which has **zero
callers** — so `isSeoMeta` is always `false`, every property meta is added to
`pureDataMetas`, and `pureDataMetas` members are unconditionally filtered from
`childArray`. There is no input for which a property-mapped meta survives.

Highest-count files: `work.ts` (12), `bug.ts` (10), `map.ts` (8),
`decision.ts` (8), `spec.ts` (8), `form.ts` (6).

## Verification

`contracts --check` plus `seo:baseline:check` returning no diff is the test.
Both artefacts are generated from config and describe every rune's complete
output, so a behavioural change cannot hide from them.

## References

- {% ref "SPEC-140" /%} — the survey this implements, Tier 1
- {% ref "SPEC-082" /%} — the `data-rune-fields` bag that made the emission inert
- {% ref "WORK-331" /%} — the change that started filtering pure-data metas out

## Resolution

Completed: 2026-10-06

Branch: `claude/v0-37-post-release-plan-dc3va1`

### What was done
- Removed every property-mapped meta from the top-level `children` of `createComponentRenderable` across 62 tag files (core runes + marketing, docs, design, learning, storytelling, business, places, media, plan plugins), plus the auto-breadcrumb builder in `packages/runes/src/config.ts`. Forms removed: literal entries, `children.push(...)`, `...layoutChildren` / `...metas` / `...coverMetas` / `...Object.values(properties)` spreads, and conditional spreads.
- `card` keeps the layout metas it does **not** map (`media-ratio`, `valign`, `collapse` from `buildLayoutMetas`) — those render — and filters out only `media-position`.
- Deliberately rendered, non-property metas stay: plan-history/breadcrumb sentinels, `sinceMeta`, playlist `hasPlayerMeta`, testimonial `variantMeta`, the hand-built form `fieldset` meta, and the `[...metas, placeholder]` sentinels in collection/relationships/file-ref/backlog/decision-log/plan-activity.

### Verification
- Found sites by temporarily tracing `createComponentRenderable` (every property meta it filtered back out of children) across the test suite and SEO fixtures, then a static sweep for what the trace could not reach (palette, typography, comparison, the layout metas no fixture sets).
- `contracts --check` (main site, both copies), `seo:baseline:check`, and `npm test` (4945) all clean.
- Stronger than contracts (which is config-derived): `refrakt inspect --json` for every rune on both sites, plus every variant attribute expanded to `all` — 3,890 outputs, before vs after. All byte-identical except `blog` (below).

### Notes
- **The "safe by construction" claim has one hole.** `component.ts` only puts a meta in `pureDataMetas` when `content !== undefined`. A property meta with undefined content is *not* filtered and renders as an empty `<meta data-field=…>`. Every removed meta was checked for this: all are defaulted, `??`-guarded, conditional, or backed by a required attribute. The single observable diff is `blog`'s `folder` (required) — inspect's sample omits it, so a stray `<meta data-field="folder" />` used to render and no longer does. Only reachable from content that already fails validation.
- **Pre-existing bug, not fixed here:** `buildAutoBreadcrumb` (`config.ts`) looks for the separator among `originalTag.children` as a meta *without* `data-field`. The separator meta was always property-mapped, so it was always filtered (and had `data-field`) — `{% breadcrumb auto separator="›" %}` has silently fallen back to `/`. The value is available in the original tag's `data-rune-fields` bag.

{% /work %}
