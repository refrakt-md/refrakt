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
  PrimaryScale,
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
	AggregatedData,
	PipelineContext,
	PipelineWarning,
	PluginPipelineHooks,
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
