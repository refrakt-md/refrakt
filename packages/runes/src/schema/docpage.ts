import { ComponentType, LinkItem, Page, PageProperties } from "@refrakt-md/types";
import { SequentialPagination } from "./pagination.js";

export class DocPage extends Page {
  pagination: SequentialPagination = new SequentialPagination();
  headings: Headings | undefined = undefined;
}

export interface DocPageProperties extends PageProperties {
  pagination: 'nav',
  headings: 'aside',
}

export interface DocPageComponent extends ComponentType<DocPage> {
  tag: 'document',
  properties: DocPageProperties,
  refs: {
    body: 'article',
  }
}

export class Headings {
  headline!: string;
  item: LinkItem[] = [];
}

export interface HeadingsComponent extends ComponentType<Headings> {
  tag: 'aside'
  properties: {
    headline: 'h1',
    item: 'li',
  }
}
