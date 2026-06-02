import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode, Tag as TagType } from '@markdoc/markdoc';
const { Tag } = Markdoc;
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

/** Extract the trailing filename from a project-root-relative path.
 *  Falls back to the trimmed input when no separator is present. */
function basename(path: string): string {
  if (!path) return '';
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  const slash = trimmed.lastIndexOf('/');
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

/** Derive a tab label from a fence's `source` (+ optional `lines`) annotation:
 *  `theme.ts` standalone, or `theme.ts:74-125` when a range is specified.
 *  Returns empty string when no `source` is set so callers can fall through
 *  to the next step in the label-resolution chain. */
function labelFromSource(source: string | undefined, lines: string | undefined): string {
  if (!source) return '';
  const name = basename(source);
  if (!name) return '';
  return lines ? `${name}:${lines}` : name;
}

const overflowValues = ['scroll', 'wrap', 'hide'] as const;

export const codegroup = createContentModelSchema({
	attributes: {
		title: { type: String, required: false, description: 'Title displayed above the code group' },
		labels: { type: String, required: false, description: 'Comma-separated custom tab labels' },
		overflow: { type: String, required: false, matches: overflowValues.slice(), description: 'How overflowing code is handled' },
	},
	contentModel: {
		type: 'sequence',
		fields: [
			{ name: 'panels', match: 'fence', greedy: true },
		],
	},
	transform(resolved, attrs, config) {
		const customLabels = (attrs.labels as string | undefined)?.split(',').map(l => l.trim()) ?? [];

		const properties: Record<string, any> = {};
		const children: any[] = [];

		// Emit the title meta whenever the attribute is *present* — even an
		// empty string. `title=""` opts into the window chrome (stoplights)
		// without a filename; an absent `title` renders no topbar at all.
		if (attrs.title !== undefined) {
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

		const panels = asNodes(resolved.panels);
		const chromeOnly = panels.length === 1 && customLabels.length === 0;

		if (chromeOnly) {
			const code = Markdoc.transform(panels[0], config);
			children.push(code);

			return createComponentRenderable({ rune: 'code-group',
				tag: 'section',
				properties,
				refs: {},
				children,
			});
		}

		const tabItems: TagType[] = [];
		const panelItems: TagType[] = [];

		for (const child of panels) {
			const lang = child.attributes.language || 'shell';
			// Label precedence (WORK-304):
			//   1. Group-level `labels=` positional override
			//   2. Per-fence `label` annotation (` ```ts {% label="X" %} `)
			//   3. Derived from fence `source` annotation (basename, with
			//      `:lines` suffix when set) — populated automatically when
			//      the panel is `{% snippet %}`-derived, and authorable on
			//      hand-written fences for the same effect
			//   4. Prettified language name (today's default)
			const fenceLabelAttr = typeof child.attributes.label === 'string'
				? (child.attributes.label as string)
				: '';
			const sourceLabel = labelFromSource(
				typeof child.attributes.source === 'string' ? child.attributes.source as string : undefined,
				typeof child.attributes.lines === 'string' ? child.attributes.lines as string : undefined,
			);
			const label = customLabels[tabItems.length]
				|| fenceLabelAttr
				|| sourceLabel
				|| prettifyLanguage(lang);

			const nameSpan = new Tag('span', {}, [label]);
			tabItems.push(new Tag('button', { 'data-name': 'tab', role: 'tab' }, [nameSpan]));

			const code = Markdoc.transform(child, config);
			panelItems.push(new Tag('div', { role: 'tabpanel' }, [code]));
		}

		const tabs = new RenderableNodeCursor(tabItems);
		const panelsCursor = new RenderableNodeCursor(panelItems);
		const tabList = tabs.wrap('div', { role: 'tablist' });
		const panelList = panelsCursor.wrap('div');

		children.push(tabList.next(), panelList.next());

		return createComponentRenderable({ rune: 'code-group',
			tag: 'section',
			properties,
			refs: { tabs: tabList, panels: panelList, panel: panelsCursor },
			children,
		});
	},
});
