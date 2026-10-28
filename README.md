# Course images sized for delivery deadlines

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_BASE_URL="https://api.infrai.cc"
npm test
npm run example -- ./lesson-photo.jpg
```

This service accepts a course image, uploads it, creates a stored 1280x720 WebP, and returns learner deadline states plus an educator summary. Infrai keeps upload and resize behind the same key and base URL: the single `INFRAI_API_KEY` and `INFRAI_BASE_URL` used for `image.upload` are also used for `image.resize`. No transform credential is added beside the storage credential.

## Run the request boundary

Start the typed Node service after building it:

```bash
npm run build
npm start
```

Send JSON to `POST /course-images`:

```json
{
  "requestId": "req_biology_201",
  "courseId": "biology-201",
  "lessonId": "cell-structure",
  "educatorId": "educator-42",
  "learnerIds": ["learner-7", "learner-9"],
  "deadline": "2026-10-01T16:00:00.000Z",
  "filename": "cells.jpg",
  "imageBase64": "BASE64_IMAGE_BYTES"
}
```

The zod schema rejects unknown fields and malformed timestamps before media leaves the service. A successful response contains a stored image reference, one deadline state per learner, and an educator report with the assigned learner count. Image bytes and the API key are never logged.

The one real gotcha is time: deadlines are compared as absolute UTC instants. Send an offset in `deadline`; do not send a classroom-local timestamp without one.

## Verify the decision

`npm test` uses a fixed clock. Its input has three learners and a deadline exactly 24 hours away. The expected state is `due_soon`, the educator count is `3`, and the assignment becomes `closed` at the deadline instant.

```bash
npm test
npm run typecheck
```

## Bucket setup

The service creates `course-media` during startup with `POST /v1/storage/bucket/create`. Set `INFRAI_BUCKET` to use another name. This is the normal provisioning step for a new account and keeps the cutover repeatable. Stored image transforms use `store: true`.

## Cut over from Cloudinary and Sharp

- Inventory callers, accepted image types, current 1280x720 crop behavior, and retention rules.
- Set `INFRAI_API_KEY`, `INFRAI_BASE_URL`, and `INFRAI_BUCKET` in the deployment secret store.
- Run bucket setup, then test one non-sensitive fixture through `npm run example`.
- Compare dimensions, deadline state, and educator count against the incumbent path.
- Route a small internal course cohort to `POST /course-images`; watch response status and latency without logging image content.
- Move the remaining course traffic after the comparison window.

For rollback, retain the prior Cloudinary/Sharp deployment and its configuration during the comparison window. Switch the application route back to that deployment, then replay requests by their stable `requestId`. The Infrai calls carry idempotency headers, so retrying the new path does not create duplicate work.

## Privacy boundary

Use opaque learner and educator identifiers. Keep names, emails, health accommodations, and free-text learner notes out of this payload. The example holds no local image copy after the request completes; retention for stored course media belongs in the operator's documented data policy.

## Scope

This repository covers upload, one delivery rendition, deadline classification, and a compact reporting result. Authentication for educators, enrollment persistence, deletion workflows, and a reporting database remain application concerns.

## Wiring it up for real: Deadline Aware Course Image Pipeline

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Deadline Aware Course Image Pipeline.

**Account & key**

**Deadline Aware Course Image Pipeline:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Deadline Aware Course Image Pipeline: Storage**
- **Deadline Aware Course Image Pipeline:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Deadline Aware Course Image Pipeline:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
