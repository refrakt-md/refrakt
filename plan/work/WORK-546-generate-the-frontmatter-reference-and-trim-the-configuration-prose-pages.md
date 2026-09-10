{% work id="WORK-546" status="done" priority="medium" complexity="simple" source="SPEC-126" milestone="v0.33.0" tags="docs,content,frontmatter" %}

# Generate the frontmatter reference and trim the configuration prose pages

The last part of {% ref "SPEC-126" /%}: point the generator at the frontmatter
schema, and delete the hand-written field tables the generated references
replace.

## Acceptance Criteria
- [x] `docs/authoring/frontmatter.md` renders from a generated artifact, the same way the config reference does
- [x] `docs/content.md` links to it instead of carrying a frontmatter table
- [x] `sites.md` loses its `## SiteConfig fields` section (~115 of its 240 lines) and keeps Single-site, Multi-site, CLI `--site`, and Path resolution
- [x] `overview.md` loses its "Top-level sections" table
- [x] Each remaining configuration page links to the reference for the full field list
- [x] Worked examples stay — a field shown in use is not a field list
- [x] Every internal link still resolves, verified against the built site

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

## Resolution

Completed: 2026-09-10

Branch: `claude/content-author-docs-org-vps1un`

### What was done

**`scripts/generate-config-reference.mjs`** extended rather than duplicated: it
now emits `frontmatter-fields.json` alongside `config-fields.json`, and covers
the **top-level** config scope as well as `SiteConfig`.

**`site/content/docs/authoring/frontmatter.md`** (new) — 18 fields rendered from
the artifact, each with its own anchor, plus the editor-configuration snippet.

**`docs/content.md`** — its 10-row frontmatter table replaced by a link, keeping
the worked example and a pointer to the two fields the rest of the page uses.

**`sites.md`** — the four `SiteConfig` field tables removed (240 → 148 lines).
Single-site, Multi-site, CLI `--site` and Path resolution stay, as does the
theme object form's prose and both worked examples.

**`overview.md`** — the "Top-level sections" table replaced by a link, with the
four root fields named in prose.

**Navigation** — both pages added, frontmatter first in the Authoring list since
it is the foundational topic.

### Notes

- **Extending the generator to the top level was not in the plan, and the plan
  was wrong without it.** The work item says to delete `overview.md`'s
  top-level table, but the reference covered `SiteConfig` only — deleting it
  would have removed the only enumeration of `plugins`, `plan`, `xrefs` and
  `fileRoots`. A `ungroupedTopLevel` assertion now guards that scope too.
- The root is mostly the flat legacy shape, the same names `SiteConfig`
  declares. That is detected structurally rather than by matching "Legacy
  shorthand" in the description — only 5 of the 17 say so, and a rule that
  depends on wording breaks when someone rewrites one.
- `plugins` is valid in both scopes. It is listed under the site scope only;
  listing it twice gave the page two headings with the same anchor.
- **The link checker caught a real break from my own trim** — `file-ref.md`
  pointed at `sites#seo-and-branding`, a heading this item removed. Repointed at
  the reference.
- It also produced a false positive, now fixed: heading ids are read at parse
  time, so a page whose headings come from a `data` body has ids the checker
  cannot know. Such pages are excluded from fragment checks, with tests for both
  the body and self-closing cases.
- Full suite 4303 passing; both generated pages verified in the built site with
  no duplicate anchors.

{% /work %}
