// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import fs from 'fs';

export const addStreamResourceTool = {
  name: 'add_stream_resource',
  description: 'Generate npm install command and app.config.ts diff to add stream-resource',
  inputSchema: {
    type: 'object',
    properties: {
      appConfigPath: { type: 'string', description: 'Path to app.config.ts' },
    },
    required: ['appConfigPath'],
  },
};

export function handleAddStreamResource(args: Record<string, unknown>) {
  const appConfigPath = args['appConfigPath'] as string;

  if (!fs.existsSync(appConfigPath)) {
    return { content: [{ type: 'text', text: `File not found or is not an Angular app.config.ts: ${appConfigPath}` }] };
  }
  const content = fs.readFileSync(appConfigPath, 'utf8');
  if (!content.includes('ApplicationConfig') && !content.includes('appConfig')) {
    return { content: [{ type: 'text', text: `File does not appear to be an Angular app.config.ts: ${appConfigPath}` }] };
  }

  const result = `Steps to add stream-resource:

1. Install the package:
\`\`\`bash
npm install @cacheplane/stream-resource
\`\`\`

2. Apply this change to ${appConfigPath}:
\`\`\`diff
+import { provideStreamResource } from '@cacheplane/stream-resource';

 export const appConfig: ApplicationConfig = {
   providers: [
+    provideStreamResource({ apiUrl: 'REPLACE_WITH_YOUR_LANGGRAPH_URL' }),
     // ... existing providers
   ]
 };
\`\`\`

Replace REPLACE_WITH_YOUR_LANGGRAPH_URL with your LangGraph server URL (e.g. http://localhost:2024).`;

  return { content: [{ type: 'text', text: result }] };
}
