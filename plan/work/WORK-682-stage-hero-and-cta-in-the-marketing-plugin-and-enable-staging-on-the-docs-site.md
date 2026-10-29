{% work id="WORK-682" status="ready" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, staging, marketing, hero, cta" milestone="v0.44.0" %}

# Stage hero and cta in the marketing plugin and enable staging on the docs site

The composed `hero` and `cta` move out of the test fixtures into
`plugins/marketing/staging/`, and the docs site turns staging on. This makes the review of
{% ref "WORK-665" /%} and {% ref "WORK-666" /%} possible: the hero and cta reference pages
rendered with the compositions, at `/staging/runes/marketing/hero` and
`/staging/runes/marketing/cta`.

## Acceptance Criteria

- [ ] `packages/runes/test/fixtures/composed/hero.md` and `cta.md` are moved (`git mv`) to `plugins/marketing/staging/`; no copy remains in a fixture directory
- [ ] `packages/content/test/composed-marketing.ts` reads definitions from `plugins/marketing/staging/`, and every composed hero and cta test passes unchanged
- [ ] `packages/content/test/composed-runes-guide.test.ts` and any other reader of the moved files are updated
- [ ] The `main` site sets `runes.staging` with `dirs: ["plugins/marketing/staging"]`
- [ ] `/staging/runes/marketing/hero` and `/staging/runes/marketing/cta` render in dev and in `npm run build`, along with every other page that uses `hero` or `cta` (the homepage included)
- [ ] The marketing package still publishes `dist` only; `npm pack --dry-run` lists nothing from `staging/`
- [ ] Contracts and the SEO baseline are unchanged (`--check` passes)

## Blocked by

- {% ref "WORK-680" /%}
- {% ref "WORK-681" /%}

## Blocks

- {% ref "WORK-668" /%}: `testimonial` is written in `plugins/marketing/staging/`, not as a test fixture
- {% ref "WORK-678" /%}: `steps` likewise

## References

- {% ref "SPEC-181" /%}: D1, D6.
- {% ref "WORK-665" /%}, {% ref "WORK-666" /%}: the differences a reviewer checks.

{% /work %}
