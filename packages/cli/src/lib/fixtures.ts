/**
 * Built-in Markdoc fixture strings for the inspect command.
 *
 * Each fixture exercises the rune's full structure with realistic content.
 * The key is the primary rune tag name (as used in Markdoc).
 */
export const fixtures: Record<string, string> = {
	hint: `{% hint type="note" %}
The identity transform runs after the rune schema transform and before rendering. It applies BEM classes, injects structural elements, and resolves design tokens.
{% /hint %}`,

	accordion: `{% accordion %}
## Getting Started
Follow these steps to set up your development environment and build your first theme.

## Configuration
Theme configuration is defined in a TypeScript file that exports a ThemeConfig object.

## Deployment
Once your theme is ready, publish it to npm and register it in the theme marketplace.
{% /accordion %}`,

	details: `{% details %}
## Implementation Notes
This section contains additional technical details about how the transform pipeline processes rune content. The identity transform reads meta tags, applies BEM classes, and injects structural elements before the content reaches the renderer.
{% /details %}`,

	grid: `{% grid %}
First column content with enough text to demonstrate layout behavior.

---

Second column content showing how grid cells are separated by horizontal rules.

---

Third column content completing the three-column grid layout example.
{% /grid %}`,

	figure: `{% figure size="large" align="center" %}
![Mountain landscape](/images/mountain.jpg)

A panoramic view of the Norwegian fjords at sunset, captured from the summit of Trolltunga.
{% /figure %}`,

	tabs: `{% tabs %}
# JavaScript
\`\`\`js
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

# TypeScript
\`\`\`ts
const greeting: string = "Hello, world!";
console.log(greeting);
\`\`\`

# Python
\`\`\`python
greeting = "Hello, world!"
print(greeting)
\`\`\`
{% /tabs %}`,

	conversation: `{% conversation %}
> **Alice** — Have you tried the new inspect command?

> **Bob** — Yes! It shows exactly what HTML the identity transform produces. No more guessing which selectors to target.

> **Alice** — The variant expansion is my favorite part. You can see every modifier value at once.
{% /conversation %}`,

	sidenote: `{% sidenote variant="sidenote" %}
This is a margin note that appears alongside the main content, providing additional context without interrupting the reading flow.
{% /sidenote %}`,

	diff: `{% diff mode="unified" %}
\`\`\`ts
const config = {
  prefix: 'rf',
  runes: {}
};
\`\`\`

\`\`\`ts
const config = {
  prefix: 'rf',
  tokenPrefix: '--rf',
  icons: {},
  runes: {}
};
\`\`\`
{% /diff %}`,

	datatable: `{% datatable %}
| Name | Role | Department | Status |
|------|------|------------|--------|
| Alice | Engineer | Platform | Active |
| Bob | Designer | Product | Active |
| Carol | Manager | Engineering | On Leave |
{% /datatable %}`,

	form: `{% form method="POST" variant="stacked" %}
- Name
- Email
- Message (textarea)

> How did you hear about us?
- Search engine
- Social media
- Friend referral
- Other

**Submit**
{% /form %}`,
};

/** Get a fixture for a rune, with optional attribute overrides applied to the source */
export function getFixture(runeName: string, attrOverrides?: Record<string, string>): string {
	// Look up by primary name or try as-is
	const source = fixtures[runeName];
	if (!source) {
		// Generate a minimal fixture for unknown runes
		return `{% ${runeName} %}\nSample content for the ${runeName} rune.\n{% /${runeName} %}`;
	}

	if (!attrOverrides || Object.keys(attrOverrides).length === 0) {
		return source;
	}

	// Apply attribute overrides by modifying the opening tag
	return applyOverrides(source, runeName, attrOverrides);
}

/** Replace or add attributes in the opening tag of a fixture */
function applyOverrides(source: string, tagName: string, overrides: Record<string, string>): string {
	// Match the opening tag: {% tagName ... %}
	const openTagPattern = new RegExp(`(\\{%\\s*${escapeRegex(tagName)})([^%]*?)(%\\})`);
	const match = source.match(openTagPattern);
	if (!match) return source;

	let attrString = match[2];

	for (const [key, value] of Object.entries(overrides)) {
		// Try to replace existing attribute
		const attrPattern = new RegExp(`${escapeRegex(key)}="[^"]*"`);
		if (attrPattern.test(attrString)) {
			attrString = attrString.replace(attrPattern, `${key}="${value}"`);
		} else {
			// Add new attribute
			attrString = attrString.trimEnd() + ` ${key}="${value}" `;
		}
	}

	return source.replace(openTagPattern, `${match[1]}${attrString}${match[3]}`);
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
