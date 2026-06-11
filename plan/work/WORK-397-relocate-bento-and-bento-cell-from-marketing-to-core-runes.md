{% work id="WORK-397" status="ready" priority="medium" complexity="moderate" source="ADR-019" tags="bento,runes,layout,marketing,core,breaking" %}

# Relocate bento and bento-cell from marketing to core runes

Execute {% ref "ADR-019" /%}: move `bento` + `bento-cell` from `@refrakt-md/marketing`
to core (`@refrakt-md/runes` + `@refrakt-md/lumina`) as Layout primitives, with a
back-compat re-export shim from marketing. Not a blocker for {% ref "WORK-350" /%};
target a future minor.

## Approach

- **Schema** — move `plugins/marketing/src/tags/bento.ts` → `packages/runes/src/tags/bento.ts`
  (imports are already all core, no rewiring). Move `BentoProps`/`BentoCellProps`
  to the core props location.
- **Catalog** — add `bento` / `bento-cell` `defineRune` entries to
  `packages/runes/src/index.ts` (category `Layout`); remove from marketing's catalog.
- **Engine config** — move the `Bento` / `BentoCell` `RuneConfig` from
  `plugins/marketing/src/config.ts` into `coreConfig` (`packages/runes/src/config.ts`).
- **CSS** — move bento styles from `plugins/marketing/styles/` to
  `packages/lumina/styles/runes/bento.css` (+ import in `lumina/index.css`); remove
  the marketing copy.
- **Shim** — marketing re-exports `bento`, `bentoCell`, `BentoProps`, `BentoCellProps`
  from `@refrakt-md/runes` so existing imports keep working (ADR-019); keep `bento`
  in marketing's `Plugin.runes`/`theme.runes` only if needed for the shim, else drop.
- **Docs** — move `site/content/runes/marketing/bento.md` → `site/content/runes/bento.md`;
  add a redirect from the old URL; update inbound links (`page-sections.md`,
  `runes/marketing/index.md`, `media-guests.md`, `runes/section.md`).
- **Tests** — move `plugins/marketing/test/bento.test.ts` → `packages/runes/test/`;
  keep a marketing shim test asserting the re-export.
- **Contracts** — regenerate `contracts/structures.json`.
- **Changeset** — `@refrakt-md/runes` + `@refrakt-md/lumina` minor; `@refrakt-md/marketing`
  minor (surface change behind shim).

## Acceptance Criteria
- [ ] `bento` and `bento-cell` resolve from `@refrakt-md/runes` core (catalog + `coreConfig`); `refrakt inspect bento` works with no plugins loaded.
- [ ] Bento CSS lives in lumina; CSS coverage passes; the marketing copy is removed.
- [ ] `import { bento, bentoCell } from '@refrakt-md/marketing'` still works via a re-export shim (a test asserts it).
- [ ] Authoring is unchanged for marketing users — a `{% bento %}` page renders identically before/after (snapshot/contract equivalence).
- [ ] Docs served at `/runes/bento` with a redirect from `/runes/marketing/bento`; all inbound links updated; no 404s in the site build.
- [ ] `contracts/structures.json` regenerated; full build + tests green; changeset added.

## References
- {% ref "ADR-019" /%} (decision) · {% ref "WORK-396" /%} (section, the pairing) · {% ref "ADR-018" /%} (related: layout vocabulary)
- `plugins/marketing/src/tags/bento.ts`, `plugins/marketing/src/config.ts`, `plugins/marketing/src/props.ts`, `site/content/runes/marketing/bento.md`

{% /work %}
