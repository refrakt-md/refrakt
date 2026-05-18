---
# Marketing default per SPEC-052 — every page on the site renders in dark
# mode, regardless of system preference, unless a deeper `_layout.md`
# (docs, runes, plan docs) opts out. The theme toggle hides on locked
# pages so users aren't presented with a control that does nothing.
tint-mode: dark
tint-lock: true
---
{% layout %}
{% region name="header" %}
[![](/mark.svg) refrakt.md](/)

{% nav layout="menubar" %}
- [Docs](/docs/getting-started)
- [Runes](/runes/rune-catalog)
- [Blog](/blog)
- [{% icon name="github" /%}](https://github.com/refrakt-md/refrakt)

## Resources
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)
- [Changelog](/releases)

## Project
- [Plan](/plan)
- [Plan Docs](/plan/docs/plan-overview)
{% /nav %}
{% /region %}

{% region name="footer" %}
{% nav layout="columns" %}
## Documentation
- [Docs](/docs/getting-started)
- [Runes](/runes/rune-catalog)
- [Plan Docs](/plan/docs/plan-overview)

## Resources
- [Blog](/blog)
- [Changelog](/releases)
- [Roadmap](https://plan.refrakt.md/refrakt-md/refrakt)

## Project
- [GitHub](https://github.com/refrakt-md/refrakt)
- [Plan](/plan)
{% /nav %}

© 2026 refrakt.md — MIT licensed.
{% /region %}

{% /layout %}
