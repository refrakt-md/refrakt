import { ComponentType } from "@refrakt-md/types";

export class Grid {}

export interface GridComponent extends ComponentType<Grid> {
  tag: 'section',
  properties: {},
  refs: {
    item: 'div',
  },
}
