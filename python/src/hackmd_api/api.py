"""Small synchronous custom layer over the generated API client."""

from collections.abc import Callable
import time
from typing import Any, TypeVar

import httpx
from pydantic import TypeAdapter

from .generated import Sdk
from .generated import pydantic_gen as models

T = TypeVar("T")


class HttpResponseError(httpx.HTTPStatusError):
    """HTTP failure with the original request and response preserved."""

    @property
    def code(self) -> int:
        return self.response.status_code


class InternalServerError(HttpResponseError):
    """The server returned a 5xx response."""


class TooManyRequestsError(HttpResponseError):
    """Rate limited; original rate-limit headers are on ``response.headers``."""


class API:
    """Authenticated API client. Use as a context manager to close connections.

    Methods return generated Pydantic models (or None for no-content responses).
    Pass ``unwrap_data=False`` for the original HTTPX response, including ETag.
    ``raw`` exposes every generated operation without parsing, retries, or
    automatic HTTP status errors.
    Credentials are explicit: this class never reads environment variables/files.
    """

    def __init__(
        self,
        access_token: str,
        base_url: str = "https://api.hackmd.io/v1",
        *,
        timeout: float = 30,
        retries: int = 3,
        retry_delay: float = 0.1,
        wrap_response_errors: bool = True,
        transport: httpx.BaseTransport | None = None,
    ):
        if not access_token.strip():
            raise ValueError("access_token is required")
        if isinstance(retries, bool) or not isinstance(retries, int) or retries < 0:
            raise ValueError("retries must be a non-negative integer")
        if retry_delay < 0:
            raise ValueError("retry_delay must be non-negative")
        self.raw = Sdk(client=httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {access_token.strip()}"},
            timeout=timeout,
            transport=transport,
        ))
        self._retries = retries
        self._retry_delay = retry_delay
        self._wrap_response_errors = wrap_response_errors

    def close(self) -> None:
        self.raw.close()

    def __enter__(self) -> "API":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def _call(
        self, operation: Callable[..., httpx.Response], model: type[T], *,
        unwrap_data: bool, retry: bool = False, allow_not_modified: bool = False,
        **kwargs: Any,
    ) -> T | None | httpx.Response:
        attempts = self._retries if retry else 0
        for attempt in range(attempts + 1):
            try:
                response = operation(**kwargs)
            except httpx.TransportError:
                if attempt == attempts:
                    raise
            else:
                transient = response.status_code == 429 or 500 <= response.status_code < 600
                remaining = response.headers.get("x-ratelimit-userremaining")
                try:
                    exhausted = remaining is not None and float(remaining) <= 0
                except ValueError:
                    exhausted = False
                if not transient or exhausted or attempt == attempts:
                    break
                response.close()
            time.sleep(self._retry_delay * 2 ** (attempt + 1))

        if not (allow_not_modified and response.status_code == 304):
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                if not self._wrap_response_errors:
                    raise
                error_type = (
                    TooManyRequestsError if response.status_code == 429
                    else InternalServerError if response.status_code >= 500
                    else HttpResponseError
                )
                # Do not include tokens or response bodies in exception messages.
                raise error_type(
                    f"HTTP {response.status_code} {response.reason_phrase}",
                    request=response.request, response=response,
                ) from error
        if not unwrap_data:
            return response
        if response.status_code in (202, 204, 304):
            return None
        return TypeAdapter(model).validate_json(response.content)

    def get_me(self, *, unwrap_data: bool = True) -> models.User | httpx.Response:
        return self._call(self.raw.get_me, models.User, retry=True, unwrap_data=unwrap_data)

    def list_teams(self, *, unwrap_data: bool = True) -> list[models.Team] | httpx.Response:
        return self._call(self.raw.list_teams, list[models.Team], retry=True, unwrap_data=unwrap_data)

    def get_history(self, limit: int | None = None, *, unwrap_data: bool = True) -> list[models.Note] | httpx.Response:
        return self._call(self.raw.get_history, list[models.Note], limit=limit, retry=True, unwrap_data=unwrap_data)

    def list_notes(self, *, unwrap_data: bool = True) -> list[models.NoteType] | httpx.Response:
        return self._call(self.raw.list_notes, list[models.NoteType], retry=True, unwrap_data=unwrap_data)

    def get_note(self, note_id: str, *, etag: str | None = None, unwrap_data: bool = True) -> models.SingleNote | None | httpx.Response:
        """Return a note, or None on conditional 304. Raw mode exposes the ETag."""
        return self._call(
            self.raw.get_note, models.SingleNote, noteId=note_id, retry=True,
            request_overrides={"headers": {"If-None-Match": etag}} if etag is not None else None,
            allow_not_modified=etag is not None, unwrap_data=unwrap_data,
        )

    def get_team_note(self, team_path: str, note_id: str, *, etag: str | None = None, unwrap_data: bool = True) -> models.SingleNote | None | httpx.Response:
        """Like get_note, scoped to a team workspace."""
        return self._call(
            self.raw.get_team_note, models.SingleNote, teampath=team_path, noteId=note_id,
            request_overrides={"headers": {"If-None-Match": etag}} if etag is not None else None,
            retry=True, allow_not_modified=etag is not None, unwrap_data=unwrap_data,
        )

    def create_note(self, body: models.CreateNote, *, unwrap_data: bool = True) -> models.SingleNote | models.CreateNoteMultiStatusResponse | httpx.Response:
        """A 207 returns CreateNoteMultiStatusResponse; the note was still created."""
        return self._call(
            self.raw.create_note, models.SingleNote | models.CreateNoteMultiStatusResponse,
            body=body, unwrap_data=unwrap_data,
        )

    def update_note(self, note_id: str, body: models.UpdateNoteBody, *, unwrap_data: bool = True) -> None | httpx.Response:
        # Preserve explicit nulls while omitting unset fields; flat raw defaults
        # cannot distinguish those two cases yet.
        return self._call(
            self.raw.update_note, type(None), noteId=note_id,
            request_overrides={"json": body}, unwrap_data=unwrap_data,
        )

    def delete_note(self, note_id: str, *, unwrap_data: bool = True) -> None | httpx.Response:
        return self._call(self.raw.delete_note, type(None), noteId=note_id, retry=True, unwrap_data=unwrap_data)

    def upload_note_image(self, note_id: str, image: bytes, *, filename: str = "image.png", content_type: str = "image/png", unwrap_data: bool = True) -> models.NoteImageUploadResponse | httpx.Response:
        """Serialize multipart through the generated endpoint; never retry uploads."""
        return self._call(
            self.raw.upload_note_image, models.NoteImageUploadResponse, noteId=note_id, image=image,
            request_overrides={"files": {"image": (filename, image, content_type)}},
            unwrap_data=unwrap_data,
        )

    def list_folders(self, *, unwrap_data: bool = True) -> list[models.ApiFolder] | httpx.Response:
        return self._call(self.raw.list_folders, list[models.ApiFolder], retry=True, unwrap_data=unwrap_data)

    def create_folder(self, body: models.CreateUserFolderBody, *, unwrap_data: bool = True) -> models.ApiFolder | httpx.Response:
        return self._call(self.raw.create_folder, models.ApiFolder, create_user_folder_body=body, unwrap_data=unwrap_data)

    def get_folder(self, folder_id: str, *, unwrap_data: bool = True) -> models.ApiFolder | httpx.Response:
        return self._call(self.raw.get_folder, models.ApiFolder, folderId=folder_id, retry=True, unwrap_data=unwrap_data)

    def update_folder(self, folder_id: str, body: models.UpdateUserFolderBody, *, unwrap_data: bool = True) -> None | httpx.Response:
        return self._call(self.raw.update_folder, type(None), folderId=folder_id, update_user_folder_body=body, unwrap_data=unwrap_data)

    def delete_folder(self, folder_id: str, *, unwrap_data: bool = True) -> None | httpx.Response:
        return self._call(self.raw.delete_folder, type(None), folderId=folder_id, retry=True, unwrap_data=unwrap_data)

    def get_folder_order(self, *, unwrap_data: bool = True) -> models.ApiFolderOrder | httpx.Response:
        return self._call(self.raw.get_folder_order, models.ApiFolderOrder, retry=True, unwrap_data=unwrap_data)

    def update_folder_order(self, body: models.UpdateFolderOrderBody, *, unwrap_data: bool = True) -> None | httpx.Response:
        return self._call(self.raw.update_folder_order, type(None), update_folder_order_body=body, retry=True, unwrap_data=unwrap_data)
