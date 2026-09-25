import * as readline from "readline";
import type { McpServer } from "./server.js";
import type { JsonRpcRequest } from "./types.js";

/**
 * Runs an MCP server over stdio streams using readline interface.
 */
export function runStdioServer(server: McpServer): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const request = JSON.parse(trimmed) as JsonRpcRequest;
      const response = await server.handleMessage(request);
      if (response !== null) {
        process.stdout.write(JSON.stringify(response) + "\n");
      }
    } catch (err: any) {
      const errorResponse = {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${err?.message || "Invalid JSON"}`,
        },
      };
      process.stdout.write(JSON.stringify(errorResponse) + "\n");
    }
  });

  process.stderr.write("[Workit MCP] Server running on stdio\n");
}
