# Python API client experiment

An experimental Python API client generated from the same OpenAPI spec as the Node.js client. Not yet published or supported for production use.

## Setup

Requires Node.js 22.18+, pnpm 10.33.2, Python 3.10+, and [uv](https://docs.astral.sh/uv/). Run from `python/`:

```sh
pnpm install --frozen-lockfile
uv sync --frozen
```

## Usage

Save this as `example.py` and run `PYTHONPATH=src uv run python example.py` with `HACKMD_ACCESS_TOKEN` set:

```python
import os
from hackmd_api import API

with API(os.environ["HACKMD_ACCESS_TOKEN"]) as api:
    notes = api.list_notes()
    if notes:
        note = api.get_note(notes[0].id)
        print(note.title, note.content)

    # Access any generated operation through api.raw.
    response = api.raw.list_webhooks()
    response.raise_for_status()
```

`API` covers profile, teams, history, personal notes/images, personal folders/order, and team note detail. All generated operations are available through `api.raw`.

- Methods return generated Pydantic models; no-content responses return `None`. Pass `unwrap_data=False` for the original HTTPX response.
- `get_note` and `get_team_note` accept `etag=...`; a conditional 304 returns `None`, so keep your cached note.
- Set `base_url` for a custom server or `retries=0` to disable retries. Only reads, PUT, and DELETE retry network errors, 429, or 5xx; POST/PATCH never retry.
- HTTP failures raise `HttpResponseError`. Raw operations do not parse responses, retry, or automatically raise HTTP errors.
- Use the exported `models` for request bodies. A create-note 207 returns `CreateNoteMultiStatusResponse`: the note was created, so do not retry creation.

## Development

```sh
pnpm codegen                # regenerate the raw client
pnpm check:generated        # detect generated-file drift
uv run --frozen pnpm check  # compile Python sources
pnpm test                   # offline tests; no token needed
```

The custom layer lives in `src/hackmd_api/api.py`. Commit generated files under `src/hackmd_api/generated/`; never edit them by hand. Use these scripts rather than `npx` so the temporary [generator patch](./patches/README.md) is applied.

Python CI runs generation checks, compilation, and offline tests on Python 3.13. It does not run live tests.

## Live E2E

Reuse the ignored `nodejs/.env` with `HACKMD_ACCESS_TOKEN` and optional `HACKMD_API_ENDPOINT`. Environment variables take precedence.

```sh
HACKMD_E2E_MUTATIONS=0 pnpm test:e2e  # read-only
HACKMD_E2E_MUTATIONS=1 pnpm test:e2e  # note/folder CRUD, image upload, and ETag
```

Use a dedicated account and explicitly approve production writes. Never commit tokens or `.env`. Run Node and Python suites sequentially to avoid conflicting folder-order changes.

Tests clean up created notes/folders and restore folder order; cleanup failures fail the suite. Deleted notes remain in trash, and uploaded images may remain in storage. Unavailable folder endpoints are skipped; set `HACKMD_E2E_FOLDERS=0` to skip folder mutations.
