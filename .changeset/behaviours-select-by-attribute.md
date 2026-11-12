---
'@refrakt-md/behaviors': minor
'@refrakt-md/runes': patch
'@refrakt-md/transform': patch
'@refrakt-md/svelte': patch
'@refrakt-md/lumina': patch
'@refrakt-md/skeleton': patch
---

**Behaviours find markup by attribute, and write state as attributes.** Interactive runes and layouts now work for a theme whose class prefix is not `rf`, and no behaviour reads a class (SPEC-196).

New attributes beside the existing classes: the fence wrapper has `data-wrapper="code"` and the table wrapper `data-wrapper="table"`; the layouts' mobile panels have `data-mobile-panel="menu"` or `"nav"`, and their sidebars `data-sidebar="docs"`, `"plan"` or `"blog"`.

**Classes behaviours no longer write.** A theme that styles any of these should select the attribute instead; Lumina and the skeleton already do:

| Was | Now |
|---|---|
| `.rf-reveal-step--visible` / `--hidden` | `[data-state="open"]` / `[data-state="closed"]`, the hidden rule scoped to `.rf-reveal[data-enhanced]` so a page without JavaScript shows every step |
| `.rf-tab--active`, `.rf-codegroup__tab--active`, `.rf-milestone__tab--active` | `[data-state="active"]` |
| `.rf-track--active`, `.rf-audio-player__chapter--active` | `[data-state="active"]` |
| `.rf-codeblock__copy--copied` | `[data-state="copied"]` |
| `html.rf-drawer-open` | `html[data-drawer-open]` |

`section-nav` no longer looks for a `.rf-plan-relationships` section, which nothing has emitted since the plan runes moved to `relationships`.
