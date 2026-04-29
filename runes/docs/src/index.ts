import type { RunePackage } from '@refrakt-md/types';
import { api } from './tags/api.js';
import { symbol, symbolGroup, symbolMember } from './tags/symbol.js';
import { changelog, changelogRelease } from './tags/changelog.js';
import { config } from './config.js';

export const docs: RunePackage = {
  name: 'docs',
  displayName: 'Documentation',
  version: '0.10.1',
  runes: {
    'api': {
      transform: api,
      aliases: ['endpoint'],
      description: 'API endpoint documentation with method, path, parameters, and request/response examples',
      category: 'Code & Data',
      snippet: ['{% api method="${1|GET,POST,PUT,DELETE,PATCH|}" path="${2:/api/resource}" %}', '## ${3:Description}', '', '| Parameter | Type | Description |', '|-----------|------|-------------|', '| ${4:id} | ${5:string} | ${6:Resource ID} |', '', '```json', '{', '  $0', '}', '```', '{% /api %}'],
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
      category: 'Code & Data',
      snippet: ['{% symbol kind="${1|function,hook,class,interface,enum,type,module,component|}" lang="${2|typescript,javascript,python,rust,go|}" %}', '', '## ${3:name}', '', '${4:Description.}', '', '```${2}', '${5:signature}', '```', '', '$0', '', '{% /symbol %}'],
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
      category: 'Semantic',
      snippet: ['{% changelog %}', '## ${1:1.0.0} \\u2014 ${2:${CURRENT_YEAR}-${CURRENT_MONTH}-${CURRENT_DATE}}', '', '- **Added**: ${3:New feature}', '- **Fixed**: ${4:Bug fix}', '{% /changelog %}'],
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

export type {
	ApiProps, ChangelogReleaseProps, ChangelogProps,
	SymbolMemberProps, SymbolGroupProps, SymbolProps,
} from './props.js';
