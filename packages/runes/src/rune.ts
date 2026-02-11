import { Schema } from '@markdoc/markdoc';
import { Type, ComponentType } from '@refract-md/types';

export interface RuneDescriptor {
  /** The primary tag name used in Markdoc (e.g., 'cta') */
  name: string;

  /** Alternative tag names (e.g., ['call-to-action']) */
  aliases?: string[];

  /** The Markdoc Schema this rune produces */
  schema: Schema;

  /** Human-readable description for docs and AI theme generation */
  description?: string;

  /** How this rune reinterprets standard Markdown primitives */
  reinterprets?: Record<string, string>;

  /** Schema.org type for SEO JSON-LD generation */
  seoType?: string;

  /** The Type from the registry this rune renders as */
  type?: Type<ComponentType<object>>;
}

export class Rune {
  readonly name: string;
  readonly aliases: string[];
  readonly schema: Schema;
  readonly description: string;
  readonly reinterprets: Record<string, string>;
  readonly seoType: string | undefined;
  readonly type: Type<ComponentType<object>> | undefined;

  constructor(descriptor: RuneDescriptor) {
    this.name = descriptor.name;
    this.aliases = descriptor.aliases ?? [];
    this.schema = descriptor.schema;
    this.description = descriptor.description ?? '';
    this.reinterprets = descriptor.reinterprets ?? {};
    this.seoType = descriptor.seoType;
    this.type = descriptor.type;
  }

  /** All names this rune can be referenced by (primary + aliases) */
  get names(): string[] {
    return [this.name, ...this.aliases];
  }
}

export function defineRune(descriptor: RuneDescriptor): Rune {
  return new Rune(descriptor);
}

/** Build a Markdoc-compatible tags record from a collection of runes */
export function runeTagMap(runes: Record<string, Rune>): Record<string, Schema> {
  const tags: Record<string, Schema> = {};
  for (const rune of Object.values(runes)) {
    for (const name of rune.names) {
      tags[name] = rune.schema;
    }
  }
  return tags;
}
