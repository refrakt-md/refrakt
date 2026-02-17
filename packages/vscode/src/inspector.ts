import * as vscode from 'vscode';

interface InspectorResult {
  runeName: string;
  stages: {
    ast: object;
    transform: object;
    serialized: object;
    identity: object | null;
  };
  identityError?: string;
}

export class InspectorNode {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly children: InspectorNode[],
    public readonly data: unknown,
    public readonly icon?: string,
  ) {}

  get collapsibleState(): vscode.TreeItemCollapsibleState {
    return this.children.length > 0
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.None;
  }
}

/**
 * Build tree nodes from a JSON-like object, recursively.
 */
function buildObjectTree(obj: unknown, parentLabel?: string): InspectorNode[] {
  if (obj === null || obj === undefined) {
    return [new InspectorNode(parentLabel ?? 'null', 'null', [], obj)];
  }

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return [new InspectorNode(parentLabel ?? String(obj), String(obj), [], obj)];
  }

  if (Array.isArray(obj)) {
    return obj.map((item, i) => {
      const label = getNodeLabel(item, i);
      const desc = getNodeDescription(item);
      const children = (typeof item === 'object' && item !== null)
        ? buildObjectChildren(item)
        : [];
      return new InspectorNode(label, desc, children, item);
    });
  }

  if (typeof obj === 'object') {
    return buildObjectChildren(obj as Record<string, unknown>);
  }

  return [];
}

function buildObjectChildren(obj: Record<string, unknown>): InspectorNode[] {
  const nodes: InspectorNode[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      nodes.push(new InspectorNode(key, String(value), [], value));
    } else if (Array.isArray(value)) {
      const children = value.map((item, i) => {
        const label = getNodeLabel(item, i);
        const desc = getNodeDescription(item);
        const childChildren = (typeof item === 'object' && item !== null)
          ? buildObjectChildren(item as Record<string, unknown>)
          : [];
        return new InspectorNode(label, desc, childChildren, item);
      });
      nodes.push(new InspectorNode(key, `[${value.length}]`, children, value));
    } else if (typeof value === 'object') {
      const children = buildObjectChildren(value as Record<string, unknown>);
      nodes.push(new InspectorNode(key, '', children, value));
    }
  }

  return nodes;
}

/**
 * Get a human-readable label for a tree node.
 */
function getNodeLabel(item: unknown, index: number): string {
  if (item === null || item === undefined) return `[${index}]`;
  if (typeof item !== 'object') return String(item);

  const obj = item as Record<string, unknown>;

  // Serialized tag nodes
  if (obj.$$mdtype === 'Tag' && obj.name) {
    const attrs = obj.attributes as Record<string, unknown> | undefined;
    if (attrs?.typeof) return `${obj.name} [typeof="${attrs.typeof}"]`;
    if (attrs?.class) return `${obj.name}.${String(attrs.class).split(' ').join('.')}`;
    if (attrs?.['data-name']) return `${obj.name} [${attrs['data-name']}]`;
    if (attrs?.property) return `${obj.name} [property="${attrs.property}"]`;
    return String(obj.name);
  }

  // AST child summary
  if (obj.type) {
    if (obj.tag) return `${obj.type}: ${obj.tag}`;
    return String(obj.type);
  }

  // Text nodes
  if (obj.text) return `"${String(obj.text).slice(0, 40)}"`;

  return `[${index}]`;
}

/**
 * Get a short description string for a tree node.
 */
function getNodeDescription(item: unknown): string {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return '';

  const obj = item as Record<string, unknown>;
  const attrs = obj.attributes as Record<string, unknown> | undefined;

  if (attrs?.typeof) return String(attrs.typeof);
  if (attrs?.class) return String(attrs.class);
  if (attrs?.['data-name']) return String(attrs['data-name']);

  return '';
}

const STAGE_ICONS: Record<string, vscode.ThemeIcon> = {
  ast: new vscode.ThemeIcon('symbol-structure'),
  transform: new vscode.ThemeIcon('symbol-method'),
  serialized: new vscode.ThemeIcon('json'),
  identity: new vscode.ThemeIcon('paintcan'),
};

export class RuneInspectorProvider implements vscode.TreeDataProvider<InspectorNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<InspectorNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private rootNodes: InspectorNode[] = [];
  private currentResult: InspectorResult | null = null;

  refresh(result: InspectorResult | null): void {
    this.currentResult = result;
    this.rootNodes = result ? this.buildRootNodes(result) : [];
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: InspectorNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, element.collapsibleState);
    item.description = element.description;
    item.tooltip = new vscode.MarkdownString(
      '```json\n' + JSON.stringify(element.data, null, 2) + '\n```'
    );
    item.contextValue = 'inspectorNode';

    if (element.icon && STAGE_ICONS[element.icon]) {
      item.iconPath = STAGE_ICONS[element.icon];
    }

    return item;
  }

  getChildren(element?: InspectorNode): InspectorNode[] {
    if (!element) {
      if (this.rootNodes.length === 0) {
        return [new InspectorNode('No rune at cursor', 'Move cursor inside a rune tag', [], null)];
      }
      return this.rootNodes;
    }
    return element.children;
  }

  getNodeJson(node: InspectorNode): string {
    return JSON.stringify(node.data, null, 2);
  }

  private buildRootNodes(result: InspectorResult): InspectorNode[] {
    const stages: InspectorNode[] = [];

    // AST stage
    const astChildren = buildObjectChildren(result.stages.ast as Record<string, unknown>);
    const astNode = new InspectorNode('AST', result.runeName, astChildren, result.stages.ast, 'ast');
    stages.push(astNode);

    // Transform stage
    const transformChildren = buildObjectChildren(result.stages.transform as Record<string, unknown>);
    const transformNode = new InspectorNode('Transform', '', transformChildren, result.stages.transform, 'transform');
    stages.push(transformNode);

    // Serialized stage
    const serializedChildren = buildObjectChildren(result.stages.serialized as Record<string, unknown>);
    const serializedNode = new InspectorNode('Serialized', '', serializedChildren, result.stages.serialized, 'serialized');
    stages.push(serializedNode);

    // Identity Transform stage
    if (result.stages.identity) {
      const identityChildren = buildObjectChildren(result.stages.identity as Record<string, unknown>);
      const identityNode = new InspectorNode('Identity Transform', '', identityChildren, result.stages.identity, 'identity');
      stages.push(identityNode);
    } else {
      const errorMsg = result.identityError ?? 'Theme not available';
      const identityNode = new InspectorNode('Identity Transform', errorMsg, [], null, 'identity');
      stages.push(identityNode);
    }

    return stages;
  }
}
