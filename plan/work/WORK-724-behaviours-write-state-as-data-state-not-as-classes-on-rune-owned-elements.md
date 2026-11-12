{% work id="WORK-724" status="done" priority="medium" complexity="simple" source="SPEC-196" tags="behaviors, state, reveal, tabs, audio, copy, lumina" milestone="v0.50.0" pr="refrakt-md/refrakt#803" %}

# Behaviours write state as data-state, not as classes on rune-owned elements

{% ref "SPEC-196" /%} D6. Four behaviours write classes onto elements a rune owns. Under a theme
that chooses `classes: "none"`, that would put classes back on the page, and under a mapping
table it produces junk:

- `reveal`: `rf-reveal-step--visible` and `--hidden`;
- `tabs`: an `--active` class *derived from the first button's class*, so a mapping such as
  Tailwind would yield names like `px-3--active`;
- the audio player: `rf-track--active`;
- `copy`: a class for its copied state.

Each already has, or gets, a `data-state`, and the CSS moves to it.

## Acceptance Criteria

- [x] `reveal` sets `data-state` on each step and writes no class on it
- [x] `tabs` sets `data-state` on the active tab and panel, writes no class, and no longer reads a class from another element
- [x] The audio player sets `data-state` on the active track and writes no class on it
- [x] `copy` sets `data-state` for its copied state and writes no class on a rune-owned element
- [x] The Lumina rules for those states select `[data-state="…"]`
- [x] The behaviour tests for `reveal`, `tabs` and `copy` assert the attribute, and the audio player gains a test that does
- [x] A test fails when a behaviour calls `classList.add`, `classList.toggle` or assigns `className` on an element it did not create

## Approach

- Check each behaviour for an existing `data-state` (or `aria-selected`, `aria-current`) before
  adding one. Where ARIA already says the state, the CSS can select ARIA and no new attribute is
  needed.
- State values follow what exists: `active` / `inactive`, `visible` / `hidden`, `copied`.
- The last criterion's test can be narrow: it flags class writes on elements reached through a
  query, not on elements made with `createElement` in the same function. Behaviour-built UI is
  {% ref "WORK-725" /%}.

## References

- {% ref "SPEC-196" /%} D6.
- {% ref "ADR-048" /%}: implementation order, step 1.

## Resolution

Completed: 2026-11-12

Branch: `claude/rune-composition-layout-convention-hkqrzx`

### What was done
- `reveal.ts`: steps carry only `data-state="open"|"closed"` (already set); the root gets `data-enhanced` while the behaviour runs; cleanup restores `closed` and removes the marker. Lumina and skeleton `reveal.css` hide `:where(.rf-reveal[data-enhanced]) .rf-reveal-step:where([data-state="closed"])` and show `[data-state="open"]`.
- `tabs.ts`: no longer derives an `--active` class from the first button's class; `data-state` only. CSS: `tabs.css`, `codegroup.css`, `milestone.css` (the three blocks whose tabs the behaviour drives) select `[data-state="active"]`.
- `elements/audio.ts`: playlist tracks and chapter buttons get `data-state="active"|"inactive"`; disconnect clears the tracks' state. `audio.css` follows.
- `copy.ts`: `data-state="copied"` on its button; `code.css` follows.
- `drawer.ts`: `html[data-drawer-open]` instead of `html.rf-drawer-open` (the root is not an element the behaviour created, so the guard counts it); skeleton `drawer.css` follows.
- Every retargeted rule wraps the attribute in `:where()`, so specificity is unchanged.
- Tests: reveal, tabs and copy tests assert the attribute and that no class changed; new `packages/behaviors/test/audio.test.ts` drives a real `<rf-audio>` against a playlist; the class-write guard is in `no-class-reads.test.ts`.

### Notes
- **The reveal trap**: the server output marks every step `data-state="closed"` (`RevealStep.rootAttributes`). Mapping the hidden style to `[data-state="closed"]` alone would have hidden every step on a page without JavaScript, or before it loads. `data-enhanced` scopes the rule to a reveal the behaviour is running; no existing "enhanced" marker convention was found to reuse.
- Chapter buttons are behaviour-built, but they are reached through a query, so the guard could not tell them from rune-owned elements; moving them to `data-state` was cheaper than an exception.
- Beyond the four named runes, `drawer`'s page lock was the only other class write on an element a behaviour did not create (plus a script string written into a sandbox iframe's own document, allowlisted in the guard).

{% /work %}
