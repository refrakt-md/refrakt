import { initRuneBehaviors, initLayoutBehaviors, registerBehaviors, tabsBehavior } from '@refrakt-md/behaviors';

// Register plan-specific behaviors
registerBehaviors({ 'milestone-backlog': tabsBehavior });

// Initialize all rune + layout behaviors on DOM ready
initRuneBehaviors(document);
initLayoutBehaviors(document);
