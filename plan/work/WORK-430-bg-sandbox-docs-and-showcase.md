{% work id="WORK-430" status="blocked" priority="medium" complexity="moderate" source="SPEC-104" milestone="v0.24.0" tags="surfaces,bg,sandbox,docs,showcase" %}

# `bg` sandbox guest — docs + showcase

{% ref "SPEC-104" /%} §6 + docs: document the `bg` guest body, the bare-surface guardrail,
the `sandbox` preset (with the `refrakt.config.json` example), and the boot-frame layering;
ship the music-blog backdrop pattern as a working showcase exercising the layout-cascade +
{% ref "SPEC-006" /%} audio-bridge composition.

## Scope

- **`bg` reference** — document the guest body (`{% bg %}{% sandbox %}{% /bg %}`), the
  bare-surface guardrail (chromed runes stay subjects), the `sandbox` preset + the
  `refrakt.config.json` example, and how the boot-frame `gradient`/`image` composes behind
  the guest.
- **Reuse pattern** (§6) — show value reuse via the named preset and **placement reuse**
  via the layout cascade (`bg="…"` in a `blog-article` layout region once), and note that
  the {% ref "SPEC-006" /%} bridge binds each page's own audio to the shared scene.
- **Showcase** — a music-blog hero: a playlist (or hero) with a sandbox visualizer backdrop
  + a positioned mood image, on every post via the layout. Reuses an existing scene
  (e.g. `site/examples/`), no new audio-bridge work here.
- Cross-link `media-guests.md` and the `bg` reference.

## Acceptance Criteria

- [ ] The `bg` reference documents the guest body, the bare-surface guardrail, the `sandbox` preset (with the `refrakt.config.json` example), and boot-frame layering.
- [ ] The reuse pattern is documented: named preset (value) + layout-cascade placement, with the {% ref "SPEC-006" /%} audio bridge cross-linked (not re-specified here).
- [ ] A working showcase renders a sandbox backdrop + positioned mood image on a blog-article-style page; reduced-motion/no-JS shows the complete static page.
- [ ] CSS coverage passes for any new bg-guest selectors; contracts green.

## Dependencies

- {% ref "WORK-428" /%}, {% ref "WORK-429" /%} — documents and demonstrates both.

## References

- {% ref "SPEC-104" /%} §6 · {% ref "SPEC-006" /%} (audio bridge, cross-linked) · `site/content/runes/bg.md`, `site/content/runes/media-guests.md` · `site/examples/`.

{% /work %}
