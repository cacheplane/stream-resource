# Remove MCP & Rename stream-resource → langchain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `@cacheplane/stream-resource-mcp` package entirely, and rename `@cacheplane/stream-resource` to `@cacheplane/langchain` (including directory move and Nx project rename).

**Architecture:** Two sequential operations — first delete MCP (smaller blast radius), then rename the library. The rename touches the Nx project name, npm package name, directory path, tsconfig path mapping, 51 TypeScript import sites, 15 package.json dependency declarations, 3 CI workflows, and documentation.

**Tech Stack:** Nx, Angular (ng-packagr), TypeScript, GitHub Actions

---

### Task 1: Delete MCP package

**Files:**
- Delete: `packages/mcp/` (entire directory)

- [ ] **Step 1: Remove the MCP package directory**

```bash
rm -rf packages/mcp
```

- [ ] **Step 2: Verify deletion**

```bash
ls packages/mcp 2>&1
```

Expected: `No such file or directory`

- [ ] **Step 3: Commit**

```bash
git add -A packages/mcp
git commit -m "chore: remove @cacheplane/stream-resource-mcp package"
```

---

### Task 2: Remove MCP references from CI workflows

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: Remove the MCP job from ci.yml**

In `.github/workflows/ci.yml`, remove the entire `mcp:` job block (lines 107-117):

```yaml
  mcp:
    name: MCP — build / smoke
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6.0.2
      - uses: actions/setup-node@v6.3.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx nx test mcp --skip-nx-cache
```

- [ ] **Step 2: Remove `mcp` from the deploy job's `needs` list in ci.yml**

Change the `needs:` line in the `deploy:` job from:

```yaml
    needs: [library, website, cockpit, cockpit-examples-build, cockpit-smoke, cockpit-secret-integration, cockpit-deploy-smoke, mcp, chat-agent-smoke, cockpit-e2e, website-e2e]
```

to:

```yaml
    needs: [library, website, cockpit, cockpit-examples-build, cockpit-smoke, cockpit-secret-integration, cockpit-deploy-smoke, chat-agent-smoke, cockpit-e2e, website-e2e]
```

- [ ] **Step 3: Remove MCP test from publish.yml**

In `.github/workflows/publish.yml`, remove this line:

```yaml
      - run: npx nx test mcp --skip-nx-cache
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/publish.yml
git commit -m "ci: remove MCP job and references from workflows"
```

---

### Task 3: Remove MCP references from docs and website

**Files:**
- Modify: `AGENTS.md`
- Modify: `apps/website/src/app/llms.txt/route.ts`
- Modify: `apps/website/src/app/llms-full.txt/route.ts`

- [ ] **Step 1: Remove MCP line from AGENTS.md**

In the `## Repo Layout` section, remove this line:

```markdown
- `packages/mcp`: MCP server package.
```

- [ ] **Step 2: Remove MCP section from llms.txt route**

In `apps/website/src/app/llms.txt/route.ts`, remove these lines from the array:

```typescript
    '## MCP server',
    'npx @cacheplane/stream-resource-mcp',
```

- [ ] **Step 3: Remove MCP section from llms-full.txt route**

In `apps/website/src/app/llms-full.txt/route.ts`, remove this entire section array element:

```typescript
    [
      '## MCP server',
      '',
      'npx @cacheplane/stream-resource-mcp',
      'Add to Claude Code settings.json, Cursor .cursor/mcp.json, or any MCP-compatible agent.',
    ].join('\n'),
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md apps/website/src/app/llms.txt/route.ts apps/website/src/app/llms-full.txt/route.ts
git commit -m "docs: remove MCP references from AGENTS.md and website routes"
```

---

### Task 4: Move library directory and rename Nx project

**Files:**
- Move: `libs/stream-resource/` → `libs/langchain/`
- Modify: `libs/langchain/project.json`
- Modify: `libs/langchain/package.json`
- Modify: `libs/langchain/ng-package.json`

- [ ] **Step 1: Move the directory**

```bash
git mv libs/stream-resource libs/langchain
```

- [ ] **Step 2: Update project.json**

Replace the full contents of `libs/langchain/project.json` with:

```json
{
  "name": "langchain",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/langchain/src",
  "prefix": "lib",
  "projectType": "library",
  "release": {
    "version": {
      "manifestRootsToUpdate": ["dist/{projectRoot}"],
      "currentVersionResolver": "git-tag",
      "fallbackCurrentVersionResolver": "disk"
    }
  },
  "tags": [],
  "targets": {
    "build": {
      "executor": "@nx/angular:package",
      "outputs": ["{workspaceRoot}/dist/{projectRoot}"],
      "options": {
        "project": "libs/langchain/ng-package.json",
        "tsConfig": "libs/langchain/tsconfig.lib.json"
      },
      "configurations": {
        "production": {
          "tsConfig": "libs/langchain/tsconfig.lib.prod.json"
        },
        "development": {}
      },
      "defaultConfiguration": "production"
    },
    "nx-release-publish": {
      "options": {
        "packageRoot": "dist/{projectRoot}"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint"
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "configFile": "libs/langchain/vite.config.mts"
      }
    }
  }
}
```

- [ ] **Step 3: Update package.json name**

In `libs/langchain/package.json`, change the `name` field:

```json
{
  "name": "@cacheplane/langchain",
```

- [ ] **Step 4: Update ng-package.json dest**

In `libs/langchain/ng-package.json`, change `dest`:

```json
{
  "$schema": "../../node_modules/ng-packagr/ng-package.schema.json",
  "dest": "../../dist/libs/langchain",
  "lib": {
    "entryFile": "src/public-api.ts"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: move libs/stream-resource to libs/langchain, rename Nx project"
```

---

### Task 5: Move e2e directory and rename Nx project

**Files:**
- Move: `e2e/stream-resource-e2e/` → `e2e/langchain-e2e/`
- Modify: `e2e/langchain-e2e/project.json`

- [ ] **Step 1: Move the directory**

```bash
git mv e2e/stream-resource-e2e e2e/langchain-e2e
```

- [ ] **Step 2: Update project.json**

Replace the full contents of `e2e/langchain-e2e/project.json` with:

```json
{
  "name": "langchain-e2e",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "sourceRoot": "e2e/langchain-e2e/src",
  "targets": {
    "e2e": {
      "executor": "@nx/vite:test",
      "options": {
        "configFile": "e2e/langchain-e2e/vite.config.mts"
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: move e2e/stream-resource-e2e to e2e/langchain-e2e"
```

---

### Task 6: Update tsconfig.base.json path mapping

**Files:**
- Modify: `tsconfig.base.json`

- [ ] **Step 1: Update the paths entry**

In `tsconfig.base.json`, change:

```json
"@cacheplane/stream-resource": ["libs/stream-resource/src/public-api.ts"],
```

to:

```json
"@cacheplane/langchain": ["libs/langchain/src/public-api.ts"],
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.base.json
git commit -m "chore: update tsconfig path mapping to @cacheplane/langchain"
```

---

### Task 7: Update CI workflows to use new Nx project names

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/publish.yml`
- Modify: `.github/workflows/e2e.yml`

- [ ] **Step 1: Update ci.yml**

In `.github/workflows/ci.yml`, replace all `stream-resource` Nx project references in the `library` job:

```yaml
      - run: npx nx lint langchain
      - run: npx nx test langchain --coverage
      - run: npx nx build langchain --configuration=production
```

(These replace `nx lint stream-resource`, `nx test stream-resource`, `nx build stream-resource`.)

- [ ] **Step 2: Update publish.yml**

In `.github/workflows/publish.yml`, replace all `stream-resource` references:

```yaml
      - run: npx nx test langchain
      - run: npx nx build langchain --configuration=production
      - name: Publish to npm
        run: npx nx-release-publish langchain
```

- [ ] **Step 3: Update e2e.yml**

In `.github/workflows/e2e.yml`, change the e2e run command:

```yaml
      - name: Run e2e tests
        run: npx nx e2e langchain-e2e
```

(Leave `LANGSMITH_PROJECT: stream-resource-e2e-ci` unchanged — it's an external service identifier.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/publish.yml .github/workflows/e2e.yml
git commit -m "ci: update workflows to use langchain Nx project name"
```

---

### Task 8: Rename package imports across all TypeScript files

**Files:**
- Modify: 51 TypeScript files across `libs/chat/src/`, `cockpit/langgraph/**/angular/src/`, `cockpit/deep-agents/**/angular/src/`, `apps/demo/src/`

All files use `from '@cacheplane/stream-resource'` in their imports. This is a bulk find-and-replace operation.

- [ ] **Step 1: Replace all import specifiers**

Run a bulk replacement across all `.ts` files:

```bash
find libs/chat/src cockpit/langgraph cockpit/deep-agents apps/demo/src -name '*.ts' -exec sed -i '' "s|@cacheplane/stream-resource|@cacheplane/langchain|g" {} +
```

- [ ] **Step 2: Verify the replacement**

```bash
grep -r "@cacheplane/stream-resource" libs/chat/src cockpit/langgraph cockpit/deep-agents apps/demo/src --include='*.ts'
```

Expected: no output (zero remaining references).

- [ ] **Step 3: Spot-check a few files**

Verify these representative files have correct imports:

- `libs/chat/src/lib/testing/mock-stream-resource-ref.ts` should have `from '@cacheplane/langchain'`
- `cockpit/langgraph/streaming/angular/src/app/app.config.ts` should have `from '@cacheplane/langchain'`
- `apps/demo/src/app/chat-demo/chat-demo.component.ts` should have `from '@cacheplane/langchain'`

- [ ] **Step 4: Commit**

```bash
git add libs/chat/src cockpit/langgraph cockpit/deep-agents apps/demo/src
git commit -m "refactor: rename @cacheplane/stream-resource imports to @cacheplane/langchain"
```

---

### Task 9: Update package.json dependency declarations

**Files (15 total):**
- Modify: `libs/chat/package.json`
- Modify: `cockpit/langgraph/memory/angular/package.json`
- Modify: `cockpit/langgraph/durable-execution/angular/package.json`
- Modify: `cockpit/langgraph/streaming/angular/package.json`
- Modify: `cockpit/langgraph/subgraphs/angular/package.json`
- Modify: `cockpit/langgraph/deployment-runtime/angular/package.json`
- Modify: `cockpit/langgraph/interrupts/angular/package.json`
- Modify: `cockpit/langgraph/persistence/angular/package.json`
- Modify: `cockpit/langgraph/time-travel/angular/package.json`
- Modify: `cockpit/deep-agents/sandboxes/angular/package.json`
- Modify: `cockpit/deep-agents/subagents/angular/package.json`
- Modify: `cockpit/deep-agents/memory/angular/package.json`
- Modify: `cockpit/deep-agents/planning/angular/package.json`
- Modify: `cockpit/deep-agents/filesystem/angular/package.json`
- Modify: `cockpit/deep-agents/skills/angular/package.json`

All contain `"@cacheplane/stream-resource": "^0.0.1"` in their dependencies or peerDependencies.

- [ ] **Step 1: Bulk replace in all cockpit and chat package.json files**

```bash
find libs/chat cockpit/langgraph cockpit/deep-agents -name 'package.json' -exec sed -i '' 's|"@cacheplane/stream-resource"|"@cacheplane/langchain"|g' {} +
```

- [ ] **Step 2: Verify**

```bash
grep -r "@cacheplane/stream-resource" libs/chat/package.json cockpit/langgraph cockpit/deep-agents --include='package.json'
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add libs/chat/package.json cockpit/langgraph cockpit/deep-agents
git commit -m "chore: rename @cacheplane/stream-resource dependency to @cacheplane/langchain"
```

---

### Task 10: Update AGENTS.md and website public context

**Files:**
- Modify: `AGENTS.md`
- Modify: `apps/website/public/AGENTS.md`
- Modify: `apps/website/public/CLAUDE.md`

- [ ] **Step 1: Update AGENTS.md repo layout**

In the `## Repo Layout` section, change:

```markdown
- `libs/stream-resource`: main Angular library.
```

to:

```markdown
- `libs/langchain`: main Angular library.
```

Also change:

```markdown
- `e2e/stream-resource-e2e`: end-to-end coverage for the workspace.
```

to:

```markdown
- `e2e/langchain-e2e`: end-to-end coverage for the workspace.
```

- [ ] **Step 2: Update website public context files**

In `apps/website/public/AGENTS.md` and `apps/website/public/CLAUDE.md`, replace all occurrences of `@cacheplane/stream-resource` with `@cacheplane/langchain` and `libs/stream-resource` with `libs/langchain`.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md apps/website/public/AGENTS.md apps/website/public/CLAUDE.md
git commit -m "docs: update AGENTS.md and public context for langchain rename"
```

---

### Task 11: Update website routes and API doc generation

**Files:**
- Modify: `apps/website/src/app/llms.txt/route.ts`
- Modify: `apps/website/src/app/llms-full.txt/route.ts`
- Modify: `apps/website/scripts/generate-api-docs.ts`

- [ ] **Step 1: Update llms.txt route**

In `apps/website/src/app/llms.txt/route.ts`, replace all occurrences of `@cacheplane/stream-resource` with `@cacheplane/langchain`. There are two: the `npm install` line and the import example.

- [ ] **Step 2: Update llms-full.txt route**

In `apps/website/src/app/llms-full.txt/route.ts`, no `@cacheplane/stream-resource` references remain (MCP section was already removed in Task 3). Verify this — if any remain, replace them.

- [ ] **Step 3: Update generate-api-docs.ts**

In `apps/website/scripts/generate-api-docs.ts`, change:

```typescript
'libs/stream-resource/src/public-api.ts',
```

to:

```typescript
'libs/langchain/src/public-api.ts',
```

- [ ] **Step 4: Commit**

```bash
git add apps/website/src/app/llms.txt/route.ts apps/website/src/app/llms-full.txt/route.ts apps/website/scripts/generate-api-docs.ts
git commit -m "docs: update website routes and API doc script for langchain rename"
```

---

### Task 12: Update documentation content files

**Files:**
- Modify: `README.md` (root)
- Modify: `COMMERCIAL.md`
- Modify: `libs/langchain/README.md`
- Modify: All `apps/website/content/docs-v2/**/*.mdx` files (~19 files)
- Modify: All `apps/website/content/prompts/**/*.md` files (~5 files)
- Modify: All `cockpit/**/python/docs/guide.md` files (~14 files)

All contain references to `@cacheplane/stream-resource` that need to become `@cacheplane/langchain`.

- [ ] **Step 1: Bulk replace in documentation**

```bash
# Root docs
sed -i '' 's|@cacheplane/stream-resource|@cacheplane/langchain|g' README.md COMMERCIAL.md libs/langchain/README.md

# Website content
find apps/website/content -name '*.mdx' -o -name '*.md' | xargs sed -i '' 's|@cacheplane/stream-resource|@cacheplane/langchain|g'

# Cockpit Python guide docs
find cockpit -name 'guide.md' | xargs sed -i '' 's|@cacheplane/stream-resource|@cacheplane/langchain|g'
```

- [ ] **Step 2: Verify no remaining references**

```bash
grep -r "@cacheplane/stream-resource" README.md COMMERCIAL.md libs/langchain/ apps/website/content/ cockpit/ --include='*.md' --include='*.mdx'
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add README.md COMMERCIAL.md libs/langchain/README.md apps/website/content/ cockpit/
git commit -m "docs: rename @cacheplane/stream-resource to @cacheplane/langchain in all docs"
```

---

### Task 13: Regenerate lockfile and verify

**Files:**
- Regenerate: `package-lock.json`

- [ ] **Step 1: Regenerate package-lock.json**

```bash
npm install
```

- [ ] **Step 2: Verify the library builds**

```bash
npx nx build langchain --configuration=production
```

Expected: successful build output.

- [ ] **Step 3: Verify the library tests pass**

```bash
npx nx test langchain
```

Expected: all tests pass.

- [ ] **Step 4: Verify the library lints**

```bash
npx nx lint langchain
```

Expected: no lint errors.

- [ ] **Step 5: Verify no stale references remain**

```bash
grep -r "@cacheplane/stream-resource" --include='*.ts' --include='*.json' --include='*.yaml' --include='*.yml' --include='*.md' --include='*.mdx' . | grep -v node_modules | grep -v '.nx/' | grep -v 'docs/superpowers/' | grep -v package-lock.json
```

Expected: no output (all references cleaned except historical planning docs and generated cache).

- [ ] **Step 6: Commit lockfile**

```bash
git add package-lock.json
git commit -m "chore: regenerate package-lock.json after langchain rename"
```
