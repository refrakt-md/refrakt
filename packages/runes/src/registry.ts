import {
  useSchema,
  Page, PageComponent, PageSectionComponent,
  PageSection,
  LinkItem, LinkItemComponent,
  Command, CommandComponent,
} from '@refrakt-md/types';

import { DocPage, DocPageComponent, Headings, HeadingsComponent } from './schema/docpage.js';
import { Hint, HintComponent } from './schema/hint.js';
import { Nav, NavComponent, NavGroup, NavGroupComponent, NavItem, NavItemComponent } from './schema/nav.js';
import { SequentialPagination, SequentialPaginationComponent } from './schema/pagination.js';
import { TabGroup, TabGroupComponent, Tab, TabComponent, TabPanel, TabPanelComponent } from './schema/tabs.js';
import { CodeGroup, CodeGroupComponent } from './schema/codegroup.js';
import { Grid, GridComponent } from './schema/grid.js';
import { Error, ErrorComponent, DebugInfo, DebugInfoComponent } from './schema/error.js';
import { Details, DetailsComponent } from './schema/details.js';
import { Figure, FigureComponent } from './schema/figure.js';
import { Accordion, AccordionComponent, AccordionItem, AccordionItemComponent } from './schema/accordion.js';
import { TableOfContents, TableOfContentsComponent } from './schema/toc.js';
import { Embed, EmbedComponent } from './schema/embed.js';
import { Breadcrumb, BreadcrumbComponent, BreadcrumbItem, BreadcrumbItemComponent } from './schema/breadcrumb.js';
import { Budget, BudgetComponent, BudgetCategory, BudgetCategoryComponent, BudgetLineItem, BudgetLineItemComponent } from './schema/budget.js';
import { Compare, CompareComponent } from './schema/compare.js';
import { DataTable, DataTableComponent } from './schema/datatable.js';
import { Diff, DiffComponent } from './schema/diff.js';
import { Chart, ChartComponent } from './schema/chart.js';
import { Diagram, DiagramComponent } from './schema/diagram.js';
import { Sidenote, SidenoteComponent } from './schema/sidenote.js';
import { Conversation, ConversationComponent, ConversationMessage, ConversationMessageComponent } from './schema/conversation.js';
import { Reveal, RevealComponent, RevealStep, RevealStepComponent } from './schema/reveal.js';
import { Annotate, AnnotateComponent, AnnotateNote, AnnotateNoteComponent } from './schema/annotate.js';
import { Form, FormComponent, FormField, FormFieldComponent } from './schema/form.js';
import { Sandbox, SandboxComponent } from './schema/sandbox.js';
import { PullQuote, PullQuoteComponent } from './schema/pullquote.js';
import { TextBlock, TextBlockComponent } from './schema/textblock.js';
import { MediaText, MediaTextComponent } from './schema/mediatext.js';

export const schema = {
  Page: useSchema(Page).defineType<PageComponent>('Page'),
  PageSection: useSchema(PageSection).defineType<PageSectionComponent>('PageSection'),
  DocPage: useSchema(DocPage).defineType<DocPageComponent>('DocPage'),
  Headings: useSchema(Headings).defineType<HeadingsComponent>('Headings'),
  Hint: useSchema(Hint).defineType<HintComponent>('Hint'),
  SequentialPagination: useSchema(SequentialPagination).defineType<SequentialPaginationComponent>('SequentialPagination'),
  TabGroup: useSchema(TabGroup).defineType<TabGroupComponent>('TabGroup'),
  Tab: useSchema(Tab).defineType<TabComponent>('Tab'),
  TabPanel: useSchema(TabPanel).defineType<TabPanelComponent>('TabPanel'),
  LinkItem: useSchema(LinkItem).defineType<LinkItemComponent>('LinkItem'),
  Command: useSchema(Command).defineType<CommandComponent>('Command'),
  CodeGroup: useSchema(CodeGroup).defineType<CodeGroupComponent>('CodeGroup'),
  Grid: useSchema(Grid).defineType<GridComponent>('Grid'),
  Error: useSchema(Error).defineType<ErrorComponent>('Error'),
  DebugInfo: useSchema(DebugInfo).defineType<DebugInfoComponent>('DebugInfo'),
  Nav: useSchema(Nav).defineType<NavComponent>('Nav'),
  NavGroup: useSchema(NavGroup).defineType<NavGroupComponent>('NavGroup'),
  NavItem: useSchema(NavItem).defineType<NavItemComponent>('NavItem'),
  Details: useSchema(Details).defineType<DetailsComponent>('Details'),
  Figure: useSchema(Figure).defineType<FigureComponent>('Figure'),
  Accordion: useSchema(Accordion).defineType<AccordionComponent>('Accordion'),
  AccordionItem: useSchema(AccordionItem).defineType<AccordionItemComponent>('AccordionItem'),
  TableOfContents: useSchema(TableOfContents).defineType<TableOfContentsComponent>('TableOfContents'),
  Embed: useSchema(Embed).defineType<EmbedComponent>('Embed'),
  Breadcrumb: useSchema(Breadcrumb).defineType<BreadcrumbComponent>('Breadcrumb'),
  BreadcrumbItem: useSchema(BreadcrumbItem).defineType<BreadcrumbItemComponent>('BreadcrumbItem'),
  Budget: useSchema(Budget).defineType<BudgetComponent>('Budget'),
  BudgetCategory: useSchema(BudgetCategory).defineType<BudgetCategoryComponent>('BudgetCategory'),
  BudgetLineItem: useSchema(BudgetLineItem).defineType<BudgetLineItemComponent>('BudgetLineItem'),
  Compare: useSchema(Compare).defineType<CompareComponent>('Compare'),
  DataTable: useSchema(DataTable).defineType<DataTableComponent>('DataTable'),
  Diff: useSchema(Diff).defineType<DiffComponent>('Diff'),
  Chart: useSchema(Chart).defineType<ChartComponent>('Chart'),
  Diagram: useSchema(Diagram).defineType<DiagramComponent>('Diagram'),
  Sidenote: useSchema(Sidenote).defineType<SidenoteComponent>('Sidenote'),
  Conversation: useSchema(Conversation).defineType<ConversationComponent>('Conversation'),
  ConversationMessage: useSchema(ConversationMessage).defineType<ConversationMessageComponent>('ConversationMessage'),
  Reveal: useSchema(Reveal).defineType<RevealComponent>('Reveal'),
  RevealStep: useSchema(RevealStep).defineType<RevealStepComponent>('RevealStep'),
  Annotate: useSchema(Annotate).defineType<AnnotateComponent>('Annotate'),
  AnnotateNote: useSchema(AnnotateNote).defineType<AnnotateNoteComponent>('AnnotateNote'),
  Form: useSchema(Form).defineType<FormComponent>('Form'),
  FormField: useSchema(FormField).defineType<FormFieldComponent>('FormField'),
  Sandbox: useSchema(Sandbox).defineType<SandboxComponent>('Sandbox'),
  PullQuote: useSchema(PullQuote).defineType<PullQuoteComponent>('PullQuote'),
  TextBlock: useSchema(TextBlock).defineType<TextBlockComponent>('TextBlock'),
  MediaText: useSchema(MediaText).defineType<MediaTextComponent>('MediaText'),
}
