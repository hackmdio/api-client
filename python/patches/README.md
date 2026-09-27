# Temporary generator patch

`@hey-api/openapi-python@0.0.24` is pinned and patched through `pnpm-workspace.yaml`. The patch adapts the runtime changes from these upstream PRs to the published package:

- [hey-api/hey-api#4441](https://github.com/hey-api/hey-api/pull/4441), commit `52ab0530832013a047ed4f867e08a94ccc7f0426`: legal Python enum member names without changing wire values.
- [hey-api/hey-api#4290](https://github.com/hey-api/hey-api/pull/4290), commit `1a7b6d75d246606aecd92b5d3a3e2d72748a17ed`: pass flat argument values, substitute URL paths, route query/JSON fields, serialize Pydantic bodies, and avoid the `fields` helper-name collision.

Only the shipped JavaScript bundle and HTTPX template are patched; generated output is never patched. No grouped implementation or SDK parameter-name normalization is included. Source maps remain those of the original npm release.

Remove the patch when an upstream release contains both fixes, then update the pinned version/lockfile and rerun codegen, compile, and smoke tests. PR numbers alone do not guarantee a released package contains the fixes.
