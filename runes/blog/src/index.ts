import type { RunePackage } from '@refrakt-md/types';
import { blog } from './tags/blog.js';
import { config } from './config.js';
import { blogPipelineHooks } from './pipeline.js';

export const blogPackage: RunePackage = {
	name: 'blog',
	displayName: 'Blog',
	version: '0.8.2',
	runes: {
		'blog': {
			transform: blog,
			description: 'Blog post listing with filtering, sorting, and multiple layouts. Displays pages from a content folder as a navigable blog index.',
			seoType: 'Blog',
			reinterprets: { heading: 'section title', paragraph: 'section description' },
			fixture: `{% blog folder="/blog" sort="date-desc" layout="list" %}
# Latest Posts

Browse our recent articles and updates.
{% /blog %}`,
		},
	},
	theme: {
		runes: config as unknown as Record<string, Record<string, unknown>>,
	},
	pipeline: blogPipelineHooks,
};

export default blogPackage;
