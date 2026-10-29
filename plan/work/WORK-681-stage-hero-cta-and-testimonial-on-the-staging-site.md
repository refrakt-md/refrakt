{% work id="WORK-681" status="ready" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, staging, marketing, hero, cta, testimonial" milestone="v0.44.0" %}

# Stage hero, cta and testimonial on the staging site

The composed `hero`, `cta` and `testimonial` move out of the test fixtures into
`site/staged-runes/`. This makes the review of {% ref "WORK-665" /%}, {% ref "WORK-666" /%} and
{% ref "WORK-668" /%} possible: the runes' reference pages, the homepage and every other page
that uses them, rendered with the compositions on the staging site.

## Acceptance Criteria

- [ ] `packages/runes/test/fixtures/composed/hero.md`, `cta.md` and `testimonial.md` are moved (`git mv`) to `site/staged-runes/`; no copy remains in a fixture directory
- [ ] `composed-marketing.ts`, `composed-testimonial.test.ts`, `composed-runes-guide.test.ts` and any other reader of the moved files read them there, and every composition test passes unchanged
- [ ] The `staging` site prefers `__project__` for `hero`, `cta` and `testimonial` (and so for the `review` alias)
- [ ] `/runes/marketing/hero`, `/runes/marketing/cta`, `/runes/marketing/testimonial` and `/` render with the compositions under `npm run dev:staging` and `npm run build:staging`
- [ ] `refrakt validate --site staging` reports nothing that `--site main` does not (SPEC-181 D7)
- [ ] `main`, the contracts and the SEO baseline are unchanged

## Blocked by

- {% ref "WORK-680" /%}
- {% ref "WORK-684" /%}: the hero content uses `start` / `end`
- {% ref "WORK-685" /%}: the testimonial content uses `author` / `role`

## Blocks

- {% ref "WORK-678" /%}: `steps` is written in `site/staged-runes/`, not as a test fixture
- {% ref "WORK-683" /%}

## References

- {% ref "SPEC-181" /%}: D1, D4, D7.
- {% ref "WORK-665" /%}, {% ref "WORK-666" /%}, {% ref "WORK-668" /%}: the differences a reviewer checks.

{% /work %}
