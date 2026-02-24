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
 * Parse YAML frontmatter from raw markdown content (browser-side).
 * Returns the frontmatter object and the body content without frontmatter.
 */
export function parseFrontmatterClient(raw: string): { frontmatter: Frontmatter; body: string } {
	const match = raw.match(/^---\r?\n([\s\S]*?\r?\n)?---\r?\n?([\s\S]*)$/);

	if (!match) {
		return { frontmatter: {}, body: raw };
	}

	const frontmatter = (yaml.parse(match[1] ?? '') as Frontmatter) ?? {};
	const body = match[2];

	return { frontmatter, body };
}

/**
 * Serialize a frontmatter object and body content back into a raw markdown string.
 * If frontmatter has no keys, returns just the body content.
 */
export function serializeFrontmatter(frontmatter: Frontmatter, body: string): string {
	const keys = Object.keys(frontmatter);
	if (keys.length === 0) return body;
	const yamlStr = yaml.stringify(frontmatter, { lineWidth: 0 }).trimEnd();
	return `---\n${yamlStr}\n---\n${body}`;
}
