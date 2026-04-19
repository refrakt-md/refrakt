import type { Schema } from '@markdoc/markdoc';

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

  /** Rune type name (e.g. 'Hint', 'Accordion') */
  typeName?: string;

  /** Schema.org type for typeof attribute (e.g. 'FAQPage') */
  schemaOrgType?: string;

  /**
   * Authoring hints — a short note that reads naturally to both humans browsing
   * the reference and LLMs generating content. Rendered as an "Authoring notes"
   * block by `refrakt reference` and included in `refrakt write` prompts.
   */
  authoringHints?: string;

  /** Editor UI category (e.g., 'Content', 'Layout', 'Section') */
  category?: string;

  /** VSCode snippet body lines (array of strings with VSCode placeholder syntax).
   *  Also used by the block editor for rich rune insertion. */
  snippet?: string[];
}

export class Rune {
  readonly name: string;
  readonly aliases: string[];
  readonly schema: Schema;
  readonly description: string;
  readonly reinterprets: Record<string, string>;
  readonly seoType: string | undefined;
  readonly typeName: string | undefined;
  readonly schemaOrgType: string | undefined;
  readonly authoringHints: string | undefined;
  readonly category: string | undefined;
  readonly snippet: string[] | undefined;

  constructor(descriptor: RuneDescriptor) {
    this.name = descriptor.name;
    this.aliases = descriptor.aliases ?? [];
    this.schema = descriptor.schema;
    this.description = descriptor.description ?? '';
    this.reinterprets = descriptor.reinterprets ?? {};
    this.seoType = descriptor.seoType;
    this.typeName = descriptor.typeName;
    this.schemaOrgType = descriptor.schemaOrgType;
    this.authoringHints = descriptor.authoringHints;
    this.category = descriptor.category;
    this.snippet = descriptor.snippet;
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
