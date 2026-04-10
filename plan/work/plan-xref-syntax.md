{% work id="WORK-021" status="done" priority="high" tags="plan, xref, content" source="SPEC-008" %}

# Update Plan Documents to Use Xref Syntax

> Ref: {% ref "WORK-020" /%} (Plan Entity Registration)

## Summary

Plan documents currently use plain-text references like `Ref: SPEC-008 (Unbuilt Runes)` and `Dependencies: WORK-015`. Replace these with `{% ref %}` tags so cross-references are machine-readable and will resolve to links once {% ref "WORK-020" /%} (entity registration) is complete.

## Scope

All files under `plan/work/`, `plan/spec/`, and `plan/decision/` that contain cross-references to other plan documents.

## Examples

Before:
```
> Ref: SPEC-008 (Unbuilt Runes) — Package: `@refrakt-md/media`
```

After:
```
> Ref: {% xref "SPEC-008" /%} — Package: `@refrakt-md/media`
```

Before:
```
- Requires track and playlist runes (WORK-015) to exist as child content
```

After:
```
- Requires track and playlist runes ({% xref "WORK-015" /%}) to exist as child content
```

## Acceptance Criteria

- [x] All `SPEC-###`, `WORK-###`, `ADR-###` references in plan documents use `{% xref %}` syntax
- [x] Blockquote `Ref:` lines use xref for each referenced ID
- [x] Dependency mentions in prose and lists use xref
- [x] No plain-text ID references remain (except inside attribute values like `id="WORK-004"`)

## Dependencies

- {% ref "WORK-026" /%} (ref alias — so migrated files can use the shorter `{% ref %}` syntax)

{% /work %}
