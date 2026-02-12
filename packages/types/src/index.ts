// Core interfaces and type definitions
export {
  Newable,
  NodeType,
  PropertyNodes,
  ComponentType,
} from './interfaces.js';

// Schema definition utilities
export {
  Type,
  TypeFactory,
  useSchema,
} from './schema/index.js';

// Schema data classes
export { Page, PageSection, PageSectionProperties, PageSectionComponent, PageProperties, PageComponent } from './schema/page.js';
export { LinkItem, Command, LinkItemComponent, CommandComponent } from './schema/common.js';
export { TabGroup, Tab, TabPanel, TabGroupProperties, TabGroupComponent, TabComponent, TabPanelComponent } from './schema/tabs.js';
export { Steps, Step, StepsProperties, StepsComponent, StepComponent } from './schema/steps.js';
export { Grid, GridComponent } from './schema/grid.js';
export { Hint, HintComponent } from './schema/hint.js';
export { Feature, FeatureDefinition, FeatureProperties, FeatureComponent, FeatureDefinitionComponent } from './schema/feature.js';
export { CallToAction, CallToActionProperties, CallToActionComponent } from './schema/cta.js';
export { Pricing, Tier, PricingProperties, PricingComponent, TierComponent } from './schema/pricing.js';
export { Editor, EditorComponent } from './schema/editor.js';
export { MusicPlaylist, MusicRecording, MusicPlaylistComponent, MusicRecordingComponent, MusicPlaylistProperties } from './schema/audio.js';
export { DocPage, DocPageComponent, DocPageProperties, Headings, HeadingsComponent } from './schema/docpage.js';
export { DebugInfo, DebugInfoComponent, Error, ErrorComponent } from './schema/error.js';
export { SequentialPagination, SequentialPaginationComponent } from './schema/pagination.js';
export { Nav, NavComponent, NavGroup, NavGroupComponent, NavItem, NavItemComponent } from './schema/nav.js';
export { Details, DetailsComponent } from './schema/details.js';
export { Figure, FigureComponent } from './schema/figure.js';
export { Accordion, AccordionProperties, AccordionComponent, AccordionItem, AccordionItemComponent } from './schema/accordion.js';
export { TableOfContents, TableOfContentsComponent } from './schema/toc.js';
export { Hero, HeroComponent } from './schema/hero.js';
export { Testimonial, TestimonialComponent } from './schema/testimonial.js';
export { Timeline, TimelineProperties, TimelineComponent, TimelineEntry, TimelineEntryComponent } from './schema/timeline.js';
export { Changelog, ChangelogProperties, ChangelogComponent, ChangelogRelease, ChangelogReleaseComponent } from './schema/changelog.js';
export { Embed, EmbedComponent } from './schema/embed.js';
export { Breadcrumb, BreadcrumbComponent, BreadcrumbItem, BreadcrumbItemComponent } from './schema/breadcrumb.js';
export { Compare, CompareComponent } from './schema/compare.js';

// Theme system types
export type {
  RefraktConfig,
  ThemeManifest,
  LayoutDefinition,
  RouteRule,
  ComponentDefinition,
} from './theme.js';
