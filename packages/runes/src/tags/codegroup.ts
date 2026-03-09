import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { createContentModelSchema, createComponentRenderable, asNodes } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

const languageNames: Record<string, string> = {
  js: 'JavaScript', ts: 'TypeScript', py: 'Python',
  rb: 'Ruby', rs: 'Rust', go: 'Go', sh: 'Shell',
  bash: 'Bash', zsh: 'Zsh', shell: 'Shell',
  html: 'HTML', css: 'CSS', json: 'JSON', yaml: 'YAML',
  sql: 'SQL', swift: 'Swift', kt: 'Kotlin', java: 'Java',
  cpp: 'C++', c: 'C', cs: 'C#', php: 'PHP',
};

function prettifyLanguage(lang: string): string {
  return languageNames[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

const overflowValues = ['scroll', 'wrap', 'hide'] as const;

export const codegroup = createContentModelSchema({
	attributes: {
		title: { type: String, required: false },
		labels: { type: String, required: false },
		overflow: { type: String, required: false, matches: overflowValues.slice() },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'panels', match: 'fence', greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const customLabels = (attrs.labels as string | undefined)?.split(',').map(l => l.trim()) ?? [];
		const tabItems: RenderableTreeNode[] = [];
		const panelItems: RenderableTreeNode[] = [];

		const panels = asNodes(resolved.panels);
		for (const child of panels) {
			const lang = child.attributes.language || 'shell';
			const label = customLabels[tabItems.length] || prettifyLanguage(lang);

			const nameSpan = new Tag('span', {}, [label]);
			tabItems.push(createComponentRenderable(schema.Tab, {
				tag: 'li',
				properties: { name: nameSpan },
				children: [nameSpan],
			}));

			const code = Markdoc.transform(child, config);
			panelItems.push(createComponentRenderable(schema.TabPanel, {
				tag: 'li',
				properties: {},
				children: [code],
			}));
		}

		const tabs = new RenderableNodeCursor(tabItems);
		const panelsCursor = new RenderableNodeCursor(panelItems);
		const tabList = tabs.wrap('ul');
		const panelList = panelsCursor.wrap('ul');

		const properties: Record<string, any> = { tab: tabs, panel: panelsCursor };
		const children: any[] = [];

		if (attrs.title) {
			const titleMeta = new Tag('meta', { content: attrs.title });
			properties.title = titleMeta;
			children.push(titleMeta);
		}

		const overflow = attrs.overflow as string | undefined;
		if (overflow && overflow !== 'scroll') {
			const overflowMeta = new Tag('meta', { content: overflow });
			properties.overflow = overflowMeta;
			children.push(overflowMeta);
		}

		children.push(tabList.next(), panelList.next());

		return createComponentRenderable(schema.CodeGroup, {
			tag: 'section',
			properties,
			refs: { tabs: tabList, panels: panelList },
			children,
		});
	},
});
