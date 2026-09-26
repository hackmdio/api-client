# Python API client experiment

This is a code generation experiment, not a usable or published Python API client. It reads the same vendored OpenAPI spec as the Node.js client; generated files are ignored and should not be edited.

Requires Node.js 22.18 or newer. From this directory:

```sh
npx --yes @hey-api/openapi-python@0.0.24
python3 -m compileall -q .generated
```

Generation currently completes for all 59 v1 operations, but the compile check fails: the `+1` and `-1` reaction values become invalid Python enum member names. The generated SDK also does not yet make parameterized calls correctly: `get_note(noteId)` leaves `{noteId}` in the URL and passes its path parameter as HTTPX query parameters. Keep this as an experiment until generated code compiles and a mocked request confirms authentication, path substitution, and response handling.
