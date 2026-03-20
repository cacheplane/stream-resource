import { Application, TSConfigReader } from 'typedoc';
import fs from 'fs';
import path from 'path';

async function main() {
  // Detect library entry point
  const candidates = [
    'libs/stream-resource/src/public-api.ts',
    'packages/stream-resource/src/public-api.ts',
    'libs/stream-resource/src/index.ts',
    'packages/stream-resource/src/index.ts',
  ];
  const entryPoint = candidates.find((p) => fs.existsSync(p));
  if (!entryPoint) {
    console.warn('Library entry point not found — generating placeholder api-docs.json');
    const outDir = 'apps/website/public';
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'api-docs.json'), JSON.stringify({
      name: 'stream-resource',
      comment: { summary: [{ text: 'API documentation placeholder — run after library is built.' }] },
      children: [],
    }, null, 2));
    console.log('✓ api-docs.json (placeholder)');
    return;
  }

  // Find the library tsconfig that includes the source files
  const libDir = path.dirname(path.dirname(entryPoint));
  const libTsconfig = fs.existsSync(path.join(libDir, 'tsconfig.lib.json'))
    ? path.join(libDir, 'tsconfig.lib.json')
    : undefined;

  const app = await Application.bootstrapWithPlugins({
    entryPoints: [entryPoint],
    skipErrorChecking: true,
    ...(libTsconfig ? { tsconfig: libTsconfig } : {}),
  });
  app.options.addReader(new TSConfigReader());
  const project = await app.convert();
  if (!project) throw new Error('TypeDoc failed to convert project');
  fs.mkdirSync('apps/website/public', { recursive: true });
  await app.generateJson(project, 'apps/website/public/api-docs.json');
  console.log('✓ api-docs.json written');
}

main().catch((e) => { console.error(e); process.exit(1); });
