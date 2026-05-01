# CI Library Job: Cover All 7 Publishable Libs

> Small mechanical workflow YAML edit. No spec needed.

**Goal:** Expand the `Library — lint / test / build` job in `.github/workflows/ci.yml` to verify all 7 publishable libraries on every PR. Currently only `langgraph` is checked.

---

## File Structure

- Modify: `.github/workflows/ci.yml`

No code changes; YAML only.

---

### Task 1: Expand library job to cover all 7 publishable libs

- [ ] **Step 1: Replace per-lib commands with `nx run-many`**

In `.github/workflows/ci.yml`, find:

```yaml
  library:
    name: Library — lint / test / build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6.0.2
      - uses: actions/setup-node@v6.3.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx nx lint langgraph
      - run: npx nx test langgraph --coverage
      - run: npx nx build langgraph --configuration=production
```

Replace with:

```yaml
  library:
    name: Library — lint / test / build
    runs-on: ubuntu-latest
    env:
      LIBS: chat,langgraph,ag-ui,render,a2ui,partial-json,licensing
    steps:
      - uses: actions/checkout@v6.0.2
      - uses: actions/setup-node@v6.3.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx nx run-many -t lint --projects=$LIBS
      - run: npx nx run-many -t test --projects=$LIBS --coverage
      - run: npx nx run-many -t build --projects=$LIBS --configuration=production
```

- [ ] **Step 2: Verify locally**

```bash
npx nx run-many -t lint --projects=chat,langgraph,ag-ui,render,a2ui,partial-json,licensing
npx nx run-many -t test --projects=chat,langgraph,ag-ui,render,a2ui,partial-json,licensing --coverage
npx nx run-many -t build --projects=chat,langgraph,ag-ui,render,a2ui,partial-json,licensing --configuration=production
```

Expected: all PASS. (Pre-existing lint warnings are OK as long as no errors.)

- [ ] **Step 3: Commit + push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: expand Library job to cover all 7 publishable libs

Previously only verified @ngaf/langgraph on each PR. A regression in
chat, ag-ui, render, a2ui, partial-json, or licensing could land
unnoticed. Switch to nx run-many across the publishable group.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
git push -u origin chore/ci-cleanup-and-adapter-guide
```

- [ ] **Step 4: Open PR**

Title: `ci: expand Library job to cover all 7 publishable libs`
Body: brief recap of the gap + the fix; link to this plan.

---

## Out of Scope

- Splitting lint/test/build into parallel jobs.
- Coverage upload integration.
- Cache strategy changes.
- Bumping Node version.
- Cockpit / website / e2e job changes.
