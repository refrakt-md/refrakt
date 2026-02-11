import { ComponentType } from "../interfaces.js";

export class SequentialPagination {
  nextPage: string | undefined = undefined;
  previousPage: string | undefined = undefined
}

export interface SequentialPaginationComponent extends ComponentType<SequentialPagination> {
  tag: 'nav',
  properties: {
    nextPage: 'a',
    previousPage: 'a',
  },
  refs: {}
}
