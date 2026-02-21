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

	api: `{% api method="GET" path="/api/users/:id" auth="Bearer" %}
Retrieve a single user by their unique identifier.

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | The user's unique ID |

\`\`\`json
{
  "id": "usr_123",
  "name": "Alice",
  "email": "alice@example.com"
}
\`\`\`
{% /api %}`,

	recipe: `{% recipe prepTime="PT15M" cookTime="PT30M" servings="4" difficulty="medium" %}
# Classic Margherita Pizza

- 500g bread flour
- 7g dried yeast
- 1 tsp salt
- 300ml warm water
- San Marzano tomatoes
- Fresh mozzarella
- Fresh basil leaves

1. Mix flour, yeast, and salt in a large bowl
2. Add warm water and knead for 10 minutes until smooth
3. Let the dough rise for 1 hour at room temperature
4. Shape into rounds and add toppings
5. Bake at 250°C for 8-10 minutes

> For the best crust, preheat your oven with a pizza stone for at least 30 minutes before baking.
{% /recipe %}`,

	symbol: `{% symbol kind="function" lang="typescript" since="1.2.0" %}
# createTransform

\`\`\`typescript
function createTransform(config: ThemeConfig): (tree: RendererNode) => RendererNode
\`\`\`

- config — The theme configuration object defining BEM mappings and structural rules
- Returns a pure transform function that enhances serialized tag trees

> Returns a function that walks the serialized tag tree and applies BEM classes, reads meta tags, injects structural elements, and recurses into children.
{% /symbol %}`,

	event: `{% event date="2026-03-15" endDate="2026-03-17" location="Stockholm, Sweden" url="https://example.com/register" %}
# Nordic Developer Summit

A three-day conference bringing together developers, designers, and product engineers from across the Nordics.

- Keynote: The Future of Web Components
- Workshop: Building Design Systems at Scale
- Panel: Open Source in Enterprise
{% /event %}`,

	howto: `{% howto estimatedTime="PT45M" difficulty="easy" %}
# Set Up a Refrakt Theme

- Node.js 20+
- A code editor
- Basic CSS knowledge

1. Create a new directory for your theme
2. Run \`npm init\` and add the theme-base dependency
3. Create your \`theme.config.ts\` extending baseConfig
4. Write CSS targeting the BEM selectors from \`refrakt inspect\`
5. Test with \`refrakt inspect --serve\`
{% /howto %}`,

	hero: `{% hero align="center" %}
# Build Beautiful Documentation
From Markdown to pixel-perfect pages in minutes.

- [Get Started](/docs)
- [View on GitHub](https://github.com)
{% /hero %}`,

	feature: `{% feature %}
# Why Refrakt

Runes reinterpret standard Markdown — same syntax, richer meaning.

- **Fast** — Static generation, zero runtime JavaScript
- **Flexible** — 43+ runes, infinite combinations
- **Themeable** — Full control over every element
{% /feature %}`,

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

	steps: `{% steps %}
# Install dependencies
Run \`npm install @refrakt-md/cli\` to add the CLI to your project.

# Create content
Write your first Markdown file using rune tags for rich components.

# Build and preview
Run \`npm run dev\` to start the development server and see your content rendered.
{% /steps %}`,

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

	pricing: `{% pricing %}
# Choose Your Plan
Select the plan that best fits your needs.

{% tier name="Starter" price="Free" %}
- Up to 3 projects
- Community support
- Basic themes
{% /tier %}

{% tier name="Pro" price="$29/mo" featured="true" %}
- Unlimited projects
- Priority support
- All themes
- Custom domains
{% /tier %}

{% tier name="Enterprise" price="Custom" %}
- Everything in Pro
- SSO & SAML
- Dedicated support
- SLA guarantee
{% /tier %}
{% /pricing %}`,

	changelog: `{% changelog %}
## 1.2.0 — 2026-02-15
- **Added** Inspect command for theme developers
- **Added** Selector extraction from transformed trees
- **Fixed** BEM class ordering for nested runes

## 1.1.0 — 2026-01-20
- **Added** Context-aware modifiers
- **Changed** Improved meta tag consumption logic
{% /changelog %}`,

	testimonial: `{% testimonial %}
> Refrakt transformed how we write documentation. The rune system means our content authors write Markdown while our designers have full control over the output.

**Sarah Chen** — Head of Developer Experience at Acme Corp

![](/avatars/sarah.jpg)
{% /testimonial %}`,

	timeline: `{% timeline %}
## 2024 — Project Inception
Initial prototype exploring Markdoc extensions for component-rich content.

## 2025 — Open Source Launch
First public release with 20 runes and the Lumina theme.

## 2026 — Theme Ecosystem
Launch of the theme marketplace and inspect tooling for developers.
{% /timeline %}`,

	conversation: `{% conversation %}
> **Alice** — Have you tried the new inspect command?

> **Bob** — Yes! It shows exactly what HTML the identity transform produces. No more guessing which selectors to target.

> **Alice** — The variant expansion is my favorite part. You can see every modifier value at once.
{% /conversation %}`,

	comparison: `{% comparison %}
# React
- **Learning Curve** — Moderate
- **Bundle Size** — ~40kb
- **Reactivity** — Virtual DOM
- ~~Server Components~~ — Experimental

# Svelte
- **Learning Curve** — Easy
- **Bundle Size** — ~5kb
- **Reactivity** — Compile-time
- **Server Components** — Native
{% /comparison %}`,

	storyboard: `{% storyboard style="clean" columns="3" %}
![Panel 1](/images/panel1.jpg)
The hero surveys the landscape from atop the hill.

![Panel 2](/images/panel2.jpg)
A distant rumble echoes across the valley.

![Panel 3](/images/panel3.jpg)
The journey begins.
{% /storyboard %}`,

	sidenote: `{% sidenote style="sidenote" %}
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

	form: `{% form method="POST" style="stacked" %}
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

	cast: `{% cast %}
- **Alice Chen** — Lead Engineer
- **Bob Martinez** — Product Designer
- **Carol Kim** — Engineering Manager
{% /cast %}`,

	bento: `{% bento %}
# Main Feature
The primary showcase area with plenty of room for a detailed description.

## Secondary Feature
A supporting feature with moderate space.

## Another Feature
More supporting content.

### Small Detail
A compact cell.

### Small Detail
Another compact cell.
{% /bento %}`,

	palette: `{% palette title="Brand Colors" %}
- Primary: #2563EB
- Secondary: #7C3AED
- Accent: #F59E0B
- Success: #10B981
- Error: #EF4444
{% /palette %}`,

	typography: `{% typography title="Type Scale" %}
- Display: Inter (400, 600, 700)
- Body: Inter (400, 500)
- Mono: JetBrains Mono (400, 500)
{% /typography %}`,

	spacing: `{% spacing title="Spacing Scale" %}
# Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
{% /spacing %}`,
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
