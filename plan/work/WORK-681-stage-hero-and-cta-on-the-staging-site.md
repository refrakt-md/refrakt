{% work id="WORK-681" status="ready" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, staging, marketing, hero, cta" milestone="v0.44.0" %}

# Stage hero and cta on the staging site

The composed `hero` and `cta` move out of the test fixtures into `site/staged-runes/`. This
makes the review of {% ref "WORK-665" /%} and {% ref "WORK-666" /%} possible: their reference
pages, the homepage and every other page that uses them, rendered with the compositions on
the staging site.

## Acceptance Criteria

- [ ] `packages/runes/test/fixtures/composed/hero.md` and `cta.md` are moved (`git mv`) to `site/staged-runes/`; no copy remains in a fixture directory
- [ ] `packages/content/test/composed-marketing.ts`, `composed-runes-guide.test.ts` and any other reader of the moved files read them there, and every composed hero and cta test passes unchanged
- [ ] The `staging` site prefers `__project__` for `hero` and `cta`
- [ ] `/runes/marketing/hero`, `/runes/marketing/cta` and `/` render with the compositions under `npm run dev:staging` and `npm run build:staging`
- [ ] `main`, the contracts and the SEO baseline are unchanged

## Blocked by

- {% ref "WORK-680" /%}

## Blocks

- {% ref "WORK-668" /%}: `testimonial` is written in `site/staged-runes/`, not as a test fixture
- {% ref "WORK-678" /%}: `steps` likewise
- {% ref "WORK-683" /%}

## References

- {% ref "SPEC-181" /%}: D1, D4.
- {% ref "WORK-665" /%}, {% ref "WORK-666" /%}: the differences a reviewer checks.

{% /work %}
