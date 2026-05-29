import { initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';

// SPEC-072 / WORK-282 — the `milestone-backlog` and `plan-entity-tabs`
// wrappers (and the per-rune behaviors they registered) were retired with
// the plan plugin's postProcess injection. The bespoke `plan build` /
// `plan serve` bundle now ships only the shared rune/layout behaviors.

// Initialize all rune + layout behaviors on DOM ready
initRuneBehaviors(document);
initLayoutBehaviors(document);
