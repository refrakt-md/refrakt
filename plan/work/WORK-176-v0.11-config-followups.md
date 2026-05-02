{% work id="WORK-176" status="ready" priority="medium" complexity="moderate" tags="config, schema, types, docs" source="ADR-010" milestone="v0.12.0" %}

# v0.11.0 config follow-ups

A handful of concerns surfaced during the v0.11.0 design review that we deliberately deferred rather than block the milestone. None are urgent; all are worth addressing before the unified config shape ossifies further.

## Acceptance Criteria

### Schema URL versioning

- [ ] Publish the JSON Schema at a versioned URL: `https://refrakt.md/schemas/v0.11/refrakt.config.schema.json`. Keep the unversioned `https://refrakt.md/refrakt.config.schema.json` as a "latest" alias.
- [ ] `create-refrakt` scaffolds reference the versioned URL matching the package version at scaffold time, so old projects don't get false errors when the schema gains fields.
- [ ] Document the versioning policy in `site/content/docs/configuration/schema.md`: pin a specific version for stable validation, or use the unversioned alias to track latest.

### Mirroring footgun (legacy top-level field types)

- [ ] Mark `contentDir`, `theme`, `target` on `RefraktConfig` as optional in `@refrakt-md/types`. They're only required for flat-shape and single-site configs, and currently they're typed as required strings — which papers over the multi-site case where they're undefined.
- [ ] Audit adapter code that reads `config.contentDir` etc. and either add null checks or migrate to `resolveSite(config).site.contentDir` per WORK-166's pattern.
- [ ] Update tests that asserted these fields as definite to handle the optional case.

### Three input shapes — deprecation timeline

- [ ] Decide on a deprecation path for the flat shape. Suggested: deprecate in v0.12 release notes (no removal), pull flat-shape examples out of new docs (overview keeps a "legacy" callout), aim for removal in v1.0.
- [ ] Add a runtime warning (one-time per process) when the loader sees a flat-shape config: "refrakt.config.json uses the legacy flat shape. Run `refrakt config migrate` to upgrade. Flat shape will be removed in v1.0."
- [ ] Update the migration command's output to mention the planned removal.

### `target` field review

- [ ] Audit which adapters actually validate or use `site.target`. Current finding: SvelteKit doesn't validate it; Astro/Nuxt/Next/Eleventy don't either. The field is increasingly vestigial.
- [ ] Decide: deprecate the field entirely, or repurpose it as a documentation hint (which adapter this site is meant for). If deprecated, follow the same v0.12 → v1.0 timeline as the flat shape.

## Approach

These can be addressed independently and don't block each other. Suggested order:

1. **Schema URL versioning** — small, mechanical, eliminates a real footgun for users on older versions.
2. **Mirroring types** — small type change with a moderate audit of adapter code. Catches the "undefined for multi-site" footgun at compile time.
3. **Three shapes timeline** — mostly docs + a one-time warning. Sets expectations.
4. **`target` field** — investigation first, then a decision. Probably ends up deprecating.

## Dependencies

- {% ref "WORK-159" /%} — types and loader were established in v0.11.0; this work refines them.
- {% ref "ADR-010" /%} — the unified config shape we're polishing.

## References

- v0.11.0 design review (this work item is the audit output) — see commit history on `claude/v0.11.0-config-foundation` for context.
- `packages/types/src/theme.ts` — `RefraktConfig` legacy fields.
- `packages/transform/refrakt.config.schema.json` — the schema file to version.
- `packages/cli/src/commands/config.ts` — the migrate command to update.

{% /work %}
