{% work id="WORK-724" status="ready" priority="medium" complexity="simple" source="SPEC-196" tags="behaviors, state, reveal, tabs, audio, copy, lumina" milestone="v0.50.0" %}

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

- [ ] `reveal` sets `data-state` on each step and writes no class on it
- [ ] `tabs` sets `data-state` on the active tab and panel, writes no class, and no longer reads a class from another element
- [ ] The audio player sets `data-state` on the active track and writes no class on it
- [ ] `copy` sets `data-state` for its copied state and writes no class on a rune-owned element
- [ ] The Lumina rules for those states select `[data-state="…"]`
- [ ] The behaviour tests for `reveal`, `tabs` and `copy` assert the attribute, and the audio player gains a test that does
- [ ] A test fails when a behaviour calls `classList.add`, `classList.toggle` or assigns `className` on an element it did not create

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

{% /work %}
