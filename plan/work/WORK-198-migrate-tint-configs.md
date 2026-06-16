{% work id="WORK-198" status="done" priority="high" complexity="simple" tags="tint, lumina, plugins, migration" source="SPEC-053" milestone="v0.14.0" %}

# Migrate Lumina and plugin tint configs

Apply the SPEC-053 field renames to every concrete tint definition that ships with refrakt. Primary scope: Lumina's five tints (`base`, `subtle`, `warm`, `cool`, `dark`). Secondary scope: any plugin under `plugins/` that defines its own tints. End state: every shipped tint uses the new vocabulary; everything renders identically to before.

## Acceptance Criteria

- [x] `packages/lumina/src/config.ts` tint configs migrated: `background → bg`, `primary → text`, `secondary → muted`, `accent → primary`, `mode: 'dark' → lockMode: 'dark'`
- [x] All five Lumina tints (`base`, `subtle`, `warm`, `cool`, `dark`) updated. The `dark` tint specifically is now `{ lockMode: 'dark', dark: { bg, text, primary } }`
- [x] Plugin audit: `grep -rln "tints:" plugins/` finds no plugin shipping tint definitions today, so the migration is contained to Lumina
- [x] Full test suite passes (2429 + 10 new tint-extends tests) — the existing tint rune tests are token-driven, so they migrate transparently
- [x] No grep hits for old field names inside `tints: { … }` blocks: searched for `background:`, `secondary:`, `accent:`, and `mode:` followed by quoted-string values — clean

## Approach

This is the work item that depends on the previous three in the SPEC-053 chain ({% ref "WORK-195" /%}, {% ref "WORK-196" /%}, {% ref "WORK-197" /%}) being merged. Once the types, merge, and CSS bridge speak the new vocabulary, the actual config files migrate.

For Lumina's `config.ts`, the migration is a careful find-and-replace within `tints: { … }` blocks — semantic, not regex-blind, because the same field names appear in *other* contexts (e.g., a CSS color token name might happen to contain "primary" too). Walk each tint definition explicitly.

Plugin audit: `grep -rl "tints:" plugins/` to find candidates, then migrate each in the same way.

## Dependencies

- {% ref "WORK-195" /%} — types ready.
- {% ref "WORK-196" /%} — merge logic ready.
- {% ref "WORK-197" /%} — CSS bridge ready.

## References

- {% ref "SPEC-053" /%} — rename map and before/after examples
- `packages/lumina/src/config.ts` — primary file to migrate
- `plugins/*/src/` — secondary audit scope

{% /work %}
