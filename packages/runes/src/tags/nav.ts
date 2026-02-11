import { Tag, RenderableTreeNode, RenderableTreeNodes, Node } from '@markdoc/markdoc';
import { headingsToList } from '../util.js';
import { schema } from '../registry.js';
import { attribute, Model } from '../lib/index.js';
import { createComponentRenderable, createSchema } from '../lib/index.js';

class NavItemModel extends Model {
  transform(): RenderableTreeNodes {
    const children = this.transformChildren({
      text: node => new Tag('span', { property: 'slug' }, [node.attributes.content]),
    });

    const slug = children.tag('span');
    const nestedItems = children.tag('ul');

    const itemChildren = nestedItems.count() > 0
      ? [...slug.toArray(), ...nestedItems.toArray()]
      : slug.toArray();

    return createComponentRenderable(schema.NavItem, {
      tag: 'li',
      properties: {
        slug,
        children: nestedItems.count() > 0
          ? nestedItems.flatten().tag('li')
          : undefined,
      },
      children: itemChildren,
    });
  }
}

const navItem = createSchema(NavItemModel);

class NavModel extends Model {
  @attribute({ type: Boolean, required: false })
  ordered: boolean = false;

  processChildren(nodes: Node[]) {
    return super.processChildren(headingsToList()(nodes));
  }

  transform(): RenderableTreeNodes {
    const children = this.transformChildren({
      item: navItem,
      list: (node, config) => {
        return new Tag('ul', {}, node.transformChildren(config));
      },
    });

    const hasGroups = children.headings().count() > 0;

    if (hasGroups) {
      const groups = this.buildGroups(children.toArray());

      return createComponentRenderable(schema.Nav, {
        tag: 'nav',
        class: this.ordered ? 'ordered' : undefined,
        properties: {
          group: groups,
          item: groups.flatMap(g =>
            g.children.filter((c): c is Tag => Tag.isTag(c) && c.name === 'ul')
              .flatMap(ul => ul.children.filter((c): c is Tag<'li'> => Tag.isTag(c) && c.name === 'li'))
          ),
        },
        children: groups,
      });
    }

    // Flat list (no groups)
    const allItems = children.flatten().tag('li');

    return createComponentRenderable(schema.Nav, {
      tag: 'nav',
      class: this.ordered ? 'ordered' : undefined,
      properties: {
        group: [],
        item: allItems,
      },
      children: children.toArray(),
    });
  }

  private buildGroups(allNodes: RenderableTreeNode[]): Tag<'section'>[] {
    const groups: Tag<'section'>[] = [];
    let currentHeading: Tag | null = null;
    let currentItems: Tag[] = [];

    const flush = () => {
      if (!currentHeading) return;
      groups.push(createComponentRenderable(schema.NavGroup, {
        tag: 'section',
        properties: {
          title: currentHeading as Tag<'h1'>,
          item: currentItems.flatMap(ul =>
            ul.children.filter((c): c is Tag<'li'> => Tag.isTag(c) && c.name === 'li')
          ),
        },
        children: [currentHeading, ...currentItems],
      }) as Tag<'section'>);
    };

    for (const node of allNodes) {
      if (node instanceof Tag && /^h[1-6]$/.test(node.name)) {
        flush();
        currentHeading = node;
        currentItems = [];
      } else if (node instanceof Tag && node.name === 'ul') {
        currentItems.push(node);
      }
    }

    flush();
    return groups;
  }
}

export const nav = createSchema(NavModel);
