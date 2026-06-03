import { NodeType } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { Tag, RenderableTreeNodes } from '@markdoc/markdoc';
import { toKebabCase } from '@refrakt-md/transform';
import { RenderableNodeCursor } from './renderable.js';

export { toKebabCase };

export interface TransformResult {
  tag: NodeType;
  id?: string;
  class?: string;
  /** Structural property name — becomes data-field on the wrapper (BEM/theming) */
  property?: string;
  properties?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  refs?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  /** Schema.org property mappings — sets RDFa `property` attribute on referenced tags */
  schema?: Record<string, RenderableNodeCursor<Tag> | Tag | Tag[] | undefined>;
  /** Override the schema.org typeof attribute */
  typeof?: string;
  children: RenderableTreeNodes;
}

/** Rune identity + transform result — single-object form for createComponentRenderable */
export interface InlineTransformResult extends TransformResult {
  /** Rune name in kebab-case (e.g. 'hint', 'accordion-item') */
  rune: string;
  /** Schema.org type (e.g. 'FAQPage') — only needed for runes with structured data */
  schemaOrgType?: string;
}

/**
 * Create a renderable tag with rune identity and structural metadata.
 *
 * Pass a single object with `rune` (kebab-case name), the tag spec, and
 * optional `schemaOrgType` for Schema.org structured data.
 */
export function createComponentRenderable(result: InlineTransformResult): Tag {
  const runeName = result.rune;
  const schemaOrgType = result.typeof ?? result.schemaOrgType;

  // Validate that property and ref names don't collide (ADR-008: flat namespace)
  if (result.properties && result.refs) {
    const propKeys = new Set(Object.keys(result.properties));
    const collisions = Object.keys(result.refs).filter(k => propKeys.has(k));
    if (collisions.length > 0) {
      throw new Error(
        `Rune "${runeName}" has naming collisions between properties and refs: ${collisions.join(', ')}. ` +
        `Properties and refs share a flat namespace (ADR-008) and must have unique names.`
      );
    }
  }

  // SPEC-082 (WORK-329): the schema.org SEO channel is independent of the data
  // channel. Collect the `schema`-mapped tags up front so the properties loop
  // can distinguish an SEO carrier from a pure data carrier.
  const schemaTags = new Set<unknown>();
  for (const v of Object.values(result.schema ?? {})) {
    if (v === undefined) continue;
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];
    for (const t of tags) schemaTags.add(t);
  }

  // Project scalar field values into the reserved `data-rune-fields` attribute
  // (the data channel). A meta that also carries schema.org `property=` is an
  // SEO carrier — it does NOT get `data-field` (data and SEO are separate
  // channels), but its value still lands in the bag. Pure-data metas keep
  // `data-field` (dropped by WORK-323). Content-marker properties (non-meta,
  // e.g. budget's `category`) get `data-field` but no field entry. Keys stay as
  // authored (camelCase, matching modifier names — no kebab transit).
  // SPEC-082 (WORK-331): the `data-rune-fields` bag is the sole field-data
  // representation. Collect the pure-data metas (those that got `data-field` and
  // aren't SEO carriers) so they can be dropped from the emitted children — the
  // value already lives in the bag.
  const fields: Record<string, unknown> = {};
  const pureDataMetas = new Set<unknown>();
  for (const [k, v] of Object.entries(result.properties ?? {})) {
    if (v === undefined) continue;
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    const values: unknown[] = [];
    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        const isSeoMeta = n.name === 'meta' && schemaTags.has(n);
        if (!isSeoMeta) n.attributes['data-field'] = toKebabCase(k);
        if (n.name === 'meta' && n.attributes.content !== undefined) {
          values.push(n.attributes.content);
          if (!isSeoMeta) pureDataMetas.add(n);
        }
      }
    });
    if (values.length === 1) fields[k] = values[0];
    else if (values.length > 1) fields[k] = values;
  }

  for (const [k, v] of Object.entries(result.refs || {})) {
    if (v === undefined) continue;
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        n.attributes['data-name'] = k;
      }
    });
  }

  // Schema.org channel: stamp `property=` on SEO carriers (they render inline as
  // RDFa — Option B). Skip empty-content metas (skip-empties) — an empty SEO
  // value is noise in both HTML and JSON-LD; drop them from the output too.
  const emptySeoMetas = new Set<unknown>();
  for (const [k, v] of Object.entries(result.schema ?? {})) {
    if (v === undefined) continue;
    const tags: Tag[] = v instanceof RenderableNodeCursor ? v.nodes : Array.isArray(v) ? v : [v];

    tags.forEach(n => {
      if (Markdoc.Tag.isTag(n)) {
        if (n.name === 'meta' && (n.attributes.content === undefined || n.attributes.content === '')) {
          emptySeoMetas.add(n);
          return;
        }
        n.attributes['property'] = k;
      }
    });
  }

  const childArray = (Array.isArray(result.children) ? result.children : [result.children])
    .filter(c => !emptySeoMetas.has(c) && !pureDataMetas.has(c));

  const tag = new Markdoc.Tag(result.tag, {
    id: result.id,
    'data-field': result.property ? toKebabCase(result.property) : result.property,
    'data-rune': runeName,
    typeof: schemaOrgType,
    class: result.class,
    ...(Object.keys(fields).length > 0 ? { 'data-rune-fields': JSON.stringify(fields) } : {}),
  }, childArray);

  return tag;
}
