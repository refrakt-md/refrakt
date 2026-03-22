import { useSchema } from '@refrakt-md/types';
import { Spec } from './schema/spec.js';
import { Work } from './schema/work.js';
import { Bug } from './schema/bug.js';
import { Decision } from './schema/decision.js';
import { Milestone } from './schema/milestone.js';

export const schema = {
	Spec: useSchema(Spec).defineType('Spec'),
	Work: useSchema(Work).defineType('Work'),
	Bug: useSchema(Bug).defineType('Bug'),
	Decision: useSchema(Decision).defineType('Decision'),
	Milestone: useSchema(Milestone).defineType('Milestone'),
};
