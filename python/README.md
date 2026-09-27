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

`src/hackmd_api/__init__.py` exports the handwritten `API`, generated `Sdk`, and generated `models`. Everything under `src/hackmd_api/generated/` belongs to the generator; the custom layer lives in `api.py`. This mirrors `nodejs/src/index.ts` and `nodejs/src/generated/`, with the extra `hackmd_api` directory providing the Python package namespace.

The smoke test imports the generated package and checks the operation count against the spec, reaction enum values, personal/team paths, query parameters, JSON/Pydantic bodies, and raw responses (including 204, 304, 207, and 404). It uses HTTPX MockTransport, a custom base URL, and a fake bearer token: no network requests or real credentials are used. This is representative coverage, not verification of every operation against a live server.

## Custom API

Run local examples with `PYTHONPATH=src uv run python your_example.py`; this experiment is not yet packaged for installation.

```python
import os
from hackmd_api import API, models

with API(os.environ["HACKMD_ACCESS_TOKEN"]) as api:
    notes = api.list_notes()
    if notes:
        note = api.get_note(notes[0].id)
        print(note.title, note.content)

    # All generated operations remain accessible; raw returns httpx.Response.
    response = api.raw.list_webhooks()
    response.raise_for_status()
```

The first wrapper slice covers profile, teams, history, personal notes CRUD/images, personal folders CRUD/order, and team note detail. Methods use snake_case and generated Pydantic models, not a second set of handwritten DTOs. Other operations remain on `api.raw`.

Unlike Node.js's compile-time-only types, Python parses and validates response bodies. A response that disagrees with the spec raises a Pydantic `ValidationError`; it is not silently coerced into an untyped dictionary. Generated named scalar schemas use `RootModel` (for example, `folder.name.root`). Request models with aliases can be constructed using wire names via `models.CreateUserFolderBody.model_validate({"name": "Folder", "parentFolderId": "..."})`.

The following snippets belong inside the `with API(...) as api:` block above.

```python
# Mutating example: only run against an account you intend to modify.
created = api.create_note(models.CreateNote(title="Example", content="# Hello"))
if isinstance(created, models.CreateNoteMultiStatusResponse):
    # HTTP 207 still created a note; do not retry the creation.
    print(created.error)
    note_id = created.note.id
else:
    note_id = created.id

api.update_note(note_id, models.UpdateNoteBody(title="Updated"))
# Unset fields are omitted; explicit None is serialized as JSON null.
api.update_note(note_id, models.UpdateNoteBody.model_validate({"parentFolderId": None}))
api.delete_note(note_id)
```

`API(token, base_url="https://api-stage.hackmd.io/v1", timeout=30, retries=3)` owns its HTTPX client. Timeout and retry delay are in seconds. Only reads, PUT, and DELETE retry transport errors, 429, or 5xx; POST/PATCH never retry automatically. Exhausted rate-limit headers stop retries. `retries=0` disables them. A retried DELETE may return 404 if the first attempt already succeeded.

HTTP errors raise `HttpResponseError` (with `code` and the original `response`), `TooManyRequestsError`, or `InternalServerError`. `wrap_response_errors=False` retains HTTPX's `HTTPStatusError`; transport errors retain their HTTPX type. Raw operations use the same authentication/base URL, but do not retry, parse, or automatically raise errors.

### ETag and raw responses

```python
cached = api.get_note(note_id, unwrap_data=False)
cached_note = models.SingleNote.model_validate_json(cached.content)
etag = cached.headers.get("ETag")
note = api.get_note(note_id, etag=etag)
if note is None:  # HTTP 304: keep your cached data
    note = cached_note
```

`get_team_note(team_path, note_id, etag=...)` behaves the same. A 304 is accepted only for conditional requests. No-content 202/204/304 returns `None`; `unwrap_data=False` preserves the original HTTPX response and status/headers. Images use `upload_note_image(note_id, image_bytes, filename="image.png", content_type="image/png")` with a multipart serializer passed to the generated operation.

## Live E2E

The suite mirrors all existing Node live scenarios (profile, lists, history, note CRUD/image, folder CRUD/nesting/order) and also checks note `200 → 304 → changed 200`. It groups dependent CRUD steps into two workflows rather than separate tests. Offline `pnpm test` never discovers or runs it.

From `python/`, reuse the ignored `nodejs/.env` (`HACKMD_ACCESS_TOKEN`, optional `HACKMD_API_ENDPOINT`). Real environment variables override values in that file:

```sh
HACKMD_E2E_MUTATIONS=0 pnpm test:e2e       # read-only
HACKMD_E2E_MUTATIONS=1 pnpm test:e2e       # creates/deletes notes, folders; uploads an image
```

For environment-only/CI credentials, use `uv run --frozen python tests/e2e/live.py`. Never commit a token or `.env`. Use a dedicated account, and explicitly authorize production writes before running them. Run Node and Python suites sequentially, without concurrent folder-order edits.

Resources are tracked before DTO assertions; folder order is restored before cleanup on failure. Cleanup errors fail the suite. Notes are moved to trash, **not permanently deleted**, and deleting a note does not prove its uploaded image was removed from storage. Folder endpoints unavailable on the target are reported as skips; `HACKMD_E2E_FOLDERS=0` disables folder mutations.

The shared spec allows `Team.ownerId` to be null, matching ownerless teams in production. Regression tests cover both string and null values in profiles and team lists. The current Python generator also defaults nullable fields to `None` when omitted, so it does not yet enforce the spec's required-vs-nullable distinction as strictly as the TypeScript output.

Grouped parameters, async wrappers, packaging/publication, and wrappers for all operations remain outside this first slice.
