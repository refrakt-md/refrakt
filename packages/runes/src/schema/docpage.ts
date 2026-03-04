import { LinkItem, Page } from "@refrakt-md/types";
import { SequentialPagination } from "./pagination.js";

export class DocPage extends Page {
  pagination: SequentialPagination = new SequentialPagination();
  headings: Headings | undefined = undefined;
}

export class Headings {
  headline!: string;
  item: LinkItem[] = [];
}
