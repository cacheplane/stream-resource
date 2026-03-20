#!/usr/bin/env node
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getApiReferenceTool, handleGetApiReference } from './tools/get-api-reference.js';
import { searchDocsTool, handleSearchDocs } from './tools/search-docs.js';
import { getExampleTool, handleGetExample } from './tools/get-example.js';
import { scaffoldChatComponentTool, handleScaffoldChatComponent } from './tools/scaffold-chat-component.js';
import { addStreamResourceTool, handleAddStreamResource } from './tools/add-stream-resource.js';
import { getThreadPersistencePatternTool, handleGetThreadPersistencePattern } from './tools/get-thread-persistence-pattern.js';

const server = new Server(
  { name: 'stream-resource', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  getApiReferenceTool,
  searchDocsTool,
  getExampleTool,
  scaffoldChatComponentTool,
  addStreamResourceTool,
  getThreadPersistencePatternTool,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'get_api_reference':              return handleGetApiReference(a);
    case 'search_docs':                    return handleSearchDocs(a);
    case 'get_example':                    return handleGetExample(a);
    case 'scaffold_chat_component':        return handleScaffoldChatComponent(a);
    case 'add_stream_resource':            return handleAddStreamResource(a);
    case 'get_thread_persistence_pattern': return handleGetThreadPersistencePattern(a);
    default: return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
