import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
const { Ast, Tag } = Markdoc;
import { attribute, group, createComponentRenderable, createContentModelSchema, createSchema, NodeStream, SplitLayoutModel, nameHelper as name, pageSectionProperties, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';
import { schema } from '../types.js';

class StepModel extends SplitLayoutModel {
  @group({ section: 0 })
  main: NodeStream;

  @group({ section: 1})
  side: NodeStream;

  transform() {
    const main = this.main.transform();
    const side = this.side.transform();

    const mainContent = main.wrap('div');
    const sideContent = side.wrap('div');

    const layoutMeta = new Tag('meta', { content: this.layout });
    const ratioMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.ratio }) : undefined;
    const valignMeta = this.layout !== 'stacked' ? new Tag('meta', { content: this.valign }) : undefined;
    const gapMeta = this.gap !== 'default' ? new Tag('meta', { content: this.gap }) : undefined;
    const collapseMeta = this.collapse ? new Tag('meta', { content: this.collapse }) : undefined;

    const children = [
      layoutMeta,
      ...(ratioMeta ? [ratioMeta] : []),
      ...(valignMeta ? [valignMeta] : []),
      ...(gapMeta ? [gapMeta] : []),
      ...(collapseMeta ? [collapseMeta] : []),
      mainContent.next(),
      ...(side.toArray().length > 0 ? [sideContent.next()] : []),
    ];

    return createComponentRenderable(schema.Step, {
      tag: 'li',
      properties: {
        name: name(main),
        layout: layoutMeta,
        ratio: ratioMeta,
        valign: valignMeta,
        gap: gapMeta,
        collapse: collapseMeta,
      },
      refs: {
        content: mainContent.tag('div'),
        media: sideContent.tag('div'),
      },
      children,
    });
  }
}

export const step = createSchema(StepModel, {
  split: {
    newName: 'layout',
    transform: (val, attrs) => val ? (attrs.mirror ? 'split-reverse' : 'split') : undefined,
  },
  mirror: { newName: '_consumed' },
});

export const steps = createContentModelSchema({
  attributes: {},
  contentModel: () => ({
    when: [
      {
        condition: { hasChild: 'heading' },
        model: {
          type: 'sections' as const,
          sectionHeading: 'heading',
          fields: [
            { name: 'header', match: 'heading|paragraph', optional: true, greedy: true },
          ],
          sectionModel: {
            type: 'sequence' as const,
            fields: [{ name: 'body', match: 'any', optional: true, greedy: true }],
          },
        },
      },
    ],
    default: {
      type: 'sequence' as const,
      fields: [
        { name: 'header', match: 'paragraph', optional: true, greedy: true },
        { name: 'list', match: 'list:ordered', optional: true },
      ],
    },
  }),
  transform(resolved, attrs, config) {
    const headerNodes = new RenderableNodeCursor(
      Markdoc.transform(asNodes(resolved.header), config) as RenderableTreeNode[],
    );

    let stepItems: RenderableNodeCursor<any>;

    if (resolved.sections) {
      // Heading-based steps: build step tags from resolved sections
      const sections = resolved.sections as Array<{
        $headingNode: Node;
        body: unknown;
      }>;
      const stepTagNodes = sections.map(section =>
        new Ast.Node('tag', {}, [section.$headingNode, ...asNodes(section.body)], 'step'),
      );
      const stepStream = new RenderableNodeCursor(
        Markdoc.transform(stepTagNodes, config) as RenderableTreeNode[],
      );
      stepItems = stepStream.tag('li').typeof('Step');
    } else {
      // List-based steps: convert ordered list items to step tags
      const listNode = asNodes(resolved.list)[0] as Node | undefined;
      const itemNodes = listNode?.children ?? [];
      const stepTagNodes = itemNodes.map(item =>
        new Ast.Node('tag', {}, item.children, 'step'),
      );
      const stepStream = new RenderableNodeCursor(
        Markdoc.transform(stepTagNodes, config) as RenderableTreeNode[],
      );
      stepItems = stepStream.tag('li').typeof('Step');
    }

    const stepList = new Tag('ol', {}, stepItems.toArray());

    const children = headerNodes.count() > 0
      ? [...headerNodes.toArray(), stepList]
      : [stepList];

    return createComponentRenderable(schema.Steps, {
      tag: 'section',
      property: 'contentSection',
      properties: {
        step: stepItems,
      },
      refs: {
        ...pageSectionProperties(headerNodes),
      },
      children,
    });
  },
});
