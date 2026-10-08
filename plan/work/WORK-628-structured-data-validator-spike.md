{% work id="WORK-628" status="in-progress" priority="medium" complexity="simple" source="SPEC-145" milestone="v0.40.0" tags="seo,schema,spike,validation" %}

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

- [ ] `@adobe/structured-data-validator` has been run over `contracts/seo-baseline/`, and its findings (noise, and which known defects it catches) are recorded as the evidence for or against lifting D25's ban (D25)
- [ ] How the schema.org vocabulary is obtained, pinned and updated is recorded, since D25 rests on consuming it rather than shipping one
- [ ] The recommendation is recorded in SPEC-145 under D25, with a follow-up work item filed if it is to become a `refrakt validate` check

{% /work %}
