import { ComponentType } from "../interfaces.js";
import { LinkItem } from "./common.js";
import { Page, PageProperties } from "./page.js";
import { SequentialPagination } from "./pagination.js";

export class DocPage extends Page {
  topic: string = '';
  pagination: SequentialPagination = new SequentialPagination();
  headings: Headings | undefined = undefined;
  summary: TableOfContents | undefined = undefined;
}

export interface DocPageProperties extends PageProperties {
  topic: 'h2',
  pagination: 'nav',
  headings: 'aside',
  summary: 'nav',
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

export class Topic {
  name: string | undefined = undefined;
  item: LinkItem[] = [];
}

export interface TopicComponent extends ComponentType<Topic> {
  tag: 'div',
  properties: {
    name: 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    item: 'li',
  }
}

export class TableOfContents {
  headline: string | undefined = undefined;
  topic: Topic[] = [];
}

export interface TableOfContentsComponent extends ComponentType<TableOfContents> {
  tag: 'nav',
  properties: {
    headline: 'h1',
    topic: 'div',
  },
  refs: {},
}
