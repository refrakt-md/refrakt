{% work id="WORK-207" status="ready" priority="medium" complexity="small" tags="create-refrakt, scaffolding, presets" source="SPEC-051" milestone="v0.14.0" %}

# create-refrakt template + post-init preset surfaces

Update the `create-refrakt` scaffolding so new projects ship with the pure neutral default — no `presets` array in the generated `refrakt.config.json`. The post-init message surfaces both `tideline` and `niwaki` as one-line opt-ins with config snippets, so the preset architecture is discoverable from the moment a new project is scaffolded.

## Acceptance Criteria

- [ ] Generated `refrakt.config.json` ships *without* a `presets` array (or with `"presets": []` explicitly, depending on which is conventional). New projects render in pure neutral default
- [ ] Post-init message printed by `create-refrakt` includes a brief "Want a starting palette?" section with the one-line opt-ins for tideline and niwaki, plus a one-line composition example
- [ ] The message points to the preset docs pages ({% ref "WORK-208" /%}) for the full visual previews
- [ ] Scaffolding template's content has at least one code block (in an example page or the welcome content) so users can immediately see the neutral syntax palette in action without writing their own
- [ ] Running `npm create refrakt` end-to-end produces a project that boots, renders, and looks like the neutral default
- [ ] No prompts during scaffolding for preset selection — option 1 from SPEC-051 ("neutral always, post-init surfaces"). Add prompts later if user feedback says discoverability is lacking

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
