import yaml from 'yaml';

/**
 * Standardised rune-fixture format (SPEC-102). A fixture is the rune's actual
 * Markdoc, with optional YAML frontmatter carrying metadata. This module owns
 * the field schema, the parser, and a validator — shared by the example
 * generator, the loader (`discoverPluginFixtures`), the CI corpus check, and
 * `plugin-validate`.
 */

/** The `role` taxonomy (SPEC-102 §3). */
export const FIXTURE_ROLES = ['canonical', 'minimal', 'rich', 'edge-case'] as const;
export type FixtureRole = (typeof FIXTURE_ROLES)[number];

/** Known frontmatter fields (SPEC-102 §2). Unknown keys are rejected. */
export interface FixtureFrontmatter {
	/** The rune this fixture exercises (defaults to the filename's rune segment). */
	rune?: string;
	title?: string;
	description?: string;
	role?: FixtureRole;
	/** Modifier values this scenario sets — consumed by the gallery variant matrix. */
	attributes?: Record<string, unknown>;
	/** Concepts/features shown, as tags — for docs + AI retrieval. */
	demonstrates?: string[];
	/** Authoring guidance — why this fixture is good (AI few-shot, docs). */
	notes?: string;
}

/** A parsed fixture file. */
export interface ParsedFixture {
	/** Rune key (from `rune` field, else the filename's rune segment). */
	rune: string;
	/** Scenario name from `<rune>.<scenario>.md`, or `'canonical'` for `<rune>.md`. */
	scenario: string;
	/** Validated frontmatter fields. */
	frontmatter: FixtureFrontmatter;
	/** Markdoc body with the frontmatter block stripped. */
	body: string;
}

const KNOWN_KEYS = new Set([
	'rune',
	'title',
	'description',
	'role',
	'attributes',
	'demonstrates',
	'notes',
]);

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?\r?\n)?---\r?\n?([\s\S]*)$/;

/**
 * Split a fixture's raw text into its (raw) frontmatter block and body.
 * Returns `frontmatter: null` for bare fixtures (no block) — these stay valid.
 */
export function splitFixture(raw: string): { frontmatter: string | null; body: string } {
	const match = raw.match(FRONTMATTER_RE);
	if (!match) return { frontmatter: null, body: raw };
	return { frontmatter: match[1] ?? '', body: match[2] ?? '' };
}

/**
 * Derive `{ rune, scenario }` from a fixture filename. `card.md` →
 * `{ rune: 'card', scenario: 'canonical' }`; `card.cover.md` →
 * `{ rune: 'card', scenario: 'cover' }`.
 */
export function parseFixtureFilename(filename: string): { rune: string; scenario: string } {
	const base = filename.replace(/\.md$/, '');
	const dot = base.indexOf('.');
	if (dot === -1) return { rune: base, scenario: 'canonical' };
	return { rune: base.slice(0, dot), scenario: base.slice(dot + 1) };
}

/** A single validation problem (path + message). */
export interface FixtureIssue {
	path: string;
	message: string;
}

/**
 * Validate a parsed frontmatter object against the field schema. Returns the
 * list of issues (empty when valid): unknown keys and wrong types are rejected.
 */
export function validateFixtureFrontmatter(fm: Record<string, unknown>): FixtureIssue[] {
	const issues: FixtureIssue[] = [];

	for (const key of Object.keys(fm)) {
		if (!KNOWN_KEYS.has(key)) {
			issues.push({ path: key, message: `Unknown frontmatter key "${key}"` });
		}
	}

	const str = (key: string) => {
		if (fm[key] !== undefined && typeof fm[key] !== 'string') {
			issues.push({ path: key, message: `Expected a string` });
		}
	};
	str('rune');
	str('title');
	str('description');
	str('notes');

	if (fm.role !== undefined && !FIXTURE_ROLES.includes(fm.role as FixtureRole)) {
		issues.push({ path: 'role', message: `Expected one of ${FIXTURE_ROLES.join(', ')}` });
	}

	if (fm.attributes !== undefined) {
		const a = fm.attributes;
		if (typeof a !== 'object' || a === null || Array.isArray(a)) {
			issues.push({ path: 'attributes', message: 'Expected a mapping of modifier values' });
		}
	}

	if (fm.demonstrates !== undefined) {
		const d = fm.demonstrates;
		if (!Array.isArray(d) || d.some(item => typeof item !== 'string')) {
			issues.push({ path: 'demonstrates', message: 'Expected an array of strings' });
		}
	}

	return issues;
}

/**
 * Parse a fixture file's raw text + filename into a {@link ParsedFixture},
 * throwing on malformed YAML or schema violations. Bare fixtures (no
 * frontmatter) parse with all fields defaulted.
 */
export function parseFixture(raw: string, filename: string): ParsedFixture {
	const { rune: fileRune, scenario } = parseFixtureFilename(filename);
	const { frontmatter: rawFm, body } = splitFixture(raw);

	let fm: Record<string, unknown> = {};
	if (rawFm !== null && rawFm.trim()) {
		const parsed = yaml.parse(rawFm);
		if (parsed !== null && parsed !== undefined) {
			if (typeof parsed !== 'object' || Array.isArray(parsed)) {
				throw new Error(`${filename}: frontmatter must be a YAML mapping`);
			}
			fm = parsed as Record<string, unknown>;
		}
	}

	const issues = validateFixtureFrontmatter(fm);
	if (issues.length > 0) {
		throw new Error(
			`${filename}: invalid frontmatter — ${issues.map(i => `${i.path}: ${i.message}`).join('; ')}`,
		);
	}

	return {
		rune: typeof fm.rune === 'string' ? fm.rune : fileRune,
		scenario,
		frontmatter: fm as FixtureFrontmatter,
		body: body.trim(),
	};
}
