# Temporary generator patch

`@hey-api/openapi-python@0.0.24` is pinned and patched through `pnpm-workspace.yaml`. The patch adapts the runtime changes from these upstream PRs to the published package:

- [hey-api/hey-api#4441](https://github.com/hey-api/hey-api/pull/4441), commit `52ab0530832013a047ed4f867e08a94ccc7f0426`: legal Python enum member names without changing wire values.
- [hey-api/hey-api#4290](https://github.com/hey-api/hey-api/pull/4290), commit `1a7b6d75d246606aecd92b5d3a3e2d72748a17ed`: pass flat argument values, substitute URL paths, route query/JSON fields, serialize Pydantic bodies, and avoid the `fields` helper-name collision.

Only the shipped JavaScript bundle and HTTPX template are patched; generated output is never patched. No grouped implementation or SDK parameter-name normalization is included. Source maps remain those of the original npm release.

Local additions for the wrapper (not part of those upstream PRs):

- Parameterized flat methods accept `request_overrides` for per-call HTTPX headers/serialization. The wrapper uses this for ETag, multipart uploads, and complete PATCH bodies without duplicating endpoint paths. `files`/`content` replaces JSON serialization.
- Pydantic bodies use `exclude_unset=True`, preserving explicit nulls without sending null for every omitted field. Raw inline optional parameters still conflate omitted values with `None`; use a full JSON body override when that distinction matters.

These are experiment-local compatibility changes, not a general multipart or unset-value implementation in the generator. Keep them until upstream provides equivalent transport options and serialization; merging the two PRs alone does not cover these additions.

Remove each part when an upstream release contains its fix, then update the pinned version/lockfile and rerun codegen, compile, and tests. PR numbers alone do not guarantee a released package contains the fixes.
