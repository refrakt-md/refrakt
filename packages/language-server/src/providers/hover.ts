import {
  Hover,
  MarkupKind,
  type HoverParams,
  type TextDocuments,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { getRune } from '../registry/loader.js';
import type { SchemaAttribute } from '@markdoc/markdoc';

export function provideHover(
  params: HoverParams,
  documents: TextDocuments<TextDocument>,
): Hover | null {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const text = document.getText();
  const offset = document.offsetAt(params.position);

  // Try to find a rune tag name or attribute at the cursor position
  const runeHover = getRuneHover(text, offset);
  if (runeHover) return runeHover;

  return null;
}

function getRuneHover(text: string, offset: number): Hover | null {
  // Find the tag context around the cursor
  // Look for {% ... %} containing the cursor
  const before = text.slice(0, offset);
  const after = text.slice(offset);

  // Find nearest {% before cursor
  const openIdx = before.lastIndexOf('{%');
  if (openIdx === -1) return null;

  // Find the next %} after that opening
  const closeSearch = text.slice(openIdx);
  const closeOffset = closeSearch.indexOf('%}');
  if (closeOffset === -1) return null;

  const closeIdx = openIdx + closeOffset + 2;
  // Cursor must be within this tag
  if (offset < openIdx || offset > closeIdx) return null;

  const tagContent = text.slice(openIdx, closeIdx);

  // Parse the tag content
  const isClosing = /^\{%\s*\//.test(tagContent);
  const tagMatch = isClosing
    ? tagContent.match(/^\{%\s*\/\s*([a-zA-Z][a-zA-Z0-9-]*)/)
    : tagContent.match(/^\{%\s*([a-zA-Z][a-zA-Z0-9-]*)/);

  if (!tagMatch) return null;

  const tagName = tagMatch[1];
  const tagNameStart = openIdx + tagMatch[0].indexOf(tagName);
  const tagNameEnd = tagNameStart + tagName.length;

  // Check if cursor is on the tag name
  if (offset >= tagNameStart && offset <= tagNameEnd) {
    return buildRuneHover(tagName);
  }

  // Check if cursor is on an attribute name (only for opening tags)
  if (!isClosing) {
    const afterTagName = tagContent.slice(tagMatch[0].length - (openIdx - openIdx));
    // Find attribute names in the tag
    const attrRegex = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=/g;
    const tagStart = openIdx;
    // Search within the tag content for attribute names
    const contentAfterTag = text.slice(tagNameEnd, closeIdx);
    let attrMatch;
    while ((attrMatch = attrRegex.exec(contentAfterTag)) !== null) {
      const attrStart = tagNameEnd + attrMatch.index;
      const attrEnd = attrStart + attrMatch[1].length;
      if (offset >= attrStart && offset <= attrEnd) {
        return buildAttributeHover(tagName, attrMatch[1]);
      }
    }
  }

  return null;
}

function buildRuneHover(tagName: string): Hover | null {
  const rune = getRune(tagName);
  if (!rune) return null;

  const lines: string[] = [];
  lines.push(`### ${rune.name}`);

  if (rune.allNames.length > 1) {
    const aliases = rune.allNames.filter(n => n !== rune.name);
    lines.push(`*Aliases: ${aliases.join(', ')}*`);
  }

  lines.push('');
  lines.push(rune.description);

  if (Object.keys(rune.reinterprets).length > 0) {
    lines.push('');
    lines.push('**Reinterprets:**');
    for (const [element, meaning] of Object.entries(rune.reinterprets)) {
      lines.push(`- ${element} → ${meaning}`);
    }
  }

  if (rune.seoType) {
    lines.push('');
    lines.push(`**SEO type:** \`${rune.seoType}\``);
  }

  const attrs = Object.entries(rune.attributes);
  if (attrs.length > 0) {
    lines.push('');
    lines.push('**Attributes:**');
    for (const [name, attr] of attrs) {
      const parts: string[] = [`\`${name}\``];
      if (attr.required) parts.push('*(required)*');
      parts.push(`— ${formatType(attr)}`);
      if (attr.default !== undefined) parts.push(`(default: \`${JSON.stringify(attr.default)}\`)`);
      lines.push(`- ${parts.join(' ')}`);
    }
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: lines.join('\n'),
    },
  };
}

function buildAttributeHover(tagName: string, attrName: string): Hover | null {
  const rune = getRune(tagName);
  if (!rune) return null;

  const attr = rune.attributes[attrName];
  if (!attr) return null;

  const lines: string[] = [];
  lines.push(`**${attrName}** on \`{% ${rune.name} %}\``);
  lines.push('');

  const typeLine: string[] = [`**Type:** ${formatType(attr)}`];
  lines.push(typeLine.join(''));

  if (attr.required) {
    lines.push('**Required:** yes');
  }

  if (attr.default !== undefined) {
    lines.push(`**Default:** \`${JSON.stringify(attr.default)}\``);
  }

  if (attr.matches && Array.isArray(attr.matches)) {
    lines.push('');
    lines.push('**Allowed values:**');
    for (const value of attr.matches) {
      lines.push(`- \`${value}\``);
    }
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: lines.join('\n'),
    },
  };
}

function formatType(attr: SchemaAttribute): string {
  if (attr.matches && Array.isArray(attr.matches)) {
    return attr.matches.map((v: string) => `\`"${v}"\``).join(' | ');
  }
  if (attr.type === String) return '`string`';
  if (attr.type === Number) return '`number`';
  if (attr.type === Boolean) return '`boolean`';
  if (Array.isArray(attr.type)) return '`array`';
  return '`any`';
}
