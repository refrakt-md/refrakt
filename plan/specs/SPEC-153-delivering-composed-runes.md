{% spec id="SPEC-153" status="implemented" tags="runes, composition, packaging, hosted, dx, plugins" %}

# Delivering composed runes

## Summary

{% ref "SPEC-145" /%} says what a composed rune *is*. This says how one **arrives** —
from a user's own repository, and from inside an installed plugin. Split out because it
is packaging and loading rather than composition semantics, and because the investigation
turned up a live defect and a dead mechanism that any delivery design has to reckon with.

The shape, in one line:

> **One file format, two read paths, one in-memory shape.**

A plugin-shipped composed rune is byte-identical to a user-authored one. Only the loader
differs, and it differs for a reason that is structural rather than aesthetic:
{% ref "SPEC-113" /%}'s `ProjectFiles` cannot reach inside a package.

## Why the formats must be identical

{% ref "ADR-037" /%} gives users the composed emit path and nothing else. That makes the
composed loader the *only* way a rune reaches a site from outside this repo — and a code
path with no first-party consumer rots. The alternative, where a plugin compiles its
composed runes into `Plugin.runes` as JS at build time, has two costs the repo already
knows the price of: a second source of truth that can drift from the `.md` (the same
lock-step problem `contracts/structures.json` pays for in two committed copies), and a
user-facing path that first-party code never exercises.

{% ref "SPEC-152" /%} supplies the forcing function. The plan plugin **stays** a plugin
and its five entity runes are composable, so it is the first plugin that wants to ship
composed runes — and it will ship them as the same files a user writes, or the user's
path has no in-repo consumer at all.

## Four delivery mechanisms already exist

Counted rather than assumed, and it matters which is live:

| Mechanism | Shape | Audience | Live users |
|---|---|---|---|
| `runes.local` | `{ name: modulePath }` in config → `import()` of **JS** | plugin authors pre-publish | documented (`plugin-authoring/authoring.md:325`) |
| `Plugin.fileRoots` / `site.fileRoots` | namespace → directory of `.md`, package- or project-relative | both | yes — partials ({% ref "SPEC-063" /%}) |
| `discoverPluginFixtures` | convention directory `<pkg>/fixtures/*.md`, `require.resolve`d | plugins | **none** |
| inline `fixture:` strings | JS string literal in the plugin's `index.ts` | plugins | yes — all nine plugins |

So the repo's *actual* precedent for a plugin shipping rune content is **inline in JS**.
The file-based convention path is an unexercised hypothesis, and the declared file-root
path is the one that has run in production.

## The convention path is broken three ways, and silently

`discoverPluginFixtures` is the closest existing analogue to plugin-shipped `.md` runes.
Each of these was measured, not inferred:

1. **No plugin has a `fixtures/` directory.** Zero of nine. The function has never run
   against real input.
2. **`files` would not publish one.** `npm pack --dry-run` on `plugins/plan` yields
   exactly `dist` and `package.json` — 157 files, no other top-level entry. Its `files`
   field also declares `styles`, which does not exist on disk, so the field has already
   drifted from reality.
3. **`require.resolve('<pkg>/package.json')` throws for two plugins.**
   `@refrakt-md/plan` and `@refrakt-md/docs` declare an `exports` map with no
   `./package.json` entry:

   ```
   @refrakt-md/plan      FAILED ERR_PACKAGE_PATH_NOT_EXPORTED
   @refrakt-md/marketing -> /home/user/refrakt/plugins/marketing/package.json
   ```

   `marketing` resolves only because it has no `exports` map at all. **The cause is the
   exports map, not a workspace link** — and the function's own `catch {}` comment
   attributes it to *"Plugin not resolvable via require (e.g., workspace link)"*, which
   is wrong about its own failure mode.

**Re-measured across all nine, and the result is worse than "two are misconfigured".**
Every claim above re-verifies, and widening the probe from two plugins to nine changes what
it means:

| | Count | Detail |
|---|---|---|
| `exports` map declared | 2 | `plan`, `docs` — both fail |
| No `exports` map | 7 | all resolve |
| Declares `./package.json` | **0** | none of the nine |

So the seven that work **work by accident**. They resolve because they have no `exports`
map, not because they export their manifest — nobody does. Adding an `exports` map is
routine modernisation (it is what `plan` and `docs` already did, presumably for their
`./cli-plugin` and subpath entries), so the convention path is not 2/9 broken: it is 2/9
broken and 7/9 one ordinary change away. A mechanism whose working cases are all accidents
is the argument for D2 rather than a caveat on it.

**And `files` is unanimous: no plugin would publish a `runes/` directory.** All nine declare
`dist` and nothing else, bar two additions — `learning`'s `i18n`, which exists, and `plan`'s
`styles`, which does not. So the drift noted in point 2 is specific to `plan` and the
publish gap is universal.

All three degrade to the same thing: `refrakt inspect` shows no fixture. Invisible,
harmless, which is exactly why none was noticed.

**For runes the identical degradation is an undefined tag on every page that uses it.**
That asymmetry is the whole argument of this spec. A delivery mechanism copied from this
one would ship plugins whose runes work in the monorepo and are absent from the tarball.

## `ProjectFiles` decides the split

{% ref "SPEC-113" /%}'s seam is **project-root-relative keys with containment enforced** —
absolute paths and post-normalisation `..` are rejected and treated as absent. In a
hosted build the provider is `memoryProjectFiles`, holding only the project's own keys.
A plugin's files are therefore not merely awkward to reach through it; they are
structurally absent.

So the two channels cannot share a reader, and each gets the one that fits:

| | Project runes | Plugin runes |
|---|---|---|
| Read through | `ProjectFiles.list` / `.read` | package-relative, at `loadPlugin` |
| When | per build | once, at import |
| Hosted | works — the keys are in the map | works — the package is on disk |
| Watchable | yes | no, and should not be |
| Traversal safety | the provider's, not the caller's | n/a — a fixed declared directory |

And the plugin side gets an invariant that makes an fs read safe there:

> **A plugin's `.md` runes are exactly as available as its JS is.**

If `import('@refrakt-md/plan')` succeeded, the package is on disk and its own directory
is readable. Any failure past that point is a packaging bug — a missing `files` entry, a
blocked `exports` path — never an absent-file condition. Which is why D3 makes it throw.

## Declaration for packages, convention for projects

The asymmetry is deliberate and the justification is concrete rather than a matter of
taste:

- **A package has a publish step that drops files and an `exports` map that blocks
  resolution.** Both failures were measured above. A declaration gives the validator
  something to check against.
- **A project has neither.** Its files are the files.

And the project side already has this exact pattern: `contentDir` is a **required,
declared** directory whose *contents* are discovered. `runes.dir` is that shape again,
not a new concept in the config — which also means the `runes` config key it joins
(`prefer`, `aliases`, `local`) stays the one place rune resolution is configured.

## A correction to the `runes.local` reading

An earlier framing of this — in conversation, not in a spec — described `runes.local` as
a shipped user-facing path for authoring runes with a hand-written transform, and so as
a live counterexample to {% ref "ADR-037" /%}. That overstates it. Its documentation is
headed *"Referencing Your Package → During Development (Local Files)"*: its purpose is a
**plugin author's inner loop before publishing**, and a plugin author is on the code path
ADR-037 assigns the declared emit path to. So its intent is consistent with ADR-037.

What remains true is narrower and still worth settling: nothing in `runes.local`
*restricts* it to that use, it takes a JS module path so a rune definition cannot go
through it at all, and ADR-037 does not mention it. That is a documentation and scope question
(D7), not a contradiction.

## Decisions

### D1 — one file format, two read paths, one in-memory shape

A plugin-shipped composed rune and a user-authored one are the same file. The loader
materialises both into the same `Rune`, so nothing downstream — engine, contracts,
`inspect`, the editor — can tell them apart or needs to.

### D2 — a plugin declares its rune directory; it is not discovered by convention

`Plugin.runeDir`, package-relative, resolved the way `fileRoots` already resolves. Not a
hardcoded `runes/` scan, because the declaration is what `refrakt plugin validate` can
check and what a reader of `package.json` can see. The evidence for preferring the
declared form over the conventional one is the three measured breakages above: every one
of them is a property of the *package*, and a declaration is where a package states its
properties.

### D3 — a plugin's rune read failure throws; it never degrades to zero

Given the D5 invariant — the files are as available as the JS — a failed read means a
packaging bug, so it is reported with the resolved path and the reason. The
`discoverPluginFixtures` `catch {}` is not the pattern to copy, and its comment should be
corrected regardless of whether it gains a caller.

### D4 — the project's rune directory is declared once, its contents discovered

`runes.dir`, following `contentDir`'s shape. Recommended default `runes`, so an existing
project can add one without a config edit — but the default is the one part of this
decision that is a convenience rather than a consequence, and `create-refrakt` should
scaffold the key either way.

### D5 — project runes read through `ProjectFiles`; plugin runes do not

Not an inconsistency. A project rune is project content: it changes between builds, it
must work under `memoryProjectFiles`, and its path is user-supplied so containment
matters. A plugin rune is none of those.

### D6 — publishability is a validated gate, not a convention

`refrakt plugin validate` checks that the declared rune directory is covered by `files`
and that the package is resolvable (a `./package.json` export, or no `exports` map). Both
failures are invisible in the monorepo, so the acceptance gate is `npm pack` → install →
load, not a unit test.

### D7 — `runes.local` keeps its documented scope, stated explicitly

Its documented purpose is unpublished plugin development. That is recorded in ADR-037's
own terms so the relationship stops being implicit, and it rejects a composed-rune path
rather than half-accepting one: it takes a JS module and a rune definition is not one.

### D8 — precedence is core < plugin < project, and core names are not shadowable

A project rune may not take a core rune's name. `{% card %}` meaning something local
breaks every snippet, every doc page and every composed rune built on it — the same
portability premise {% ref "ADR-028" /%} rests on, one layer out. A project rune may
shadow a *plugin* rune, because `runes.prefer` already exists for exactly that and makes
the choice explicit.

### D9 — one file per composed rune, named `<rune>.md`, and the filename is authoritative

**There is no second file**, and the justification got simpler than it was: an earlier
revision said {% ref "ADR-035" /%}'s `<rune>.skin.md` *"has no counterpart here"*, leaving the
two-file split a theme concern. ADR-035 is now `rejected`, so there is no skin format at all
and no pair to be half of.

**So the file is `playlist.md`, not `playlist.rune.md`.** A suffix earns its keep when a file
must be identified out of context, and these never are: a plugin **declares** its rune
directory (D2) and a project's is a declared directory whose contents are discovered (D4), so
the directory always says what they are. That matches every other convention in the repo —
`site/content/**`, `fixtures/*.md`, `plan/specs/*.md` are all directory-scoped, `_layout.md` is
the single prefix special case, and nothing uses a double extension.

**The filename carries the rune's name, and frontmatter does not repeat it.** This repo has
already run the other experiment: plan entities are `{ID}-{slug}.md` *and* carry `id="…"` in
frontmatter, two sources of truth for one fact, and they drifted badly enough to need
`refrakt plan migrate filenames --apply --git`. So `rune:` comes out of the frontmatter —
resolution needs the filename anyway (`{% playlist %}` → `<runeDir>/playlist.md` is the
cheapest possible lookup), and a rename becomes just a rename. Frontmatter keeps what a
filename cannot carry: `tag`, `aliases`, `attributes`, `content`, `schema`, `metaFields`,
`blocks` and `registers`.

**The fixture is separated by directory, not by suffix.** {% ref "SPEC-102" /%} fixtures are
also `.md`, so `fixtures/playlist.md` sits beside `runes/playlist.md` — which is what plugins
already do — rather than introducing `playlist.fixture.md`.

### D10 — a rune edit invalidates every page that uses it

`setupContentHmr(server, contentDir, examplesDir, invalidate)`
(`packages/transform/src/content-hmr.ts:41`) watches two directories, and neither the
project's rune directory nor any `fileRoot` is among them. Adding the watch is small; the
part that is not is the granularity — editing a rune changes every page that uses it,
which is a different invalidation shape from a content edit. Noted here because it is the
kind of thing that gets discovered as a stale-page bug rather than designed.

### D11 — the composed variant reaches `PluginRune`

`validatePlugin` currently requires `entry.transform` on **every** rune and
`loadPlugin` passes it straight to `defineRune`. {% ref "SPEC-145" /%} D5's mutual
exclusion has to reach that type, or a plugin's composed rune fails validation for
lacking the thing it is defined by not having.

## What this does not do

**A plugin with no JavaScript** is newly *possible* — a pack of `.md` runes needs no
`transform`, no config and no CSS — and this spec does not introduce it. `loadPlugin`
requires `import()`, `findPluginExport` and `validatePlugin`, so a JS-free pack means
relaxing three things at once and inventing a second loader entry point. D2's shape does
not preclude it later; it is simply a different change, and the hosted product is the
consumer that would justify it.

## Status after v0.40.0

Implementation notes 1 and 2 are done:
- {% ref "WORK-626" /%}: every plugin's manifest resolves, and `files` matches disk.
- {% ref "WORK-627" /%}: the `npm pack` → install → load harness.

Notes 3–5 are open: plugin rune directories, project rune directories, and the
`discoverPluginFixtures` caller. In v0.40.0, composed definitions reached the pipeline as
strings. This spec stays `draft`. `plan validate`'s suggestion to advance it is expected
until notes 3–5 have work behind them.

## Implementation notes, deliberately not yet work items

Kept here rather than filed, so the adopting milestone decides its own breakdown.

1. **Fix the packaging prerequisites first** — a `./package.json` export (or no `exports`
   map) and `files` coverage, on every plugin. Everything else in this spec rests on the
   package being readable, and all three failures are invisible in the monorepo, so this
   is the step that must not be assumed.
2. **Build the `npm pack` → install → load harness.** It is the only acceptance gate that
   catches the measured breakages, and the one piece here with no existing equivalent.
3. **Plugin side before project side.** `Plugin.runeDir` + D11's `PluginRune` variant,
   with plan as the consumer, proves the file format from inside the repo where debugging
   is cheap and the fixture corpus already exists.
4. **Project side after.** `runes.dir`, read through `ProjectFiles`, with D8's precedence
   check and D10's watch. The hosted case is the reason this exists, so it is tested
   against `memoryProjectFiles` and not only against disk.
5. **Correct the `discoverPluginFixtures` comment** regardless of whether it ever gains a
   caller — it currently misattributes its own failure mode.

## Non-goals

- Changing what a composed rune's file contains ({% ref "SPEC-145" /%})
- A JS-free plugin or rune pack, per the section above
- Retiring `runes.local` (D7 scopes it instead)
- Relaxing `ProjectFiles`' containment rules, or routing package reads through it (D5)
- Fixing `discoverPluginFixtures`' three breakages as a prerequisite — the comment
  correction is in scope, a caller for it is not
- Reworking `fileRoots`, which this borrows the resolution technique from and otherwise
  leaves alone

## Acceptance Criteria

- [ ] A composed rune file loads identically from a project directory and from a plugin's declared rune directory, asserted by loading the same file both ways and comparing the resulting `Rune`
- [ ] `@refrakt-md/plan` ships at least one composed rune in its published tarball, verified by `npm pack` → install → load in a fixture project, not by a monorepo test
- [ ] A plugin whose declared rune directory is missing from `files`, or whose package is unresolvable, fails `refrakt plugin validate` with the resolved path and the cause (D6)
- [ ] A plugin rune read failure throws rather than yielding an empty set, asserted by a fixture plugin with a blocked `./package.json` export (D3)
- [ ] `discoverPluginFixtures`' comment no longer attributes the failure to workspace links
- [ ] Project runes resolve under `memoryProjectFiles` with no filesystem, and a rune path escaping the project root is refused by the provider rather than by the loader (D5)
- [ ] A project rune taking a core rune's name is rejected at load with both names reported; taking a plugin rune's name requires a `runes.prefer` entry (D8)
- [ ] Editing a file in the project's rune directory in dev invalidates every page using that rune, asserted on a two-page fixture where only one page uses it (D10)
- [ ] A plugin rune entry carrying a template and no `transform` passes `validatePlugin`, and one carrying both is rejected naming the rune (D11)
- [ ] A composed rune is named `<rune>.md`, its name is read from the filename, and a frontmatter key restating it is rejected rather than silently preferred (D9)
- [ ] `create-refrakt` scaffolds the `runes.dir` key, and the authoring guide states the project-versus-package asymmetry with the reason rather than as a convention

## References

- {% ref "SPEC-145" /%} — composed runes; what is being delivered, and D2 / D5 / D12 which this depends on
- {% ref "ADR-037" /%} — users author composed runes only; why the composed loader is the only external path, and what D7 scopes against
- {% ref "SPEC-152" /%} — the plan audit; the first plugin that stays and still wants to ship composed runes
- {% ref "SPEC-113" /%} — `ProjectFiles`; the seam that decides D5
- {% ref "SPEC-063" /%} — file roots and partial resolution; the package-relative resolution technique D2 borrows
- {% ref "SPEC-102" /%} — the standardised fixture format, whose file-discovery half is the mechanism measured here
- {% ref "ADR-035" /%} — the skin format, `rejected`; D9 is where the one-file naming decision lives instead
- {% ref "SPEC-102" /%} — the standardised fixture format D9 separates by directory rather than by suffix
- {% ref "ADR-028" /%} — the portability premise D8 extends from themes to rune names

{% /spec %}
