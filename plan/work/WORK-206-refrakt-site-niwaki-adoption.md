{% work id="WORK-206" status="done" priority="medium" complexity="simple" tags="site, presets, niwaki, dogfood" source="SPEC-051" milestone="v0.14.0" %}

# Refrakt site adopts presets: ["niwaki"]

Wire the refrakt documentation site to use the niwaki preset on top of the neutral default. The result: neutral chrome (so component examples render exactly as a fresh `create-refrakt` project would), niwaki syntax (so refrakt's voice lives in code blocks — the surface most uniquely *refrakt's*). Adds a visible "this site uses the niwaki preset" signal so visitors can mentally separate "default refrakt" from "this site's choice."

## Acceptance Criteria

- [x] `refrakt.config.json` updated: `sites.main.theme` is now the object form `{ "package": "@refrakt-md/lumina", "presets": ["@refrakt-md/lumina/presets/niwaki"] }`
- [ ] Visible signal of which preset the site uses *(deferred to {% ref "WORK-208" /%} alongside the design-plugin-rune docs page — the preset docs themselves are the natural place to surface "this is what the site uses")*
- [x] After change: every code block on the site renders with niwaki colours; all other content (callouts, headings, body, surface) renders with neutral default — verified by reading the merged-CSS path: niwaki overrides only `syntax.*` tokens, so everything else cascades to neutral default values
- [x] A user clicking through the site sees no preset change — preset applies site-wide via the SvelteKit plugin's `composeSiteTokensCss` at `buildStart`, which injects via the `virtual:refrakt/site-tokens.css` virtual module loaded alongside the theme's CSS
- [x] Build clean; full test suite green (2439 tests)

## Approach

This is a one-line config edit plus a signal-component decision.

For the signal: the lightest option is a small text indicator in the footer. The most discoverable option is a homepage mention. Decide based on what feels right when you see the site rendered — capture the choice in the resolution.

Consider deferring the signal to the preset docs pages ({% ref "WORK-208" /%}) — those pages exist specifically to surface the architecture, so a sidebar link "See how this site is composed" from any docs page might be enough on its own. Worth a brief read of how Vercel and Linear signal their own theme choices for reference.

## Dependencies

- {% ref "WORK-205" /%} — niwaki preset must exist.
- {% ref "WORK-200" /%}, {% ref "WORK-201" /%}, {% ref "WORK-202" /%} — neutral default fully populated.

## References

- {% ref "SPEC-051" /%} — "Site & Scaffold Implications" section explains the dogfooding rationale
- `refrakt.config.json` — file being edited

{% /work %}
