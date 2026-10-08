{% work id="WORK-628" status="done" priority="medium" complexity="simple" source="SPEC-145" milestone="v0.40.0" tags="seo,schema,spike,validation" pr="refrakt-md/refrakt#676" %}

# Spike: `@adobe/structured-data-validator` over the SEO baseline

{% ref "SPEC-145" /%} D25 bans `schema` in user composition definitions until a mechanical
check exists, and names the candidate:

- `@adobe/structured-data-validator` (Apache-2.0)
- validates JSON-LD against schema.org's published vocabulary and Google's rich-result
  rules
- takes the vocabulary as input, so refrakt curates no ontology

This spike measures whether it can be that check. Run it over every fixture's `jsonLd`
in `contracts/seo-baseline/baseline.json`, and record:

- **Noise.** Findings on output a reviewer would accept.
- **Catch rate.** The baseline records today's output *including its defects* (SPEC-130
  / WORK-562), so there is a known answer to check against.
- **Cost.** Install size, runtime, and how the vocabulary file is obtained and pinned.

The output is a recommendation, not an integration: lift D25's ban behind a
`refrakt validate` check, or keep it and say why. A spike script is fine. Nothing
ships to users from this item.

## Acceptance Criteria

- [x] `@adobe/structured-data-validator` has been run over `contracts/seo-baseline/`, and its findings (noise, and which known defects it catches) are recorded as the evidence for or against lifting D25's ban (D25)
- [x] How the schema.org vocabulary is obtained, pinned and updated is recorded, since D25 rests on consuming it rather than shipping one
- [x] The recommendation is recorded in SPEC-145 under D25, with a follow-up work item filed if it is to become a `refrakt validate` check

## Resolution

Completed: 2026-10-08

Branch: `claude/v040-sd-validator-spike`
PR: refrakt-md/refrakt#676

### What was done
- `scripts/sd-validator-spike.mjs` runs `@adobe/structured-data-validator` 1.7.0 against schema.org 30.1, pinned by version and sha256. It covers today's baseline, the baseline at `306e18e`, `83e86f6` and `edc0608`, and six synthetic probes. The validator is not a dependency of anything; it is a scratch install passed in `SDV_DIR`.
- `plan/specs/SPEC-145-composed-runes.md`: the D25 "Spike result" section records noise, catch rate, probes, cost, how the vocabulary is obtained and pinned, and the recommendation.
- Filed BUG-033: `byArtist` on `MusicPlaylist`, and `duration` on `Chapter` and on `CreativeWork`, found by the schema.org layer.
- Filed WORK-629 (draft): the schema.org layer as a maintainer-side CI check over the baseline.

### Notes
- Recommendation: keep D25's ban on user `schema`. The schema.org layer checks only that a type exists and that each property is in the type's domain. It had zero false positives, but it caught 3 of 17 recorded defects, one of them incidentally. It misses wrong types, bare types, wrong values and wrong membership. The rich-result layer is eligibility noise on refrakt's output: 196 of 203 findings on today's baseline. So no `refrakt validate` follow-up was filed.
- Spec premise that did not hold as written: the sandbox's egress policy refused `schema.org`, while GitHub raw (`schemaorg/schemaorg` `data/releases/<v>/`) worked. So "consume, don't ship" means network in validate, a vendored 229 KB-gzipped file, or a user-supplied one.
- The library caches its vocabulary in a process-wide static, so the first vocabulary loaded wins. This matters for long-lived processes.

{% /work %}
