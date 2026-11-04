{% spec id="SPEC-189" status="draft" tags="migrations, codemods, deprecation, composition, simplification, cli" %}

# Breaking changes are a table: one migration row drives the codemod, the runtime alias, the warning and the expiry

An attribute-level breaking change (a renamed tag, a renamed attribute, a remapped value) is
declared once, as a row in a migration table. That row drives four things that are hand-written
separately today: the `refrakt migrate` codemod, runtime acceptance of the old form, a `validate`
warning, and a test that fails once the row's removal release has passed. A composition can
declare the same rows in its frontmatter, so a composed rune goes live still accepting the form it
replaced.

## Why

**Every codemod so far has the same shape, and each was hand-written.** `refrakt migrate`
(`packages/cli/src/commands/migrate.ts`) carries three:

| Codemod | Rewrite | Since |
|---|---|---|
| `elevation` | `none/sm/md/lg` → the ladder, on any tag | v0.23 ({% ref "SPEC-107" /%}) |
| `hero` | `align="left/right"` → `start/end`, `justify` → `align` | unreleased (WORK-702) |
| `cta` | `call-to-action` → `cta` | unreleased (WORK-703) |

Each is a regex function, a registry entry, help text and a test file. The `hero` and `cta`
regexes also rewrite examples inside fenced code blocks, and `elevation`'s isn't limited to tags.

**The runtime side is a second, separate copy of the same facts.** A `DeprecationRule
{ newName, transform }` table already exists (`packages/runes/src/lib/index.ts:245`), applied by
three duplicated loops in that file. Grid `layout`, pullquote `variant` and marketing feature
`justify` use it, and none of them warns. Showcase has its own warning function and ~70 lines of
alias handling (`tags/showcase.ts`); elevation has its own alias in the facet
(`transform/src/facets/elevation.ts:19`). So the codemod, the runtime alias and the warning are
three implementations of one rename.

**"Removed in a future minor" doesn't happen.** The showcase aliases date from v0.20
({% ref "SPEC-086" /%}) and the elevation aliases from v0.23; the packages are at v0.47. Nothing
fails when a deprecation outlives its welcome, so nothing removes it.

**Every conversion to a composition pays for this by hand.** A composition's frontmatter accepts
`aliases`, but has no way to accept an old attribute form. So {% ref "SPEC-181" /%} makes each
conversion first teach the *native TS rune* the new form additively, write a bespoke codemod,
assert both forms in `staging-site.test.ts`, and wait a release. Hero, cta and testimonial each
cost roughly 60–170 lines of migration-only code and tests, and testimonial's 169-line codemod was
written and then deleted. Feature (`justify` → `align`), bento (`gap` lengths → tokens,
`bento-cell` → `card span=`), steps, pricing and cast are queued behind the same process.

## Decisions

### D1 — a migration is a row

```ts
interface Migration {
  id: string;                 // the codemod name: `refrakt migrate <id>`
  spec: string;               // the spec or work item that made the change
  since: string;              // the release that deprecated the old form
  removeAfter?: string;       // the last release that accepts it
  tags: string[] | '*';       // '*' = a universal attribute
  renameTag?: string;         // call-to-action → cta
  attrs?: Record<string, {
    to?: string;              // justify → align, shadow → frame-shadow
    values?: Record<string, string | Record<string, string> | null>;
    // a new value; or an attribute patch (pullquote accent →
    // { prominence: 'prominent', tint: 'subtle' }); or null = drop
  }>;
}
```

The rows for today's changes:

```ts
{ id: 'elevation', tags: '*',
  attrs: { elevation: { values: { none: 'flat', sm: 'raised', md: 'raised', lg: 'floating' } } } }
{ id: 'hero', tags: ['hero'],
  attrs: { align:   { values: { left: 'start', right: 'end' } },
           justify: { to: 'align', values: { left: 'start', right: 'end' } } } }
{ id: 'cta', tags: ['call-to-action'], renameTag: 'cta' }
```

Showcase's five `frame-*` renames, grid `layout`, pullquote `variant` and feature `justify` are
rows too. Rows live with the package that owns the rune: core rows in `@refrakt-md/runes`, a
plugin's rows on its `Plugin` export.

### D2 — one engine reads the rows in four places

1. **Codemod.** `refrakt migrate <id> [paths]` applies the row to source text, using Markdoc node
   positions so fenced code and inline code are left alone. `--apply` writes; the default
   previews. The generic runner, directory walk and diff output already exist and stay.
2. **Runtime.** Before the schema sees the attributes, the old form is rewritten to the new one.
   This replaces `DeprecationRule`, its three loops, `warnShowcaseDeprecated` and the elevation
   facet alias.
3. **Warning.** `refrakt validate` reports each use of an old form, with the codemod that fixes
   it. Grid, pullquote and feature gain the warning they lack today.
4. **Expiry.** A test fails when a row's `removeAfter` is earlier than the package version.
   Removing the row removes the runtime acceptance and the codemod at once.

Content rewrites that are not attribute-shaped (testimonial's byline, budget's `~` →
`(estimate)` in {% ref "SPEC-162" /%}, `migrate snippets`' anchor inference) stay hand-written
codemods registered beside the table. The table covers the common case; it doesn't pretend to
cover all of them.

### D3 — a composition declares `migrations:`

```yaml
---
tag: hero
migrations:
  - since: 0.48.0
    removeAfter: 0.50.0
    attrs:
      align: { values: { left: start, right: end } }
      justify: { to: align, values: { left: start, right: end } }
---
```

`DEFINITION_KEYS` accepts `migrations`; the rows join the table under the composition's name. A
composed rune therefore accepts the old form with a warning from the release it goes live.

This replaces {% ref "SPEC-181" /%}'s third rollout gate ("a codemod run and the new form accepted
by the plugin for a release") for attribute-shaped changes: the native rune no longer has to
learn the new form, and `staging-site.test.ts` no longer asserts both forms. The gate's intent
stays: authors are never broken without a warning and a codemod.

### D4 — every deprecation gets a `removeAfter`, and the overdue ones go

On adoption, every row is given a `removeAfter`:

- `elevation` aliases and showcase aliases: already overdue, so their rows ship with the next
  release as `removeAfter`. Fix `packages/runes/fixtures/showcase.md:5` first.
- `hero` and `cta`: one release after the release they shipped in.
- grid `layout`, pullquote `variant`: two releases after the warning first ships, since they
  have never warned.
- Config-shape deprecations (flat config, `packages`, `sandbox.examplesDir`) keep their documented
  v1.0 removal. They are config, not content, and stay in `config-normalize.ts`.

## Not in scope

- **Body-content rewrites.** Hand-written, as D2 says.
- **Plan's own migrations.** `plan migrate filenames` and `plan migrate ids` are repair tools, not
  deprecations. `pr-attrs` and `dependencies` are handled in {% ref "SPEC-192" /%}.
- **`refrakt config migrate`.** Retires at v1.0 with the shapes it migrates.

## Open questions

- Should `refrakt migrate` with no id apply every row whose old form is present? It's convenient
  after an upgrade, but it hides which change did what. Possibly `--all` as an explicit flag.
- Should `refrakt format` apply runtime-safe rows itself? It already rewrites Markdoc source.

## Acceptance Criteria

- [ ] A `Migration` row type exists, and core and plugin packages can contribute rows
- [ ] `refrakt migrate <id>` applies a row, leaving fenced and inline code untouched
- [ ] The runtime applies rows before the schema, and `DeprecationRule` and its three loops are deleted
- [ ] The `elevation`, `hero` and `cta` codemods are rows, and their hand-written functions are deleted
- [ ] Showcase, grid `layout`, pullquote `variant` and feature `justify` are rows, and their bespoke alias code is deleted
- [ ] `refrakt validate` warns on every old form a row describes, naming the codemod
- [ ] A test fails when a row's `removeAfter` is older than the package version
- [ ] A composition can declare `migrations:` in its frontmatter
- [ ] {% ref "SPEC-181" /%}'s rollout gate 3 is amended to accept a composition `migrations:` row in place of additive acceptance by the native rune

## References

- {% ref "SPEC-181" /%}: the staged-rune rollout whose gate 3 D3 amends.
- {% ref "SPEC-107" /%}, {% ref "SPEC-086" /%}: the elevation and showcase deprecations.
- {% ref "SPEC-185" /%}: the pullquote `variant` deprecation.
- {% ref "SPEC-162" /%}: budget's content rewrite, an example of what stays hand-written.
- {% ref "SPEC-192" /%}: deletion of the plan migrations that are no longer needed.

{% /spec %}
