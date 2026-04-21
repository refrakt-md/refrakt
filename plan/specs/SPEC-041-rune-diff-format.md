{% spec id="SPEC-041" status="draft" version="0.1" tags="runes, diff, history, content" %}

# Rune Diff Format

A semantic diff format for rune-bearing pages: compare two revisions of the same page on the rune output AST rather than line-by-line source, producing human-readable change narratives like "ingredient added to recipe".

-----

## Problem

Runes turn Markdown into structured content. A `{% recipe %}` declares ingredients and steps; a `{% nav %}` declares groups and links; a `{% character %}` declares relationships and traits. When authors edit these pages over time, what actually changed is a structural change to that content — but git's line-based diff doesn't see it that way.

A reviewer comparing two versions of a recipe page sees:

```diff
- - 200g flour
+ - 200g all-purpose flour
+ - 1 tsp salt
- 3. Bake for 30 minutes
+ 3. Bake for 25 minutes
```

What they should be seeing is:

```
recipe: weeknight-bread
  ingredient #1 modified  (200g flour → 200g all-purpose flour)
  ingredient added         (1 tsp salt)
  step #3 modified         (bake duration: 30 min → 25 min)
```

The line-based view obscures the structure the runes already make explicit. A whitespace change to an unrelated paragraph reads the same as a meaningful content change. Reordered ingredients show as a delete + add. Authors and reviewers have to mentally re-derive the rune structure from the diff to understand what actually changed.

The data is already there. The transform pipeline produces a structured tree of typed runes with named children. A diff operating on that tree can produce narratives that match how authors and readers think about the content.

This spec is related to [SPEC-038](git-native-history.md), which derives history events from plan-entity files specifically. This spec generalises the concept to all runes, on any page, while constraining itself to pairwise revision diffs (not git timeline extraction). The two specs share concepts (typed change events, identity matching across revisions) but operate at different layers.

-----

## Design Principles

**The transform tree is the diff target.** Diffs operate on the post-schema-transform Tag tree (stage 3 of the pipeline — see CLAUDE.md "Transformation Pipeline"). That tree is semantic but pre-BEM: a `recipe` is still a `recipe`, ingredients are still children with their natural attributes intact. Diffing later (post-identity-transform) muddies the output with structural elements; diffing earlier (raw AST) loses rune semantics.

**Diffs are for humans.** The primary consumer is a person reviewing a change — in a PR, in a CMS revision history, in an editor's "what changed" panel. Output prioritises legibility over machine round-tripping. A diff that's slightly fuzzy but always understandable beats one that's exact but unreadable. (A separate machine-readable JSON form is provided for tooling, but the format is designed around the human-facing narrative first.)

**Identity is configured, not inferred.** Each rune declares how its instances are identified across revisions. There is no global heuristic, no fuzzy text matching, no learned similarity. If a rune's identity rule produces a match, that's a modification. If it doesn't, that's a delete + add. Predictability matters more than cleverness — a reviewer should be able to predict from the rune's config what a given edit will read as.

**Replacement is the default.** When in doubt, the diff says "removed X, added Y" rather than "renamed X to Y" or "modified X heavily". This keeps the output honest: significant changes look significant. Renames and refactors are surfaced through the commit message, not synthesised by the diff engine.

-----

## Identity Resolution

To diff two trees, the engine must decide which node in tree A corresponds to which node in tree B. Each rune type has its own identity rule, applied in a fixed cascade.

### Cascade

For a given rune instance, identity is resolved by the first rule that produces a match:

1. **Explicit `id` attribute** — Markdoc supports `{% recipe id="weeknight-bread" %}` natively. If present, the id alone determines identity. Two recipes with `id="weeknight-bread"` in different revisions are the same recipe; if one is removed and another added with a different id, that's a delete + add even if all other content is identical.

2. **Natural key** — Each rune config may declare one attribute as its natural key (e.g., `name` for ingredients, `title` for sections, `slug` for nav links). When the explicit id is absent, the natural key value identifies the rune. Two ingredients both named "flour" are the same ingredient; if "flour" becomes "all-purpose flour", that's a delete + add (per the replacement-by-default principle).

3. **Positional fallback** — When neither id nor natural key applies (rune has no natural key, or natural keys are absent), instances are matched by position within their parent, scoped to their rune type. The 3rd `step` child of a recipe in revision A pairs with the 3rd `step` child in revision B. Insertions and deletions shift positions; the engine surfaces these as added/removed events rather than cascading "modified" reports through every subsequent sibling (see Decisions §4).

### Configuration

Add a `naturalKey` field to `RuneConfig` (`packages/transform/src/types.ts`):

```typescript
interface RuneConfig {
  // ... existing fields ...

  /**
   * Attribute name used to identify instances of this rune across revisions
   * when no explicit `id` is set. Used by the rune-diff engine.
   * Falls back to positional matching when neither id nor naturalKey resolves.
   */
  naturalKey?: string;
}
```

Examples for existing runes (illustrative, not exhaustive):

| Rune | naturalKey |
|------|-----------|
| `ingredient` | `name` |
| `step` | (none — positional) |
| `nav-link` | `href` |
| `character` | `name` |
| `tab` | `label` |
| `feature` | `title` |
| `api` | `path` |
| `swatch` | `name` |

Runes without a meaningful identity attribute (`step`, `paragraph`, generic body content) fall straight through to positional matching — which is appropriate, since reordering a step is a meaningful change worth surfacing.

### Identity scope

Identity matching is **scoped to (parent, rune-type)**, not global. Two different recipes can both have an ingredient named "flour" without conflict — the match is "the ingredient in *this recipe* named flour" vs "the ingredient in *that recipe* named flour".

When an explicit `id` is used, it's globally unique within the page (Markdoc's `id` attribute behaves this way). A `{% recipe id="bread" %}` moved from one section to another is still the same recipe — the parent change becomes a `moved` event.

-----

## Diff Op Schema

The diff engine emits a flat list of typed change events. Each event has a path identifying where in the tree the change occurred and a kind describing what happened.

```typescript
interface RuneDiff {
  pageUrl: string;
  fromRevision: string;          // commit hash, label, or arbitrary identifier
  toRevision: string;
  events: RuneDiffEvent[];
}

type RuneDiffEvent =
  | { kind: 'added'; path: RunePath; rune: string; snapshot: RuneSnapshot }
  | { kind: 'removed'; path: RunePath; rune: string; snapshot: RuneSnapshot }
  | { kind: 'modified'; path: RunePath; rune: string; changes: AttributeChange[] }
  | { kind: 'moved'; path: RunePath; rune: string; from: RunePath; to: RunePath }
  | { kind: 'reordered'; path: RunePath; rune: string; order: ReorderChange };

interface RunePath {
  segments: RunePathSegment[];   // [{ rune: 'recipe', key: 'weeknight-bread' }, { rune: 'ingredient', key: 'flour' }]
}

interface RunePathSegment {
  rune: string;                  // rune type
  key: string | number;          // id, natural key, or position index
  keyKind: 'id' | 'natural' | 'position';
}

interface AttributeChange {
  attribute: string;
  from: unknown;
  to: unknown;
}

interface RuneSnapshot {
  attributes: Record<string, unknown>;
  childCount: number;            // shallow summary; full tree available via path lookup
}
```

### Event kinds

- **`added`** — A rune instance present in `to` has no match in `from`. Carries a snapshot of the new instance for display.
- **`removed`** — A rune instance present in `from` has no match in `to`. Carries a snapshot of the old instance.
- **`modified`** — A matched pair has the same identity but different attributes. Body content changes are reported as nested events, not flattened into this one.
- **`moved`** — An instance with a stable id appears under a different parent in `to`. Only emitted when explicit `id` matching applies (positional and natural-key matches don't survive parent changes).
- **`reordered`** — Sibling order within a parent changed without any add/remove. Emitted as a single parent-level event rather than N modified events on the children.

### Body content

For runes whose children include freeform Markdown (a `paragraph` body inside a `feature`, etc.), the diff falls back to a textual summary at that node — "body modified (3 lines added, 1 removed)" — rather than recursing into prose-level diffing. Prose diffing is line-based and well-served by existing tools; the rune diff format's value is at the structural level.

-----

## Output Formats

### Human (CLI)

```
docs/recipes/weeknight-bread.md
  @@ recipe (id: weeknight-bread)
       attribute changed: servings  4 → 6
     + ingredient: 1 tsp salt
     ~ ingredient: flour              (200g → 250g)
     - ingredient: olive oil
     ~ step #3                        (bake 30min → 25min)
       reordered: steps [1, 2, 3, 4] → [1, 3, 2, 4]
```

Path segments are shown as breadcrumbs at the start of each grouped block; events within a block are bullet-style with leading sigils (`+`, `-`, `~`, etc.). The format mirrors `git diff` conventions where reasonable so reviewers familiar with code review tools find it legible.

### Human (rune)

A `{% rune-diff from="abc123" to="def456" /%}` rune (or similar) renders the same information as a vertical timeline-style block, reusing the diff colour conventions from the existing `diff` rune (per [SPEC-038](git-native-history.md) §Rendering — "Diff colouring"). Out of scope for this spec's first iteration; sketched here for forward compatibility.

### Machine (JSON)

The `RuneDiff` interface above, serialised directly. Used by editor integrations, CI checks, and any tool that needs to reason about the changes programmatically.

-----

## Pipeline Integration

The diff engine lives in a new package (proposed: `packages/diff/`) depending on `types` and `transform`. It exposes:

```typescript
function diffRuneTrees(
  from: Renderable,             // serialized tag tree from stage 3
  to: Renderable,
  config: DiffConfig,           // includes RuneConfig map for naturalKey lookup
): RuneDiff;
```

Inputs are the serialised plain-object tag trees (output of stage 3 — the `serialize()` step that converts Markdoc Tag instances to `{$$mdtype:'Tag'}` plain objects), not raw markdown source. Callers are responsible for parsing both revisions through the standard pipeline up to that point.

### CLI surface

A `refrakt diff <page-path> [--from <rev>] [--to <rev>]` command in `packages/cli` runs both revisions through the parse + transform stages and emits the diff. Revisions default to `HEAD~1` and `HEAD`.

### Site integration

Future: a build-time hook can pre-compute diffs for the most recent N revisions of each page and expose them through a `{% page-history %}` rune. Out of scope for the initial spec; flagged as a follow-on opportunity.

-----

## Open Questions

These are intentionally unresolved for the first draft. They should be answered through real-content experiments before the spec moves to `accepted`.

1. **Granularity of attribute changes** — Should multi-attribute modifications collapse into one `modified` event with a list of `AttributeChange`, or fan out into one event per attribute? The schema supports the former; the question is whether the rendering should ever flatten.

2. **Natural keys with collisions** — If two siblings have the same natural-key value (two ingredients both named "flour"), the cascade falls through to positional matching for the colliding pair. Is that the right behaviour, or should the engine warn and refuse to diff?

3. **Cross-revision rune-type changes** — If `{% feature %}` becomes `{% pricing-tier %}` at the same position, is that a modification, a delete + add, or a third "type-changed" event? Per the replacement-default principle, delete + add seems right, but worth validating.

4. **Move detection threshold** — `moved` events fire only for explicit-id matches. Should natural-key matches also produce `moved` events when they cross parent boundaries, or always degrade to delete + add? Predictability argues for delete + add; reviewer ergonomics may argue for moves.

5. **Body content threshold** — When a rune's body has many small prose changes, at what point does "body modified (N lines)" become unhelpful and require recursing into the prose? Probably never — prose diffing is git's job — but worth confirming with examples.

6. **Editor integration shape** — The `editHints` system already declares how named sections are edited. Should `naturalKey` overlap with that, or stay independent? A natural-key field is almost certainly editable inline; the editor can derive that.

-----

## Decisions

### 1. Diff at the post-schema-transform tree, not later or earlier

The pipeline has three viable diff points: raw Markdoc AST, post-schema-transform tag tree, post-identity-transform Renderable. The middle stage is the only one that's both semantic (rune-typed) and unpolluted (no BEM classes, no injected structural elements). Diffing earlier loses the "this is an `ingredient`" framing the rune system provides; diffing later forces the engine to understand and ignore structural noise. The middle stage is what every rune knows about itself, with nothing extra.

### 2. Replacement is the default for natural-key changes

Per the user's framing in the originating discussion: when an ingredient's `name` changes from "flour" to "all-purpose flour", the diff reads as "removed flour, added all-purpose flour" rather than "renamed flour to all-purpose flour". This keeps the engine simple (no similarity heuristics, no fuzzy thresholds) and the output predictable. Rename detection is deferred indefinitely; if real usage shows it's needed, it can be reconsidered with concrete examples.

### 3. Identity is per-rune, declared via `naturalKey`

Adding `naturalKey` to `RuneConfig` keeps identity colocated with the rest of the rune's declaration — the same place that declares modifiers, structure, and editHints. Community packages declare their runes' natural keys in their own `RunePackage` config. There is no central registry to keep in sync.

### 4. Positional matching is type-scoped and tolerant of insertions

When matching by position, the engine indexes children by rune type. The "3rd step" pairs with "the 3rd step" across revisions — not "the 3rd child overall". This means inserting an `ingredient` between two `step`s doesn't shift step indices, and the diff stays focused on what actually changed. Insertions at the boundary of a type group surface as `added` events; everything after still pairs cleanly.

{% /spec %}
