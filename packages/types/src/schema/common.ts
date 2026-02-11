import { ComponentType } from "../interfaces.js";

export class LinkItem {
  name: string = '';
  url: string = '';
}

export class Command {
  code: string = '';
}

export interface LinkItemComponent extends ComponentType<LinkItem> {
  tag: 'li',
  properties: {
    name: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    url: 'a',
  },
}

export interface CommandComponent extends ComponentType<Command> {
  tag: 'div',
  properties: {
    code: 'code',
  },
}
