import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNode, Node } from '@markdoc/markdoc';
import { headingsToList } from '../util.js';
import { createContentModelSchema, asNodes } from '../lib/index.js';
import { createComponentRenderable } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** Sentinel meta property written by nav auto mode; consumed by corePipelineHooks.postProcess */
export const NAV_AUTO_SENTINEL = '__nav-auto';

const navItem = createContentModelSchema({
  contentModel: {
    type: 'sequence',
    fields: [
      { name: 'body', match: 'any', optional: true, greedy: true },
    ],
  },
  transform(resolved, attrs, config) {
    const children = new RenderableNodeCursor(
      Markdoc.transform(asNodes(resolved.body), {
        ...config,
        nodes: {
          ...config.nodes,
          text: {
            transform(node: Node) {
              return new Markdoc.Tag('span', { 'data-field': 'slug' }, [node.attributes.content]);
            },
          },
        },
      }) as RenderableTreeNode[],
    );

    const slug = children.tag('span');
    const nestedItems = children.tag('ul');

    const itemChildren = nestedItems.count() > 0
      ? [...slug.toArray(), ...nestedItems.toArray()]
      : slug.toArray();

    return createComponentRenderable({ rune: 'nav-item',
      tag: 'li',
      properties: {
        slug,
        children: nestedItems.count() > 0
          ? nestedItems.flatten().tag('li')
          : undefined,
      },
      children: itemChildren,
    });
  },
});

function buildGroups(allNodes: RenderableTreeNode[]): Tag<'section'>[] {
  const groups: Tag<'section'>[] = [];
  let currentHeading: Tag | null = null;
  let currentItems: Tag[] = [];

  const flush = () => {
    if (!currentHeading) return;
    groups.push(createComponentRenderable({ rune: 'nav-group',
      tag: 'section',
      properties: {
        title: currentHeading as Tag<'h1'>,
        item: currentItems.flatMap(ul =>
          ul.children.filter((c): c is Tag<'li'> => Markdoc.Tag.isTag(c) && c.name === 'li')
        ),
      },
      children: [currentHeading, ...currentItems],
    }) as Tag<'section'>);
  };

  for (const node of allNodes) {
    if (node instanceof Markdoc.Tag && /^h[1-6]$/.test(node.name)) {
      flush();
      currentHeading = node;
      currentItems = [];
    } else if (node instanceof Markdoc.Tag && node.name === 'ul') {
      currentItems.push(node);
    }
  }

  flush();
  return groups;
}

export const nav = createContentModelSchema({
  attributes: {
    ordered: { type: Boolean, required: false, description: 'Use numbered list for navigation items' },
    auto: { type: Boolean, required: false, description: 'Automatically generate from child pages' },
  },
  contentModel: {
    type: 'custom',
    processChildren: (nodes) => headingsToList({ level: 1 })(nodes as Node[]),
    description: 'Top-level (#) headings become nav groups; the list directly under each heading becomes the group\'s items. Items are page slugs — wrap in markdown links to set custom labels, or use plain text to resolve the page title. Without headings, a single list becomes a flat nav.',
  },
  transform(resolved, attrs, config) {
    if (attrs.auto) {
      // Emit a placeholder with an empty nav and a sentinel meta tag.
      // The core post-process hook will replace this with resolved child page items.
      const sentinelMeta = new Markdoc.Tag('meta', { 'data-field': NAV_AUTO_SENTINEL, content: 'true' });

      return createComponentRenderable({ rune: 'nav',
        tag: 'nav',
        properties: {
          group: [],
          item: [],
        },
        children: [sentinelMeta],
      });
    }

    const children = new RenderableNodeCursor(
      Markdoc.transform(asNodes(resolved.children), {
        ...config,
        nodes: {
          ...config.nodes,
          item: navItem,
          list: {
            transform(node: Node, cfg: any) {
              return new Markdoc.Tag('ul', {}, node.transformChildren(cfg));
            },
          },
        },
      }) as RenderableTreeNode[],
    );

    const hasGroups = children.headings().count() > 0;

    if (hasGroups) {
      const groups = buildGroups(children.toArray());

      return createComponentRenderable({ rune: 'nav',
        tag: 'nav',
        class: attrs.ordered ? 'ordered' : undefined,
        properties: {
          group: groups,
          item: groups.flatMap(g =>
            g.children.filter((c): c is Tag => Markdoc.Tag.isTag(c) && c.name === 'ul')
              .flatMap(ul => ul.children.filter((c): c is Tag<'li'> => Markdoc.Tag.isTag(c) && c.name === 'li'))
          ),
        },
        children: groups,
      });
    }

    // Flat list (no groups)
    const allItems = children.flatten().tag('li');

    return createComponentRenderable({ rune: 'nav',
      tag: 'nav',
      class: attrs.ordered ? 'ordered' : undefined,
      properties: {
        group: [],
        item: allItems,
      },
      children: children.toArray(),
    });
  },
});
