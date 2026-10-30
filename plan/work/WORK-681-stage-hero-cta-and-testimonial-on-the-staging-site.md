{% work id="WORK-681" status="done" priority="high" complexity="simple" source="SPEC-181" tags="runes, composition, staging, marketing, hero, cta, testimonial" milestone="v0.44.0" pr="refrakt-md/refrakt#737" %}

# Stage hero, cta and testimonial on the staging site

The composed `hero`, `cta` and `testimonial` move out of the test fixtures into
`site/staged-runes/`. This makes the review of {% ref "WORK-665" /%}, {% ref "WORK-666" /%} and
{% ref "WORK-668" /%} possible: the runes' reference pages, the homepage and every other page
that uses them, rendered with the compositions on the staging site.

## Acceptance Criteria

- [x] `packages/runes/test/fixtures/composed/hero.md`, `cta.md` and `testimonial.md` are moved (`git mv`) to `site/staged-runes/`; no copy remains in a fixture directory
- [x] `composed-marketing.ts`, `composed-testimonial.test.ts`, `composed-runes-guide.test.ts` and any other reader of the moved files read them there, and every composition test passes unchanged
- [x] The `staging` site prefers `__project__` for `hero`, `cta` and `testimonial` (and so for the `review` alias)
- [x] `/runes/marketing/hero`, `/runes/marketing/cta`, `/runes/marketing/testimonial` and `/` render with the compositions under `npm run dev:staging` and `npm run build:staging`
- [x] `refrakt validate --site staging` reports nothing that `--site main` does not (SPEC-181 D7)
- [x] `main`, the contracts and the SEO baseline are unchanged

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

## Resolution

Completed: 2026-10-30

Branch: `claude/milestone-v0-44-0-ism7ni`

### What was done
- `git mv` of `hero.md`, `cta.md` and `testimonial.md` from `packages/runes/test/fixtures/composed/` to `site/staged-runes/`. No copy remains in a fixture directory, and WORK-683's test holds that.
- Readers updated:
  - `packages/content/test/composed-marketing.ts` (hence `composed-hero`, `composed-cta`, `composed-testimonial`);
  - `packages/runes/test/composition-models.test.ts` (`staged()`);
  - `packages/content/test/staging-site.test.ts`.

  Every composition test passes unchanged.
- `staging` site: `runes.prefer` sets `hero`, `cta` and `testimonial` to `__project__`, with `runes.schema: "allow"`.
- **`runes.schema: "deny" | "allow"` (SPEC-181 D8, amending SPEC-145 D25 item 2):** in the config schema, the types and `checkProjectRunes` / `loadProjectRunes` options, threaded through every caller (sveltekit, content, cli, `validate-core`, language server, create-refrakt). The D25 rejection names the option.
- **`mergePlugins`:** a project rune preferred over a plugin rune takes the aliases it shares with it, so `review` follows `testimonial`. An alias claimed by another plugin rune still needs its own entry. Tested in `project-runes.test.ts`.
- **`refrakt validate`:** `--site staging` and `--site main` both report no findings.
- **`npm run build:staging`:** builds `/runes/marketing/{hero,cta,testimonial}` and `/` with the compositions.
- Contracts (`--check`), the SEO baseline and `rune-attributes.json` are unchanged.

### Notes
- `testimonial`'s `schema` row is what needed D8. The storytelling compositions (WORK-682) need it too, and can now be staged the same way.

{% /work %}
