import { ComponentType, PropertyNodes } from "../interfaces.js";

export class NavItem {
  slug: string = '';
  children: NavItem[] = [];
}

export interface NavItemComponent extends ComponentType<NavItem> {
  tag: 'li',
  properties: {
    slug: 'span',
    children: 'li',
  },
  refs: {},
}

export class NavGroup {
  title: string = '';
  item: NavItem[] = [];
}

export interface NavGroupComponent extends ComponentType<NavGroup> {
  tag: 'section',
  properties: {
    title: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    item: 'li',
  },
  refs: {},
}

export class Nav {
  group: NavGroup[] = [];
  item: NavItem[] = [];
}

export interface NavComponent extends ComponentType<Nav> {
  tag: 'nav',
  properties: {
    group: 'section',
    item: 'li',
  },
  refs: {},
}
