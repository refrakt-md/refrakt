{% spec id="SPEC-075" status="draft" tags="collection, sort, attributes, types, validation, runes" source="SPEC-072" %}

# Comparable attribute types — typed sort + validation for rune attributes

`collection` sort knows three things: numeric values, lexical strings, and per-`(type, field)` enum orders ({% ref "SPEC-072" /%}, derived from an attribute's `matches`). Value types with a *universal but non-lexical* order — versions, durations, prefixed ids — sort wrong, and they're un-validated strings besides. This spec lets a rune attribute's **type** own its comparison (and validation): a Markdoc custom attribute type class may expose a `compare`, and `collection` consults it when sorting. SemVer (for `milestone.name`) is the first consumer; the same pattern serves dates, plan ids, and durations.

## Problem

`sortEntities` (SPEC-072) resolves, per `(type, field)`: enum order (from `matches` / theme overrides) → numeric (both values finite) → lexical. That leaves a class of values mis-sorted because their natural order is neither numeric, nor lexical, nor a fixed enum:

- **Versions:** `v0.10.0` sorts *before* `v0.9.0` lexically — which blocks the milestone roadmap, where `sort="name"` is the obvious thing to write.
- **Prefixed ids:** `WORK-10` sorts before `WORK-9` — any plan listing sorted by id.
- **Durations:** `"1h"` vs `"30m"` — lexical is meaningless.

These same fields are also **un-validated** today — a typo'd `name="v0.16"` or a malformed duration flows straight to output. And crucially the *order is intrinsic to the value type*, not domain-specific: every semver sorts the same way, unlike a `status` enum whose order is a domain choice. So the comparison belongs to the **type**, not to a per-`(type, field)` override.

Markdoc already models attribute types as classes with `validate` / `transform`. We can carry the comparator there too — and `collection` can read it, because it already reaches `embedConfig.tags[type].attributes[field]` to pull enum orders.

## Goals

- A convention: a rune attribute's **type class may expose a static `compare(a, b)`**; `collection` sort consults it.
- The same type class can **normalize** via Markdoc's `transform` (e.g. dates → ISO), so sort, filter, and storage share one canonical form while display stays the formatter's job.
- A small, reusable library of such types — validated **and** comparable — usable by core and plugin runes, starting with **SemVer**.
- `milestone.name` adopts SemVer so the roadmap sorts correctly with the intuitive `sort="name"`, and malformed versions fail at build.
- Authoring stays intuitive: content and collection authors do nothing special; the rune author declares the type once.

## Non-goals

- Replacing enum ordering — `matches` / theme `orderings` stay the mechanism for fixed enums (`status`, `priority`, `severity`); this is complementary, for open-ended / structured value types.
- Full semver pre-release precedence in v1 (`-rc.1` ordering) — dotted-numeric core first; pre-release is a documented follow-up.
- Implementing every candidate type now — deliver the mechanism + SemVer; the rest are a prioritized backlog (below).

## Capability 1 — the `compare` convention + sort hook

- Document the convention: a Markdoc attribute type class (the `type` of an attribute) MAY define a static `compare(a: string, b: string): number` (ascending), alongside Markdoc's `validate` / `transform`.
- `sortEntities` resolves a comparator for `(type, field)` in this order: **enum order (matches/override) → the field type's `compare` → numeric → lexical**. The `-` / `-desc` direction flips the result, as today.
- The type class is read from the live schema (`embedConfig.tags[type].attributes[field].type`) — the same path the enum ordering already uses — so no new threading. `transform` keeps the entity value a plain string so it stays comparable + serializable; `compare` parses on demand.

## Capability 2 — a SemVer type + first consumer

- Ship a `SemVer` attribute type (shared, exported from `@refrakt-md/runes` so plugins can reuse it): `validate` rejects non-`v?X.Y[.Z…]`; `transform` passes the string through; `compare` is dotted-numeric.
- `milestone.name` uses `type: SemVer`. A `collection type="milestone" sort="name"` orders `v0.9.0 < v0.10.0 < v1.0.0`; a malformed name is a build-time validation error.

## Capability 3 — normalization via `transform`

Comparison isn't the only thing a value type owns. A type's `transform` can **normalize input to a canonical, serializable form**, which pays off across **sort, filter, and storage** at once — while human display stays the formatter's job (`date()`, etc.). The clearest case is **Date**: canonicalizing varied inputs (`"2024-1-5"`, `"Jan 5 2024"`) to ISO `2024-01-05` makes lexical sort correct *without* a `compare` (ISO sorts lexically), makes `collection`'s `filter` predictable (it matches the stored value), and keeps storage machine-clean while `date()` formats for humans. Durations likewise normalize to a canonical form; SemVer stays passthrough (keep the authored `v0.16.0` visible) unless canonical version display is wanted.

So the type contract spans three methods, and different value types lean on different ones:

| Type | `validate` | `transform` | `compare` |
|------|-----------|-------------|-----------|
| Date | ISO-ish input | → ISO (does the work) | unneeded — ISO sorts lexically |
| SemVer | `v?X.Y[.Z…]` | passthrough | dotted-numeric |
| Duration | parseable | → canonical | (or rely on canonical) |

Two constraints:

- **Serializable output only.** The transformed value lands in entity `data` and flows into rendered output across the server→client boundary, so `transform` must return a plain primitive (a normalized string / number) — not a `Date` / class instance, which wouldn't survive serialization. The parsed rich value is transient, used inside `compare`, never stored.
- **`validate` is the gate, `transform` is coercion.** Malformed input errors in `validate`; `transform` canonicalizes the rest.

## Other attributes worth the same treatment (reflection)

Enumerated so the mechanism is built once and reused; **not** all in scope now:

- **Date / ISO datetime** — `created` / `modified` (work/spec/bug/milestone), `milestone.target`, blog `date`, places `event` dates. The **transform-led** type (Capability 3): normalizing to ISO fixes sort *and* `filter` without a `compare`, and it's the **most widely reused** sortable field — likely the highest-value type after SemVer.
- **Identifier / natural sort** (`PREFIX-<n>`) — plan ids (`WORK-9` vs `WORK-10`); any numbered id. High value for plan listings sorted by id.
- **Duration** — learning `recipe` / `howto` `prepTime` / `cookTime` / `totalTime` (`"30m"`, `"PT1H30M"`).
- **(Boundary)** `status` / `priority` / `severity` are fixed enums, already handled by `matches` / `orderings`; listed only to mark where the type-class approach does *not* apply.

A reasonable build order after SemVer: **Date** (breadth), then **Id / natural** (plan listings), then **Duration**.

## Acceptance Criteria

- [ ] Documented convention: attribute type classes own **validate + transform + compare** — `compare(a, b)` for sort, and `transform` for normalizing to a canonical *serializable* value (no class instances across the SSR boundary); `validate` remains the error gate.
- [ ] `sortEntities` consults the field type's `compare` for `(type, field)`, ordered after enum ordering and before numeric / lexical; `-` / `-desc` honored; falls through cleanly when absent.
- [ ] A `SemVer` type ships and is exported for reuse: `validate` rejects non-versions, `compare` is dotted-numeric (pre-release deferred), `transform` passes through.
- [ ] `milestone.name` uses `SemVer`; `collection type="milestone" sort="name"` yields `v0.9.0 < v0.10.0 < v1.0.0`; a malformed `name` raises a build validation error.
- [ ] Tests: the comparator (incl. `v0.9.0 < v0.10.0`, mixed / short forms) and the `sortEntities` integration (typed compare wins over lexical, loses to an explicit enum order, honors direction).
- [ ] Docs: the `collection` sort section documents the tier order; the rune-authoring output-contract page documents the `compare` convention and lists the candidate types.

## References

- {% ref "SPEC-072" /%} — domain-aware ordering (enum `matches` / overrides); this extends the sort resolution with typed comparators.
- {% ref "SPEC-070" /%} — the `collection` rune whose sort this improves.

{% /spec %}
