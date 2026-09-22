{% milestone name="v0.37.0" status="planning" %}

# v0.37.0 — Documentation drift

Documentation makes claims about code. Code changes independently. Nothing in
this repository connects the two, at any of the three points where the
connection can break — and all three have already broken, in the open, in pages
about the very features that would have caught them.

## Why

Three failures, each one level up from the last:

**The wrong region is quoted.** `snippet` and `file-ref` address files by line
range only — a coordinate into a file nobody promised to hold still. 23 of 37
`snippet` invocations in `site/content` are line-addressed, and each has a 100%
silent-wrong exposure to any edit above its range.

{% ref "BUG-020" /%} is the live instance: three pages carry a `file-ref`
labelled `SiteConfig` pointing at `packages/types/src/theme.ts` lines 74–125.
`SiteConfig` is not in that file. `theme.ts` is 104 lines long. A drawer
captioned "SiteConfig" opens onto the back half of `ThemeManifest`, the whole of
`LayoutDefinition` and the start of `ComponentDefinition` — on the documentation
page for the rune whose addressing model is the subject of
{% ref "SPEC-131" /%}.

This is worse than the drift that spec predicted. The prediction was a range
sliding out of alignment with a symbol still in place. What happened was a
**move**, which no line range survives and no care in choosing the original
range would have prevented.

**The region is right and the prose is stale.** {% ref "SPEC-131" /%} itself
states, in the present tense, *"`SiteConfig` occupies lines 74–161 of
`packages/types/src/theme.ts` today"*. The sentence was accurate when written.
The file changed, the prose did not, and nothing connected them. That is the
*ordinary* case — editing a declaration is far more common than renaming one —
and it is the one failure with no detector at all.

**Nobody knows where to look.** 28 of 237 content pages name a file. The other
209 can be entirely about a subsystem without ever mentioning one, so even a
perfect check of quoted regions leaves most of the corpus unmeasured.

## The through-line

v0.34.0's was *"the checks were always written; nothing was listening."*
v0.36.0's was *"the findings exist and nobody can reach them."*

This one is different, and worth stating plainly because it changes what
counts as done: **there is no check here to wire up.** Line ranges cannot be
validated — a wrong slice is real code from the right file, which is why it
renders plausibly and why no amount of care in authoring prevents it. The
instrument has to be built before anything can listen to it.

## What lands

Three specs, in a deliberate ladder — each answers the question the one before
it leaves open.

**{% ref "SPEC-131" /%} — address by name, not by coordinate.** A regex anchor
plus a delimiter-balanced extent, in the reader all three runes already share.
Measured at 95.37% exact spans against the TypeScript compiler over 1,360
symbols, with a **0.07% silent-wrong rate and zero false alarms** — against line
numbers, which are 100% exposed.

- {% ref "WORK-586" /%} — the masker and the language table. The lexical layer,
  split out because D10 makes the table a correctness boundary rather than a
  convenience.
- {% ref "WORK-587" /%} — anchor resolution, the `auto` extent, and the corpus
  test. The three termination rules each cost an iteration of the prototype to
  find and are not re-derivable; the corpus test ships here, not after.
- {% ref "WORK-588" /%} — `dedent`, `section`, `paired`, and the explicit
  terminators. Closes the dead-end risk before anyone depends on the feature.
- {% ref "WORK-589" /%} — `reindent`, `highlight-match`, and the coordinate
  frame. Small, and a prerequisite for two later items rather than a tail.
- {% ref "WORK-590" /%} — the codemod and the migration. Where
  {% ref "BUG-020" /%} is closed.

**{% ref "SPEC-134" /%} — review markers.** An opt-in `reviewed` hash recording
that a human read one version of a resolved slice.

- {% ref "WORK-591" /%} — normalization, both hash levels, and `--check`.
- {% ref "WORK-592" /%} — the review CLI. The phase that decides whether anyone
  uses the feature.
- {% ref "WORK-593" /%} — stamp-on-insert and selective adoption.

**{% ref "SPEC-136" /%} — staleness ranking.** The cheap, wide signal
underneath the precise one. Needs no new syntax, no marker, and no change to a
single existing page.

- {% ref "WORK-594" /%} — the edge index, the git scan, and `refrakt stale`.
- {% ref "WORK-595" /%} — `documents:` and prose extraction, the classes that
  reach the other 209 pages.
- {% ref "WORK-596" /%} — the MCP tool and the `touching` query.

## Two tracks, not one chain

The milestone reads as a ladder and is not sequenced as one.
{% ref "SPEC-136" /%} phase 1 extracts edges from `path=` attributes that exist
today; it needs {% ref "SPEC-131" /%}'s resolver only for `--precise`, which is
out of scope here. So {% ref "WORK-594" /%} starts on day one alongside
{% ref "WORK-586" /%}, and the two tracks meet only at
{% ref "WORK-596" /%}, which reads {% ref "WORK-591" /%}'s marker.

## The payoff is prevention, and it is the last item

Everything here except {% ref "WORK-596" /%} is retrospective — it reports rot
that has already happened, through a command someone must choose to run. That is
{% ref "SPEC-126" /%}'s failure mode, and this milestone would be its fourth
instance.

`touching` is the answer, and it inverts the question: *"I am about to change
this file — what documents it?"*, asked at edit time by whoever or whatever is
making the change, before the divergence exists. It is the query an agent can be
made to ask every time, which a human reliably will not.

Do not let it slip. It is placed last because an impact lookup that knows about
`snippet` invocations but not about the guides misses the pages most worth
updating — not because it is a tail.

Its only hard dependency is {% ref "WORK-595" /%}, deliberately.
{% ref "WORK-591" /%}'s marker is a *soft* one: hard-blocking on it would put
the payoff behind the entire {% ref "SPEC-131" /%} chain, which is the longest
path here. Marker awareness lands behind a capability check whenever
{% ref "WORK-591" /%} does, and {% ref "WORK-596" /%} ships without it if
{% ref "SPEC-134" /%} slips.

## A stale prerequisite, now cleared

{% ref "SPEC-134" /%}'s Approach says the feature would "ship as a no-op with a
CLI attached" until {% ref "WORK-573" /%} makes the diagnostic channel
load-bearing, on the strength of {% ref "WORK-554" /%}'s finding that the
adapter dev server prints no diagnostics at all.

{% ref "WORK-575" /%} shipped in v0.36.0 and fixed exactly that — one reporter
at `loadContent`, printing in dev. A review-marker diagnostic now reaches
someone editing documentation, which was the disqualifying row.

What {% ref "WORK-573" /%} still owns is whether an error-severity diagnostic
*fails a build* — and {% ref "SPEC-134" /%} D7 says a fired marker is a review
prompt, not a failure, so this milestone actively does not want it. **No
dependency in either direction.** The spec text should be corrected when
{% ref "WORK-591" /%} lands.

## Deliberately not here

- **{% ref "SPEC-131" /%} phase 4 — adoption.** Pointing the reference pages at
  declarations, and {% ref "SPEC-126" /%}'s deferred `file-ref preview="drawer"`
  provenance idea. Valuable, and it wants the migration's findings first.
- **{% ref "SPEC-136" /%} phase 4 — `--precise`.** Region scoping via `git log
  -L`. It sharpens a signal the earlier phases have to prove is worth
  sharpening, and its cost needs measuring before it could ever be a default.
- **A config surface for the language table.** {% ref "SPEC-131" /%} D15 builds
  the table as data behind a merge seam and commits to no `languages` or
  `anchors` key. {% ref "WORK-590" /%} is the input that decides the shape, and
  the named-anchor half is the one to build first when it ships.
- **Regex-literal lexing.** D8's ~15 lines, the cause of the single silent-wrong
  case. {% ref "WORK-590" /%} picks it up only if the migration surfaces
  refusals that need it.
- **The editor validation rail.** {% ref "WORK-395" /%}'s, unmilestoned.
  {% ref "WORK-593" /%} ships stamp-on-insert without it.
- **Making a build fail.** {% ref "WORK-573" /%}, per above.
- **Partial or field-level review markers.** `review-match=` hashing only
  signature lines. Deferred until an author hits the need.

## Minor, and additive — but a large surface

Following v0.36.0's habit of saying this plainly in the milestone rather than
discovering it at release time. Nothing here is breaking, but the public
surface this adds is the widest of any recent milestone:

| Surface | Added |
|---|---|
| `snippet` / `file-ref` attributes | `symbol`, `match`, `occurrence`, `extent`, `until`, `through`, `doc`, `reindent`, `highlight-match`, `reviewed` |
| CLI | `refrakt snippet review` (+ `--check`, `--update`, `--interactive`), `refrakt stale` |
| MCP | `refrakt_stale` |
| Frontmatter | `documents` |

Two defaults are worth naming in the changeset because they are the only places
existing content could notice anything:

- **`reindent` defaults on for anchors and off for `lines=`** ({% ref "SPEC-131" /%}
  D16), specifically so none of the 23 existing invocations change how they
  render. If that default is ever made uniform, it is a visual change to every
  one of them.
- **`doc` defaults on for `symbol` and off for `match`** (D9). Only reachable
  through new attributes, so nothing existing moves.

{% ref "WORK-590" /%} rewrites 23 invocations in our own `site/content`. That is
our content, not a consumer migration — no upgrade note is owed.

## Two things that must not be traded away

**The self-check is load-bearing, not a nicety.** {% ref "SPEC-131" /%} D2: zero
false alarms is a structural property, because the same lexer defect produces
both the wrong extent *and* the imbalance. That argument holds only for extents
derived from delimiter counting — so the check is required for `auto` and must
stay inert everywhere else. Applying it globally would turn D4's escape hatch
into a false-alarm generator and get the guard disabled for the case that needs
it.

**Nothing here may become a gate that green-ness satisfies.**
{% ref "SPEC-136" /%} D1 is the sharp case: the cheapest way to turn a staleness
edge green is to edit the referring page, so a required check would train people
to make trivial documentation edits to clear it — destroying the signal it
measures. `refrakt stale` exits zero whatever it finds. `snippet review
--check` has an exit code because a marker is a *fact* rather than a
correlation, and even it is a review prompt rather than a failure.

{% /milestone %}
