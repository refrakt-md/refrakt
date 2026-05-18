{% work id="WORK-188" status="ready" priority="high" complexity="medium" tags="dark-mode, tokens, config" source="SPEC-048" milestone="v0.14.0" %}

# Dark mode as PartialTokenContract overlay

Replace today's parallel `packages/lumina/tokens/dark.css` file (which duplicates ~30 tokens under two selectors — `[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`) with a structured `modes.dark` overlay in `ThemeTokensConfig`. Authors specify only the tokens that differ from base; everything else inherits via CSS variable cascade. Future modes (high-contrast, sepia, print) reuse the same shape.

## Acceptance Criteria

- [ ] `ThemeTokensConfig.modes` field accepts a record of mode name → `PartialTokenContract`
- [ ] Build pipeline emits per-mode stylesheets scoped to `[data-theme="<mode>"]` and to the `@media (prefers-color-scheme: <mode>) { :root:not([data-theme]) }` block for matching system preference
- [ ] Authors only specify *changed* tokens in a mode overlay — unspecified tokens inherit from base via the CSS variable cascade
- [ ] Lumina's existing `dark.css` migrated to `modes.dark` config form; resulting stylesheet renders identically (visual regression check)
- [ ] Generated stylesheet output order is deterministic so diffs in CI stay clean
- [ ] Mode overlay validation rejects keys not present in `TokenContract` with clear errors
- [ ] Documentation note explaining how to add a custom mode (e.g. high-contrast) — single config snippet, no parallel CSS file required

## Approach

Reshape the existing dark-mode CSS into config form. The migration is mechanical for Lumina:

1. Read `packages/lumina/tokens/dark.css`.
2. For each `--rf-*: value;` declaration, mirror it into `modes.dark.<path>` in the new config.
3. Delete the raw CSS file once the generated stylesheet matches.

The generated CSS preserves the existing two-selector pattern (explicit `[data-theme="dark"]` for user-toggled mode, media query for system preference). That's the SSR-friendly pattern and matches what SPEC-052's cascade resolution will emit.

Authors authoring custom themes specify only the deltas:

```json
{
  "theme": {
    "modes": {
      "dark": {
        "color": { "primary": "#a78bfa", "text": "#f1f5f9" }
      },
      "high-contrast": {
        "color": { "border": "#000000", "text": "#000000" }
      }
    }
  }
}
```

## Dependencies

- {% ref "WORK-185" /%} — `PartialTokenContract` shape defined.
- {% ref "WORK-187" /%} — base stylesheet generation infrastructure to extend.

## References

- {% ref "SPEC-048" /%} — "Modes are partials over the base, not parallel contracts" design principle
- `packages/lumina/tokens/dark.css` — file being migrated and eventually removed

{% /work %}
