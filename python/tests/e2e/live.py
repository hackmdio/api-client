"""Explicit live E2E entry point. Never discovered by the offline test command."""

import os
from pathlib import Path
import sys
import unittest
from uuid import uuid4

from pydantic import TypeAdapter, ValidationError

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from hackmd_api import API, HttpResponseError, models

MUTATIONS = os.environ.get("HACKMD_E2E_MUTATIONS") == "1"
FOLDERS = os.environ.get("HACKMD_E2E_FOLDERS") != "0"


class LiveE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        token = os.environ.get("HACKMD_ACCESS_TOKEN", "").strip()
        if not token:
            raise RuntimeError("HACKMD_ACCESS_TOKEN is required (see python/README.md)")
        endpoint = os.environ.get("HACKMD_API_ENDPOINT", "").strip() or "https://api.hackmd.io/v1"
        cls.api = API(token, endpoint, retries=2, retry_delay=0.25)
        cls.addClassCleanup(cls.api.close)
        print(f"Live E2E: {endpoint}; mutations={MUTATIONS}; folders={FOLDERS}", flush=True)

    def test_profile(self):
        user = self.api.get_me()
        self.assertIsInstance(user.id, str)
        self.assertIsInstance(user.name, str)
        self.assertIsInstance(user.user_path, str)
        self.assertIsInstance(user.teams, list)

    def test_notes_list(self):
        notes = self.api.list_notes()
        self.assertIsInstance(notes, list)
        for note in notes[:1]:
            self.assertIsInstance(note.id, str)
            self.assertIsInstance(note.title, str)

    def test_teams(self):
        self.assertIsInstance(self.api.list_teams(), list)

    def test_history(self):
        self.assertIsInstance(self.api.get_history(7), list)

    def test_folders_list(self):
        try:
            self.assertIsInstance(self.api.list_folders(), list)
        except HttpResponseError as error:
            if error.code == 404:
                self.skipTest("Server does not expose /folders")
            raise

    def track(self, resource_id, delete):
        # Register before any DTO validation/assertion can fail. Cleanup failures
        # are unittest errors, not silently ignored. Only our exact IDs are used.
        self.assertIsInstance(resource_id, str)
        def cleanup():
            try:
                delete(resource_id)
            except HttpResponseError as error:
                if error.code != 404:
                    raise RuntimeError(f"Cleanup failed for {resource_id}: HTTP {error.code}") from error
        self.addCleanup(cleanup)

    @unittest.skipUnless(MUTATIONS, "Set HACKMD_E2E_MUTATIONS=1 to enable writes")
    def test_notes_crud_and_image(self):
        title = f"e2e-python-note-{uuid4().hex}"
        response = self.api.create_note(models.CreateNote(title=title, content="# initial\n", tags=["e2e"]), unwrap_data=False)
        wire = response.json()
        note_id = wire["note"]["id"] if response.status_code == 207 else wire["id"]
        self.track(note_id, self.api.delete_note)
        created = TypeAdapter(models.SingleNote | models.CreateNoteMultiStatusResponse).validate_python(wire)
        self.assertEqual(response.status_code, 201, "Note created but folder placement failed")
        self.assertEqual(created.title, title)
        self.assertIn("e2e", created.tags)

        raw = self.api.get_note(note_id, unwrap_data=False)
        note = models.SingleNote.model_validate_json(raw.content)
        self.assertEqual(note.id, note_id)
        self.assertEqual(note.title, title)
        self.assertIn("initial", note.content)
        etag = raw.headers.get("ETag")
        self.assertIsNotNone(etag)
        conditional = self.api.get_note(note_id, etag=etag, unwrap_data=False)
        self.assertEqual(conditional.status_code, 304)
        self.assertEqual(conditional.content, b"")

        patch = self.api.update_note(note_id, models.UpdateNoteBody(title=title + "-patched", content="# patched\n\nbody", tags=["e2e", "updated"]), unwrap_data=False)
        self.assertEqual(patch.status_code, 202)
        changed = self.api.get_note(note_id, etag=etag, unwrap_data=False)
        self.assertEqual(changed.status_code, 200)
        note = models.SingleNote.model_validate_json(changed.content)
        self.assertEqual(note.title, title + "-patched")
        self.assertIn("patched", note.content)
        self.assertTrue({"e2e", "updated"}.issubset(note.tags))

        image = (ROOT / "../nodejs/tests/fixtures/hackmd-cute-logo.png").read_bytes()
        uploaded = self.api.upload_note_image(note_id, image, filename=f"{title}.png")
        self.assertTrue(uploaded.data.link)
        found = next(note for note in self.api.list_notes() if note.id == note_id)
        self.assertEqual(found.title, title + "-patched")
        self.api.delete_note(note_id)
        self.assertNotIn(note_id, [note.id for note in self.api.list_notes()])

    @unittest.skipUnless(MUTATIONS and FOLDERS, "Folder writes disabled")
    def test_folders_crud_nesting_and_order(self):
        stamp = uuid4().hex
        try:
            response = self.api.create_folder(models.CreateUserFolderBody(name=f"e2e-python-parent-{stamp}", description="e2e parent"), unwrap_data=False)
        except HttpResponseError as error:
            if error.code == 404:
                self.skipTest("Server does not expose folder writes")
            raise
        parent_id = response.json()["id"]
        self.track(parent_id, self.api.delete_folder)
        parent = models.ApiFolder.model_validate_json(response.content)
        self.assertIn("e2e-python-parent", parent.name.root)
        fetched = self.api.get_folder(parent_id)
        self.assertEqual(fetched.id, parent_id)
        self.assertEqual(fetched.description, "e2e parent")
        renamed = f"e2e-python-renamed-{stamp}"
        self.api.update_folder(parent_id, models.UpdateUserFolderBody(name=renamed, description="renamed"))
        updated = self.api.get_folder(parent_id)
        self.assertEqual(updated.name.root, renamed)
        self.assertEqual(updated.description, "renamed")
        child_response = self.api.create_folder(models.CreateUserFolderBody.model_validate({"name": f"e2e-python-child-{stamp}", "parentFolderId": parent_id}), unwrap_data=False)
        child_id = child_response.json()["id"]
        self.track(child_id, self.api.delete_folder)
        self.assertEqual(self.api.get_folder(child_id).parent_folder_id, parent_id)
        self.assertTrue({parent_id, child_id}.issubset(folder.id for folder in self.api.list_folders()))

        with self.subTest("folder order round-trip"):
            try:
                original = self.api.get_folder_order()
            except HttpResponseError as error:
                if error.code == 404:
                    self.skipTest("Server does not expose folder-order")
                raise
            order_dirty = False
            def restore_order():
                nonlocal order_dirty
                if order_dirty:
                    self.api.update_folder_order(models.UpdateFolderOrderBody(order=original))
                    self.assertEqual(self.api.get_folder_order(), original)
                    order_dirty = False
            # Registered last, runs before the folder cleanup callbacks.
            self.addCleanup(restore_order)
            root = list(dict.fromkeys([parent_id, *original.root.get("root", [])]))
            order = models.ApiFolderOrder({**original.root, "root": root})
            order_dirty = True
            self.api.update_folder_order(models.UpdateFolderOrderBody(order=order))
            self.assertIn(parent_id, self.api.get_folder_order().root["root"])
            restore_order()

        # Cleanup runs after assertions, in order: restore display order, child,
        # parent. Verify deletes here too without leaving stale IDs in order.
        self.api.delete_folder(child_id)
        self.assertNotIn(child_id, [folder.id for folder in self.api.list_folders()])
        self.api.delete_folder(parent_id)
        self.assertNotIn(parent_id, [folder.id for folder in self.api.list_folders()])


class SafeResult(unittest.TextTestResult):
    def addError(self, test, err):
        if isinstance(err[1], ValidationError):
            # Live note content/profile data must not enter failure logs.
            details = "; ".join(
                f"{'.'.join(map(str, item['loc']))}: {item['type']}"
                for item in err[1].errors(include_input=False, include_context=False)
            )
            err = (AssertionError, AssertionError(f"Response schema mismatch: {details}"), err[2])
        super().addError(test, err)


if __name__ == "__main__":
    unittest.main(testRunner=unittest.TextTestRunner(verbosity=2, resultclass=SafeResult))
