import { Config, Node, NodeType } from '@markdoc/markdoc';
import { Annotation } from './annotation.js';
import { propertyDecorator } from './decoration.js';
import { Group } from '../../interfaces.js';
import { isFilterMatching, NodeStream } from '../node.js';

export type GroupAnnotationOptions = Omit<Group, 'name'>;

export class AbstractGroupAnnotation extends Annotation {
  constructor(
    protected target: any,
    protected propertyKey: string,
  ) {
    super();
  }

  create(nodes: Node[], index: number, config: Config) {
    return index;
  }
}

export class GroupAnnotation extends AbstractGroupAnnotation {
  constructor(
    target: any,
    propertyKey: string,
    private options: GroupAnnotationOptions,
  ) {
    super(target, propertyKey);
  }

  public create(nodes: Node[], index: number, config: Config) {
    let section = nodes.slice(0, index).filter(n => n.type === 'hr').length;
    const group = new NodeStream([], config);

    for (const n of nodes.slice(index)) {
      if (n.type === 'hr') {
        section++;
        continue;
      }

      if (this.includes(n, section) || n.type === 'comment') {
        group.push(n);
      } else {
        break;
      }
    }

    this.target[this.propertyKey] = group;

    return index + group.length;
  }

  private includes(node: Node, section: number) {
    const group = this.options;

    if (group.section !== undefined && group.section !== section) {
      return false;
    }
    if (group.include) {
      return group.include.some(g => isFilterMatching(node, g));
    }
    return true;
  }
}

interface GroupListOptions {
  delimiter: NodeType;
}

class GroupListAnnotation extends AbstractGroupAnnotation {
  constructor(
    target: any,
    propertyKey: string,
    private options: GroupListOptions,
  ) {
    super(target, propertyKey);
  }

  create(nodes: Node[], index: number, config: Config): number {
    const streams: NodeStream[] = [];
    let current = new NodeStream([], config);

    for (const n of nodes.slice(index)) {
      if (n.type === this.options.delimiter && current.length > 0) {
        streams.push(current);
        current = new NodeStream([], config);
      } else {
        current.push(n);
      }
    }

    if (current.length > 0) {
      streams.push(current);
    }

    this.target[this.propertyKey] = streams;

    return nodes.length - 1;
  }
}

export function group(options: GroupAnnotationOptions) {
  return propertyDecorator(({ target, propertyKey }) => new GroupAnnotation(target, propertyKey, options));
}

export function groupList(options: GroupListOptions) {
  return propertyDecorator<NodeStream[]>(({ target, propertyKey }) => new GroupListAnnotation(target, propertyKey, options));
}
