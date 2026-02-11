export interface NavItem {
  /** Page slug or URL */
  slug: string;
  /** Display title */
  title?: string;
  /** Child items */
  children: NavItem[];
}

export interface NavGroup {
  /** Group title */
  title: string;
  /** Items in this group */
  items: NavItem[];
}

export interface NavTree {
  /** Navigation groups */
  groups: NavGroup[];
  /** Top-level items not in any group */
  items: NavItem[];
  /** Whether this nav supports sequential pagination */
  ordered: boolean;
}

/**
 * Build a navigation tree from parsed {% nav %} rune output.
 * This processes the rendered Tag tree from the nav rune into a
 * structured navigation object.
 */
export function buildNavigation(navTag: unknown): NavTree {
  // TODO: Implement full nav tree building from rendered Tag output
  return {
    groups: [],
    items: [],
    ordered: false,
  };
}
