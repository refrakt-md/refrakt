import type { RunePackage } from '@refrakt-md/types';
import { api } from './tags/api.js';
import { symbol, symbolGroup, symbolMember } from './tags/symbol.js';
import { changelog, changelogRelease } from './tags/changelog.js';
import { config } from './config.js';

export const docs: RunePackage = {
  name: 'docs',
  displayName: 'Documentation',
  version: '0.7.2',
  runes: {
    'api': {
      transform: api,
      aliases: ['endpoint'],
      description: 'API endpoint documentation with method, path, parameters, and request/response examples',
      reinterprets: { heading: 'endpoint title', fence: 'request/response examples', table: 'parameter list', blockquote: 'notes/warnings' },
      fixture: `{% api method="GET" path="/api/users/:id" auth="Bearer" %}
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
    },
    'symbol': {
      transform: symbol,
      description: 'Code construct documentation for functions, classes, interfaces, enums, and type aliases',
      seoType: 'TechArticle',
      reinterprets: { heading: 'construct name or member group', fence: 'type signature', list: 'parameter definitions', blockquote: 'returns/throws/deprecation' },
      fixture: `{% symbol kind="function" lang="typescript" since="1.2.0" %}
# createTransform

\`\`\`typescript
function createTransform(config: ThemeConfig): (tree: RendererNode) => RendererNode
\`\`\`

- config — The theme configuration object defining BEM mappings and structural rules
- Returns a pure transform function that enhances serialized tag trees

> Returns a function that walks the serialized tag tree and applies BEM classes, reads meta tags, injects structural elements, and recurses into children.
{% /symbol %}`,
    },
    'symbol-group': {
      transform: symbolGroup,
      description: 'Member group within a class/interface symbol',
    },
    'symbol-member': {
      transform: symbolMember,
      description: 'Individual member within a symbol group',
    },
    'changelog': {
      transform: changelog,
      description: 'Version history where headings become releases with categorized changes',
      reinterprets: { heading: 'version number and date', list: 'categorized changes', strong: 'change category' },
      fixture: `{% changelog %}
## 1.2.0 — 2026-02-15
- **Added** Inspect command for theme developers
- **Added** Selector extraction from transformed trees
- **Fixed** BEM class ordering for nested runes

## 1.1.0 — 2026-01-20
- **Added** Context-aware modifiers
- **Changed** Improved meta tag consumption logic
{% /changelog %}`,
    },
    'changelog-release': {
      transform: changelogRelease,
      description: 'Individual changelog release with version and date',
    },
  },
  theme: {
    runes: config as unknown as Record<string, Record<string, unknown>>,
  },
};

export default docs;
