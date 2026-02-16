import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  type CompletionParams,
  type TextDocuments,
} from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { getAllRunes, getRune, getAllNames } from '../registry/loader.js';
import { getTagContext, findUnclosedTags } from '../parser/document.js';

export function provideCompletion(
  params: CompletionParams,
  documents: TextDocuments<TextDocument>,
): CompletionItem[] {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const textBefore = text.slice(0, offset);

  const ctx = getTagContext(textBefore);
  if (!ctx) return [];

  // Closing tag completion: {% /
  if (ctx.isClosing) {
    return completeClosingTags(textBefore, ctx.tagName);
  }

  // Attribute value completion: {% hint type="
  if (ctx.attribute?.inValue) {
    return completeAttributeValues(ctx.tagName, ctx.attribute.name, ctx.attribute.valuePrefix);
  }

  // Attribute name completion: {% hint | (cursor after space, or partial attribute name)
  if (ctx.attribute && !ctx.attribute.inValue) {
    return completeAttributeNames(ctx.tagName, ctx.attribute.name, ctx.existingAttributes);
  }

  // If we have a tag name and trailing space, offer attributes
  if (ctx.tagName && textBefore.match(/\{%\s*[a-zA-Z][a-zA-Z0-9-]*\s+$/)) {
    return completeAttributeNames(ctx.tagName, '', ctx.existingAttributes);
  }

  // Tag name completion: {% | or {% partial-name
  return completeTagNames(ctx.tagName);
}

function completeTagNames(prefix: string): CompletionItem[] {
  const items: CompletionItem[] = [];
  const seen = new Set<string>();

  for (const rune of getAllRunes()) {
    // Primary name
    if (rune.name.startsWith(prefix) && !seen.has(rune.name)) {
      seen.add(rune.name);
      const requiredAttrs = Object.entries(rune.attributes)
        .filter(([, attr]) => attr.required)
        .map(([name]) => name);

      let insertText: string;
      let insertFormat: InsertTextFormat;

      if (requiredAttrs.length > 0) {
        // Build snippet with required attributes
        const attrSnippets = requiredAttrs.map((name, i) => {
          const attr = rune.attributes[name];
          if (attr.matches && Array.isArray(attr.matches)) {
            return `${name}="\${${i + 1}|${attr.matches.join(',')}|}"`;
          }
          return `${name}="\${${i + 1}}"`;
        });
        insertText = `${rune.name} ${attrSnippets.join(' ')} `;
        insertFormat = InsertTextFormat.Snippet;
      } else {
        insertText = rune.name;
        insertFormat = InsertTextFormat.PlainText;
      }

      items.push({
        label: rune.name,
        kind: CompletionItemKind.Class,
        detail: rune.description,
        documentation: buildRuneDocumentation(rune),
        insertText,
        insertTextFormat: insertFormat,
        sortText: `0_${rune.name}`,
      });
    }

    // Aliases
    for (const alias of rune.allNames.slice(1)) {
      if (alias.startsWith(prefix) && !seen.has(alias)) {
        seen.add(alias);
        items.push({
          label: alias,
          kind: CompletionItemKind.Class,
          detail: `Alias for ${rune.name}`,
          documentation: buildRuneDocumentation(rune),
          insertText: alias,
          sortText: `1_${alias}`,
        });
      }
    }
  }

  return items;
}

function completeAttributeNames(
  tagName: string,
  prefix: string,
  existingAttributes: string[],
): CompletionItem[] {
  const rune = getRune(tagName);
  if (!rune) return [];

  const items: CompletionItem[] = [];
  const existing = new Set(existingAttributes);

  for (const [name, attr] of Object.entries(rune.attributes)) {
    if (existing.has(name)) continue;
    if (!name.startsWith(prefix)) continue;

    let insertText: string;
    let insertFormat: InsertTextFormat;

    if (attr.matches && Array.isArray(attr.matches)) {
      // Enum attribute — offer choice snippet
      insertText = `${name}="\${1|${attr.matches.join(',')}|}"`;
      insertFormat = InsertTextFormat.Snippet;
    } else if (attr.type === Boolean) {
      // Boolean attribute — no value needed
      insertText = name;
      insertFormat = InsertTextFormat.PlainText;
    } else {
      insertText = `${name}="\$1"`;
      insertFormat = InsertTextFormat.Snippet;
    }

    const detail = buildAttributeDetail(name, attr);

    items.push({
      label: name,
      kind: CompletionItemKind.Property,
      detail,
      insertText,
      insertTextFormat: insertFormat,
      sortText: attr.required ? `0_${name}` : `1_${name}`,
    });
  }

  return items;
}

function completeAttributeValues(
  tagName: string,
  attrName: string,
  prefix: string,
): CompletionItem[] {
  const rune = getRune(tagName);
  if (!rune) return [];

  const attr = rune.attributes[attrName];
  if (!attr || !attr.matches || !Array.isArray(attr.matches)) return [];

  return attr.matches
    .filter((v: string) => v.startsWith(prefix))
    .map((value: string, i: number) => ({
      label: value,
      kind: CompletionItemKind.EnumMember,
      sortText: String(i).padStart(3, '0'),
    }));
}

function completeClosingTags(textBefore: string, prefix: string): CompletionItem[] {
  const unclosed = findUnclosedTags(textBefore);

  return unclosed
    .filter(name => name.startsWith(prefix))
    .reverse() // Innermost first (most likely to close)
    .map((name, i) => ({
      label: name,
      kind: CompletionItemKind.Class,
      detail: `Close {% ${name} %}`,
      sortText: String(i).padStart(3, '0'),
    }));
}

import type { RuneInfo } from '../registry/loader.js';

function buildRuneDocumentation(rune: RuneInfo): string {
  const parts: string[] = [rune.description];

  if (Object.keys(rune.reinterprets).length > 0) {
    parts.push('');
    parts.push('**Reinterprets:**');
    for (const [element, meaning] of Object.entries(rune.reinterprets)) {
      parts.push(`- ${element} → ${meaning}`);
    }
  }

  if (rune.seoType) {
    parts.push('');
    parts.push(`**SEO:** ${rune.seoType}`);
  }

  const attrs = Object.entries(rune.attributes);
  if (attrs.length > 0) {
    parts.push('');
    parts.push('**Attributes:**');
    for (const [name, attr] of attrs) {
      parts.push(`- \`${name}\`${attr.required ? ' (required)' : ''}: ${formatType(attr)}`);
    }
  }

  return parts.join('\n');
}

function buildAttributeDetail(name: string, attr: import('@markdoc/markdoc').SchemaAttribute): string {
  const parts: string[] = [];
  if (attr.required) parts.push('required');
  parts.push(formatType(attr));
  if (attr.default !== undefined) parts.push(`default: ${JSON.stringify(attr.default)}`);
  return parts.join(' · ');
}

function formatType(attr: import('@markdoc/markdoc').SchemaAttribute): string {
  if (attr.matches && Array.isArray(attr.matches)) {
    return attr.matches.map((v: string) => `"${v}"`).join(' | ');
  }
  if (attr.type === String) return 'string';
  if (attr.type === Number) return 'number';
  if (attr.type === Boolean) return 'boolean';
  if (Array.isArray(attr.type)) return 'array';
  return 'any';
}
