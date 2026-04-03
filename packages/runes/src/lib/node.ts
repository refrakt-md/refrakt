import type { Node } from '@markdoc/markdoc';
import { NodeFilter, NodeFilterOptions } from '../interfaces.js';

export function isFilterMatching(n: Node, match: NodeFilter) {
  if (typeof match === 'function') {
    return match(n);
  }

  const filter: NodeFilterOptions = typeof match === 'string' ? { node: match } : match;
  if (filter.node && n.type !== filter.node) {
    return false;
  }
  if (filter.descendant && !Array.from(n.walk()).some(n => n.type === filter.descendant)) {
    return false;
  }
  if (filter.descendantTag && !Array.from(n.walk()).some(n => n.type === 'tag' && n.tag === filter.descendantTag)) {
    return false;
  }
  return true;
}
