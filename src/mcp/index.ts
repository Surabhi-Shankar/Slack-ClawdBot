/**
 * MCP (Model Context Protocol) Module
 * 
 * Provides integration with MCP servers like GitHub and Notion.
 * 
 * QUICK START:
 * ------------
 * 
 * 1. Configure MCP servers (see mcp-config.json or .env)
 * 
 * 2. Initialize MCP:
 *    ```typescript
 *    import { initializeMCP } from './mcp';
 *    await initializeMCP();
 *    ```
 * 
 * 3. Get available tools:
 *    ```typescript
 *    import { getAllMCPTools, mcpToolsToOpenAI } from './mcp';
 *    const mcpTools = getAllMCPTools();
 *    const openAITools = mcpToolsToOpenAI(mcpTools);
 *    ```
 * 
 * 4. Execute tools:
 *    ```typescript
 *    import { executeMCPTool, parseToolName } from './mcp';
 *    const parsed = parseToolName('github_create_issue');
 *    const result = await executeMCPTool(parsed.serverName, parsed.toolName, args);
 *    ```
 */

export {
  executeMCPTool, getAllMCPTools, getConnectedServers, initializeMCP, isMCPEnabled, parseToolName, shutdownMCP, type MCPTool
} from './client.js';

export {
  loadMCPConfig,
  validateMCPConfig, type MCPConfig, type MCPServerConfig
} from './config.js';

export {
  formatMCPResult, mcpToolsToOpenAI, mcpToolToOpenAI
} from './tool-converter.js';
// Add to mcp/index.ts
export function mcpToolsToClaude(mcpTools: any[]) {
  return mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}