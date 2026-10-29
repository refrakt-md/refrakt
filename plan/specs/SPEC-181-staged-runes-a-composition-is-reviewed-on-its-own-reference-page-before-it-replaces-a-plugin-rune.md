{% spec id="SPEC-181" status="draft" tags="runes, composition, site, staging, review, plugins, rollout" %}

# Staged runes: a composition is reviewed on its own reference page before it replaces a plugin rune

A composition that will replace a plugin rune is first written as a project rune of a second
docs site, `staging`. That site renders the same content as `main`, with the staged
compositions in place of the plugin runes they replace. You review a rune by opening its
reference page on both sites and switching tabs.

Each rune goes live on its own once its review is accepted. Going live moves the definition
into the plugin, in a work item of its own. This is the convention for every conversion,
starting with `hero`, `cta` and `testimonial` in v0.44.0.

## Why

**A composition has no page where anyone can look at it.**
- The composed `hero`, `cta` and `testimonial` are test fixtures in
  `packages/runes/test/fixtures/composed/`.
  The five composed storytelling runes are in
  `packages/content/test/fixtures/composed-storytelling/runes/`.
- The only code that loads them is the test harnesses.
- {% ref "SPEC-147" /%} D2 and the v0.44.0 milestone gate each replacement on a reviewed
  comparison with the plugin rune. Today that review means reading a list of differences in a
  work item's resolution. Nobody can see the differences.

**The reference page is the right review surface; a gallery is not.**
- The gallery fixtures cover a few attribute combinations and are not yet solid.
- The reference page under `site/content/runes/` is what users read. It already shows each
  attribute, variant and pairing. It is also the page that must render correctly once the
  rune goes live.
- Other pages that use the rune (the homepage uses `hero`) are reviewed for free.

**The mechanism already exists.**
- A site can declare a project rune directory (`runes.dir`). A project rune may replace a plugin
  rune when `runes.prefer` names `__project__` for it ({% ref "SPEC-153" /%} D8). A project rune
  that takes a plugin rune's name without that entry is a build error (`project-plugin-name`).
- `refrakt.config.json` already declares several sites.
- So a second site over the same content needs no new configuration option, and no new code in
  any package. It is what any refrakt user would do to replace a plugin rune with their own.
  That means this repository exercises the path itself instead of only testing it.

**A prefixed name (`lab-hero`) would review the wrong thing.**
- It emits `data-rune="lab-hero"`, not the `hero` that ships.
- Every reference page would need a hand-edited copy that uses the prefix.
- A staged rune here keeps its real name and its real output.

## Design

### The staging site

`refrakt.config.json` gains a `staging` site:
- the same `contentDir` (`./site/content`), theme, tints, plugins, route rules and icons as
  `main`;
- plus `runes.dir` set to `site/staged-runes` and a `runes.prefer` entry of `__project__` for
  each staged rune.

```json
"staging": {
  "contentDir": "./site/content",
  "runes": {
    "dir": "site/staged-runes",
    "prefer": { "hero": "__project__", "cta": "__project__" }
  }
}
```

The other fields are elided above. Sites cannot extend each other, so they are a copy of
`main`'s, and a test asserts that `staging` equals `main` apart from `runes`.

`site/vite.config.ts` reads the site name from `REFRAKT_SITE`, defaulting to `main`.
- `npm run dev:staging` serves the staging site on its own port.
- `npm run build:staging` builds it into its own output directory.
- Paths are identical on both sites, so comparing is switching between two tabs.

`main` never reads `site/staged-runes`, so its output, the contracts and the SEO baseline are
unaffected by anything staged.

### Where a staged definition lives

- `site/staged-runes/<rune>.md`, named after the plugin rune it replaces (SPEC-153 D9).
- One directory for all plugins, because `runes.dir` is a single directory.
- The comparison test harnesses read the definition from there. The reviewed file and the
  tested file are the same file.

### Content both sites can render

The two sites share one `contentDir`. When a composition changes how an author writes the rune,
the shared content can only suit one of them:
- `hero`: the composed rune takes `align="start | center | end"`, while the homepage and the
  hero reference page write `align="left"`;
- `testimonial`: the composed rune takes `author` and `role` attributes and reports the
  `**Name** — Role` paragraph as `content-unmatched`, while the plugin rune takes no `author`
  attribute.

So the plugin rune learns the new form first. It accepts the composition's authoring form as
well as its own, as an additive change. This repository's content is then migrated on `main`
(with the codemod, where there is one), and both sites render the same source.
- `hero` accepts `start` and `end` as synonyms for `left` and `right`.
- `testimonial` accepts `author` and `role`, and parses the paragraph only when neither is set.

This also gives users a migration window. Authors can move to the new form while the plugin
rune is still live, so the go-live removes only the old form.

### Going live

Going live is a work item of its own, never part of the conversion:
- `git mv site/staged-runes/<rune>.md plugins/<plugin>/runes/<rune>.md`;
- the plugin declares `runeDir` (SPEC-153 D2) if it does not yet;
- the rune's `transform`, theme entry and CSS are removed, and so is its `prefer` entry;
- both copies of the contracts and the SEO baseline are regenerated, and every diff is
  explained;
- the changeset carries a migration note. It also carries a codemod (`refrakt migrate`) when
  authored content changes meaning;
- the rune's reference page is updated for any attribute whose vocabulary changed.

## Rollout

**Runes go live one at a time, as each review is accepted. Nothing waits for the other
conversions.**

Waiting until every intended conversion is staged was considered and rejected:
- **The wait would be long.** Marketing alone needs {% ref "SPEC-156" /%} (`steps`, `feature`),
  {% ref "SPEC-162" /%} and {% ref "SPEC-167" /%} (`pricing`, `tier`) and SPEC-145 D30
  (`cast-member`). The first staged rune would wait several milestones.
- **Reviews would go stale.** `section`, `actions` and the composition machinery keep changing
  under staged runes. A rune approved early would need reviewing again before a single
  switch-over.
- **Everything would be maintained twice.** Each plugin rune keeps its transform, config and
  CSS until it goes live, and every fix lands in both versions.
- **Problems would surface late, and all together.** The first go-live is what exercises the
  plugin `runeDir`, the contract and baseline diffs, and {% ref "WORK-669" /%}'s reporting of
  theme overrides. A single switch-over would find their problems at once, in the largest
  breaking release possible.

Going live one at a time costs authors more, smaller migrations. Each is a breaking change
(no `rf-<rune>` classes, and some vocabulary differs, e.g. `align` takes `start | end` rather
than `left | right`). Each ships with its own migration note, and with a codemod where content
must change. A plugin is mixed while this happens, part composed and part native. That is
acceptable: nothing promises that a plugin's runes are built the same way.

**Runes go live together only when they cannot be migrated separately.**
- That is the case when one migration step must change several runes at once, or a theme or
  author could not follow the intermediate state.
- A shared vocabulary change is not by itself such a case. The codemod is per rune and
  idempotent, so running it at each go-live is cheap.

**Storytelling is a plugin-level decision.** SPEC-147 D1 replaces that plugin alongside and
deletes it separately. Its compositions stay staged until that decision is taken, and then go
live, or become documented project runes, together.

### A rune goes live when

1. its mirror on the staging site has been reviewed, light and dark, on its reference page and
   on every other page that uses it;
2. every difference listed in its conversion item is either accepted or fixed;
3. any authored content whose meaning changes has a codemod, run over this repository's
   content, and the plugin rune has accepted the new form for at least one release (D7);
4. it does not depend on a primitive whose spec is still `draft`.

## Decisions

### D1 — a staged composition is a project rune of a second site, under its final name

`site/staged-runes/<rune>.md`, loaded only by the `staging` site, preferred over the plugin
rune through `runes.prefer`. There is no new configuration option and no prefix. A composition
that replaces nothing (`teaser`, the section-grammar fixtures) is not staged; it stays a test
fixture.

### D2 — the reference page is the review surface

The staging site renders the whole docs site. A rune is reviewed on its reference page and on
every other page that uses it. There is no separate gallery of staged runes.

### D3 — `staging` is a copy of `main` apart from `runes`, and a test holds it there

This is the price of not having site inheritance. A test fails when the two sites differ in any
field other than `runes`.

### D4 — the test harnesses read the staged definition

The comparison tests (SPEC-147 D2) and the reviewed page read the same file. A staged rune may
not also have a copy in a test fixture directory.

### D5 — going live is its own work item, one rune at a time

Going live is never part of a conversion. A rune goes live once the four gates in the rollout
are met. Runes are grouped only when they cannot be migrated separately. Storytelling goes
live as a whole, by the SPEC-147 decision.

### D6 — the convention is stated where conversions are planned and checked where they are tested

- `CLAUDE.md` and the rune authoring docs describe it.
- A test fails when a composed definition under a test fixture directory has the name of a
  shipping plugin rune.

### D7 — the plugin rune accepts the composition's authoring form before the rune is staged

A staged composition must render the shared content without errors. Where its authoring form
differs from the plugin rune's, the plugin rune gains the new form additively, and this
repository's content is migrated on `main` before the rune is staged. The staging site's
validation (`refrakt validate --site staging`) reports nothing that `main`'s does not.

## Not in scope

- Staging a replacement for a core rune. Core names are not shadowable (SPEC-153 D8).
- A hosted staging deploy. `build:staging` makes one possible; deploying it is a separate
  decision.
- Site inheritance in `refrakt.config.json`. D3's test is the stand-in.
- Fixing {% ref "BUG-037" /%}. The staging site uses `__project__`, which that bug does not
  affect.

## Acceptance Criteria

- [ ] The `staging` site serves the docs content with staged runes in place of plugin runes, through existing configuration only, and a test holds it equal to `main` apart from `runes`
- [ ] `main`'s output, the contracts and the SEO baseline are unchanged by anything staged
- [ ] The plugin `hero` and `testimonial` accept their compositions' authoring forms, and this repository's content uses them
- [ ] `hero`, `cta` and `testimonial` are staged in `site/staged-runes/`, their tests read them there, and their reference pages render with them on the staging site with no validation findings beyond `main`'s
- [ ] The storytelling compositions are staged likewise
- [ ] The convention and rollout are documented, and a test catches a composed definition of a plugin rune outside staging

## References

- {% ref "SPEC-145" /%}: composed runes.
- {% ref "SPEC-147" /%}: D1 replace alongside, D2 every difference explained.
- {% ref "SPEC-153" /%}: D2 plugin `runeDir`, D8 precedence, D9 the filename is the name.
- {% ref "SPEC-160" /%}, {% ref "SPEC-161" /%}: the marketing conversions.
- {% ref "ADR-042" /%}, {% ref "WORK-669" /%}: theme overrides of composed runes.

{% /spec %}
