{% spec id="SPEC-052" status="draft" tags="theme, tint, cascade, frontmatter, layout, dark-mode" %}

# Per-page and per-subtree tint cascade

Extend the existing per-rune `tint` and `tint-mode` attributes to cascade through layout files and individual pages, so authors can express "lock all marketing pages to dark mode" or "this single page uses the hero-brand tint preset" without writing per-rune attributes everywhere. Reuses the layout cascade refrakt authors already work with, rather than introducing a separate route-rules config surface.

Depends on SPEC-048 (typed token contract, `tint` system, `theme.colorScheme` field at site level).

## Problem

Today `tint` (named colour) and `tint-mode` (`light` / `dark` / `auto`) exist only as per-rune attributes. A hero can be dark; a callout can use a named tint. But there's no way for an author to express:

- "This entire marketing subtree is dark, no toggle, no system preference." (Linear's homepage, Stripe's product pages)
- "Docs respect user preference; marketing doesn't." (Vercel, Stripe, Linear all do this)
- "This one launch announcement uses the `brand-warm` tint preset for the day it's live."

These are real patterns from production sites. Today refrakt requires authors to either (a) apply `tint` and `tint-mode` to every top-level rune on the page individually (verbose, error-prone, easy to miss), or (b) write CSS that sets `data-theme` on the page root by hand (works but bypasses the token system the rest of refrakt uses).

**Why not just promote `theme.colorScheme` to per-page?** SPEC-048 added `theme.colorScheme: auto | light | dark` at the site level. Extending that field to per-page would solve the dark/light axis but miss the more general case — named tint presets (`brand-warm`, `seasonal-autumn`, etc.) that aren't on the dark/light axis at all. The existing `tint` attribute already supports named tints; extending *its* cascade is strictly more powerful than promoting `colorScheme`.

-----

## Design Principles

**Cascade through what's already there.** Refrakt already cascades via `_layout.md` files. This feature uses that same mechanism — no `routes` array in config, no separate per-page registration. `tint` and `tint-mode` become frontmatter fields that cascade with the same precedence rules as layout content. If you already understand how `_layout.md` cascades, you already understand how tint cascades.

**Field names match existing rune attributes exactly.** The fields are `tint` and `tint-mode`, identical to the existing rune-level attributes. Same value semantics — `tint` accepts a named tint preset name or empty; `tint-mode` accepts `auto` / `light` / `dark`. Learning the page-level cascade is reusing knowledge from the rune-attribute level, not learning a new system.

**Locked vs. preferred is explicit, not inferred.** `tint-mode: dark` alone means "default to dark but user can toggle"; combine with `tint-lock: true` to mean "always dark, the toggle does not apply here, user preference is ignored." Without explicit locking, the user's runtime choice always wins for the unlocked axes. This mirrors how Linear marketing locks while Linear docs default-but-allow.

**Resolution at SSR, not on the client.** The effective `(tint, tintMode, locked)` tuple for each page is resolved at build time and emitted as `data-theme`, `data-tint`, and `data-tint-lock` attributes on `<html>`. No flash of incorrect theme on dark-locked marketing pages. Client JS only acts when a page is unlocked.

**Cascade order is global → layout → page → rune. Last writer wins.** Each level can override the next-narrower one. A rune with `tint-mode="dark"` always wins over its page setting, which wins over its containing layout's setting, which wins over the global config. This is the same precedence model the existing layout cascade uses.

-----

## The Cascade

Four levels, narrowest wins:

### Level 1 — Site config

```json
{
  "theme": {
    "colorScheme": "auto"
  }
}
```

Site-wide default. SPEC-048's existing field; this spec reuses it as the cascade's root.

### Level 2 — Layout (`_layout.md` frontmatter)

```yaml
---
layout: marketing
tint-mode: dark
tint-lock: true
---
```

Applies to every page under this directory unless overridden. The natural place to express "all of /marketing is dark."

### Level 3 — Page frontmatter

```yaml
---
title: Launch Day
tint: brand-warm
tint-mode: light
---
```

Overrides layout for this page only. Useful for one-off announcements, feature pages, or breaking out of a subtree default.

### Level 4 — Rune attribute (existing)

```markdoc
{% hero tint-mode="dark" %}
...
{% /hero %}
```

Overrides page for this rune only. Already works today; this spec doesn't change rune-level semantics, only adds the page and layout levels above them.

### Worked example

```
site/content/
  _layout.md                 # tint-mode: dark, tint-lock: true  (marketing default)
  index.md                   # → locked dark
  about.md                   # → locked dark
  blog/
    _layout.md               # (inherits — locked dark)
    announcement.md          # → locked dark
  docs/
    _layout.md               # tint-mode: auto, tint-lock: false  (override the lock)
    getting-started.md       # → auto, respects user preference
  runes/
    _layout.md               # tint-mode: auto, tint-lock: false
    hint.md                  # → auto
  plan/
    docs/
      _layout.md             # tint-mode: auto, tint-lock: false
      overview.md            # → auto
```

The root `_layout.md` sets a dark-locked default; documentation subtrees (`docs/`, `runes/`, `plan/docs/`) explicitly unlock and switch to auto. Individual pages can still override either way.

-----

## Refrakt Site Adoption

The refrakt site itself adopts this cascade as part of this spec. The structure above isn't hypothetical — it's the configuration the refrakt site ships with at v1.0.

**Rationale.** Marketing surfaces (`/`, `/about`, `/blog/*`) are brand statements — they should look the same to every visitor regardless of system preference, the way Linear's homepage and Stripe's product pages do. Documentation surfaces (`/docs/*`, `/runes/*`, `/plan/docs/*`) are reading-for-hours surfaces — the user's eyes win over the brand's preference, the way Linear's and Vercel's docs do. The cascade lets us express both stances declaratively without per-page repetition.

**Configuration:**

| Subtree | `tint-mode` | `tint-lock` | Rationale |
|---|---|---|---|
| `/` (root, default) | `dark` | `true` | Marketing default — homepage, about, anything not under a docs subtree |
| `/blog/*` | inherited | inherited | Inherits root → locked dark; blog reads as marketing-adjacent for refrakt |
| `/docs/*` | `auto` | `false` | Reading surface — respect user/system preference |
| `/runes/*` | `auto` | `false` | Rune reference docs — same treatment as docs |
| `/plan/docs/*` | `auto` | `false` | Plan documentation surface — same treatment as docs |

`tint-mode: auto` is the documented value for "follow the user's saved preference, falling back to system `prefers-color-scheme`" — semantically what every reading surface wants by default.

**Layout files affected:** `site/content/_layout.md`, `site/content/docs/_layout.md`, `site/content/runes/_layout.md`, `site/content/plan/docs/_layout.md` all gain the relevant frontmatter. `site/content/blog/_layout.md` doesn't need a tint change (inherits the root). Existing layout settings (region definitions, etc.) are unchanged.

**Edge cases worth flagging during implementation:**

- **Plan content outside `/plan/docs/`** (`/plan/specs/*`, `/plan/work/*` if those are exposed on the site) inherits the root → locked dark. If they're meant to read as docs surfaces, they need their own layout overrides; if they're internal-only or marketing-adjacent, the inheritance is correct. Decide deliberately when implementing.
- **The toggle UI behaviour matters more now** — on locked pages it should hide entirely (per spec); on auto pages it should be visible and functional. Verify Lumina's toggle implementation honours the contract before committing to this configuration site-wide.
- **Pre-paint script must read the resolved tuple correctly** for the locked-vs-unlocked distinction. A flash of light content on a dark-locked marketing page would be visible and embarrassing; worth a dedicated visual test before launch.

-----

## Frontmatter Authoring Surface

| Field | Type | Default | Where |
|---|---|---|---|
| `tint` | `string` \| `null` | inherited | layout, page |
| `tint-mode` | `"auto"` \| `"light"` \| `"dark"` | inherited (defaults to `"auto"` at the root) | layout, page |
| `tint-lock` | `boolean` | `false` (inherited) | layout, page |

All three fields are optional at every level. Missing means inherit from the next outer level. To explicitly *break out* of a layout setting and revert to inherit-from-further-up, set the field to `null` (e.g., `tint: null` to remove an inherited named tint without applying a new one). Setting `tint-lock: false` explicitly in a page can unlock a page that lives under a locked layout.

The rune-level attributes (`tint`, `tint-mode` on individual runes) remain unchanged. They override page-level resolution for the scope of that rune's subtree. Rune-level `tint-lock` is **not** introduced — locking is a page concern, not a rune concern.

-----

## SSR & Rendering

At build time, the page transform pipeline runs cascade resolution alongside other frontmatter resolution. For each page it produces a single tuple:

```ts
type ResolvedTint = {
  tint: string | null;        // named tint preset, or null
  tintMode: 'auto' | 'light' | 'dark';
  locked: boolean;
};
```

The renderer uses this tuple to:

1. **Emit attributes on `<html>`:** `data-theme="dark"`, `data-tint="brand-warm"`, `data-tint-lock="true"`. CSS cascade reacts to these.
2. **Emit `<meta name="color-scheme">`** matching the resolved mode (when locked) or `light dark` (when unlocked, letting the browser hint UI).
3. **Set initial state for the client.** When unlocked, the client may swap `data-theme` based on user preference or saved choice. When locked, the client must not.
4. **Inject a small inline script** that runs before paint, checks saved user preference, and applies it — only when the page is unlocked. Same anti-FOIT pattern most theme-toggle implementations use.

The cascade resolution is pure: same inputs → same output. No runtime state. Build-time caching is straightforward.

-----

## Toggle UI

The theme toggle (if the site has one — typically supplied by Lumina or user-added) reads `data-tint-lock` on `<html>`:

- **Locked page:** toggle hides entirely. (Alternative: render disabled with a tooltip — author preference; spec is agnostic.)
- **Unlocked page:** toggle works as today. User preference persists across unlocked pages via `localStorage`; locked pages temporarily display their locked mode without disturbing the saved preference.

When a user is on a saved-light preference and navigates from an unlocked docs page to a locked-dark marketing page, the marketing page renders dark, the toggle disappears, the saved preference is untouched. When they navigate back to docs, the toggle returns and the page renders light again.

-----

## Implementation

1. **Resolution function.** Given a page path, walk up the layout chain accumulating frontmatter values (last-write-wins per field), fall back to `theme.colorScheme` at the root, return the resolved `(tint, tintMode, locked)` tuple. Lives in `packages/content/`.
2. **Frontmatter schema.** Add `tint`, `tint-mode`, `tint-lock` to the validated frontmatter shape for both layout and page frontmatter. Reject invalid `tint-mode` values at parse time.
3. **Renderer integration.** Surface the resolved tuple to whichever component renders `<html>` (currently in `@refrakt-md/svelte` ThemeShell). Emit `data-*` attributes and `<meta name="color-scheme">` accordingly.
4. **Inline pre-paint script.** Add the standard "read user preference from localStorage, apply data-theme before first paint" snippet. Skip if `data-tint-lock="true"`.
5. **Toggle component contract.** Lumina's theme toggle (or whatever the host theme uses) inspects `data-tint-lock` and hides itself when locked. Document the contract for theme authors.
6. **Adopt the cascade on the refrakt site.** Add `tint-mode: dark, tint-lock: true` to `site/content/_layout.md`. Add `tint-mode: auto, tint-lock: false` to `site/content/docs/_layout.md`, `site/content/runes/_layout.md`, and `site/content/plan/docs/_layout.md`. Verify rendering across one page in each subtree.
7. **Documentation page.** `/docs/themes/tint-cascade` with worked examples, the precedence table, and the locked-vs-preferred distinction explained. Use the design plugin's `palette` / `swatch` runes where relevant to show tints visually. Use the refrakt site's own configuration as the canonical example.

-----

## Acceptance Criteria

- [ ] SPEC-048 is implemented and merged
- [ ] `tint`, `tint-mode`, `tint-lock` accepted as fields in both `_layout.md` and page frontmatter, validated against a schema, rejected with a clear error on invalid values
- [ ] Page transform produces a resolved `(tint, tintMode, locked)` tuple per page, deterministic from layout chain + page frontmatter + site config
- [ ] SSR emits `data-theme`, `data-tint`, `data-tint-lock` on `<html>` matching the resolved values, and `<meta name="color-scheme">` matching the locked mode (or `light dark` when unlocked)
- [ ] Inline pre-paint script applies saved user preference on unlocked pages, no-ops on locked pages
- [ ] Theme toggle hides on locked pages (Lumina's implementation; theme authors document the same contract)
- [ ] A test site demonstrates: marketing subtree locked dark, docs subtree auto, individual blog post locked dark, named tint applied to a single page, rune-level override beating page-level
- [ ] The refrakt site itself adopts the cascade per the *Refrakt Site Adoption* section: root layout locked dark; `docs/`, `runes/`, and `plan/docs/` layouts switched to `auto` + `tint-lock: false`
- [ ] Visual regression / SSR snapshot confirms no flash of incorrect theme on locked marketing pages
- [ ] `/docs/themes/tint-cascade` exists and documents the cascade with worked examples, using the refrakt site's own configuration as the canonical example

-----

## Out of Scope

- **Toggle UI design.** The toggle's visual treatment is a theme concern (Lumina's job), not this spec's.
- **Defining new tint presets.** The mechanism for declaring named tints (`brand-warm`, etc.) lives in SPEC-048's tint config; this spec only consumes them.
- **Cascading non-tint frontmatter.** The cascade pattern could in principle generalise to other fields (presets, fonts, layout-specific options), but this spec only covers `tint` / `tint-mode` / `tint-lock`. Generalisation is a future decision worth making deliberately when there's a second use case.
- **Animated transitions between tint changes** when the user navigates from unlocked to locked. Defer; raw cuts are fine for v1.
- **A user-facing theme picker** showing multiple tints to choose from. Separate UX surface; not this spec.
- **Per-tint dark-mode pairing rules** (e.g., "the `brand-warm` tint has both a light and a dark variant; which renders depends on `tint-mode`"). SPEC-048's tint config handles this; this spec just surfaces whichever variant the cascade resolves to.

-----

## Open Questions

- **`tint-lock` field name.** Alternatives considered: `tint-locked`, `tint-strict`, `tint-fixed`, `lock-tint`. `tint-lock` reads as "the lock for the tint," which is fine; `tint-locked` reads as "the tint is locked" which is also fine. Bikeshed-able. Recommend `tint-lock` for parallel with `tint` and `tint-mode` (all three start with the same prefix), but worth a quick decision before implementation.
- **Should `null` and missing be distinguishable?** Setting `tint: null` to break out of an inherited named tint is a real authoring need; *missing* `tint` means inherit. YAML parsers handle this differently — needs explicit handling in the frontmatter schema so authors get predictable behaviour. Probably surface a `tint: ~` syntax in docs as the canonical "reset to inherit-up" idiom.
- **Should runes be able to read the resolved cascade?** A rune that needs to know its current tint context (e.g., an `<img>` swapping `src` between light and dark variants) might need access. Could expose via the rune transform's `config` argument, or as a CSS-only contract via attribute selectors on `<html>`. Lean CSS-only for v1 — keeps the rune API smaller — but worth flagging.
- **What about the `index.md` at site root?** It's neither under `/marketing/` nor `/docs/` — does it inherit only from the global config, or should there be a top-level `_layout.md` to set marketing-style defaults? Probably the latter; worth confirming the docs example shows this pattern.
- **Persistence model for unlocked-page user preference.** Today: localStorage. With locked pages in the mix, does that change? Lean no — locked pages don't write to localStorage; they only read it on unlock. But worth a behavioural test in the acceptance suite to make sure it doesn't drift.

{% /spec %}
