"""Offline checks against regenerated code; no real token or network requests."""

import json
from pathlib import Path
import sys
import unittest

import httpx


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from hackmd_api import Sdk
from hackmd_api.generated import pydantic_gen as models


class GeneratedClientSmokeTest(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.response = httpx.Response(200, json={"content": "hello"})

        def handle(request):
            self.requests.append(request)
            return self.response

        self.client = httpx.Client(
            base_url="https://example.test/custom/v1",
            headers={"Authorization": "Bearer test-token"},
            transport=httpx.MockTransport(handle),
        )
        self.addCleanup(self.client.close)
        self.sdk = Sdk(client=self.client)

    def test_all_spec_operations_have_methods(self):
        document = json.loads((ROOT / "../nodejs/spec/hackmd-openapi.json").read_text())
        methods = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}
        operations = [
            operation
            for path in document["paths"].values()
            for method, operation in path.items()
            if method in methods
        ]
        sdk_methods = [
            name for name, value in vars(Sdk).items()
            if not name.startswith("_") and callable(value)
        ]
        self.assertEqual(len(sdk_methods), len(operations))

    def test_reaction_wire_values_are_unchanged(self):
        reaction = models.ApiCommentReactionShortcode
        self.assertEqual(reaction("+1").value, "+1")
        self.assertEqual(reaction("-1").value, "-1")
        self.assertIsNot(reaction("+1"), reaction("-1"))

    def test_note_path_auth_and_raw_response(self):
        response = self.sdk.get_note(noteId="a/b?#")
        request = self.requests[0]
        self.assertEqual(request.url.raw_path, b"/custom/v1/notes/a%2Fb%3F%23")
        self.assertEqual(request.url.host, "example.test")
        self.assertEqual(request.headers["Authorization"], "Bearer test-token")
        self.assertIsInstance(response, httpx.Response)
        self.assertEqual(response.json(), {"content": "hello"})

    def test_team_path_and_query(self):
        self.sdk.get_team_note(teampath="docs", noteId="note-1")
        self.assertEqual(self.requests[-1].url.path, "/custom/v1/teams/docs/notes/note-1")
        self.sdk.get_history(limit=7)
        self.assertEqual(str(self.requests[-1].url), "https://example.test/custom/v1/history?limit=7")

    def test_inline_json_body_accumulates_fields(self):
        self.response = httpx.Response(202)
        response = self.sdk.update_note(noteId="note-1", title="Title", content="Body")
        request = self.requests[0]
        self.assertEqual(request.method, "PATCH")
        self.assertEqual(request.url.query, b"")
        self.assertEqual(json.loads(request.content), {"title": "Title", "content": "Body"})
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.content, b"")

    def test_pydantic_body_and_multistatus(self):
        body = models.CreateNote.model_validate({"title": "Title", "parentFolderId": "folder-1"})
        result = {"note": {"id": "note-1"}, "error": "Folder unavailable"}
        self.response = httpx.Response(207, json=result)
        response = self.sdk.create_note(body=body)
        request = self.requests[0]
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.headers["Content-Type"], "application/json")
        self.assertEqual(json.loads(request.content), body.model_dump(mode="json", by_alias=True))
        self.assertEqual(json.loads(request.content)["parentFolderId"], "folder-1")
        self.assertEqual(response.status_code, 207)
        self.assertEqual(response.json(), result)

    def test_no_content_conditional_request_and_error_response(self):
        self.response = httpx.Response(204)
        response = self.sdk.delete_note(noteId="note-1")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")

        self.client.headers["If-None-Match"] = 'W/"cached"'
        self.response = httpx.Response(304, headers={"ETag": 'W/"cached"'})
        response = self.sdk.get_note(noteId="note-1")
        self.assertEqual(self.requests[-1].headers["If-None-Match"], 'W/"cached"')
        self.assertEqual(response.status_code, 304)
        self.assertEqual(response.content, b"")
        self.assertEqual(response.headers["ETag"], 'W/"cached"')

        self.response = httpx.Response(404, json={"error": "Note not found"})
        response = self.sdk.get_note(noteId="missing")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": "Note not found"})
        with self.assertRaises(httpx.HTTPStatusError):
            response.raise_for_status()


if __name__ == "__main__":
    unittest.main()
