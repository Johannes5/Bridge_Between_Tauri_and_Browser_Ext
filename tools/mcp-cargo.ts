#!/usr/bin/env ts-node
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const SIDE_CAR_DIR = path.resolve(process.cwd(), "packages/sidecar");

const server = new Server(
  {
    name: "rust-cargo",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.addTool({
  name: "cargo",
  description: "Run cargo commands inside packages/sidecar",
  inputSchema: {
    type: "object",
    properties: {
      args: { type: "string" }
    },
    required: ["args"]
  }
});

server.setRequestHandler("tools/call", async (req) => {
  const args = String((req.params as { arguments?: { args?: string } })?.arguments?.args ?? "");
  const output = await execCargo(args);
  return { content: [{ type: "text", text: output }] };
});

async function execCargo(args: string): Promise<string> {
  const parts = args.trim().length > 0 ? args.trim().split(/\s+/) : [];
  return await new Promise((resolve, reject) => {
    const child = spawn("cargo", parts, {
      cwd: SIDE_CAR_DIR,
      shell: false,
      env: process.env
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (data) => {
      stdout += data;
    });
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`cargo ${args} failed (${code}): ${stderr.trim()}`));
      }
    });
  });
}

const transport = new StdioServerTransport();
transport.connect(server).catch((err) => {
  console.error("Failed to start rust-cargo MCP server:", err);
  process.exit(1);
});
