import type { HLJSApi, Language } from 'highlight.js';

export function markdoc(hljs: HLJSApi): Language {
  return {
    name: 'Markdoc',
    aliases: ['markdoc'],
    subLanguage: 'markdown',
    contains: [
      {
        className: 'template-tag',
        begin: /\{%/,
        end: /%\}/,
        contains: [
          {
            className: 'name',
            begin: /\/?\s*[a-z][a-z0-9-]*/,
          },
          {
            className: 'attr',
            begin: /[a-zA-Z_][a-zA-Z0-9_-]*(?=\s*=)/,
          },
          {
            className: 'string',
            begin: /"/, end: /"/,
          },
          {
            className: 'number',
            begin: /\b\d+\b/,
          },
          {
            className: 'literal',
            begin: /\b(true|false)\b/,
          },
        ],
      },
    ],
  };
}
