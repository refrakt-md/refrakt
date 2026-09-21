{% bug id="BUG-022" status="confirmed" severity="major" source="ADR-024" milestone="v0.36.0" tags="themes, validation, cli, dx" %}

# validateManifest enforces the pre-ADR-024 manifest shape, so every scaffolded theme fails it

{% ref "ADR-024" /%} made themes framework-agnostic: no `target`, and layouts
declare regions rather than pointing at framework components.
`validateManifest` (`packages/transform/src/validate.ts:467`) was never updated.

It still requires `target` and `layouts.*.component`, so it rejects **the
manifest `create-refrakt` generates** and **the manifest Lumina ships**. Nobody
noticed because nothing ran it — until {% ref "WORK-579" /%} gave it a command
of its own.

## Steps to Reproduce

Scaffold a theme, or take the manifest `create-refrakt` writes
(`packages/create-refrakt/src/scaffold.ts:838`) verbatim:

```json
{
	"name": "my-theme",
	"version": "0.1.0",
	"refrakt": "^0.36.0",
	"designTokens": "./tokens/base.css",
	"layouts": {
		"default": { "regions": ["header", "footer"] },
		"docs": { "regions": ["header", "nav", "sidebar", "footer"] }
	},
	"components": {},
	"unsupportedRuneBehavior": "passthrough"
}
```

```bash
refrakt theme validate --manifest ./manifest.json
```

## Expected

It passes. This is the shape the project's own scaffolder emits, and the
scaffold says so in a comment citing the ADR:

> Framework-agnostic manifest (ADR-024): no `target`; layouts declare only
> their regions (the LayoutConfig lives in `src/layouts.ts`, consumed by every
> adapter).

## Actual

```
Validating manifest...
  Manifest: FAIL (4 errors)
    ERROR target: Required and must be a non-empty string
    ERROR layouts.default.component: Required and must be a non-empty string
    ERROR layouts.docs.component: Required and must be a non-empty string
```

Lumina — the reference theme, exported as `./manifest` from
`packages/lumina/package.json` — fails with five, adding `designTokens`.

## Why

The validator requires four things. Three of them are wrong, and each is wrong
in a different way:

| Field | Validator | Type (`packages/types/src/theme.ts`) | Read by anything? |
|---|---|---|---|
| `name`, `version` | required | required | yes |
| `target` | **required** | `target?` — optional, and `@deprecated … adapters do not gate on it (ADR-024)` | no |
| `designTokens` | **required** | required | **no** — only the validator, its test, and the scaffold that writes it |
| `layouts.*.component` | **required** | required on `LayoutDefinition` | **no** — the only hit in `packages/{transform,svelte,content}/src` is the validator itself |

`target` is the unambiguous one: the type's own doc comment deprecates it and
names the ADR that did so, while the validator makes it mandatory.

`designTokens` and `layouts.*.component` are the more interesting pair. Both are
still required by `ThemeManifest`, and **neither is read by any runtime code**.
Layouts moved to `LayoutConfig` in `@refrakt-md/transform`; the manifest's
`component` path is a leftover from when a theme shipped Svelte layout
components, which is exactly what ADR-024 made optional.

## Why it survived: its tests encode the same stale shape

Worth stating plainly, because it is the reason a wrong check stayed green.
`packages/transform/test/validate.test.ts:198` defines the fixture it validates
against:

```ts
const validManifest = {
  name: 'my-theme',
  version: '0.1.0',
  target: 'svelte',
  layouts: {
    default: { component: './layouts/Default.svelte', regions: ['content'] },
  },
  …
};
```

A pre-ADR-024 Svelte theme. There is also a test asserting `target` is reported
missing. So the suite is green, the check is tested, and both are measuring a
manifest shape the project stopped producing — while the reference theme and
every scaffolded theme fail.

This is the milestone's own thesis again, one turn further: a check with no
automatic caller does not merely fail to catch things, it **drifts**, and its
tests drift with it. {% ref "BUG-021" /%} and the duplicate-ID finding in
{% ref "SPEC-135" /%} D7 are the same shape.

## Fix

Bring the validator to ADR-024, and decide the two dead fields rather than
carrying them:

- **`target`** — drop the requirement. Accept it when present (it is
  documentation-only), never demand it.
- **`layouts.*.component`** — make optional. A framework-agnostic theme has no
  component path; a `--target svelte` theme does.
- **`designTokens`** — decide. Either it is genuinely required, in which case
  Lumina is non-conforming and should declare it; or it is vestigial like the
  other two, in which case make it optional in both the validator and
  `ThemeManifest`. Prefer the second unless a consumer turns up: a field nothing
  reads is not a requirement, it is a ritual.
- **Replace the test fixture** with the manifest `create-refrakt` actually
  emits, so the check is measured against the shape the project produces. Add
  Lumina's own manifest as a case — a validator the reference theme fails is
  the signal this bug exists at all.

## Notes

Found by {% ref "WORK-579" /%}, which moved `validateManifest` behind
`refrakt theme validate` and gave it its first real invocation. The relocation
did not cause this; it revealed it.

**Scope note.** Fixing the validator may turn theme-manifest findings on for
real for the first time. Check Lumina and the scaffold both pass before closing,
or this re-lands as a failing gate the moment {% ref "WORK-580" /%}'s job grows
a theme-validation step.

## References

- {% ref "ADR-024" /%} — framework-agnostic themes; deprecated `target` and the framework layout layer
- {% ref "SPEC-118" /%} — the themes/plugins/templates family ADR-024 sits under
- {% ref "WORK-579" /%} — moved the check to `refrakt theme validate`, surfacing this
- {% ref "BUG-021" /%} — same class: declared in three places, behaviour in the fourth
- `packages/transform/src/validate.ts` — `validateManifest`, the stale requirements at `:479` and `:498`
- `packages/transform/test/validate.test.ts` — the pre-ADR-024 fixture at `:198`
- `packages/types/src/theme.ts` — `ThemeManifest`, where `target` is already optional and deprecated
- `packages/create-refrakt/src/scaffold.ts` — the manifest the project emits, at `:838`
- `packages/lumina/manifest.json` — the reference theme that fails

{% /bug %}
