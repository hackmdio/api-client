"""Wrapper behavior using real HTTPX serialization, with no network access."""

import json
from pathlib import Path
import sys
import unittest

import httpx
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from hackmd_api import API, HttpResponseError, InternalServerError, TooManyRequestsError, models


NOTE = {
    "id": "note-1", "title": "Title", "content": "Body", "description": "",
    "tags": [], "createdAt": 1, "lastChangedAt": 2, "publishType": "view",
    "shortId": "short", "publishLink": "https://example.test/s/short",
    "readPermission": "owner", "writePermission": "owner",
}
FOLDER = {"id": "folder-1", "name": "Folder", "createdAt": 1, "updatedAt": 2}


class APITest(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.responses = []

        def handle(request):
            self.requests.append(request)
            response = self.responses.pop(0)
            if isinstance(response, Exception):
                raise response
            return response

        self.api = API(" test-token ", "https://example.test/custom/v1/", retries=2,
                       retry_delay=0, transport=httpx.MockTransport(handle))
        self.addCleanup(self.api.close)

    def respond(self, code=200, body=None, headers=None):
        self.responses.append(httpx.Response(code, json=body, headers=headers))

    def test_note_etag_and_headers_do_not_leak(self):
        self.respond(body=NOTE, headers={"ETag": 'W/"one"'})
        response = self.api.get_note("a/b?#", unwrap_data=False)
        self.assertEqual(response.headers["ETag"], 'W/"one"')
        self.assertEqual(self.requests[-1].url.raw_path, b"/custom/v1/notes/a%2Fb%3F%23")
        self.assertEqual(self.requests[-1].headers["Authorization"], "Bearer test-token")
        self.respond(304, headers={"ETag": 'W/"one"'})
        self.assertIsNone(self.api.get_note("note-1", etag='W/"one"'))
        self.assertEqual(self.requests[-1].headers["If-None-Match"], 'W/"one"')
        self.respond(body=NOTE)
        note = self.api.get_team_note("docs", "note-1")
        self.assertIsInstance(note, models.SingleNote)
        self.assertEqual(note.content, "Body")
        self.assertNotIn("If-None-Match", self.requests[-1].headers)
        self.assertEqual(self.requests[-1].url.path, "/custom/v1/teams/docs/notes/note-1")
        self.respond(304)
        response = self.api.get_team_note("docs", "note-1", etag="cached", unwrap_data=False)
        self.assertEqual(response.status_code, 304)
        self.respond(304)
        with self.assertRaises(HttpResponseError):
            self.api.get_note("note-1")

    def test_create_multistatus_and_no_implicit_nulls(self):
        for code, body in [(201, NOTE), (207, {"note": NOTE, "error": "Folder unavailable"})]:
            with self.subTest(code=code):
                self.respond(code, body)
                result = self.api.create_note(models.CreateNote(title="Title", content="Body"))
                self.assertEqual(json.loads(self.requests[-1].content), {"title": "Title", "content": "Body"})
                self.assertIsInstance(result, models.SingleNote if code == 201 else models.CreateNoteMultiStatusResponse)

    def test_patch_preserves_null_and_omits_unset(self):
        self.respond(202)
        body = models.UpdateNoteBody.model_validate({"title": "Changed", "parentFolderId": None})
        self.assertIsNone(self.api.update_note("note-1", body))
        self.assertEqual(json.loads(self.requests[-1].content), {"title": "Changed", "parentFolderId": None})
        self.respond(202)
        self.api.update_folder("folder-1", models.UpdateUserFolderBody.model_validate({"description": None}))
        self.assertEqual(json.loads(self.requests[-1].content), {"description": None})

    def test_note_description_omitted_string_and_null(self):
        for fields in [{}, {"description": "Changed"}, {"description": ""}, {"description": None}]:
            with self.subTest(fields=fields):
                self.respond(202)
                body = models.UpdateNoteBody.model_validate(fields)
                self.assertIsNone(self.api.update_note("note-1", body))
                self.assertEqual(json.loads(self.requests[-1].content), fields)
        with self.assertRaises(ValidationError):
            models.SingleNote.model_validate({**NOTE, "description": None})

    def test_multipart_is_bytes_not_json(self):
        self.respond(201, {"data": {"link": "https://example.test/image.png"}})
        result = self.api.upload_note_image("note-1", b"\x89PNG\x00\xff", filename="test.png")
        request = self.requests[-1]
        self.assertEqual(result.data.link, "https://example.test/image.png")
        self.assertEqual(request.url.path, "/custom/v1/notes/note-1/images")
        self.assertTrue(request.headers["Content-Type"].startswith("multipart/form-data; boundary="))
        self.assertIn(b'name="image"; filename="test.png"', request.content)
        self.assertIn(b"Content-Type: image/png", request.content)
        self.assertIn(b"\x89PNG\x00\xff", request.content)

    def test_nullable_team_owner_in_profile_and_team_list(self):
        for owner_id in [None, "owner-id"]:
            with self.subTest(owner_id=owner_id):
                team = {
                    "id": "team-id", "ownerId": owner_id, "name": "Docs",
                    "logo": "", "path": "docs", "description": None,
                    "visibility": "private", "upgraded": False, "createdAt": 1,
                }
                self.respond(body=[team])
                self.assertEqual(self.api.list_teams()[0].owner_id, owner_id)
                self.respond(body={
                    "id": "u", "name": "User", "userPath": "user", "photo": "",
                    "teams": [team], "upgraded": False,
                })
                self.assertEqual(self.api.get_me().teams[0].owner_id, owner_id)

    def test_profile_lists_history_and_folders(self):
        self.respond(body={"id": "u", "name": "User", "userPath": "user", "photo": "", "teams": [], "upgraded": False})
        self.assertIsInstance(self.api.get_me(), models.User)
        for operation in [self.api.list_teams, self.api.list_notes, self.api.list_folders]:
            self.respond(body=[])
            self.assertEqual(operation(), [])
        self.respond(body=[])
        self.assertEqual(self.api.get_history(7), [])
        self.assertEqual(self.requests[-1].url.query, b"limit=7")
        self.respond(201, FOLDER)
        folder = self.api.create_folder(models.CreateUserFolderBody.model_validate({"name": "Folder", "parentFolderId": "parent"}))
        self.assertEqual(folder.name.root, "Folder")
        self.assertEqual(json.loads(self.requests[-1].content), {"name": "Folder", "parentFolderId": "parent"})
        self.respond(body=FOLDER)
        self.assertEqual(self.api.get_folder("folder-1").id, "folder-1")
        self.respond(body={"root": ["folder-1"]})
        order = self.api.get_folder_order()
        self.assertEqual(order.root, {"root": ["folder-1"]})
        self.respond(204)
        self.assertIsNone(self.api.update_folder_order(models.UpdateFolderOrderBody(order=order)))
        self.assertEqual(json.loads(self.requests[-1].content), {"order": {"root": ["folder-1"]}})
        for operation in [self.api.delete_note, self.api.delete_folder]:
            self.respond(204)
            self.assertIsNone(operation("id"))

    def test_retry_is_per_call_and_safe_methods_only(self):
        for _ in range(2):
            self.responses.append(httpx.ConnectError("offline"))
            self.respond(503)
            self.respond(body=NOTE)
            self.assertEqual(self.api.get_note("note-1").id, "note-1")
        self.assertEqual(len(self.requests), 6)
        self.respond(429)
        self.respond(body=[])
        self.assertEqual(self.api.list_notes(), [])
        for operation, args in [
            (self.api.create_note, (models.CreateNote(title="title"),)),
            (self.api.update_note, ("note-1", models.UpdateNoteBody(title="title"))),
            (self.api.upload_note_image, ("note-1", b"image")),
        ]:
            count = len(self.requests)
            self.respond(503)
            with self.assertRaises(InternalServerError):
                operation(*args)
            self.assertEqual(len(self.requests), count + 1)
        self.respond(503)
        self.respond(204)
        self.api.delete_note("note-1")

    def test_errors_exhaustion_and_raw_escape_hatch(self):
        self.respond(404, {"error": "Note not found"})
        with self.assertRaises(HttpResponseError) as caught:
            self.api.get_note("missing")
        self.assertEqual(caught.exception.code, 404)
        self.assertEqual(caught.exception.response.json(), {"error": "Note not found"})
        self.respond(429, headers={"x-ratelimit-userremaining": "0"})
        with self.assertRaises(TooManyRequestsError):
            self.api.get_note("note-1")
        self.assertEqual(len(self.requests), 2)
        for _ in range(3):
            self.respond(503)
        with self.assertRaises(InternalServerError):
            self.api.list_notes()
        self.assertEqual(len(self.requests), 5)
        self.respond(503)
        self.assertEqual(self.api.raw.list_notes().status_code, 503)
        self.assertEqual(len(self.requests), 6)

    def test_retry_disabled_native_errors_and_validation(self):
        with self.assertRaises(ValueError):
            API(" ")
        for value in [-1, 1.5, True]:
            with self.assertRaises(ValueError):
                API("token", retries=value)
        with API("token", retries=0, wrap_response_errors=False,
                 transport=httpx.MockTransport(lambda _: httpx.Response(503))) as api:
            with self.assertRaises(httpx.HTTPStatusError) as caught:
                api.get_me()
            self.assertNotIsInstance(caught.exception, HttpResponseError)
        self.respond(body={"id": "incomplete"})
        with self.assertRaises(ValidationError):
            self.api.get_note("note-1")

    def test_cleanup_and_live_failure_redaction(self):
        import io
        import runpy
        live = runpy.run_path(str(Path(__file__).parent / "e2e/live.py"))
        case = live["LiveE2E"]("test_profile")
        deleted = []
        case.track("only-our-id", deleted.append)
        case.doCleanups()
        self.assertEqual(deleted, ["only-our-id"])

        def broken_cleanup(_):
            raise RuntimeError("cleanup failed")
        case = live["LiveE2E"]("test_profile")
        case.track("our-id", broken_cleanup)
        case.test_profile = lambda: None
        cleanup_result = unittest.TestResult()
        case.run(cleanup_result)
        self.assertEqual(len(cleanup_result.errors), 1)
        self.assertIn("cleanup failed", cleanup_result.errors[0][1])

        stream = io.StringIO()
        payload = {"content": "private-note-body"}
        def invalid_response():
            models.SingleNote.model_validate(payload)
        result = unittest.TextTestRunner(stream=stream, resultclass=live["SafeResult"]).run(
            unittest.FunctionTestCase(invalid_response)
        )
        self.assertNotIn("private-note-body", result.errors[0][1])
        self.assertIn("Response schema mismatch", result.errors[0][1])


if __name__ == "__main__":
    unittest.main()
