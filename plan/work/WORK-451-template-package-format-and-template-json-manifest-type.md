{% work id="WORK-451" status="ready" priority="high" complexity="moderate" source="SPEC-109" tags="templates,manifest,types" milestone="v0.25.0" %}

# Template package format and template.json manifest type

{% ref "SPEC-109" /%} §2 — define the site-template package format and the `template.json`
manifest type. The config payload is a `SiteConfig` partial (install = add a site); the path
fields are install-derived, not author-set.

## Acceptance Criteria
- [ ] A `template.json` type is defined: metadata (`kind`, `name`, `title`, `description`, `category`, a `refrakt` range, optional `previewUrl`) plus a `site` field that is a `SiteConfig` partial
- [ ] The `site` partial **omits** `contentDir`/`sandbox.dir` — they are install-derived ({% ref "SPEC-109" /%} §2)
- [ ] `kind` defaults to `"site"`; `"section"` is reserved (type-level only, not implemented)
- [ ] The package layout (`content/`, optional `sandboxes/`) is documented as fixed source-folder names
- [ ] The type lives in `packages/types` and is importable by the install path and the scaffold

## Approach
Add the `template.json` interface alongside `ThemeManifest` in `packages/types/src/theme.ts`,
reusing `SiteConfig`. No runtime yet — this is the shared shape the apply step and scaffold
both consume.

## Dependencies
- {% ref "WORK-465" /%} — the `refrakt` range field

## References
- {% ref "SPEC-109" /%} §2; `packages/types/src/theme.ts` (`SiteConfig`)

{% /work %}
