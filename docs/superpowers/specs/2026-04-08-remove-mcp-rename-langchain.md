# Remove MCP Package & Rename stream-resource to langchain

## Summary

Two operations:
1. **Delete** the `@cacheplane/stream-resource-mcp` package (`packages/mcp/`) and all references
2. **Rename** `@cacheplane/stream-resource` to `@cacheplane/langchain`, including moving `libs/stream-resource/` to `libs/langchain/` and updating the Nx project name from `stream-resource` to `langchain`

## Part 1: Remove MCP Package

### Delete

- Remove `packages/mcp/` directory entirely

### Clean references

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Remove the `mcp:` job (lines ~107-117), remove `mcp` from the `needs:` list on the gate job |
| `.github/workflows/publish.yml` | Remove `npx nx test mcp --skip-nx-cache` line |
| `AGENTS.md` | Remove the `packages/mcp` line |
| `apps/website/src/app/llms.txt/route.ts` | Remove MCP server section (~lines 30-31) |
| `apps/website/src/app/llms-full.txt/route.ts` | Remove MCP server section (~lines 42-45) |
| `docs/superpowers/plans/` | Update references in planning docs where MCP is mentioned (best-effort, these are historical) |

### Auto-regenerated (no manual action)

- `.nx/workspace-data/` cache files — Nx rebuilds these
- `package-lock.json` — regenerated via `npm install` after deletion

## Part 2: Rename stream-resource to langchain

### Directory move

```
git mv libs/stream-resource libs/langchain
```

### Nx project name

The Nx project name changes from `stream-resource` to `langchain`. This is set in `libs/langchain/project.json` (the `"name"` field) and drives all `nx run` / `nx build` / `nx test` commands.

### Package identity

| File (post-move path) | Field | Old | New |
|------------------------|-------|-----|-----|
| `libs/langchain/package.json` | `name` | `@cacheplane/stream-resource` | `@cacheplane/langchain` |
| `libs/langchain/project.json` | `name` | `stream-resource` | `langchain` |
| `libs/langchain/project.json` | all path refs | `libs/stream-resource/...` | `libs/langchain/...` |
| `libs/langchain/ng-package.json` | `dest` | `../../dist/libs/stream-resource` | `../../dist/libs/langchain` |
| `tsconfig.base.json` | `paths` | `"@cacheplane/stream-resource": ["libs/stream-resource/src/public-api.ts"]` | `"@cacheplane/langchain": ["libs/langchain/src/public-api.ts"]` |

### CI/CD workflows

| File | Old | New |
|------|-----|-----|
| `.github/workflows/ci.yml` | `nx lint stream-resource`, `nx test stream-resource`, `nx build stream-resource` | `nx lint langchain`, `nx test langchain`, `nx build langchain` |
| `.github/workflows/publish.yml` | `nx test stream-resource`, `nx build stream-resource`, `nx-release-publish stream-resource` | `nx test langchain`, `nx build langchain`, `nx-release-publish langchain` |
| `.github/workflows/e2e.yml` | `nx e2e stream-resource-e2e` | `nx e2e langchain-e2e` (if e2e project exists and is renamed) |

**Note:** The `LANGSMITH_PROJECT: stream-resource-e2e-ci` in `e2e.yml` and `projectName: "stream-resource"` in ci.yml (Vercel config) are external service identifiers, not Nx names. Leave these unchanged unless the user wants to rename them too.

### TypeScript imports (63+ files)

All `import { ... } from '@cacheplane/stream-resource'` statements become `import { ... } from '@cacheplane/langchain'`. Files affected:

- `libs/chat/src/lib/**/*.ts` (~16 files)
- `cockpit/langgraph/*/angular/src/app/**/*.ts` (~16 files)
- `cockpit/deep-agents/*/angular/src/app/**/*.ts` (~12 files)
- `apps/demo/src/app/**/*.ts` (~1 file)

### Dependency declarations (15 package.json files)

All `"@cacheplane/stream-resource"` entries in `dependencies` or `peerDependencies` become `"@cacheplane/langchain"`:

- `libs/chat/package.json`
- 8 `cockpit/langgraph/*/angular/package.json` files
- 6 `cockpit/deep-agents/*/angular/package.json` files

### Documentation

Update `@cacheplane/stream-resource` to `@cacheplane/langchain` in:

- `README.md` (root)
- `AGENTS.md`
- `libs/langchain/README.md`
- `apps/website/content/docs-v2/**/*.mdx` (~19 files)
- `apps/website/content/prompts/**/*.md` (~5 files)
- `apps/website/public/AGENTS.md`
- `apps/website/public/CLAUDE.md`
- `apps/website/src/app/llms.txt/route.ts`
- `apps/website/src/app/llms-full.txt/route.ts`
- `apps/website/scripts/generate-api-docs.ts`
- `COMMERCIAL.md`

### E2E project

The `e2e/stream-resource-e2e/` project exists and must be renamed:

- `git mv e2e/stream-resource-e2e e2e/langchain-e2e`
- Update `e2e/langchain-e2e/project.json`: name `stream-resource-e2e` → `langchain-e2e`, sourceRoot and configFile paths updated
- Update `.github/workflows/e2e.yml`: `nx e2e stream-resource-e2e` → `nx e2e langchain-e2e`

### Post-rename

- Run `npm install` to regenerate `package-lock.json`
- Nx workspace cache (`.nx/workspace-data/`) regenerates automatically
- `apps/website/public/api-docs.json` regenerates via the build script

## Execution order

1. Delete `packages/mcp/` and clean all MCP references
2. `git mv libs/stream-resource libs/langchain`
3. Update Nx project name and all internal path references in the moved library
4. Update `tsconfig.base.json` path mapping
5. Sweep all imports, dependencies, CI, and docs
6. `npm install` to regenerate lockfile
7. Verify: `nx build langchain --configuration=production` and `nx test langchain`

## Out of scope

- Renaming the git repository itself
- Renaming external service identifiers (LangSmith project name, Vercel project name)
- Updating historical planning docs in `docs/superpowers/plans/` (these are archival)
- Publishing to npm under the new name
