{% work id="WORK-148" status="ready" priority="high" complexity="simple" source="SPEC-040" tags="plan, architecture, edge-runtime" %}

# Add edge-safe entry points to package.json exports

Wire up new package entry points in `runes/plan/package.json` for the extracted edge-safe modules: `./diff`, `./filter`, `./relationships`, `./cards`. Verify that each entry point can be imported without triggering Node.js API resolution.

## Acceptance Criteria

- [ ] `runes/plan/package.json` exports map includes `"./diff"` pointing to `./dist/diff.js` with types at `./dist/diff.d.ts`
- [ ] `runes/plan/package.json` exports map includes `"./filter"` pointing to `./dist/filter.js` with types at `./dist/filter.d.ts`
- [ ] `runes/plan/package.json` exports map includes `"./relationships"` pointing to `./dist/relationships.js` with types at `./dist/relationships.d.ts`
- [ ] `runes/plan/package.json` exports map includes `"./cards"` pointing to `./dist/cards.js` with types at `./dist/cards.d.ts`
- [ ] Existing entry points (`.`, `./scanner`, `./cli-plugin`) are unchanged
- [ ] Each new entry point's module graph contains zero imports from `node:fs`, `node:path`, or `node:child_process` (verified by a build-time or test-time check)
- [ ] Package builds successfully with `tsc`
- [ ] All existing tests pass

## Approach

1. Add the four new export entries to the `"exports"` field in `runes/plan/package.json`, matching the pattern used by existing entries (both `"types"` and `"default"` conditions).
2. After the package builds, verify edge-safety by statically analyzing the import graph of each new entry point. A simple approach: for each entry point, recursively follow imports and assert none resolve to `node:*` modules. This can be a test or a build script check.
3. Run the full test suite to confirm no regressions.

## Dependencies

- {% ref "WORK-144" /%} — scanner-core extraction (provides the split scanner)
- {% ref "WORK-145" /%} — diff module extraction
- {% ref "WORK-146" /%} — relationships module extraction
- {% ref "WORK-147" /%} — cards module extraction

## References

- {% ref "SPEC-040" /%} — Edge Runtime Compatibility for Plan Package

{% /work %}
