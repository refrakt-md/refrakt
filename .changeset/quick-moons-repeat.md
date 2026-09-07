---
'@refrakt-md/transform': minor
'@refrakt-md/runes': patch
'@refrakt-md/storytelling': patch
'@refrakt-md/places': patch
---

Lint slot/role mismatches so section-role drift cannot recur (SPEC-125 Phase 1)

The twelve corrections in this milestone were found by an ad-hoc script comparing each rune's declared slots against its `sections` map. Nothing stopped the same drift returning the next time a rune gained a `body` slot — and the failure mode is silent: `reading`, `dropcap` and `prominence` are simply dropped.

`@refrakt-md/transform` now exports two new functions. `declaredSlots(config)` collects every slot a rune declares, from all five config fields that can introduce one (`layout`, `structure`, `autoLabel`, `blocks`, `contentWrapper`) — the reconstruction the ad-hoc script had to do by hand. `lintSectionRoles(runes)` builds on it and flags a rune declaring a `body` or heading slot with no matching role.

`validateThemeConfig` runs the lint, so `refrakt validate` and `refrakt plugin validate` fail on drift with a non-zero exit rather than only warning. Across the 132-rune catalogue the check is quiet: no findings, and no noise from the ~105 genuinely bodyless runes.

The check is **direction-only** — it flags a *missing* role and never a role that is present. A `body` role on a non-prose region (`datatable`'s table, `showcase`'s viewport) is an overload of what `body` means, not a data error, and themes style those roles directly; flagging them would push someone toward removing a correct role.

New `RuneConfig.sectionRoleExceptions` records a deliberate decision not to map a slot, keyed by slot name and valued by the reason, so the reasoning travels with the rune instead of living only in a commit message. Applied to the five runes this milestone deliberately left without a header-ish role — `accordion-item`, the three storytelling `*-section` runes, and `itinerary-day` — each carrying its own justification.

Theme and plugin authors upgrading may see `refrakt validate` fail on a rune that was quietly dropping an attribute. That is the check working: map the role, or record why not.
