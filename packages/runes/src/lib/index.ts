import { Newable } from '@refrakt-md/types';
import type { ContentModel, ResolvedContent } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNodes, Schema, SchemaAttribute, Tag, ValidationError } from '@markdoc/markdoc';

import { Model } from './model.js';
import { AttributeAnnotation } from './annotations/attribute.js';
import { resolveContentModel } from './resolver.js';

export { createComponentRenderable } from './component.js';
export { attribute } from './annotations/attribute.js';
export { group, groupList } from './annotations/group.js';
export { id } from './annotations/id.js';
export { Model } from './model.js';
export { resolve, resolveSequence, resolveDelimited, resolveSections, resolveContentModel, matchesType } from './resolver.js';

/** Normalize resolver output (single Node, Node[], or undefined) into Node[]. */
export function asNodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value as Node[];
  if (value != null) return [value as Node];
  return [];
}

/** Rule for mapping a deprecated attribute to its replacement */
export interface DeprecationRule {
  /** New attribute name to copy the value to */
  newName: string;
  /** Optional transform — receives the old value and all attributes, returns the new value */
  transform?: (value: any, allAttrs: Record<string, any>) => any;
}

/**
 * Inject tint meta tags into the result renderable.
 * Handles both the attribute form (tint="warm", tint-mode="dark") and
 * the inline child rune form (extracted _tintNode on the model).
 */
function injectTintMetas(result: RenderableTreeNodes, model: Model): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;

  const metas: Tag[] = [];
  const tintAttr = (model as any).tint as string | undefined;
  const tintModeAttr = (model as any)['tint-mode'] as string | undefined;

  // Inline tint child rune takes priority — transform it and extract metas
  if (model._tintNode) {
    const tintResult = Markdoc.transform(model._tintNode, model.config);
    if (Markdoc.Tag.isTag(tintResult)) {
      for (const child of tintResult.children) {
        if (Markdoc.Tag.isTag(child) && child.name === 'meta') {
          metas.push(child);
        }
      }
    }
  }

  // Attribute form: only add if inline tint didn't already set the same property
  const hasMetaProp = (prop: string) => metas.some(
    m => Markdoc.Tag.isTag(m) && m.attributes.property === prop
  );

  if (tintAttr && !hasMetaProp('tint')) {
    metas.push(new Markdoc.Tag('meta', { property: 'tint', content: tintAttr }));
  }
  if (tintModeAttr && tintModeAttr !== 'auto' && !hasMetaProp('tint-mode')) {
    metas.push(new Markdoc.Tag('meta', { property: 'tint-mode', content: tintModeAttr }));
  }

  if (metas.length === 0) return result;

  // Append tint metas to the result's children
  result.children = [...result.children, ...metas];
  return result;
}

/**
 * Inject bg meta tags into the result renderable.
 * Handles both the universal `bg="preset-name"` attribute and
 * the inline child rune form (extracted _bgNode on the model).
 */
function injectBgMetas(result: RenderableTreeNodes, model: Model): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;

  const metas: Tag[] = [];
  const bgAttr = (model as any).bg as string | undefined;

  // Inline bg child rune takes priority — transform it and extract metas
  if (model._bgNode) {
    const bgResult = Markdoc.transform(model._bgNode, model.config);
    if (Markdoc.Tag.isTag(bgResult)) {
      for (const child of bgResult.children) {
        if (Markdoc.Tag.isTag(child) && child.name === 'meta') {
          metas.push(child);
        }
      }
    }
  }

  // Universal bg attribute: emit a bg-preset meta tag if not already set by inline child
  const hasPresetMeta = metas.some(
    m => Markdoc.Tag.isTag(m) && m.attributes.property === 'bg-preset'
  );
  if (bgAttr && !hasPresetMeta) {
    metas.push(new Markdoc.Tag('meta', { property: 'bg-preset', content: bgAttr }));
  }

  if (metas.length === 0) return result;

  result.children = [...result.children, ...metas];
  return result;
}

export function createSchema<TInput extends Model>(
  ModelCtr: Newable<TInput>,
  deprecations?: Record<string, DeprecationRule>,
): Schema {
  const attributes: Record<string, SchemaAttribute> = {};

  for (const attr of AttributeAnnotation.onClass(ModelCtr, true)) {
    attributes[attr.propertyKey] = attr.schema;
  }

  // Add tint and tint-mode as universal attributes on all runes
  attributes['tint'] = { type: String, required: false };
  attributes['tint-mode'] = { type: String, required: false, matches: ['auto', 'dark', 'light'] };

  // Add bg as universal attribute on all runes (like tint)
  attributes['bg'] = { type: String, required: false };

  // Add width and spacing as universal layout attributes on all runes
  attributes['width'] = { type: String, required: false, matches: ['compact', 'narrow', 'content', 'wide', 'full'] };
  attributes['spacing'] = { type: String, required: false, matches: ['flush', 'tight', 'default', 'loose', 'breathe'] };
  attributes['inset'] = { type: String, required: false, matches: ['flush', 'tight', 'default', 'loose', 'breathe'] };

  // Register deprecated attribute names so Markdoc accepts them
  if (deprecations) {
    for (const [oldName, rule] of Object.entries(deprecations)) {
      if (!attributes[oldName]) {
        // Inherit type from the target attribute if possible
        const target = attributes[rule.newName];
        attributes[oldName] = { type: target?.type ?? String, required: false, deprecated: true } as SchemaAttribute;
      }
    }
  }

  const schema: Schema = {
    attributes,
    transform: (node, config) => {
      // Resolve deprecated attributes before model construction
      if (deprecations) {
        for (const [oldName, rule] of Object.entries(deprecations)) {
          if (node.attributes[oldName] !== undefined && node.attributes[rule.newName] === undefined) {
            const newVal = rule.transform
              ? rule.transform(node.attributes[oldName], node.attributes)
              : node.attributes[oldName];
            if (newVal !== undefined) {
              node.attributes[rule.newName] = newVal;
            }
          }
        }
      }

      const model = new ModelCtr(node, config);
      const attr = node.transformAttributes(config);
      for (const k of Object.keys(attr)) {
        (model as any)[k] = attr[k];
      }
      model.node.children = model.processChildren(node.children);

      const result = model.transform();
      const output = injectBgMetas(injectTintMetas(result, model), model);

      // Forward universal layout attributes to the output tag
      if (Markdoc.Tag.isTag(output)) {
        const width = (model as any).width as string | undefined;
        const spacing = (model as any).spacing as string | undefined;
        const inset = (model as any).inset as string | undefined;
        if (width) output.attributes.width = width;
        if (spacing) output.attributes.spacing = spacing;
        if (inset) output.attributes.inset = inset;
      }

      return output;
    }
  };

  // Add validation for deprecation warnings
  if (deprecations) {
    schema.validate = (node) => {
      const errors: ValidationError[] = [];
      for (const [oldName, rule] of Object.entries(deprecations)) {
        if (node.attributes[oldName] !== undefined) {
          errors.push({
            id: 'deprecated-attribute',
            level: 'warning',
            message: `Attribute "${oldName}" is deprecated. Use "${rule.newName}" instead.`,
          });
        }
      }
      return errors;
    };
  }

  return schema;
}

// ---------------------------------------------------------------------------
// Universal attribute definitions (shared between createSchema and
// createContentModelSchema)
// ---------------------------------------------------------------------------

const universalAttributes: Record<string, SchemaAttribute> = {
  'tint': { type: String, required: false },
  'tint-mode': { type: String, required: false, matches: ['auto', 'dark', 'light'] },
  'bg': { type: String, required: false },
  'width': { type: String, required: false, matches: ['compact', 'narrow', 'content', 'wide', 'full'] },
  'spacing': { type: String, required: false, matches: ['flush', 'tight', 'default', 'loose', 'breathe'] },
  'inset': { type: String, required: false, matches: ['flush', 'tight', 'default', 'loose', 'breathe'] },
};

// ---------------------------------------------------------------------------
// Tint / bg injection helpers (Model-free versions)
// ---------------------------------------------------------------------------

interface TintBgContext {
  tintNode?: Node;
  bgNode?: Node;
  tint?: string;
  'tint-mode'?: string;
  bg?: string;
  config: Config;
}

function injectTintMetasFrom(result: RenderableTreeNodes, ctx: TintBgContext): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;

  const metas: Tag[] = [];

  if (ctx.tintNode) {
    const tintResult = Markdoc.transform(ctx.tintNode, ctx.config);
    if (Markdoc.Tag.isTag(tintResult)) {
      for (const child of tintResult.children) {
        if (Markdoc.Tag.isTag(child) && child.name === 'meta') {
          metas.push(child);
        }
      }
    }
  }

  const hasMetaProp = (prop: string) => metas.some(
    m => Markdoc.Tag.isTag(m) && m.attributes.property === prop
  );

  if (ctx.tint && !hasMetaProp('tint')) {
    metas.push(new Markdoc.Tag('meta', { property: 'tint', content: ctx.tint }));
  }
  if (ctx['tint-mode'] && ctx['tint-mode'] !== 'auto' && !hasMetaProp('tint-mode')) {
    metas.push(new Markdoc.Tag('meta', { property: 'tint-mode', content: ctx['tint-mode'] }));
  }

  if (metas.length === 0) return result;
  result.children = [...result.children, ...metas];
  return result;
}

function injectBgMetasFrom(result: RenderableTreeNodes, ctx: TintBgContext): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;

  const metas: Tag[] = [];

  if (ctx.bgNode) {
    const bgResult = Markdoc.transform(ctx.bgNode, ctx.config);
    if (Markdoc.Tag.isTag(bgResult)) {
      for (const child of bgResult.children) {
        if (Markdoc.Tag.isTag(child) && child.name === 'meta') {
          metas.push(child);
        }
      }
    }
  }

  const hasPresetMeta = metas.some(
    m => Markdoc.Tag.isTag(m) && m.attributes.property === 'bg-preset'
  );
  if (ctx.bg && !hasPresetMeta) {
    metas.push(new Markdoc.Tag('meta', { property: 'bg-preset', content: ctx.bg }));
  }

  if (metas.length === 0) return result;
  result.children = [...result.children, ...metas];
  return result;
}

// ---------------------------------------------------------------------------
// Content-model-based schema factory
// ---------------------------------------------------------------------------

export interface ContentModelSchemaOptions {
  /**
   * Optional base Model class whose `@attribute` decorators provide
   * additional attribute definitions (e.g., SplitLayoutModel).
   */
  base?: Newable<Model>;

  /** Explicit attribute definitions (merged with base class attributes). */
  attributes?: Record<string, SchemaAttribute>;

  /** The declarative content model. */
  contentModel: ContentModel;

  /**
   * Transform function that receives resolved content, the rune's
   * attributes, and the Markdoc config.  Returns the renderable output.
   */
  transform: (
    resolved: ResolvedContent,
    attrs: Record<string, any>,
    config: Config,
  ) => RenderableTreeNodes;

  /** Deprecated attribute mappings. */
  deprecations?: Record<string, DeprecationRule>;
}

/**
 * Create a Markdoc Schema from a declarative content model.
 *
 * This is the content-model counterpart of `createSchema`.  Instead of
 * using a Model subclass with `@group` decorators, the rune declares
 * a content model and provides a transform function that receives the
 * resolver's output.
 */
export function createContentModelSchema(options: ContentModelSchemaOptions): Schema {
  const attributes: Record<string, SchemaAttribute> = {};

  // Merge base class attribute decorators (if provided)
  if (options.base) {
    for (const attr of AttributeAnnotation.onClass(options.base, true)) {
      attributes[attr.propertyKey] = attr.schema;
    }
  }

  // Merge explicit attributes
  if (options.attributes) {
    Object.assign(attributes, options.attributes);
  }

  // Add universal attributes
  Object.assign(attributes, universalAttributes);

  // Register deprecated attribute names
  const deprecations = options.deprecations;
  if (deprecations) {
    for (const [oldName, rule] of Object.entries(deprecations)) {
      if (!attributes[oldName]) {
        const target = attributes[rule.newName];
        attributes[oldName] = { type: target?.type ?? String, required: false, deprecated: true } as SchemaAttribute;
      }
    }
  }

  const schema: Schema = {
    attributes,
    transform: (node, config) => {
      // Resolve deprecated attributes
      if (deprecations) {
        for (const [oldName, rule] of Object.entries(deprecations)) {
          if (node.attributes[oldName] !== undefined && node.attributes[rule.newName] === undefined) {
            const newVal = rule.transform
              ? rule.transform(node.attributes[oldName], node.attributes)
              : node.attributes[oldName];
            if (newVal !== undefined) {
              node.attributes[rule.newName] = newVal;
            }
          }
        }
      }

      // Extract attributes
      const attrs = node.transformAttributes(config);

      // Resolve content model
      const { content, tintNode, bgNode } = resolveContentModel(
        node.children,
        options.contentModel,
      );

      // Call the user's transform function
      const result = options.transform(content, attrs, config);

      // Inject tint / bg metas
      const tintBgCtx: TintBgContext = {
        tintNode,
        bgNode,
        tint: attrs.tint,
        'tint-mode': attrs['tint-mode'],
        bg: attrs.bg,
        config,
      };
      const output = injectBgMetasFrom(injectTintMetasFrom(result, tintBgCtx), tintBgCtx);

      // Forward universal layout attributes
      if (Markdoc.Tag.isTag(output)) {
        if (attrs.width) output.attributes.width = attrs.width;
        if (attrs.spacing) output.attributes.spacing = attrs.spacing;
        if (attrs.inset) output.attributes.inset = attrs.inset;
      }

      return output;
    },
  };

  // Add validation for deprecation warnings
  if (deprecations) {
    schema.validate = (node) => {
      const errors: ValidationError[] = [];
      for (const [oldName, rule] of Object.entries(deprecations)) {
        if (node.attributes[oldName] !== undefined) {
          errors.push({
            id: 'deprecated-attribute',
            level: 'warning',
            message: `Attribute "${oldName}" is deprecated. Use "${rule.newName}" instead.`,
          });
        }
      }
      return errors;
    };
  }

  return schema;
}
