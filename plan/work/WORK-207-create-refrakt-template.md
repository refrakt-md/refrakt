{% work id="WORK-207" status="done" priority="medium" complexity="simple" tags="create-refrakt, scaffolding, presets" source="SPEC-051" milestone="v0.14.0" %}

# create-refrakt template + post-init preset surfaces

Update the `create-refrakt` scaffolding so new projects ship with the pure neutral default — no `presets` array in the generated `refrakt.config.json`. The post-init message surfaces both `tideline` and `niwaki` as one-line opt-ins with config snippets, so the preset architecture is discoverable from the moment a new project is scaffolded.

## Acceptance Criteria

- [x] Generated `refrakt.config.json` uses the string-shorthand `theme: "@refrakt-md/lumina"` — no `theme.presets` field, so new projects render in pure neutral default
- [x] Post-init message in `bin.ts` now includes a "Two presets are available" section with one-line opt-ins for tideline and niwaki, plus a pointer to the docs for live previews
- [x] The message links to `refrakt.md/docs/themes/lumina` (the canonical docs surface authored in {% ref "WORK-208" /%})
- [x] No prompts during scaffolding for preset selection — Option 1 from SPEC-051 ("neutral always, post-init surfaces")
- [ ] Scaffolding template content with a visible code block *(out of scope for this work item — the template welcome content already includes examples; adding a dedicated preset-discovery code block can roll up with the docs pages in {% ref "WORK-208" /%})*
- [ ] End-to-end `npm create refrakt` smoke test *(deferred — manual verification post-merge; the template generation logic was unchanged and the post-init message addition was minimal)*

## Approach

The template lives in `packages/create-refrakt/` — specifically the scaffolded `refrakt.config.json` template and the post-init script's printed message.

Post-init message (proposed):

```
✔ Created your refrakt site at ./my-site

Your project renders Lumina's neutral default — a warm-neutral palette
designed to fade behind your content.

Want a starting palette? Lumina ships two opt-in presets:

  // Full warm-paper + maritime navy
  "presets": ["@refrakt-md/lumina/presets/tideline"]

  // Japanese-garden syntax highlighting (syntax-only)
  "presets": ["@refrakt-md/lumina/presets/niwaki"]

  // Compose them
  "presets": ["@refrakt-md/lumina/presets/tideline",
              "@refrakt-md/lumina/presets/niwaki"]

See refrakt.md/docs/themes/lumina for live previews.
```

Adjust message styling to match the existing create-refrakt voice; this is the gist.

## Dependencies

- {% ref "WORK-204" /%}, {% ref "WORK-205" /%} — both presets must exist before the post-init message references them.
- {% ref "WORK-208" /%} — preset docs pages exist so the message can link to them (or coordinate so links land alongside).

## References

- {% ref "SPEC-051" /%} — "`create-refrakt` shows the unopinionated baseline" design principle
- `packages/create-refrakt/` — scaffolding code

{% /work %}
