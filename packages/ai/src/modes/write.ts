import { RUNE_EXAMPLES, RUNE_FIXTURE_META } from '@refrakt-md/runes';

export interface WritePromptOptions {
	multiFile?: boolean;
}

const FRONTMATTER_INSTRUCTION = `

## File format

Every page should begin with YAML frontmatter:
---
title: Page Title
description: A brief description
---`;

/** Fixture roles that opt a rune into the few-shot exemplar set. */
const EXEMPLAR_ROLES = new Set(['canonical', 'rich']);

/**
 * Few-shot exemplars drawn from the standardised fixture corpus (SPEC-102 /
 * WORK-413). Only fixtures whose frontmatter explicitly tags a `canonical` /
 * `rich` role are included — an explicit role is the author's opt-in that a
 * fixture is a good example to learn from. Each block carries the fixture's
 * `notes` (authoring guidance) when present. Replaces the old hardcoded example
 * snippet; grows automatically as the corpus is annotated.
 */
export function exemplarSection(): string {
	const exemplars = Object.entries(RUNE_FIXTURE_META)
		.filter(([name, meta]) => meta.role && EXEMPLAR_ROLES.has(meta.role) && RUNE_EXAMPLES[name])
		.sort(([a], [b]) => a.localeCompare(b));

	if (exemplars.length === 0) return '';

	const blocks = exemplars.map(([name, meta]) => {
		const notes = meta.notes ? `\n${meta.notes}\n` : '';
		return `### ${name}${notes}\n\`\`\`md\n${RUNE_EXAMPLES[name]}\n\`\`\``;
	});

	return `

## Example patterns

These are canonical, validated examples of well-formed runes. Study their
structure and match this quality — emulate the shape, don't copy the literal
content.

${blocks.join('\n\n')}`;
}

export function writePrompt(options?: WritePromptOptions): string {
	const exemplars = exemplarSection();

	if (!options?.multiFile) {
		return FRONTMATTER_INSTRUCTION + exemplars;
	}

	return FRONTMATTER_INSTRUCTION + `

## Multi-file output

You are generating multiple content files for a site. Separate each file with a marker line:

--- FILE: path/to/file.md ---

Rules:
- The path is relative to the content directory (e.g. \`index.md\`, \`docs/getting-started.md\`, \`blog/first-post.md\`).
- Start your output with the first file marker.
- Every file must begin with YAML frontmatter (title, description).
- For a \`_layout.md\` file, include only frontmatter with layout-level metadata.
- Use directory nesting for logical sections (e.g. \`docs/\`, \`blog/\`).
- Do NOT use \`../\` in file paths.

The marker structure looks like this (compose the page bodies from the rune
patterns shown below):

--- FILE: _layout.md ---
---
title: My Site
description: A documentation site
---

--- FILE: index.md ---
---
title: Home
description: Welcome to the site
---

--- FILE: docs/getting-started.md ---
---
title: Getting Started
description: Learn the basics
---` + exemplars;
}
