{% work id="WORK-640" status="done" priority="medium" complexity="moderate" source="SPEC-170" tags="markdoc, dependencies, parsing, validation" milestone="v0.42.0" pr="refrakt-md/refrakt#716" %}

# Upgrade Markdoc from 0.4.0 to 0.5.10

Every package pins `"@markdoc/markdoc": "0.4.0"` exactly: `packages/runes`, `transform`,
`content`, `svelte`, `editor`, `cli`, `language-server`, `plugins/places`, `site` and
`plan-site`. 0.4.0 was released in December 2023; 0.5.10 in September 2026, eleven releases
later. Nothing in the plan or the git history records why the version is pinned. SPEC-123 and
WORK-556 only call it "the pinned `0.4.0`".

The 0.4.0 → 0.5.10 source was read, not run. The changes that matter here:

**Worth having:**

- **Validation errors can carry their own location.** In 0.4.0 every error a schema's validator
  returns gets the whole node's line range. 0.5 keeps an error's own `location` when it has one
  (`toValidateError` in `src/validator.ts`). That is what {% ref "ADR-034" /%}'s file-qualified
  ranges and {% ref "WORK-556" /%}'s routing of Markdoc findings want.
- **`Markdoc.format` fixes.** refrakt uses `format` for in-memory round trips at five sites
  (`packages/runes/src/deferred-body.ts:38`, `collection-helpers.ts:49`,
  `collection-resolve.ts:120`, `:133`, `packages/content/src/site.ts:547`). 0.4.0 escapes only
  the first parenthesis in an image `src` (the regex has no `/g`), mis-serialises blockquotes
  with several children, over-escapes text starting with `#`, and can drop a fence's trailing
  newline. These are latent bugs on those paths.
- **The comment plugin's unclosed-comment check** is fixed: 0.4.0 tests `if (!close)` against an
  `indexOf` result, so a missing `-->` (-1) passes. refrakt does not enable comments today.
- **A tag's text is read across its lines** (`src/tokenizer/plugins/annotations.ts`), which may
  matter for multi-line and indented tags ({% ref "SPEC-170" /%}).

**Could change behaviour, so measure:**

- **`{% if %}` / `{% else %}` conditions are type-checked** (`src/schema-types/conditional.ts`):
  a string or number condition is now an `attribute-type-invalid` error, where 0.4.0 accepted
  any value. Repository content uses variables, `equals(…)` and `true`.
- **Table transform:** non-list content between table rows is now a critical `table-syntax`
  error instead of being dropped. No tracked `.md` file uses `{% table %}`.

**Not relevant:** an opt-in link check for Markdoc tags inside URLs, generic `Config` types, and
React renderer changes.

`allowIndentation`, which SPEC-170 relies on, behaves the same in 0.5.10.

## Acceptance Criteria

- [x] Every `@markdoc/markdoc` pin is `0.5.10`, and the lockfile is regenerated with npm, not edited by hand
- [x] The AST of every tracked `.md` file is compared before and after the upgrade; every difference is listed in the resolution and explained
- [x] `npm test`, `npx refrakt contracts --check` (both contract copies) and `npm run seo:baseline:check` pass, or every change they report is explained as a fix
- [x] New validation findings from the stricter `if` and table checks are listed, and each is fixed in content or recorded as a breaking change for third-party sites
- [x] A test asserts that a schema validator's error with its own location reaches `refrakt validate` with that location, not the whole node's range
- [x] A test round-trips an image `src` with two parentheses and a blockquote with two paragraphs through `Markdoc.format` unchanged
- [x] The changeset describes the behaviour changes for authors (the `if` condition check, table errors)
- [x] The reason for pinning an exact Markdoc version is written down (in RELEASING.md or a short ADR), so the next upgrade knows what to check

## Approach

1. Upgrade the pins together in one change; mixed Markdoc versions across packages would give two
   parsers.
2. Before installing, capture the AST of every tracked `.md` file with 0.4.0, then compare after.
   This is the same comparison SPEC-170 used for `allowIndentation`.
3. Land this before SPEC-170's shared `parse()`, so it is built once, on the current version.

## References

- {% ref "SPEC-170" /%}: indentation; this upgrade lands first.
- {% ref "ADR-034" /%}: source locations, which the validator change improves.
- {% ref "WORK-556" /%}: Markdoc validation routed into the pipeline.
- {% ref "SPEC-123" /%}: an earlier parse behaviour confirmed against 0.4.0, to re-check.
- {% ref "SPEC-145" /%} D30: expansion-time `if` evaluation should match Markdoc's own condition rules, including the new type check.

## Resolution

Completed: 2026-10-25

Branch: `claude/v0-42-0-planning-t31f5e`

### What was done
- All 18 `@markdoc/markdoc` pins moved from `0.4.0` to `0.5.10`; `package-lock.json` regenerated with `npm install` (`npm ls` shows one copy). `create-refrakt`'s scaffold ranges moved from `^0.4.0` to `^0.5.10`: under 0.x, `^0.4.0` excludes 0.5, so new sites would have installed a second Markdoc.
- **AST comparison:** every tracked `.md` file (1,545) parsed on 0.4.0 and on 0.5.10, compared as full JSON (positions and errors included). **0 differences**, so there is nothing to explain.
- Tests, both contract copies, the SEO baseline: unchanged. `refrakt validate --deep`: 0 findings on `main` and `plan`, so the stricter `if` and table checks find nothing here (no tracked file uses `{% table %}`). Both are recorded as author-facing changes in `.changeset/markdoc-0-5-10.md`.
- `packages/content/test/validate.test.ts`: a validator error with its own `location` is reported at that line (5), not the node's (3).
- `packages/runes/test/markdoc-format.test.ts`: an image `src` with two parenthesis pairs (0.4.0 gave `/maps/(north`), a blockquote with two paragraphs, and a list inside a blockquote (0.4.0 dropped the `>` on continuation lines).
- `RELEASING.md`, "The Markdoc pin": why the version is exact, and the checks an upgrade runs.

### Notes
- The two-paragraph blockquote round-trips on 0.4.0 too. The breaking case was a child spanning several lines, so that case is the one that fails on 0.4.0.
- SPEC-145 D30 (expansion-time `if` matching Markdoc's condition rules) is not addressed here: a composition template is transformed, not validated.

{% /work %}
