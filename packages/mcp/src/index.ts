/**
 * @refrakt-md/mcp — Model Context Protocol server wrapping the refrakt CLI.
 *
 * Most users will install this and register `refrakt-mcp` (the bin entry) in
 * their MCP client config. Programmatic consumers can import the server
 * factory directly.
 */

export { createServer, runStdioServer } from './server.js';
export type { CreateServerOptions } from './server.js';
export { detect } from './detect.js';
export type { DetectionResult, DetectedPlanContext, DetectedSiteContext } from './detect.js';
export { CORE_TOOLS } from './tools/core.js';
export type { McpTool } from './tools/core.js';
