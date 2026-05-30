import pb from 'path-browserify';
import Markdoc from '@markdoc/markdoc';
import type { Schema } from '@markdoc/markdoc';
import * as xml from 'fast-xml-parser';
import { unescapeFenceContent } from './fence-escape.js';

const { dirname, join, isAbsolute } = pb;
const { Tag } = Markdoc;

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
        // Strip URL-unsafe punctuation that breaks fragment links. `%` in
        // particular trips `decodeURI` (SvelteKit's prerender crawler) when
        // it isn't followed by a valid hex pair — e.g. a heading whose text
        // contains a literal `{% symbol %}` would otherwise produce an id
        // like `…-{%-symbol-%}-…` and crash the prerender.
        .replace(/[?{}%]/g, '')
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
    // SPEC-062 / WORK-304 — fence-level annotation contract. All four are
    // valid on hand-authored fences via Markdoc annotations (e.g. ```ts {%
    // source="theme.ts" lines="74-125" linenumbers=true highlight="80-85" %}).
    // Snippet's preprocess stamps `source` / `lines` on fences it
    // synthesizes (and propagates author-set `linenumbers` / `highlight`
    // from the rune). Consumer runes (codegroup, diff) read these names
    // directly from `node.attributes` pre-transform and use them for tab
    // labels / diff header / per-side gutter offset.
    source: { type: String, render: false },
    lines: { type: String, render: false },
    linenumbers: { type: Boolean, render: false, default: false },
    highlight: { type: String, render: false },
    // Per-fence tab label hint consumed by `codegroup` (WORK-304). Inert on
    // standalone fences; ignored when the parent rune doesn't read it.
    label: { type: String, render: false },
  },
  transform(node, config) {
    const lang = node.attributes.language || 'shell';

    // Forward declared annotation attributes as `data-*` on the rendered
    // <pre> and <code>. Both get the same set so the highlight transform
    // (which keys off the inner <code data-language>) and the CSS
    // line-number / line-status selectors (which key off the outer <pre>)
    // each see what they need. Empty / falsy values are dropped so
    // unset annotations don't pollute the DOM.
    const preAttrs: Record<string, unknown> = { 'data-language': lang };
    const codeAttrs: Record<string, unknown> = { 'data-language': lang };

    const source = node.attributes.source;
    if (typeof source === 'string' && source.length > 0) {
      preAttrs['data-source'] = source;
      codeAttrs['data-source'] = source;
    }
    const lines = node.attributes.lines;
    if (typeof lines === 'string' && lines.length > 0) {
      preAttrs['data-lines'] = lines;
      codeAttrs['data-lines'] = lines;
      // Seed --rf-start-line so the CSS counter for line numbers begins
      // at the file's actual offset rather than 1. Parse the start of the
      // range; `--rf-start-line: <start - 1>` so the first increment lands
      // on <start>. Silently no-op on malformed values.
      const match = /^(\d+)/.exec(lines.trim());
      if (match) {
        const startLine = Number(match[1]);
        if (Number.isFinite(startLine) && startLine > 0) {
          const existingStyle = typeof preAttrs.style === 'string' ? `${preAttrs.style}; ` : '';
          preAttrs.style = `${existingStyle}--rf-start-line: ${startLine - 1}`;
        }
      }
    }
    if (node.attributes.linenumbers === true) {
      preAttrs['data-linenumbers'] = 'true';
      codeAttrs['data-linenumbers'] = 'true';
    }
    const highlight = node.attributes.highlight;
    if (typeof highlight === 'string' && highlight.length > 0) {
      preAttrs['data-highlight-lines'] = highlight;
      codeAttrs['data-highlight-lines'] = highlight;
    }

    // Forward any raw `data-*` attributes from the fence node (e.g. the
    // legacy `data-snippet-error` produced by the snippet error-fence
    // path). Authored fences with `{% data-foo="bar" %}` style annotations
    // already need to declare `data-foo` on the schema for Markdoc to
    // accept them — this just lets snippet's error path pass through.
    for (const [key, value] of Object.entries(node.attributes)) {
      if (key.startsWith('data-')) {
        preAttrs[key] = value;
        codeAttrs[key] = value;
      }
    }

    const pre = new Tag('pre', preAttrs, [
      new Tag('code', codeAttrs, [unescapeFenceContent(node.attributes.content)])
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
    const { urls, path } = config.variables || {};
    const dirName = path ? dirname(path) : '/';
    let attributes = node.attributes;
    const absPath = dirName !== '/'
      ? join(dirName, node.attributes.href)
      : node.attributes.href;

    if (absPath in (urls || {})) {
      const href = urls[absPath];
      attributes = { ...attributes, href };
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
