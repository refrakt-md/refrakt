import type { RunePackage } from '@refrakt-md/types';
import { api } from './tags/api.js';
import { symbol, symbolGroup, symbolMember } from './tags/symbol.js';
import { changelog, changelogRelease } from './tags/changelog.js';
import { config } from './config.js';

export const docs: RunePackage = {
  name: 'docs',
  displayName: 'Documentation',
  version: '0.6.0',
  runes: {
    'api': {
      transform: api,
      aliases: ['endpoint'],
      description: 'API endpoint documentation with method, path, parameters, and request/response examples',
      reinterprets: { heading: 'endpoint title', fence: 'request/response examples', table: 'parameter list', blockquote: 'notes/warnings' },
    },
    'symbol': {
      transform: symbol,
      description: 'Code construct documentation for functions, classes, interfaces, enums, and type aliases',
      seoType: 'TechArticle',
      reinterprets: { heading: 'construct name or member group', fence: 'type signature', list: 'parameter definitions', blockquote: 'returns/throws/deprecation' },
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
