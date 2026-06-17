import type { ContentModel, ResolvedContent } from '@refrakt-md/types';
import Markdoc from '@markdoc/markdoc';
import type { Config, Node, RenderableTreeNodes, Schema, SchemaAttribute, Tag, ValidationError } from '@markdoc/markdoc';

import { resolveContentModel } from './resolver.js';
import { schemaBasePresets } from '../attribute-presets.js';

export { createComponentRenderable } from './component.js';
export type { InlineTransformResult } from './component.js';
export { resolve, resolveSequence, resolveDelimited, resolveSections, resolveContentModel, resolveListItems, evaluateCondition, matchesType } from './resolver.js';
export { sanitizeSandboxContent } from './sanitize.js';

/**
 * Maps a Markdoc Schema to its content model declaration.
 * Populated by `createContentModelSchema()` so consumers (editor, language server)
 * can introspect a rune's expected content structure without re-parsing.
 */
export const schemaContentModels = new WeakMap<Schema, ContentModel | ((attrs: Record<string, any>) => ContentModel)>();

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

// ---------------------------------------------------------------------------
// Universal attribute definitions
// ---------------------------------------------------------------------------

const universalAttributes: Record<string, SchemaAttribute> = {
  'tint': { type: String, required: false, description: 'Color tint preset applied to this block' },
  'tint-mode': { type: String, required: false, matches: ['auto', 'dark', 'light'], description: 'Whether the tint adapts to auto, dark, or light mode' },
  'bg': { type: String, required: false, description: 'Background preset applied to this block' },
  'width': { type: String, required: false, matches: ['compact', 'narrow', 'content', 'wide', 'full'], description: 'Maximum width constraint for this block' },
  'spacing': { type: String, required: false, matches: ['flush', 'tight', 'default', 'loose', 'breathe'], description: 'Vertical spacing above and below this block' },
  'inset': { type: String, required: false, matches: ['flush', 'tight', 'default', 'loose', 'breathe'], description: 'Inner padding of this block' },
  // SPEC-107 — `elevation` is a depth ladder. The legacy shadow-scale values
  // (none/sm/md/lg) stay in `matches` so authored content still validates during
  // the deprecation window; the engine maps them onto the ladder with a warning.
  'elevation': { type: String, required: false, matches: ['sunken', 'flush', 'flat', 'raised', 'floating', 'overlay', 'none', 'sm', 'md', 'lg'], description: 'Surface depth on the SPEC-107 ladder (sunken→overlay); none/sm/md/lg are deprecated aliases' },
  'prominence': { type: String, required: false, matches: ['quiet', 'normal', 'prominent', 'display'], description: 'Section-header emphasis (only on page-section-header family runes)' },
  // SPEC-105 — scroll-reveal motion. `reveal` is a closed entrance vocabulary
  // (author declares intent; the theme owns choreography, a behaviour owns
  // timing); an unknown value is a build error via Markdoc `matches`. `stagger`
  // cascades a multi-child block's items in — a silent no-op on single-child runes.
  'reveal': { type: String, required: false, matches: ['none', 'fade', 'slide', 'scale', 'blur'], description: 'Scroll-reveal entrance character (none|fade|slide|scale|blur); the theme owns the choreography' },
  'stagger': { type: Boolean, required: false, description: 'Cascade this block\'s items in as it reveals (no-op on single-child runes)' },
  // SPEC-086 — frame: media-surface chrome preset + inline facet overrides.
  'frame': { type: String, required: false, description: 'Named frame preset presenting this block\'s media surface' },
  'frame-aspect': { type: String, required: false, description: 'Aspect ratio of the framed media, e.g. "16/9"' },
  'frame-displace': { type: String, required: false, matches: ['top', 'bottom', 'end', 'bottom-end', 'top-end'], description: 'Edge/corner the framed guest moves toward' },
  'frame-displace-mode': { type: String, required: false, matches: ['peek', 'bleed'], description: 'How displacement renders: `peek` (default) translates the guest visually inside its frame target; `bleed` uses negative margin on the media zone so following layout pulls up — extends past a section like a hero without leaving a gap above' },
  'frame-offset': { type: String, required: false, matches: ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'], description: 'Displacement distance (non-linear named scale: sm…xl ride the block-spacing tokens, 2xl/3xl/4xl step up to section-spacing for bleed-mode displacements that clear a section edge)' },
  'frame-oversize': { type: String, required: false, description: 'How far the guest exceeds its slot (scale factor)' },
  'frame-place': { type: String, required: false, description: 'Guest-box alignment in the slot (e.g. "left top")' },
  'frame-anchor': { type: String, required: false, description: 'Crop focal point when the guest is cut (object-position)' },
  'frame-shadow': { type: String, required: false, matches: ['none', 'sm', 'md', 'lg'], description: 'Silhouette drop-shadow strength for the framed media' },
  // SPEC-087 — substrate: generated surface pattern + inline facet overrides.
  'substrate': { type: String, required: false, matches: ['dots', 'grid', 'lines', 'cross', 'checker', 'none'], description: 'Generated surface pattern' },
  'substrate-size': { type: String, required: false, matches: ['sm', 'md', 'lg'], description: 'Pattern cell size' },
  'substrate-opacity': { type: String, required: false, matches: ['sm', 'md', 'lg'], description: 'Pattern ink strength' },
  'substrate-fill': { type: String, required: false, matches: ['inherit', 'inset'], description: 'Surface fill the pattern sits on (full colour stays with tint)' },
  'substrate-target': { type: String, required: false, matches: ['self', 'media'], description: 'Which surface the pattern fills (overrides the rune/theme default)' },
  // SPEC-088 — bg gradient fill facets (token-driven; colours stay token-owned).
  'bg-gradient': { type: String, required: false, matches: ['to-t', 'to-b', 'to-l', 'to-r', 'to-tr', 'to-br', 'to-bl', 'to-tl'], description: 'Gradient direction (bounded named set)' },
  'bg-from': { type: String, required: false, description: 'Gradient start colour — a semantic token name (→ var(--rf-color-*))' },
  'bg-to': { type: String, required: false, description: 'Gradient end colour — a semantic token name' },
  'bg-via': { type: String, required: false, description: 'Optional middle gradient stop — a semantic token name' },
  'bg-gradient-type': { type: String, required: false, matches: ['linear', 'radial', 'conic'], description: 'Gradient type' },
  // SPEC-088 — structured scrim (legibility treatment behind overlaid text).
  'scrim': { type: String, required: false, matches: ['top', 'bottom', 'left', 'right', 'none'], description: 'Scrim direction (heaviest edge); presence turns the scrim on, "none" opts out of the default cover scrim' },
  'scrim-type': { type: String, required: false, matches: ['gradient', 'frost'], description: 'Scrim treatment: gradient (default) or frost (backdrop blur)' },
  'scrim-strength': { type: String, required: false, matches: ['sm', 'md', 'lg'], description: 'Gradient scrim strength' },
  'scrim-blur': { type: String, required: false, matches: ['none', 'sm', 'md', 'lg'], description: 'Frost scrim blur amount' },
  'scrim-tone': { type: String, required: false, matches: ['dark', 'light'], description: 'Whether the scrim darkens (for light text) or lightens (for dark text)' },
};

/** SPEC-088 bg gradient + scrim facet attribute names (host-level). */
const BG_GRADIENT_FACET_NAMES = [
  'bg-gradient', 'bg-from', 'bg-to', 'bg-via', 'bg-gradient-type',
  'scrim', 'scrim-type', 'scrim-strength', 'scrim-blur', 'scrim-tone',
] as const;

/** SPEC-086 frame facet attribute names (excluding the `frame` preset key). */
const FRAME_FACET_NAMES = ['frame-aspect', 'frame-displace', 'frame-displace-mode', 'frame-offset', 'frame-oversize', 'frame-place', 'frame-anchor', 'frame-shadow'] as const;

/** SPEC-087 substrate facet attribute names (excluding the `substrate` enum key). */
const SUBSTRATE_FACET_NAMES = ['substrate-size', 'substrate-opacity', 'substrate-fill', 'substrate-target'] as const;

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
    m => Markdoc.Tag.isTag(m) && m.attributes['data-field'] === prop
  );

  if (ctx.tint && !hasMetaProp('tint')) {
    metas.push(new Markdoc.Tag('meta', { 'data-field': 'tint', content: ctx.tint }));
  }
  if (ctx['tint-mode'] && ctx['tint-mode'] !== 'auto' && !hasMetaProp('tint-mode')) {
    metas.push(new Markdoc.Tag('meta', { 'data-field': 'tint-mode', content: ctx['tint-mode'] }));
  }

  if (metas.length === 0) return result;
  result.children = [...result.children, ...metas];
  return result;
}

/** A `sandbox`-typed bg preset descriptor (SPEC-104 §5 — a sibling of `BgPresetDefinition`). */
interface BgSandboxPreset {
  src: string;
  framework?: string;
  dependencies?: string;
}

/** Recursively find the rendered `rf-sandbox` element in a transformed tree. */
function findRfSandbox(node: RenderableTreeNodes): Tag | undefined {
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (!Markdoc.Tag.isTag(n)) continue;
    if (n.name === 'rf-sandbox') return n;
    const nested = findRfSandbox(n.children as RenderableTreeNodes);
    if (nested) return nested;
  }
  return undefined;
}

/** Tag a rendered sandbox as the bg backdrop guest (matches the WORK-428 body path). */
function asBackdropGuest(sandbox: Tag): Tag {
  return new Markdoc.Tag(sandbox.name, {
    ...sandbox.attributes,
    'data-bg-guest': '',
    'data-guest-posture': 'backdrop',
    'data-height': 'fill',
    'data-activation': 'eager',
  }, sandbox.children);
}

// SPEC-104 §5 — memoise an assembled scene per config + descriptor: a named
// scene's source is byte-identical across pages, so the (file-reading) sandbox
// transform runs once and each page gets a fresh clone. Keyed by the Markdoc
// config so a new build/site starts a fresh cache (no cross-build staleness).
const presetGuestCache = new WeakMap<object, Map<string, Tag>>();

/** SPEC-104 §5 — expand a `sandbox`-typed bg preset into the WORK-428
 *  `data-bg-guest` body. Runs at transform time (the sandbox readers live on
 *  `config.variables`), producing the same element the engine relocates. */
function expandSandboxPreset(preset: BgSandboxPreset, config: Config, registry: object): Tag | undefined {
  const key = `${preset.src} ${preset.framework ?? ''} ${preset.dependencies ?? ''}`;
  let cache = presetGuestCache.get(registry);
  if (!cache) { cache = new Map(); presetGuestCache.set(registry, cache); }
  const cached = cache.get(key);
  if (cached) return asBackdropGuest(cached);

  const attrs: Record<string, unknown> = { src: preset.src };
  if (preset.framework) attrs.framework = preset.framework;
  if (preset.dependencies) attrs.dependencies = preset.dependencies;
  // Synthesise the `{% sandbox %}` and run the real rune (file resolution +
  // sanitisation via the config readers) — the preset is sugar over the body.
  const node = new Markdoc.Ast.Node('tag', attrs, [], 'sandbox');
  const sandbox = findRfSandbox(Markdoc.transform(node, config));
  if (!sandbox) return undefined;
  cache.set(key, sandbox);
  return asBackdropGuest(sandbox);
}

function injectBgMetasFrom(result: RenderableTreeNodes, ctx: TintBgContext): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;

  const metas: Tag[] = [];
  // SPEC-104 — a `{% bg %}` body may render a `data-bg-guest` element (a sandbox
  // backdrop). Hoist it to the host alongside the metas; the engine (§1f)
  // relocates it into the bg layer.
  const guests: Tag[] = [];

  if (ctx.bgNode) {
    const bgResult = Markdoc.transform(ctx.bgNode, ctx.config);
    if (Markdoc.Tag.isTag(bgResult)) {
      for (const child of bgResult.children) {
        if (!Markdoc.Tag.isTag(child)) continue;
        if (child.name === 'meta') metas.push(child);
        else if (child.attributes['data-bg-guest'] !== undefined) guests.push(child);
      }
    }
  }

  const hasPresetMeta = metas.some(
    m => Markdoc.Tag.isTag(m) && m.attributes['data-field'] === 'bg-preset'
  );
  if (ctx.bg && !hasPresetMeta) {
    metas.push(new Markdoc.Tag('meta', { 'data-field': 'bg-preset', content: ctx.bg }));
  }

  // SPEC-104 §5 — `bg="name"` where the named preset is `sandbox`-typed expands
  // to a live backdrop guest, the same as an inline `{% bg %}{% sandbox %}` body.
  // Only when no body guest was authored (an explicit body wins).
  if (ctx.bg && guests.length === 0) {
    const backgrounds = ctx.config?.variables?.__backgrounds as Record<string, { sandbox?: BgSandboxPreset; extends?: string }> | undefined;
    const preset = backgrounds?.[ctx.bg];
    if (preset && backgrounds) {
      // Resolve `extends` (single level, mirroring the engine's preset chain) so a
      // sandbox preset can build on a base scene; the preset's own fields win.
      const base = preset.extends ? backgrounds[preset.extends] : undefined;
      const sandbox = preset.sandbox || base?.sandbox
        ? { ...base?.sandbox, ...preset.sandbox } as BgSandboxPreset
        : undefined;
      if (sandbox?.src) {
        const guest = expandSandboxPreset(sandbox, ctx.config, backgrounds);
        if (guest) guests.push(guest);
      }
    }
  }

  if (metas.length === 0 && guests.length === 0) return result;
  result.children = [...result.children, ...metas, ...guests];
  return result;
}

/** SPEC-086 — surface the `frame` preset + `frame-*` facet attributes as
 *  `<meta data-field>` tags so the engine reads them via the same meta channel
 *  as `bg`, then routes the chrome to the rune's frame-target element. */
function injectFrameMetas(result: RenderableTreeNodes, attrs: Record<string, any>): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;
  const has = (name: string) => result.children.some(
    c => Markdoc.Tag.isTag(c) && c.name === 'meta' && c.attributes['data-field'] === name,
  );
  const metas: Tag[] = [];
  if (attrs.frame && !has('frame')) {
    metas.push(new Markdoc.Tag('meta', { 'data-field': 'frame', content: String(attrs.frame) }));
  }
  for (const name of FRAME_FACET_NAMES) {
    const value = attrs[name];
    if (value != null && value !== '' && !has(name)) {
      metas.push(new Markdoc.Tag('meta', { 'data-field': name, content: String(value) }));
    }
  }
  if (metas.length === 0) return result;
  result.children = [...result.children, ...metas];
  return result;
}

/** SPEC-088 — surface the `bg-*` gradient facets as `<meta data-field>` tags so
 *  the engine's bg resolution reads them (host-level, no `{% bg %}` child needed). */
function injectBgFacetMetas(result: RenderableTreeNodes, attrs: Record<string, any>): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;
  const has = (name: string) => result.children.some(
    c => Markdoc.Tag.isTag(c) && c.name === 'meta' && c.attributes['data-field'] === name,
  );
  const metas: Tag[] = [];
  for (const name of BG_GRADIENT_FACET_NAMES) {
    const value = attrs[name];
    if (value != null && value !== '' && !has(name)) {
      metas.push(new Markdoc.Tag('meta', { 'data-field': name, content: String(value) }));
    }
  }
  if (metas.length === 0) return result;
  result.children = [...result.children, ...metas];
  return result;
}

/** SPEC-087 — surface the `substrate` pattern + `substrate-*` facets as
 *  `<meta data-field>` tags so the engine reads and routes them like `frame`. */
function injectSubstrateMetas(result: RenderableTreeNodes, attrs: Record<string, any>): RenderableTreeNodes {
  if (!Markdoc.Tag.isTag(result)) return result;
  const has = (name: string) => result.children.some(
    c => Markdoc.Tag.isTag(c) && c.name === 'meta' && c.attributes['data-field'] === name,
  );
  const metas: Tag[] = [];
  if (attrs.substrate && !has('substrate')) {
    metas.push(new Markdoc.Tag('meta', { 'data-field': 'substrate', content: String(attrs.substrate) }));
  }
  for (const name of SUBSTRATE_FACET_NAMES) {
    const value = attrs[name];
    if (value != null && value !== '' && !has(name)) {
      metas.push(new Markdoc.Tag('meta', { 'data-field': name, content: String(value) }));
    }
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
   * Optional base providing additional attribute definitions.
   * Accepts a plain attribute record that is merged before explicit attributes.
   */
  base?: Record<string, SchemaAttribute>;

  /** Explicit attribute definitions (merged with base class attributes). */
  attributes?: Record<string, SchemaAttribute>;

  /** The declarative content model (or a function of resolved attributes). */
  contentModel: ContentModel | ((attrs: Record<string, any>) => ContentModel);

  /**
   * Transform function that receives resolved content, the rune's
   * attributes, the Markdoc config, and optionally the AST node.
   * Returns the renderable output.
   */
  transform: (
    resolved: ResolvedContent,
    attrs: Record<string, any>,
    config: Config,
    node: Node,
  ) => RenderableTreeNodes;

  /** Deprecated attribute mappings. */
  deprecations?: Record<string, DeprecationRule>;

  /** Whether this tag is self-closing (no children). */
  selfClosing?: boolean;

  /**
   * Mark this rune as deferring its body to postProcess (per-entity template).
   * The content loader captures the pristine body as source on `__deferred-body`
   * and empties it before transform; the rune reads it via `readDeferredBody`.
   */
  deferBody?: boolean;
}

/**
 * Create a Markdoc Schema from a declarative content model.
 *
 * The rune declares a content model and provides a transform function
 * that receives the resolver's output.
 */
export function createContentModelSchema(options: ContentModelSchemaOptions): Schema {
  const attributes: Record<string, SchemaAttribute> = {};

  // Merge base attributes
  if (options.base) {
    Object.assign(attributes, options.base);
  }

  // Merge explicit attributes
  if (options.attributes) {
    Object.assign(attributes, options.attributes);
  }

  // Add universal attributes
  Object.assign(attributes, universalAttributes);

  // deferBody: declare the stash attribute so the loader-captured body source
  // is readable in the transform (see deferred-body.ts).
  if (options.deferBody) {
    attributes['__deferred-body'] = { type: String, required: false } as SchemaAttribute;
  }

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
    ...(options.selfClosing != null && { selfClosing: options.selfClosing }),
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
      const resolvedModel = typeof options.contentModel === 'function'
        ? options.contentModel(attrs)
        : options.contentModel;
      const { content, tintNode, bgNode } = resolveContentModel(
        node.children,
        resolvedModel,
        attrs,
      );

      // Call the user's transform function
      const result = options.transform(content, attrs, config, node);

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

      // Forward universal layout/surface attributes
      if (Markdoc.Tag.isTag(output)) {
        if (attrs.width) output.attributes.width = attrs.width;
        if (attrs.spacing) output.attributes.spacing = attrs.spacing;
        if (attrs.inset) output.attributes.inset = attrs.inset;
        if (attrs.elevation) output.attributes.elevation = attrs.elevation;
        if (attrs.prominence) output.attributes.prominence = attrs.prominence;
        if (attrs.reveal) output.attributes.reveal = attrs.reveal;
        if (attrs.stagger) output.attributes.stagger = attrs.stagger;
      }

      return injectBgFacetMetas(injectSubstrateMetas(injectFrameMetas(output, attrs), attrs), attrs);
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

  // Mark deferBody so the content loader captures the body pre-transform.
  if (options.deferBody) {
    (schema as Schema & { deferBody?: boolean }).deferBody = true;
  }

  // Register content model for introspection by editor / language server
  schemaContentModels.set(schema, options.contentModel);

  // Record the base record reference so reference output can identify
  // attributes inherited from a registered preset.
  if (options.base) {
    schemaBasePresets.set(schema, options.base);
  }

  return schema;
}
