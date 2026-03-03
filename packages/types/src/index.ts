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

// Foundational schema data classes (shared across packages)
export { Page, PageSection, PageSectionProperties, PageSectionComponent, PageProperties, PageComponent } from './schema/page.js';
export { LinkItem, Command, LinkItemComponent, CommandComponent } from './schema/common.js';

// Design tokens (standalone interface, not tied to a rune schema)
export type { DesignTokens } from './tokens.js';

// Theme system types
export type {
  RefraktConfig,
  ThemeManifest,
  LayoutDefinition,
  RouteRule,
  ComponentDefinition,
} from './theme.js';

// Community rune package types
export type {
  RunePackage,
  RunePackageEntry,
  RunePackageAttribute,
  RuneExtension,
  RunePackageThemeConfig,
} from './package.js';

// Serialized tree types
export type { SerializedTag, RendererNode } from './serialized.js';
