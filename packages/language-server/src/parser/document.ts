/**
 * Regex-based document context parser.
 * Scans backward from cursor position to determine what context we're in
 * (tag name, attribute name, attribute value, closing tag).
 *
 * We use regex rather than Markdoc.parse() because the AST parser fails
 * on incomplete/mid-typing tags.
 */

export interface TagContext {
  /** The tag name typed so far (may be partial) */
  tagName: string;
  /** Whether this is a closing tag ({% / ... %}) */
  isClosing: boolean;
  /** Attribute context if cursor is in attribute position */
  attribute?: {
    /** Attribute name (may be partial if we're still typing the name) */
    name: string;
    /** Whether cursor is inside the value (after =") */
    inValue: boolean;
    /** The partial value typed so far (only when inValue=true) */
    valuePrefix: string;
  };
  /** Names of attributes already present on this tag */
  existingAttributes: string[];
}

/**
 * Analyze the text before the cursor to determine the tag context.
 * Returns undefined if the cursor is not inside a rune tag.
 */
export function getTagContext(textBeforeCursor: string): TagContext | undefined {
  // Find the last unclosed {% — scan backward
  const lastOpen = findLastUnclosedTag(textBeforeCursor);
  if (lastOpen === -1) return undefined;

  const inside = textBeforeCursor.slice(lastOpen);

  // Check for closing tag: {% /tagname
  const closingMatch = inside.match(/^\{%\s*\/\s*([a-zA-Z][a-zA-Z0-9-]*)?\s*$/);
  if (closingMatch) {
    return {
      tagName: closingMatch[1] ?? '',
      isClosing: true,
      existingAttributes: [],
    };
  }

  // Opening/self-closing tag: {% tagname ...attributes...
  const openMatch = inside.match(/^\{%\s*([a-zA-Z][a-zA-Z0-9-]*)?\s*/);
  if (!openMatch) return undefined;

  const tagName = openMatch[1] ?? '';
  const afterTag = inside.slice(openMatch[0].length);

  // Parse existing attributes and determine cursor position
  const existingAttributes: string[] = [];

  // Match completed attributes: name="value" or name (boolean)
  const attrRegex = /([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*"[^"]*"/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(afterTag)) !== null) {
    existingAttributes.push(attrMatch[1]);
  }

  // Check if we're currently typing an attribute value
  // Pattern: ...name="partialValue (no closing quote)
  const valueMatch = afterTag.match(/([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)$/);
  if (valueMatch) {
    return {
      tagName,
      isClosing: false,
      attribute: {
        name: valueMatch[1],
        inValue: true,
        valuePrefix: valueMatch[2],
      },
      existingAttributes,
    };
  }

  // Check if we're right after = (about to type value)
  const equalsMatch = afterTag.match(/([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*$/);
  if (equalsMatch) {
    return {
      tagName,
      isClosing: false,
      attribute: {
        name: equalsMatch[1],
        inValue: true,
        valuePrefix: '',
      },
      existingAttributes,
    };
  }

  // Check if we're typing an attribute name
  const nameMatch = afterTag.match(/(?:^|\s)([a-zA-Z_][a-zA-Z0-9_-]*)$/);
  if (nameMatch) {
    return {
      tagName,
      isClosing: false,
      attribute: {
        name: nameMatch[1],
        inValue: false,
        valuePrefix: '',
      },
      existingAttributes,
    };
  }

  // We're after the tag name with a trailing space — attribute position
  if (afterTag.match(/\s$/)) {
    return {
      tagName,
      isClosing: false,
      existingAttributes,
    };
  }

  // Just the tag name (possibly partial)
  return {
    tagName,
    isClosing: false,
    existingAttributes,
  };
}

/**
 * Find the position of the last unclosed {% in the text.
 * Skips over matched {% ... %} pairs.
 */
function findLastUnclosedTag(text: string): number {
  // Find all {% and %} positions
  const opens: number[] = [];
  const openRegex = /\{%/g;
  let match;

  while ((match = openRegex.exec(text)) !== null) {
    opens.push(match.index);
  }

  // For each open from the end, check if it has a matching close after it
  for (let i = opens.length - 1; i >= 0; i--) {
    const openPos = opens[i];
    const afterOpen = text.slice(openPos);
    // Check if there's a %} that closes this tag
    const closeIdx = afterOpen.indexOf('%}');
    if (closeIdx === -1) {
      // No matching close — this is our unclosed tag
      return openPos;
    }
  }

  return -1;
}

/**
 * Find unclosed rune tags before the cursor for closing tag completion.
 * Returns tag names of unclosed tags in order (outermost first).
 */
export function findUnclosedTags(textBeforeCursor: string): string[] {
  const stack: string[] = [];
  // Match opening tags: {% tagname ... %}  (not self-closing, not closing)
  // and closing tags: {% /tagname %}
  const tagRegex = /\{%\s*(?:(\/)\s*)?([a-zA-Z][a-zA-Z0-9-]*)[^%]*?(\/)?\s*%\}/g;

  let match;
  while ((match = tagRegex.exec(textBeforeCursor)) !== null) {
    const isClosing = match[1] === '/';
    const isSelfClosing = match[3] === '/';
    const name = match[2];

    if (isClosing) {
      // Pop matching tag from stack
      const idx = stack.lastIndexOf(name);
      if (idx !== -1) {
        stack.splice(idx, 1);
      }
    } else if (!isSelfClosing) {
      stack.push(name);
    }
  }

  return stack;
}
