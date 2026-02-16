import Markdoc from '@markdoc/markdoc';
import type { RenderableTreeNode } from '@markdoc/markdoc';
const { Tag } = Markdoc;
import { schema } from '../registry.js';
import { attribute, Model } from '../lib/index.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';
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

class CodeGroupModel extends Model {
  @attribute({ type: String, required: false })
  title: string | undefined;

  @attribute({ type: String, required: false })
  labels: string | undefined;

  transform() {
    const customLabels = this.labels?.split(',').map(l => l.trim()) ?? [];
    const tabItems: RenderableTreeNode[] = [];
    const panelItems: RenderableTreeNode[] = [];

    for (const child of this.node.children) {
      if (child.type !== 'fence') continue;

      const lang = child.attributes.language || 'shell';
      const label = customLabels[tabItems.length] || prettifyLanguage(lang);

      const nameSpan = new Tag('span', {}, [label]);
      tabItems.push(createComponentRenderable(schema.Tab, {
        tag: 'li',
        properties: { name: nameSpan },
        children: [nameSpan],
      }));

      const code = Markdoc.transform(child, this.config);
      panelItems.push(createComponentRenderable(schema.TabPanel, {
        tag: 'li',
        properties: {},
        children: [code],
      }));
    }

    const tabs = new RenderableNodeCursor(tabItems);
    const panels = new RenderableNodeCursor(panelItems);
    const tabList = tabs.wrap('ul');
    const panelList = panels.wrap('ul');

    const properties: Record<string, any> = { tab: tabs, panel: panels };
    const children: any[] = [];

    if (this.title) {
      const titleSpan = new Tag('span', {}, [this.title]);
      properties.title = new RenderableNodeCursor([titleSpan]).tag('span');
      children.push(titleSpan);
    }

    children.push(tabList.next(), panelList.next());

    return createComponentRenderable(schema.CodeGroup, {
      tag: 'section',
      properties,
      refs: { tabs: tabList, panels: panelList },
      children,
    });
  }
}

export const codegroup = createSchema(CodeGroupModel);
