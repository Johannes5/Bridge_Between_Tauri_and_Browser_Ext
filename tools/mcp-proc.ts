#!/usr/bin/env ts-node
import net from "node:net";
import { exec } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const execAsync = promisify(exec);

const server = new Server(
  {
    name: "system-proc",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.addTool({
  name: "checkPort",
  description: "Check whether a TCP port on localhost is open",
  inputSchema: {
    type: "object",
    properties: {
      port: { type: "number" }
    },
    required: ["port"]
  }
});

server.addTool({
  name: "psgrep",
  description: "List running processes whose name contains the given substring",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" }
    },
    required: ["name"]
  }
});

server.setRequestHandler("tools/call", async (req) => {
  const { name, arguments: args } = req.params as { name: string; arguments?: Record<string, unknown> };
  switch (name) {
    case "checkPort": {
      const port = Number(args?.port);
      const open = await isPortOpen(port);
      return { content: [{ type: "text", text: open ? "open" : "closed" }] };
    }
    case "psgrep": {
      const needle = String(args?.name ?? "");
      const output = await listProcesses(needle);
      return { content: [{ type: "text", text: output }] };
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
});

async function isPortOpen(port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function listProcesses(pattern: string): Promise<string> {
  if (process.platform === "win32") {
    const psCmd = [
      "Get-Process | Where-Object { $_.ProcessName -like '*",
      pattern.replace(/'/g, "''"),
      "*' } | Select-Object ProcessName, Id"
    ].join("");
    const { stdout } = await execAsync(`powershell.exe -NoProfile -Command "${psCmd}"`);
    return stdout.trim();
  }
  const { stdout } = await execAsync(`ps aux | grep ${pattern} | grep -v grep`);
  return stdout.trim();
}

const transport = new StdioServerTransport();
transport.connect(server).catch((err) => {
  console.error("Failed to start system-proc MCP server:", err);
  process.exit(1);
});
