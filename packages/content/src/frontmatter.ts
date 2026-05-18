import yaml from 'yaml';

export interface Frontmatter {
  title?: string;
  description?: string;
  slug?: string;
  draft?: boolean;
  redirect?: string;
  order?: number;
  date?: string;
  author?: string;
  tags?: string[];
  image?: string;
  /** Icon name resolvable by the `{% icon %}` rune. Used by `nav layout="cards"`
   *  to render an icon on each child page card. */
  icon?: string;
  /** Named tint preset to apply for this page (or subtree, when set in a
   *  `_layout.md`). Cascades down the layout chain; explicit `null` resets
   *  to inherit from the layer above. See SPEC-052. */
  tint?: string | null;
  /** Initial colour-scheme behaviour for this page (or subtree, when set in
   *  a `_layout.md`). `'auto'` follows user preference and system pref;
   *  `'light'` / `'dark'` lock the SSR-emitted mode. Cascades down the
   *  layout chain. */
  'tint-mode'?: 'auto' | 'light' | 'dark';
  /** When `true`, the page (or subtree) ignores user theme preference and
   *  hides the theme-toggle UI — used for marketing surfaces where the
   *  brand should look the same to every visitor. Cascades down the layout
   *  chain. See SPEC-052. */
  'tint-lock'?: boolean;
  [key: string]: unknown;
}

/**
 * Parse YAML frontmatter from raw markdown content.
 * Returns the frontmatter object and the content without frontmatter.
 */
export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?\r?\n)?---\r?\n?([\s\S]*)$/);

  if (!match) {
    return { frontmatter: {}, content: raw };
  }

  const frontmatter = yaml.parse(match[1] ?? '') as Frontmatter ?? {};
  const content = match[2];

  return { frontmatter, content };
}

/**
 * Serialize a frontmatter object and body content back into a raw markdown string.
 * If frontmatter has no keys, returns just the body content.
 */
export function serializeFrontmatter(frontmatter: Frontmatter, content: string): string {
  const keys = Object.keys(frontmatter);
  if (keys.length === 0) return content;
  const yamlStr = yaml.stringify(frontmatter, { lineWidth: 0 }).trimEnd();
  return `---\n${yamlStr}\n---\n${content}`;
}
