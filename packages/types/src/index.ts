// Core interfaces and type definitions
export {
  Newable,
  NodeType,
} from './interfaces.js';


// Design tokens (standalone interface, not tied to a rune schema)
export type { DesignTokens } from './tokens.js';

// Token contract (SPEC-048) — the universal theme-token surface
export type {
  TokenContract,
  PartialTokenContract,
  ThemeTokensConfig,
  ThemeTokensModeOverlay,
  SentimentTokens,
  SyntaxTokens,
  DeepPartial,
} from './token-contract.js';

// Theme system types
export type {
  RefraktConfig,
  SiteConfig,
  SiteThemeConfig,
  PlanConfig,
  XrefPattern,
  ThemeManifest,
  LayoutDefinition,
  RouteRule,
  EntityRoute,
  ComponentDefinition,
} from './theme.js';
export { getThemePackage } from './theme.js';

// Plugin types
export type {
  Plugin,
  PluginRune,
  PluginAttribute,
  RuneExtension,
  PluginThemeConfig,
  PluginLocalizedValue,
} from './package.js';

// Serialized tree types
export type { SerializedTag, RendererNode } from './serialized.js';

// Component override prop types (ADR-008)
export type {
	BaseComponentProps,
	PageSectionSlots,
	SplitLayoutProperties,
} from './component-props.js';

// Declarative content model types
export type {
	ContentFieldDefinition,
	SequenceModel,
	HeadingExtractField,
	HeadingExtract,
	KnownSectionDefinition,
	SectionsModel,
	DelimitedZone,
	DelimitedModel,
	CustomModel,
	ItemFieldDefinition,
	ItemModel,
	AttributeInCondition,
	AttributeExistsCondition,
	HasChildCondition,
	ContentModelCondition,
	ConditionalContentModel,
	StructuralContentModel,
	ContentModel,
	ResolvedField,
	ResolvedContent,
} from './content-model.js';

// Cross-page pipeline types
export type {
	TransformedPage,
	PipelineHeadingInfo,
	EntityRegistration,
	EntityRegistry,
	EntityEdge,
	ResolvedEdge,
	AggregatedData,
	PipelineContext,
	PipelineWarning,
	PluginPipelineHooks,
	PluginConfigureOptions,
	PreprocessContext,
	PreprocessPage,
	ContributePagesContext,
	ContributedPage,
} from './pipeline.js';

// CLI plugin contract
export type {
	CliPlugin,
	CliPluginCommand,
	McpHandlerContext,
	JSONSchema7,
} from './cli-plugin.js';

// Security policy
export type { SecurityPolicy, ResolvedSecurityPolicy } from './security.js';
export { resolveSecurityPolicy } from './security.js';

// Distributable-extension manifests (SPEC-109, SPEC-111, ADR-023)
export type {
	TemplateManifest,
	TemplateSiteConfig,
	PresetScope,
	PresetEntry,
	PresetPackManifest,
} from './distribution.js';

// Versioning & compatibility (ADR-023)
export type { SemverParts, CompatResult } from './compat.js';
export { parseVersion, satisfiesRange, checkRefraktCompat } from './compat.js';

// ProjectFiles seam (SPEC-113) — type-only here so the package root stays
// free of `node:fs`. The providers live behind the `@refrakt-md/types/project-files`
// subpath export.
export type { ProjectFiles, ProjectFilesAccess } from './project-files.js';
