{% work id="WORK-477" status="done" priority="medium" complexity="simple" source="SPEC-108" milestone="v0.26.0" tags="reading,prose,runes,layouts,config" %}

# Reading per-rune + layout/region defaults

Assign the per-rune and layout-region reading defaults so the right bodies read as prose/ui/fine
with zero author markup. Per {% ref "SPEC-108" /%} §4 + Work breakdown 2.

## Scope

- Set `defaultReading` on editorial-body runes → `prose` (`pullquote`, `lore`, `blockquote`,
  `textblock`); UI runes → `ui` (or omit, since `ui` is the fallback) (`card`, `nav`, `form`);
  captions → `fine`.
- Set the `content`-region `reading` default per layout: `blog-article` → `prose`; `docs` → omit
  (so it stays `ui`, or a docs-tuned register).
- Verify the cascade end-to-end: a `pullquote` reads `prose` in any context; a `card` in a
  `blog-article` stays `ui`; bare article paragraphs in `blog-article` read `prose`.

## Acceptance Criteria

- [x] Assignment resolves from layout/region default → per-rune `defaultReading` → author override; a `blog-article` content region defaults to `prose` and a `docs` region does not.
- [x] Editorial-body runes default to `prose`, UI runes to `ui`, captions to `fine`; a `card` inside a `blog-article` stays `ui` while the bare article body reads `prose`.

## Dependencies

- {% ref "WORK-476" /%} — needs `defaultReading`, the region default field, and the resolver.

## References

- Spec: {% ref "SPEC-108" /%} §4 (assignment is layout-aware). `packages/transform/src/layouts.ts` (`blog-article`, `docs`), per-rune configs.

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-108-reading-defaults`

### What was done
- **Per-rune defaults** — `defaultReading: 'prose'` on `PullQuote` and `TextBlock`, `'fine'` on `Sidenote` (`packages/runes/src/config.ts`), and `'prose'` on `Lore` (`plugins/storytelling/src/config.ts`). Each already has a `data-section="body"`, so the engine now emits `data-reading` there.
- **Layout/region default** — `packages/transform/src/layout.ts` emits `data-reading` on a slot built from a `content` source when its `reading` is set (suppressed at `ui`); `blogArticleLayout`'s `rf-blog-article__body` content slot now sets `reading: 'prose'` so the bare article body reads as prose with zero markup. `docs`/`default` layouts omit it (→ `ui`).
- Tests: `layout.test.ts` covers the content-slot emission (prose / ui-suppressed / unset); the rune-default emission mechanism is covered by `reading.test.ts` (WORK-476) and verified against the real `baseConfig`.

### Notes
- The decision holds: the region default seeds **only the bare body** — a `card` (no `defaultReading`) inside a `blog-article` stays `ui` because runes resolve from `author ?? defaultReading ?? 'ui'` without the region default. Editorial runes (`pullquote`/`textblock`/`lore`) read `prose` anywhere because they self-declare.
- Structure contracts unchanged (the generator doesn't track `data-reading`). Lumina styling of `[data-reading="prose"]` + generalised `dropcap` is WORK-478.

{% /work %}
