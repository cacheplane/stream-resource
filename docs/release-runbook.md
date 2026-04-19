# Release Runbook

How to cut a new release of `@cacheplane/angular`, `@cacheplane/render`, or `@cacheplane/chat`.

## Prerequisites

- Clean working tree on `main` (pull latest)
- `NPM_TOKEN` configured in GitHub repo secrets (for CI)
- Local login to npm (`npm login`) if doing a manual publish (not the default path)

## Standard release (preferred)

1. **Pre-flight smoke against local registry:**

   ```bash
   ./scripts/verify-release-local.sh
   ```

   Fix any failures before proceeding.

2. **Version + changelog locally:**

   ```bash
   npm run release:version
   npm run release:changelog
   ```

   Nx analyzes conventional commits since the last `<pkg>@v*` tag for each project and:
   - bumps `libs/<pkg>/package.json` version
   - updates `libs/<pkg>/CHANGELOG.md`
   - creates one commit + one tag per bumped package

   **First release:** if this is the very first release (no prior `<pkg>@v*` tags), pass `--first-release` to both commands so Nx seeds the initial version and changelog:

   ```bash
   npx nx release version --first-release
   npx nx release changelog --first-release
   ```

3. **Review the generated commit + tags:**

   ```bash
   git log -5 --oneline
   git tag --contains HEAD
   ```

   Expected: one commit per bumped package (e.g., `chore(release): publish @cacheplane/angular@1.0.0`) and matching tags like `agent@v1.0.0`.

4. **Push commits + tags:**

   ```bash
   git push origin main --follow-tags
   ```

   Pushing the tag triggers `.github/workflows/release.yml`, which runs `nx release publish` with npm provenance.

5. **Verify on npm:**

   - https://www.npmjs.com/package/@cacheplane/angular
   - https://www.npmjs.com/package/@cacheplane/render
   - https://www.npmjs.com/package/@cacheplane/chat

   Each published version should have a "Provenance" badge.

## Manual dispatch (recovery path)

Use GitHub Actions → Release → "Run workflow" when:
- A previous release failed mid-publish
- You need to publish without running `nx release` locally

Provide `version-spec` (e.g., `patch`, `1.0.1`) or leave empty to use conventional commits. Check `dry-run` to preview.

## Troubleshooting

**Tag pushed but nothing published:**
- Check the Release workflow run in GitHub Actions
- Common cause: `NPM_TOKEN` expired or missing

**Provenance missing from published package:**
- Confirm the workflow ran on a tag push (not a manual `npm publish`)
- Confirm `permissions: id-token: write` is present in `.github/workflows/release.yml`

**Wrong version bumped:**
- Commit messages since last tag determined the bump. Review with:
  ```bash
  git log <pkg>@v<prev>..HEAD --oneline -- libs/<pkg>
  ```
- To override, use manual dispatch with explicit `version-spec`

**Rolled back release:**
- `npm` publishes are immutable. To "roll back," publish a new patch version.
- If a tag was pushed but the publish failed, delete the tag locally and remote before retrying:
  ```bash
  git tag -d agent@v1.0.0
  git push origin :refs/tags/agent@v1.0.0
  ```

## Version policy

- `@cacheplane/angular`, `@cacheplane/render`, `@cacheplane/chat` follow semver independently.
- Breaking changes to any public export = major bump.
- New exports or non-breaking API additions = minor bump.
- Bug fixes with no API change = patch bump.
- Conventional commit types drive bumps:
  - `feat(<scope>):` → minor
  - `fix(<scope>):` → patch
  - `BREAKING CHANGE:` footer or `!` suffix → major
