import pb from 'path-browserify';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import * as xml from 'fast-xml-parser';
import { unescapeFenceContent } from './fence-escape.js';

const { dirname, join, isAbsolute, normalize } = pb;
const { Tag } = Markdoc;

/** Check whether an href targets a .md file (editor-clickable file link). */
function isFileLink(href: string): boolean {
  const path = href.split('#')[0].split('?')[0];
  return path.endsWith('.md');
}

/** Split a fragment (and optional query) from a path: "./page.md#intro" → ["./page.md", "#intro"] */
function splitFragment(href: string): [path: string, suffix: string] {
  const hashIdx = href.indexOf('#');
  if (hashIdx !== -1) return [href.slice(0, hashIdx), href.slice(hashIdx)];
  return [href, ''];
}

export interface TargetFile {
  _id: string;
  content: string;
}

export const heading: Schema = {
  children: ['inline'],
  attributes: {
    level: { type: 'Number', required: true, render: false },
    property: { type: String, required: false },
  },
  transform(node, config) {
    const attributes = node.transformAttributes(config);
    const children = node.transformChildren(config);

    if (!attributes.id || typeof attributes.id !== 'string') {
      attributes.id = children
        .filter((child: any) => typeof child === 'string')
        .join(' ')
        .replace(/[?]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
    }

    return new Tag(
      `h${node.attributes['level']}`,
      attributes,
      children
    );
  }
}

export const paragraph: Schema = {
  children: ['inline'],
  attributes: {
    property: { type: String, required: false },
  },
  render: 'p',
}

export const fence: Schema = {
  render: 'fence',
  attributes: {
    content: {
      type: String,
      render: false,
    },
    process: { type: Boolean, render: false, default: false },
    language: { type: String, render: false, default: 'shell' },
  },
  transform(node, config) {
    const lang = node.attributes.language || 'shell';

    const pre = new Tag('pre', { 'data-language': lang }, [
      new Tag('code', { 'data-language': lang }, [unescapeFenceContent(node.attributes.content)])
    ]);
    return new Tag('div', { class: 'rf-codeblock' }, [pre]);
  }
}

export const list: Schema = {
  children: ['item'],
  attributes: {
    ordered: { type: Boolean, render: false, required: true },
    start: { type: Number },
    marker: { type: String, render: false },
  },
  transform(node, config) {
    return new Tag(
      node.attributes.ordered ? 'ol' : 'ul',
      node.transformAttributes(config),
      node.transformChildren(config)
    );
  },
}

export const item: Schema = {
  render: 'li',
  children: [
    'inline',
    'heading',
    'paragraph',
    'image',
    'table',
    'tag',
    'fence',
    'blockquote',
    'list',
    'hr',
  ],
  attributes: {
    property: { type: String, required: false },
    typeof: { type: String, required: false },
  }
};

export const em: Schema = {
  render: 'em',
  children: ['strong', 's', 'link', 'code', 'text', 'tag'],
  attributes: {
    marker: { type: String, render: true },
  },
};

export const strong: Schema = {
  render: 'strong',
  children: ['em', 's', 'link', 'code', 'text', 'tag'],
  attributes: {
    marker: { type: String, render: true },
  },
};

export const text: Schema = {
  attributes: {
    content: { type: String, required: true },
    property: { type: String, required: false },
  },
  transform(node, config) {
    const attr = node.transformAttributes(config);

    if (attr.property) {
      return new Tag('span', { 'data-field': attr.property }, [node.attributes.content] );
    }
    return node.attributes.content;
  },
};

export const link: Schema = {
  children: ['strong', 'em', 's', 'code', 'text', 'tag'],
  attributes: {
    href: { type: String, required: true },
    title: { type: String },
  },
  render: 'a',
  transform(node, config) {
    const { urls, path, filePath } = config.variables || {};
    let attributes = node.attributes;
    const href = node.attributes.href;

    // File-system links: resolve .md hrefs against the source file's path.
    // Authors write [link](./other-page.md) so editors can click-through,
    // and we rewrite them to proper URLs using the routing table.
    if (urls && filePath && isFileLink(href)) {
      const [linkPath, fragment] = splitFragment(href);
      const fileDir = dirname(filePath);
      const resolved = linkPath.startsWith('/')
        ? linkPath.slice(1)               // absolute from content root
        : normalize(join(fileDir, linkPath)); // relative to current file
      if (resolved in urls) {
        attributes = { ...attributes, href: urls[resolved] + fragment };
        return new Tag(this.render, attributes, node.transformChildren(config));
      }
    }

    // URL-space resolution (existing behavior)
    const dirName = path ? dirname(path) : '/';
    const absPath = dirName !== '/'
      ? join(dirName, href)
      : href;

    if (absPath in (urls || {})) {
      attributes = { ...attributes, href: urls[absPath] };
    }
    return new Tag(this.render, attributes, node.transformChildren(config));
  }
}

export const hardbreak = Markdoc.nodes.hardbreak;

export const image: Schema = {
  render: 'img',
  attributes: {
    src: { type: String, required: true },
    alt: { type: String },
    title: { type: String },
    property: { type: String },
  },
  transform(node, config) {
    const attr = node.transformAttributes(config);
    const svgFiles: TargetFile[] = config.variables?.svg || [];

    let src = node.attributes.src;
    if (!isAbsolute(src) && config.variables?.path) {
      src = join('/', dirname(config.variables.path), src);
    }

    const svg = svgFiles.find(file => file._id === src);

    if (svg) {
      const parser = new xml.XMLParser({ ignoreAttributes: false });
      let jObj = parser.parse(svg.content);
      const tag = jObjToTag('svg', jObj.svg);

      if (attr.property) {
        tag.attributes['data-field'] = attr.property;
      }
      tag.attributes.xmlns = undefined;

      return tag;
    }

    return new Tag(this.render, attr, node.transformChildren(config));
  },
};

export const table: Schema = {
  children: ['thead', 'tbody', 'tr'],
  attributes: {},
  transform(node, config) {
    const tableTag = new Tag('table', node.transformAttributes(config), node.transformChildren(config));
    return new Tag('div', { class: 'rf-table-wrapper' }, [tableTag]);
  }
}

function jObjToTag(tagName: string, content: Record<string, any> | Record<string, any>[]): any {
  if (Array.isArray(content)) {
    return content.map(c => jObjToTag(tagName, c));
  }

  let children: any[] = [];
  let attr: Record<string, string | undefined> = {};

  for (const [k, v] of Object.entries(content)) {
    if (k.startsWith('@_')) {
      attr[k.slice(2)] = v;
    } else if (k === '#text') {
      children.push(v);
    } else {
      children.push(jObjToTag(k, v));
    }
  }
  return new Tag(tagName, attr, children);
}
