export interface Newable<T> {
  new (...args: any[]): T;
}

export type PropertyNodes<TSchema> = { [P in keyof TSchema ]: NodeType };

export type NodeType =
  'document' |

  // Document metadata
  'meta' |

  //Content sectioning
  'address' |
  'article' |
  'aside' |
  'footer' |
  'header' |
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' |
  'hgroup' |
  'main' |
  'nav' |
  'section' |
  'search' |

  // Text content
  'blockquote' |
  'dd' |
  'div' |
  'dl' |
  'dt' |
  'figcaption' |
  'figure' |
  'hr' |
  'li' |
  'menu' |
  'ol' |
  'p' |
  'pre' |
  'ul' |

  // Inline text semantics
  'a' |
  'abbr' |
  'b' |
  'bdi' |
  'bdo' |
  'br' |
  'cite' |
  'code' |
  'data' |
  'dfn' |
  'em' |
  'i' |
  'kbd' |
  'span' |
  'strong' |
  'time' |

  // Image and multimedia
  'area' |
  'audio' |
  'img' |
  'map' |
  'track' |
  'video' |

  // SVG and MathML
  'svg' |
  'path' |
  'math' |

  // Table content
  'caption' |
  'col' |
  'colgroup' |
  'table' |
  'tbody' |
  'td' |
  'tfoot' |
  'th' |
  'thead' |
  'tr';


export interface ComponentType<TSchema> {
  tag: NodeType;

  schema: TSchema;

  properties: PropertyNodes<TSchema>;

  refs: Record<string, NodeType>
}
