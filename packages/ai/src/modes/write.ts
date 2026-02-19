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

export function writePrompt(options?: WritePromptOptions): string {
	if (!options?.multiFile) {
		return FRONTMATTER_INSTRUCTION;
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

Example structure:

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

{% hero %}
# Welcome
...
{% /hero %}

--- FILE: docs/getting-started.md ---
---
title: Getting Started
description: Learn the basics
---

Content here...`;
}
