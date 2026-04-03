import Markdoc from '@markdoc/markdoc';
import type { Node, RenderableTreeNode } from '@markdoc/markdoc';
import type { ResolvedContent } from '@refrakt-md/types';
const { Ast, Tag } = Markdoc;
import { createComponentRenderable, createContentModelSchema, SplitLayoutModel, nameHelper as name, pageSectionProperties, asNodes } from '@refrakt-md/runes';
import { RenderableNodeCursor } from '@refrakt-md/runes';

export const step = createContentModelSchema({
  base: SplitLayoutModel,
  contentModel: {
    type: 'delimited',
    delimiter: 'hr',
    zones: [
      {
        name: 'main',
        type: 'sequence',
        fields: [
          { name: 'content', match: 'any', optional: true, greedy: true },
        ],
      },
      {
        name: 'side',
        type: 'sequence',
        fields: [
          { name: 'content', match: 'any', optional: true, greedy: true },
        ],
      },
    ],
  },
  transform(resolved, attrs, config) {
    const mainZone = (resolved.main ?? {}) as ResolvedContent;
    const sideZone = (resolved.side ?? {}) as ResolvedContent;

    const main = new RenderableNodeCursor(
      Markdoc.transform(asNodes(mainZone.content), config) as RenderableTreeNode[],
    );
    const side = new RenderableNodeCursor(
      Markdoc.transform(asNodes(sideZone.content), config) as RenderableTreeNode[],
    );

    const mainContent = main.wrap('div');
    const sideContent = side.wrap('div');

    const layout = (attrs.layout as string) || 'stacked';
    const ratio = (attrs.ratio as string) || '1 1';
    const valign = (attrs.valign as string) || 'top';
    const gap = (attrs.gap as string) || 'default';
    const collapse = attrs.collapse as string | undefined;

    const layoutMeta = new Tag('meta', { content: layout });
    const ratioMeta = layout !== 'stacked' ? new Tag('meta', { content: ratio }) : undefined;
    const valignMeta = layout !== 'stacked' ? new Tag('meta', { content: valign }) : undefined;
    const gapMeta = gap !== 'default' ? new Tag('meta', { content: gap }) : undefined;
    const collapseMeta = collapse ? new Tag('meta', { content: collapse }) : undefined;

    const children = [
      layoutMeta,
      ...(ratioMeta ? [ratioMeta] : []),
      ...(valignMeta ? [valignMeta] : []),
      ...(gapMeta ? [gapMeta] : []),
      ...(collapseMeta ? [collapseMeta] : []),
      mainContent.next(),
      ...(side.toArray().length > 0 ? [sideContent.next()] : []),
    ];

    return createComponentRenderable({ rune: 'step',
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
  },
  deprecations: {
    split: {
      newName: 'layout',
      transform: (val, attrs) => val ? (attrs.mirror ? 'split-reverse' : 'split') : undefined,
    },
    mirror: { newName: '_consumed' },
  },
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

    return createComponentRenderable({ rune: 'steps',
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
