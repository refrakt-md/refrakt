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
