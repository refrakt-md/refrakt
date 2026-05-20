import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNode, Node } from '@markdoc/markdoc';
import { headingsToList } from '../util.js';
import { createContentModelSchema, asNodes } from '../lib/index.js';
import { createComponentRenderable } from '../lib/index.js';
import { RenderableNodeCursor } from '../lib/renderable.js';

/** Sentinel meta property written by nav auto mode; consumed by corePipelineHooks.postProcess */
export const NAV_AUTO_SENTINEL = '__nav-auto';

/** Marker attribute placed on each NavGroup of a collapsible nav; resolved during postProcess */
export const NAV_COLLAPSED_AUTO = 'auto';

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

    const links = children.tag('a');
    const slug = children.tag('span');
    const nestedItems = children.tag('ul');

    // Explicit links (e.g., [Label](/path)) pass through as-is — no slug resolution needed
    if (links.count() > 0) {
      return createComponentRenderable({ rune: 'nav-item',
        tag: 'li',
        properties: {},
        children: links.toArray(),
      });
    }

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

function buildGroups(allNodes: RenderableTreeNode[]): { topLevel: Tag[], groups: Tag<'section'>[] } {
  const topLevel: Tag[] = [];
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
      if (!currentHeading) {
        // Items before the first heading become top-level items
        topLevel.push(...node.children.filter((c): c is Tag<'li'> => Markdoc.Tag.isTag(c) && c.name === 'li'));
      } else {
        currentItems.push(node);
      }
    }
  }

  flush();
  return { topLevel, groups };
}

export const nav = createContentModelSchema({
  attributes: {
    ordered: { type: Boolean, required: false, description: 'Use numbered list for navigation items' },
    auto: { type: Boolean, required: false, description: 'Automatically generate from child pages' },
    layout: { type: String, required: false, matches: ['vertical', 'menubar', 'columns', 'cards'], description: 'Presentation layout: sidebar (vertical), horizontal menubar (header), column grid (footer), or cards (section landing). Defaults to vertical.' },
    collapsible: { type: Boolean, required: false, description: 'Make each group collapsible. The group containing the current page auto-expands; others start collapsed. Only meaningful for vertical layout.' },
    defaultOpen: { type: String, required: false, description: 'Comma-separated group titles to expand by default, overriding the URL-driven auto-open behaviour.' },
  },
  contentModel: {
    type: 'custom',
    processChildren: (nodes) => headingsToList({ level: 1 })(nodes as Node[]),
    description: 'Top-level (#) headings become nav groups; the list directly under each heading becomes the group\'s items. Items are page slugs — wrap in markdown links to set custom labels, or use plain text to resolve the page title. Without headings, a single list becomes a flat nav.',
  },
  transform(resolved, attrs, config) {
    const collapsible = Boolean(attrs.collapsible);
    const sourcePath = (config as { variables?: { __sourcePath?: string } }).variables?.__sourcePath;

    const forwardLayout = (tag: Tag): Tag => {
      if (attrs.layout) tag.attributes.layout = attrs.layout;
      if (sourcePath) tag.attributes['data-source-path'] = sourcePath;
      if (collapsible) {
        tag.attributes['data-collapsible'] = 'true';
        const existing = (tag.attributes.class as string | undefined) ?? '';
        tag.attributes.class = [existing, 'rf-nav--collapsible'].filter(Boolean).join(' ');
        if (typeof attrs.defaultOpen === 'string' && attrs.defaultOpen.trim()) {
          tag.attributes['data-default-open'] = attrs.defaultOpen.trim();
        }
      }
      return tag;
    };

    const maybeWithTrigger = (children: RenderableTreeNode[]): RenderableTreeNode[] => {
      if (attrs.layout === 'menubar') {
        const trigger = new Markdoc.Tag('button', {
          'data-name': 'trigger',
          type: 'button',
          'aria-label': 'Toggle navigation',
          'aria-expanded': 'false',
        }, []);
        return [trigger, ...children];
      }
      return children;
    };

    if (attrs.auto) {
      // Emit a placeholder with an empty nav and a sentinel meta tag.
      // The core post-process hook will replace this with resolved child page items.
      const sentinelMeta = new Markdoc.Tag('meta', { 'data-field': NAV_AUTO_SENTINEL, content: 'true' });

      return forwardLayout(createComponentRenderable({ rune: 'nav',
        tag: 'nav',
        properties: {
          group: [],
          item: [],
        },
        children: maybeWithTrigger([sentinelMeta]),
      }));
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
      const { topLevel, groups } = buildGroups(children.toArray());

      if (collapsible) {
        for (const group of groups) {
          group.attributes['data-collapsed'] = NAV_COLLAPSED_AUTO;
        }
      }

      const topLevelContainer = topLevel.length > 0
        ? new Markdoc.Tag('div', { 'data-name': 'top-level' }, [new Markdoc.Tag('ul', {}, topLevel)])
        : null;

      const allGroupItems = groups.flatMap(g =>
        g.children.filter((c): c is Tag => Markdoc.Tag.isTag(c) && c.name === 'ul')
          .flatMap(ul => ul.children.filter((c): c is Tag<'li'> => Markdoc.Tag.isTag(c) && c.name === 'li'))
      );

      return forwardLayout(createComponentRenderable({ rune: 'nav',
        tag: 'nav',
        class: attrs.ordered ? 'ordered' : undefined,
        properties: {
          group: groups,
          item: [...topLevel, ...allGroupItems],
        },
        children: maybeWithTrigger(topLevelContainer ? [topLevelContainer, ...groups] : groups),
      }));
    }

    // Flat list (no groups)
    const allItems = children.flatten().tag('li');

    return forwardLayout(createComponentRenderable({ rune: 'nav',
      tag: 'nav',
      class: attrs.ordered ? 'ordered' : undefined,
      properties: {
        group: [],
        item: allItems,
      },
      children: maybeWithTrigger(children.toArray()),
    }));
  },
});
