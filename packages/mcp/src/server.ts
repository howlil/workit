import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpServerConfig,
} from "./types.js";
import { WORKIT_MCP_TOOLS } from "./tools.js";
import { executeMcpTool } from "./handlers.js";

export class McpServer {
  private config: McpServerConfig;
  private defaultUserId: string;
  private serverName: string;
  private serverVersion: string;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.defaultUserId = config.userId || "usr_default";
    this.serverName = config.serverName || "workit-mcp";
    this.serverVersion = config.serverVersion || "0.1.0";
  }

  async handleMessage(
    request: JsonRpcRequest,
    context?: { userId?: string }
  ): Promise<JsonRpcResponse | null> {
    const id = request.id ?? null;
    const userId = context?.userId || this.defaultUserId;

    // Handle notifications (no response needed)
    if (request.method === "notifications/initialized") {
      return null;
    }

    if (request.jsonrpc !== "2.0") {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc version must be '2.0'",
        },
      };
    }

    switch (request.method) {
      case "initialize": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: this.serverName,
              version: this.serverVersion,
            },
          },
        };
      }

      case "ping": {
        return {
          jsonrpc: "2.0",
          id,
          result: {},
        };
      }

      case "tools/list": {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: WORKIT_MCP_TOOLS,
          },
        };
      }

      case "tools/call": {
        const { name, arguments: toolArgs } = request.params || {};
        if (!name || typeof name !== "string") {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32602,
              message: "Invalid params: 'name' is required for tools/call",
            },
          };
        }

        const toolResult = await executeMcpTool(
          name,
          toolArgs,
          this.config.services,
          userId
        );

        return {
          jsonrpc: "2.0",
          id,
          result: toolResult,
        };
      }

      default: {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        };
      }
    }
  }
}

export function createWorkitMcpServer(config: McpServerConfig): McpServer {
  return new McpServer(config);
}
