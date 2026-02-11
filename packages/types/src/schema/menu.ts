import { ComponentType } from "../interfaces.js";
import { LinkItem } from "./common.js";

export class Menu {
  title: string | undefined = undefined;
  item: LinkItem[] = [];
}

export interface MenuComponent extends ComponentType<Menu> {
  tag: 'nav',
  properties: {
    title: 'h1',
    item: 'li',
  },
  refs: {},
}
