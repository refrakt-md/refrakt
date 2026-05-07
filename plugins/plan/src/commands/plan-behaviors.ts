import { initRuneBehaviors, initLayoutBehaviors, registerBehaviors, tabsBehavior } from '@refrakt-md/behaviors';
import { entityTabsBehavior } from '../entity-tabs-behavior.js';

// Register plan-specific behaviors
registerBehaviors({ 'milestone-backlog': tabsBehavior, 'plan-entity-tabs': entityTabsBehavior });

// Initialize all rune + layout behaviors on DOM ready
initRuneBehaviors(document);
initLayoutBehaviors(document);
