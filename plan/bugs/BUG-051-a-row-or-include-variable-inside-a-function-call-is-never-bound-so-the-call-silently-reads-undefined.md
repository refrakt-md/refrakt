{% bug id="BUG-051" status="confirmed" severity="major" source="SPEC-127" tags="data, include, preprocess, functions, variables" %}

# A $row or include variable inside a function call is never bound, so the call silently reads undefined

Found while writing {% ref "SPEC-194" /%} D15. Reproduced on `main` (2026-11-10).

`data` binds `$row` and `include` binds its `variables` at preprocess, by substitution: each
walks the pasted AST and replaces a `Variable` node with the bound value. Both replace a
`Variable` only when it is **the whole attribute value**:

```ts
// packages/runes/src/data-pipeline.ts:260 — resolveRowVariable
if (node.$$mdtype === 'Variable' && Array.isArray(node.path) && node.path[0] === 'row') { … }
return value;

// packages/runes/src/tags/include.ts:114 — substitute
if (node.$$mdtype === 'Variable' && Array.isArray(node.path) && node.path.length > 0) { … }
return value;
```

A function call parses to a `Function` node whose arguments sit in `parameters`:

```json
{ "$$mdtype": "Function", "name": "first",
  "parameters": { "0": { "$$mdtype": "Variable", "path": ["row", "title"] }, "1": "Untitled" } }
```

Neither substitution descends into `parameters`, so the `Variable` survives preprocess. At
transform Markdoc resolves it against the page's variables, which have no `row` (or no
include binding), gets `undefined`, and the function runs on that. Nothing reports it.

## Steps to Reproduce

1. A CSV with a column that is empty on some rows:

   ```csv
   name,role,nick
   Ada,Engineer,Countess
   Grace,Admiral,
   ```

2. A row template that calls a function on `$row`:

   ```markdoc
   {% data src="people.csv" %}
   {% if equals($row.role, "Admiral") %}ADMIRAL {% $row.name %}{% /if %}

   named: {% default($row.nick, "none") %}
   {% /data %}
   ```

3. Render it.

## Expected

- Grace's row reads "ADMIRAL Grace"; Ada's does not.
- Ada's row reads "named: Countess"; Grace's reads "named: none".

## Actual

- Neither row prints "ADMIRAL": `equals(undefined, "Admiral")` is false on every row.
- Both rows read "named: none": `default(undefined, "none")`.

The same holds for `include`: `{% include file="_x.md" variables={kind: "note"} /%}` with
`{% if equals($kind, "note") %}` in the file is false. *Confirmed by reading the code; the
`data` case was run.*

## Approach

- Make both substitutions recursive over `Function` parameters (and over arrays and objects in
  an attribute value), so a bound variable is replaced wherever it appears in an expression.
  The function itself is left in place, to be evaluated at transform with the literal it now
  holds. That is the ordering {% ref "SPEC-195" /%} D8 records: paste-time substitution, then
  transform-time evaluation.
- One helper for both: `data` and `include` carry two copies of the same rule today, and they
  have drifted before (`data-pipeline.ts:212`: the inline flag `cloneWithBindings` had right).
- Tests: `equals`, `default` and a nested call (`not(equals($row.a, "x"))`) per row in `data`;
  the same through `include` `variables`; a nested `data` whose inner body's `$row` inside a
  function is still left for the inner rows (the WORK-553 stop must hold inside expressions too).
- A `$row` that no binding covers (a typo, `$rwo.name`) still reaches transform and reads
  `undefined`. That is a separate gap, and worth a validation warning, but not this fix.

## Environment

- `main` at 270491d. `@refrakt-md/runes` 0.48.0.

## References

- {% ref "SPEC-127" /%}: per-row templates.
- {% ref "SPEC-129" /%}: `include` and its `variables`.
- {% ref "SPEC-195" /%} D8: functions evaluate at transform, after paste-time substitution.
- {% ref "SPEC-194" /%} D15: preprocess runes as macro definitions.

{% /bug %}
