# Python API client experiment

This is a code generation experiment, not a supported or published Python API client. It reads the same vendored OpenAPI spec as the Node.js client and uses flat parameters. Generated files in `src/hackmd_api/generated/` belong in version control and must not be edited by hand.

Requires Node.js 22.18+, pnpm 10.33.2, Python 3.10+, and [uv](https://docs.astral.sh/uv/). From this directory:

```sh
pnpm install --frozen-lockfile
pnpm codegen
pnpm check:generated
pnpm check
pnpm test
```

The pinned generator includes a temporary [pnpm patch](./patches/README.md) adapting two pending upstream fixes. Use the commands above rather than `npx`, which bypasses the patch.

Like the Node.js client, `codegen` generates sources and `check:generated` checks them. Commit regenerated files alongside spec, config, or generator changes. The check regenerates the package and fails if generated files were added, removed, or changed, ignoring Python bytecode caches.

`src/hackmd_api/__init__.py` is the handwritten package entry point; it currently re-exports the generated `Sdk`. Everything under `src/hackmd_api/generated/` belongs to the generator. Future handwritten wrappers must live outside that directory so regeneration cannot overwrite them. This mirrors `nodejs/src/index.ts` and `nodejs/src/generated/`, with the extra `hackmd_api` directory providing the Python package namespace.

The smoke test imports the generated package and checks the operation count against the spec, reaction enum values, personal/team paths, query parameters, JSON/Pydantic bodies, and raw responses (including 204, 304, 207, and 404). It uses HTTPX MockTransport, a custom base URL, and a fake bearer token: no network requests or real credentials are used. This is representative coverage, not verification of every operation against a live server.

The SDK still returns `httpx.Response`; callers read `.json()` or explicitly call `.raise_for_status()`. Authentication is configured on an injected `httpx.Client`, not generated from security schemes. Grouped parameters, multipart uploads, automatic response parsing, and production readiness remain outside this experiment.
