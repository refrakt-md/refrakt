{% spec id="SPEC-189" status="draft" tags="migrations, codemods, deprecation, composition, simplification, cli" %}

# A migration is a composition: the old form in frontmatter, the new form as its template

A breaking change to a rune is described by a migration file. Its frontmatter is written like a
composed rune's ({% ref "SPEC-145" /%}), but describes the *old* authoring form: the attributes,
values and content model the rune used to accept. Its body is a template in the *new* form,
filled through `$attrs` and `{% slot %}` exactly as a composition's is. Expanding a migration
gives the new form as a Markdoc AST, and one expansion serves four uses:

1. **Runtime acceptance:** the expansion is rendered, so old content keeps building.
2. **Codemod:** the expansion is written back to source (`refrakt migrate <id>`).
3. **Warning:** `refrakt validate` reports each instance that needed a migration.
4. **Expiry:** a test fails once a migration has outlived its `removeAfter` release.

A migration with no body keeps the tag and its content and only rewrites attributes: an
attribute rename or a value map is a few lines of frontmatter. Text inside a paragraph or
heading is rewritten the way compositions already read it, with field patterns and inline node
matchers. Hand-written codemods remain only for changes that need information from outside the
content.

## Why

**Every codemod so far was hand-written, and they are all the same shape.** `refrakt migrate`
(`packages/cli/src/commands/migrate.ts`) carries three:

| Codemod | Rewrite | Since |
|---|---|---|
| `elevation` | `none/sm/md/lg` → the ladder, on any tag | v0.23 ({% ref "SPEC-107" /%}) |
| `hero` | `align="left/right"` → `start/end`, `justify` → `align` | v0.48 (WORK-702) |
| `cta` | `call-to-action` → `cta` | v0.48 (WORK-703) |

Each is a regex function, a registry entry, help text and a test file. The `hero` and `cta`
regexes also rewrite examples inside fenced code, and `elevation`'s isn't limited to tags.
Testimonial's byline codemod (169 lines) was written and then deleted when the design changed.

**The runtime side is a second copy of the same facts.** `DeprecationRule { newName, transform }`
(`packages/runes/src/lib/index.ts:245`) is applied by three duplicated loops in that file. Grid
`layout`, pullquote `variant` and marketing feature `justify` use it, and none of them warns.
Showcase has its own warning function and ~70 lines of alias handling (`tags/showcase.ts`), and
elevation has its own alias in the facet (`transform/src/facets/elevation.ts:19`). A rename is
written once as a codemod, again as a runtime alias, and a third time (or never) as a warning.

**"Removed in a future minor" doesn't happen.** The showcase aliases date from v0.20
({% ref "SPEC-086" /%}) and the elevation aliases from v0.23; the packages are at v0.48.
Nothing fails when a deprecation outlives its welcome, so nothing removes it.

**Every conversion to a composition pays for this by hand.** A composition's frontmatter has
`aliases` but no way to accept an old form. So {% ref "SPEC-181" /%} has each conversion first
teach the *native TS rune* the new form additively, write a bespoke codemod, assert both forms in
`staging-site.test.ts`, and wait a release (rollout gate 3). Hero, cta and testimonial each spent
roughly 60–170 lines on migration-only code and tests. Feature (`justify` → `align`), bento
(`bento-cell` → `card span=`, `gap` lengths → tokens), steps, pricing and cast are queued behind
the same process, and budget's tilde estimate markers ({% ref "SPEC-162" /%} D5) are a text
rewrite that the attribute-shaped codemods can't express.

**The machinery to read an old form and write a new one already exists.** A composition parses
its input with a content model (sequence, delimited, `itemModel` inside a paragraph, text
`pattern`s with a capture group, `headingExtract`), reports what it couldn't place
(`content-unmatched`), and expands a template through `$attrs` and slots on the Markdoc AST
(`substituteNode` in `packages/runes/src/lib/composition.ts`). A migration reuses all of it. What
is new is the rule for when a migration applies, and writing an expansion back to source.

## Decisions

### D1 — a migration is a file beside the runes it changes

Migrations live in a `migrations/` folder inside the rune directory that owns the rune:
`plugins/<plugin>/runes/migrations/` for a plugin's composed runes, the project's
`runes.dir/migrations/` for a site's own, and a `migrations/` folder in `@refrakt-md/runes` and
in each plugin package for TS runes. The definition loader reads only top-level `.md` files
(`rune-dir.ts:75`), so a migration is never mistaken for a rune.

The filename is the migration's id, which is what `refrakt migrate <id>` takes:
`hero-align.md`, `bento-cell.md`. Its frontmatter:

```yaml
---
migrates: hero          # the tag in the old form; '*' for a universal attribute
since: 0.48.0           # the release that deprecated the old form
removeAfter: 0.50.0     # the last release that accepts it (D6)
spec: WORK-702          # what made the change
attributes: …           # the old form's attributes (D2)
content: …              # the old form's content model, when the body changes (D3)
---
```

Everything else a composition's frontmatter takes (`schema`, `defaults`, `blocks`, `metaFields`,
`registers`) is refused: a migration writes Markdoc, it doesn't publish anything.

### D2 — attribute changes are frontmatter, and a migration may have no body

An attribute is declared as in a composition, plus two keys:

- `to`: the new name (`justify` → `align`, showcase `shadow` → `frame-shadow`);
- `values`: a map from old value to new value. A value maps to a string, to a patch of several
  attributes (pullquote `variant: accent` → `{ prominence: prominent, tint: subtle }`), or to
  `null` to drop the attribute.

With no body, the migration keeps the tag, its other attributes and its content, and applies
only these rewrites. That covers every attribute deprecation in the codebase today:

```yaml
# hero-align.md
migrates: hero
attributes:
  align:   { matches: [left, right], values: { left: start, right: end } }
  justify: { to: align, values: { left: start, right: end } }
```

```yaml
# call-to-action.md: a tag rename is a body-less migration with `to` at the top
migrates: call-to-action
to: cta
```

```yaml
# elevation.md
migrates: '*'
attributes:
  elevation: { matches: [none, sm, md, lg], values: { none: flat, sm: raised, md: raised, lg: floating } }
```

### D3 — structural changes are a template

A migration with a body reads the old form with its content model and writes the new form with
the template. The rules are a composition's: `$attrs.<name>` places an attribute, `{% slot %}`
places a field, and every field must be placed (D11 of {% ref "SPEC-145" /%} already refuses a
definition that would drop content).

```markdoc
---
migrates: bento-cell
since: 0.49.0
removeAfter: 0.51.0
attributes:
  span: { type: string }
content:
  type: sequence
  fields:
    body: { match: any, greedy: true }
---

{% card span=$attrs.span %}
	{% slot name="body" /%}
{% /card %}
```

(The bento example is illustrative; {% ref "SPEC-171" /%} owns the real mapping.)

### D4 — text and inline markup are read the way compositions read them

A rewrite inside a paragraph or heading needs no new regex mechanism. It is read with the
patterns and inline matchers content models already have, and written back with the template:

- **Text** is read with a field `pattern` and its capture group, as testimonial reads its
  attribution (`match: text, pattern: '^\s*[-–—,]\s*(.+)$'`) and as `headingExtract` reads a
  heading. Budget's `~Label~` is a heading field `{ name: label, match: text, pattern: '^~(.+)~$' }`,
  written as `{% $each.label %} (estimate)`.
- **Markup** is read as a node, not as text. `~~Label~~` is a strikethrough node by the time
  the content model sees it, so no text pattern can find its tildes ({% ref "SPEC-162" /%} D5
  says as much). An inline field matches the node (`match: s`) as testimonial's matches
  `strong`, and its text is what the template places.

A template may place a captured field in a heading or paragraph, between literal text. If the
expansion doesn't already support this in content position, that is the one extension D4 needs.

### D5 — a pure `replace()` function for attribute values

Attribute values are strings, so a regex function fits them:

```markdoc
{% card span=replace($attrs.span, "^(\d+)$", "$1/1") %}
```

`replace(value, pattern, replacement)` joins the shared function set (`functions.ts`). Functions
used in a migration must be **pure**: they are evaluated during expansion, not left to the
transform as `substitute()` does today, because the codemod has to write the resulting value
into source. A migration that uses an impure function is refused when it loads.

`replace()` is not for slot content. A slot holds an AST with links, emphasis and refs;
flattening it to a string loses that markup, and a function returns a value, not nodes. Text
rewrites go through D4.

### D6 — when a migration applies, and what it must produce

- **Applies:** to an instance the current definition rejects and the migration accepts. Nothing
  else decides it, so there's no hand-written predicate, and the new form of a rune with the same
  name (new-form `hero`) is never migrated again.
- **Chains:** migrations apply repeatedly until none applies, so v1 → v2 → v3 is two files.
  A cycle is refused when the migrations load.
- **Produces a valid instance:** the expansion must validate against the current definition.
  A migration's own fixtures are checked when the package's tests run, and the codemod checks
  every instance it rewrites.
- **Drops nothing:** every node of the old instance lands in exactly one slot, and attributes the
  migration doesn't name (`id`, `tint`, `width` and the other universal attributes) carry over
  unchanged. A partial match, where the content model leaves a node unplaced, is refused and
  reported as `content-unmatched`. It is never guessed.

### D7 — the codemod writes only what changed

`refrakt migrate <id> [paths]` previews by default and writes with `--apply`. It follows the rule
`refrakt format` already follows (`format-indent.ts:10`): the source is never reprinted from the
AST, because `Markdoc.format` normalises list markers, emphasis and tag openings.

- The tag lines are regenerated from the expansion.
- Slot content is spliced in verbatim from the original source's line ranges.
- Text rewrites from D4 replace only the captured span.
- Fenced and inline code is never touched, since only parsed tags are rewritten.
- The rewritten file is parsed again, and must give the same AST as the expansion. If it doesn't,
  the file is left as it was and the instance is reported.

The generic runner, directory walk and diff output in `migrate.ts` stay; the three hand-written
codemod functions go.

### D8 — the runtime, the warning and the expiry come from the same files

- **Runtime:** before a rune's schema sees an instance, the instance is expanded through any
  migration that applies (D6). This replaces `DeprecationRule`, its three loops,
  `warnShowcaseDeprecated` and the elevation facet alias.
- **Warning:** `refrakt validate` reports each instance a migration applied to, naming the
  migration and the command that fixes it. Grid, pullquote and feature gain the warning they
  lack today.
- **Expiry:** a test fails when a migration's `removeAfter` is older than the package version.
  Deleting the file removes the runtime acceptance, the codemod and the warning together.

### D9 — a composition goes live with its migrations, and SPEC-181's gate 3 changes

A rune converted to a composition goes live together with migrations for every authored form
it no longer accepts. The native TS rune no longer has to learn the new form additively, and
`staging-site.test.ts` no longer asserts both forms.

{% ref "SPEC-181" /%}'s third rollout gate becomes: *any authored content whose meaning changes
has a migration, run over this repository's content, and the migration accepts the old form for
at least one release after go-live.* Its intent is unchanged: an author is never broken without a
warning and a codemod. The migration window moves from before go-live to after it.

### D10 — the existing deprecations become migrations, each with a `removeAfter`

| Deprecation | Migration | `removeAfter` |
|---|---|---|
| `elevation` none/sm/md/lg | `elevation.md` (D2) | the next release: already overdue |
| showcase `shadow`/`bleed`/`offset`/`aspect`/`place` | `showcase-frame.md`, one attribute each with `to` | the next release: overdue. Fix `packages/runes/fixtures/showcase.md:5` first |
| hero `align` left/right, `justify` | `hero-align.md` | one release after v0.48 |
| `call-to-action` | `call-to-action.md` | one release after v0.48 |
| grid `layout` | `grid-layout.md`, values to `{ spans }` or `{ mode }` patches | two releases after its warning first ships |
| pullquote `variant` | `pullquote-variant.md`, values to `{ prominence, tint }` patches | two releases after its warning first ships |
| feature `justify` | `feature-justify.md` | goes with feature's conversion |

Config-shape deprecations (the flat config, `packages`, `sandbox.examplesDir`) are config, not
content, and keep their documented v1.0 removal in `config-normalize.ts`.

## What stays hand-written

Some changes need information the content doesn't hold. These remain code, registered beside the
migrations so `refrakt migrate` lists them together:

- **Lookups:** bento's `gap="12px"` → the nearest spacing token is a computation, not a value
  map or a regex.
- **Outside information:** `migrate snippets` ({% ref "SPEC-131" /%} D7) reads the source files
  a snippet points at to infer anchors.

## Not in scope

- **Plan's own migrations.** `plan migrate filenames` and `plan migrate ids` are repair tools,
  not deprecations. `pr-attrs` and `dependencies` are handled in {% ref "SPEC-192" /%}.
- **`refrakt config migrate`.** It retires at v1.0 with the shapes it migrates.

## Open questions

- Should `refrakt migrate` with no id apply every migration that matches? It's convenient after
  an upgrade, but it hides which change did what. Possibly `--all` as an explicit flag.
- Should `refrakt format` apply migrations itself? It already rewrites Markdoc source, and a
  migration's output is checked to be equivalent to what the runtime renders.
- Do TS runes' migrations live in a `migrations/` folder in the package, or beside the tag file
  (`tags/hero.migrations/`)? A folder per package is simpler to find and to list.

## Acceptance Criteria

- [ ] Migration files load from `migrations/` folders in core, plugin and project rune directories, and their filename is their id
- [ ] A body-less migration rewrites attribute names and values (`to`, `values`, attribute patches, `null`) and can rename a tag
- [ ] A migration with a body reads the old form with a content model and writes the new form through `$attrs` and slots
- [ ] A migration can rewrite text captured by a field `pattern` and inline markup matched as a node
- [ ] `replace()` exists as a pure function, pure functions are evaluated during a migration's expansion, and a migration using an impure function is refused
- [ ] A migration applies only to instances the current definition rejects, chains until none applies, and refuses a cycle
- [ ] An expansion that fails the current definition, leaves a node unplaced or would drop an attribute is refused and reported
- [ ] `refrakt migrate <id>` regenerates only tag lines and captured spans, splices slot content verbatim, leaves code untouched, and re-parses to check the result
- [ ] The runtime applies migrations before the schema, and `DeprecationRule`, its three loops, `warnShowcaseDeprecated` and the elevation facet alias are deleted
- [ ] `refrakt validate` warns on every instance a migration applied to, naming the migration
- [ ] A test fails when a migration's `removeAfter` is older than the package version
- [ ] The `elevation`, `hero` and `cta` codemods are migration files, and their hand-written functions are deleted
- [ ] The deprecations in D10 are migration files with a `removeAfter`, and their bespoke alias code is deleted
- [ ] {% ref "SPEC-181" /%}'s rollout gate 3 is amended as D9 states

## References

- {% ref "SPEC-145" /%}: composed runes, whose frontmatter, content model and template a migration reuses.
- {% ref "SPEC-181" /%}: the staged-rune rollout whose gate 3 D9 amends.
- {% ref "SPEC-162" /%}: budget's estimate markers, the text and markup rewrite D4 covers.
- {% ref "SPEC-171" /%}: bento's conversion, the structural rewrite D3 sketches.
- {% ref "SPEC-107" /%}, {% ref "SPEC-086" /%}, {% ref "SPEC-185" /%}: the elevation, showcase and pullquote deprecations.
- {% ref "SPEC-131" /%}: the snippet anchors behind `migrate snippets`, which stays hand-written.
- {% ref "SPEC-192" /%}: the plan migrations that are deleted rather than converted.

{% /spec %}
