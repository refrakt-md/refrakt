{% work id="WORK-546" status="ready" priority="medium" complexity="simple" source="SPEC-126" milestone="v0.33.0" tags="docs,content,frontmatter" %}

# Generate the frontmatter reference and trim the configuration prose pages

The last part of {% ref "SPEC-126" /%}: point the generator at the frontmatter
schema, and delete the hand-written field tables the generated references
replace.

## Acceptance Criteria
- [ ] `docs/authoring/frontmatter.md` renders from a generated artifact, the same way the config reference does
- [ ] `docs/content.md` links to it instead of carrying a frontmatter table
- [ ] `sites.md` loses its `## SiteConfig fields` section (~115 of its 240 lines) and keeps Single-site, Multi-site, CLI `--site`, and Path resolution
- [ ] `overview.md` loses its "Top-level sections" table
- [ ] Each remaining configuration page links to the reference for the full field list
- [ ] Worked examples stay — a field shown in use is not a field list
- [ ] Every internal link still resolves, verified against the built site

## Approach

Cheap once the first two parts are in — the generator already exists and the
schema already describes the fields.

**Resist keeping `overview.md`'s top-level table as orientation.** Five
stable-looking rows is exactly the table that was missing `xrefs` and
`fileRoots` until WORK-539. Stability is what made nobody check it.

**Worked examples are not duplication.** `sites.md`'s multi-site JSON block sets
`baseUrl` per site — that is a field in use, and it should stay. The rule is
that a page may *show* a field; it may not claim to *enumerate* them.

Verify links against the built site rather than by inspection. WORK-540 found
that three anchors written by intuition did not resolve, because refrakt's
heading-ID generator preserves em-dashes and commas and drops inline code —
see {% ref "BUG-005" /%}.

## Blocked by

- {% ref "WORK-544" /%} — reuses its generator and guard
- {% ref "WORK-545" /%} — nothing to generate the frontmatter reference from without the schema

{% /work %}
