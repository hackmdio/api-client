# AGENTS.md — `@hackmd/api` (Node.js client)

## Releasing a new version

Branches: `develop` is the integration branch, and `master` holds released code. Publishing is done by `.github/workflows/publish.yml`:

- Pushing a `v*` tag builds the package, runs `pnpm publish` to npm `latest` (OIDC trusted publishing) and creates a **draft** GitHub release.
- Every push to `develop` publishes `<version>-beta.<timestamp>.<sha>` to the npm `beta` tag. Nothing needs to be done by hand for this.

Steps (shown for a minor release, `X.Y.0`):

1. Start from up-to-date `develop` and verify it:
   ```bash
   git fetch origin
   git checkout -b release/X.Y.0 origin/develop
   cd nodejs && pnpm install --frozen-lockfile && pnpm build && pnpm test
   ```
2. Bump `version` in `nodejs/package.json`, without creating a git tag. Commit it as `chore: bump to X.Y.0` and push the branch.
3. Open a PR titled `Release X.Y.0` from `release/X.Y.0` into **`master`**. In the body, list the commits it brings in. Merge it with a **merge commit**, not squash.
4. Tag the master merge commit. Pushing the tag triggers the npm publish:
   ```bash
   git checkout master && git pull
   git tag vX.Y.0 && git push origin vX.Y.0
   ```
5. Merge `master` back into `develop` and push, so the bump is on `develop`.
6. Confirm the "Publish to NPM" run for the tag passed, and that `npm view @hackmd/api dist-tags.latest` shows `X.Y.0`. The registry can take a minute or two to update.
7. Ask the maintainer to write release notes for the draft GitHub release and publish it. The workflow leaves it empty.

For a patch or major release, use the same steps with the matching version number.
