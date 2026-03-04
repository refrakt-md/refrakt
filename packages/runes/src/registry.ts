import {useSchema, Page, PageSection, LinkItem, Command, } from '@refrakt-md/types';

import {DocPage, Headings} from './schema/docpage.js';
import {Hint} from './schema/hint.js';
import {Nav, NavGroup, NavItem} from './schema/nav.js';
import {SequentialPagination} from './schema/pagination.js';
import {TabGroup, Tab, TabPanel} from './schema/tabs.js';
import {CodeGroup} from './schema/codegroup.js';
import {Grid} from './schema/grid.js';
import {Error, DebugInfo} from './schema/error.js';
import {Details} from './schema/details.js';
import {Figure} from './schema/figure.js';
import {Accordion, AccordionItem} from './schema/accordion.js';
import {TableOfContents} from './schema/toc.js';
import {Embed} from './schema/embed.js';
import {Breadcrumb, BreadcrumbItem} from './schema/breadcrumb.js';
import {Budget, BudgetCategory, BudgetLineItem} from './schema/budget.js';
import {Compare} from './schema/compare.js';
import {DataTable} from './schema/datatable.js';
import {Diff} from './schema/diff.js';
import {Chart} from './schema/chart.js';
import {Diagram} from './schema/diagram.js';
import {Sidenote} from './schema/sidenote.js';
import {Conversation, ConversationMessage} from './schema/conversation.js';
import {Reveal, RevealStep} from './schema/reveal.js';
import {Annotate, AnnotateNote} from './schema/annotate.js';
import {Form, FormField} from './schema/form.js';
import {Sandbox} from './schema/sandbox.js';
import {PullQuote} from './schema/pullquote.js';
import {TextBlock} from './schema/textblock.js';
import {MediaText} from './schema/mediatext.js';
import {Tint} from './schema/tint.js';

export const schema = {
  Page: useSchema(Page).defineType('Page'),
  PageSection: useSchema(PageSection).defineType('PageSection'),
  DocPage: useSchema(DocPage).defineType('DocPage'),
  Headings: useSchema(Headings).defineType('Headings'),
  Hint: useSchema(Hint).defineType('Hint'),
  SequentialPagination: useSchema(SequentialPagination).defineType('SequentialPagination'),
  TabGroup: useSchema(TabGroup).defineType('TabGroup'),
  Tab: useSchema(Tab).defineType('Tab'),
  TabPanel: useSchema(TabPanel).defineType('TabPanel'),
  LinkItem: useSchema(LinkItem).defineType('LinkItem'),
  Command: useSchema(Command).defineType('Command'),
  CodeGroup: useSchema(CodeGroup).defineType('CodeGroup'),
  Grid: useSchema(Grid).defineType('Grid'),
  Error: useSchema(Error).defineType('Error'),
  DebugInfo: useSchema(DebugInfo).defineType('DebugInfo'),
  Nav: useSchema(Nav).defineType('Nav'),
  NavGroup: useSchema(NavGroup).defineType('NavGroup'),
  NavItem: useSchema(NavItem).defineType('NavItem'),
  Details: useSchema(Details).defineType('Details'),
  Figure: useSchema(Figure).defineType('Figure'),
  Accordion: useSchema(Accordion).defineType('Accordion'),
  AccordionItem: useSchema(AccordionItem).defineType('AccordionItem'),
  TableOfContents: useSchema(TableOfContents).defineType('TableOfContents'),
  Embed: useSchema(Embed).defineType('Embed'),
  Breadcrumb: useSchema(Breadcrumb).defineType('Breadcrumb'),
  BreadcrumbItem: useSchema(BreadcrumbItem).defineType('BreadcrumbItem'),
  Budget: useSchema(Budget).defineType('Budget'),
  BudgetCategory: useSchema(BudgetCategory).defineType('BudgetCategory'),
  BudgetLineItem: useSchema(BudgetLineItem).defineType('BudgetLineItem'),
  Compare: useSchema(Compare).defineType('Compare'),
  DataTable: useSchema(DataTable).defineType('DataTable'),
  Diff: useSchema(Diff).defineType('Diff'),
  Chart: useSchema(Chart).defineType('Chart'),
  Diagram: useSchema(Diagram).defineType('Diagram'),
  Sidenote: useSchema(Sidenote).defineType('Sidenote'),
  Conversation: useSchema(Conversation).defineType('Conversation'),
  ConversationMessage: useSchema(ConversationMessage).defineType('ConversationMessage'),
  Reveal: useSchema(Reveal).defineType('Reveal'),
  RevealStep: useSchema(RevealStep).defineType('RevealStep'),
  Annotate: useSchema(Annotate).defineType('Annotate'),
  AnnotateNote: useSchema(AnnotateNote).defineType('AnnotateNote'),
  Form: useSchema(Form).defineType('Form'),
  FormField: useSchema(FormField).defineType('FormField'),
  Sandbox: useSchema(Sandbox).defineType('Sandbox'),
  PullQuote: useSchema(PullQuote).defineType('PullQuote'),
  TextBlock: useSchema(TextBlock).defineType('TextBlock'),
  MediaText: useSchema(MediaText).defineType('MediaText'),
  Tint: useSchema(Tint).defineType('Tint'),
}
