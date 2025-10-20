#!/usr/bin/env ts-node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

const ROOT = process.cwd();

const server = new Server(
  {
    name: "bridge-runner",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.addTool({
  name: "readFile",
  description: "Read a UTF-8 file relative to the workspace root",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  }
});

server.addTool({
  name: "writeFile",
  description: "Write a UTF-8 file relative to the workspace root",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" }
    },
    required: ["path", "content"]
  }
});

server.addTool({
  name: "listFiles",
  description: "List files within a directory relative to the workspace root",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  }
});

server.addTool({
  name: "pnpmScript",
  description: "Run a pnpm script from the workspace root",
  inputSchema: {
    type: "object",
    properties: {
      script: { type: "string" },
      filter: { type: "string" }
    },
    required: ["script"]
  }
});

server.addTool({
  name: "shellCommand",
  description: "Run an arbitrary shell command from the workspace root",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "array", items: { type: "string" } }
    },
    required: ["command"]
  }
});

server.setRequestHandler("tools/call", async (req) => {
  const call = req.params as ToolCall;
  switch (call.name) {
    case "readFile": {
      const filePath = resolvePath(call.arguments?.path);
      const data = await fs.readFile(filePath, "utf-8");
      return { content: [{ type: "text", text: data }] };
    }
    case "writeFile": {
      const filePath = resolvePath(call.arguments?.path);
      const content = String(call.arguments?.content ?? "");
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf-8");
      return { content: [{ type: "text", text: "ok" }] };
    }
    case "listFiles": {
      const dirPath = resolvePath(call.arguments?.path ?? ".");
      const entries = await fs.readdir(dirPath);
      return { content: [{ type: "text", text: entries.join("\n") }] };
    }
    case "pnpmScript": {
      const script = String(call.arguments?.script ?? "");
      const filter = call.arguments?.filter ? String(call.arguments?.filter) : undefined;
      const args = filter ? ["--filter", filter, "run", script] : ["run", script];
      const output = await exec("pnpm", args);
      return { content: [{ type: "text", text: output }] };
    }
    case "shellCommand": {
      const command = Array.isArray(call.arguments?.command)
        ? (call.arguments?.command as string[])
        : [];
      if (command.length === 0) {
        throw new Error("command array must not be empty");
      }
      const output = await exec(command[0] as string, command.slice(1));
      return { content: [{ type: "text", text: output }] };
    }
    default:
      throw new Error(`Unknown tool ${call.name}`);
  }
});

function resolvePath(input?: unknown): string {
  const target = path.resolve(ROOT, String(input ?? ""));
  const relative = path.relative(ROOT, target);
  if (relative.startsWith("..") || path.isAbsolute(relative) && relative !== "") {
    throw new Error(`Path ${target} escapes workspace root`);
  }
  return target;
}

async function exec(cmd: string, args: string[]): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, shell: false });
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
        reject(new Error(`Command ${cmd} ${args.join(" ")} failed (${code}): ${stderr.trim()}`));
      }
    });
  });
}

const transport = new StdioServerTransport();
transport.connect(server).catch((err) => {
  console.error("Failed to start bridge-runner MCP server:", err);
  process.exit(1);
});
