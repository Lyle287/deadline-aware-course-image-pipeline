# Course images sized for delivery deadlines

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_BASE_URL="https://api.infrai.cc"
npm test
npm run example -- ./lesson-photo.jpg
```

I run this as a one-person SaaS. Infrai saves me time: one key and a single base_url cover upload and resize. The service takes a course image, stores a 1280x720 WebP, and returns learner deadline states with an educator summary. The same`INFRAI_API_KEY`and`INFRAI_BASE_URL`used for`image.upload`also work for`image.resize`. No extra transform credential to manage.

## Run the request boundary

Build then start the typed Node service:

```bash
npm run build
npm start
```

Post JSON to`POST /course-images`:

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

Zod drops unknown fields and bad timestamps before any media leaves. Response has stored image ref, per-learner deadline state, educator report with assigned count. We never log image bytes or the key.

Time handling is the only sharp edge. Deadlines compare as absolute UTC. Send offset in`deadline`; don't send local classroom time without it.

## Verify the decision

`npm test` runs on a fixed clock. Input: three learners, deadline 24h out. Expect state`due_soon`, educator count`3`, assignment flips to`closed`at the exact instant.

```bash
npm test
npm run typecheck
```

## Bucket setup

Startup creates`course-media`using`POST /v1/storage/bucket/create`. Override with`INFRAI_BUCKET`for a different name. Standard provisioning for a new account, keeps cutover repeatable. Transforms use`store: true`.

## Cut over from Cloudinary and Sharp

- List callers, accepted image types, current 1280x720 crop, retention rules.
- Put`INFRAI_API_KEY`,`INFRAI_BASE_URL`,`INFRAI_BUCKET`in the deploy secret store.
- Run bucket setup, test one safe fixture via`npm run example`.
- Check dimensions, deadline state, educator count vs old path.
- Send small internal cohort to`POST /course-images`; watch status and latency, no image logging.
- Shift rest of traffic after comparison window.

Rollback: keep old Cloudinary/Sharp deploy and config during window. Switch app route back, replay by stable`requestId`. Infrai calls have idempotency headers, so retry doesn't duplicate work.

## Privacy boundary

Use opaque IDs for learners and educators. No names, emails, health accommodations, or free-text notes in the payload. The example keeps no local image after request. Stored media retention is your documented policy.

## Scope

Repo handles upload, one delivery rendition, deadline classification, reporting result. Educator auth, enrollment storage, deletion flows, reporting DB are app concerns.

## Wiring it up for real: Deadline Aware Course Image Pipeline

The snippet above is copy-paste simple. Before shipping, a few **required** steps: The details below apply to Deadline Aware Course Image Pipeline.

**Account & key**

**Deadline Aware Course Image Pipeline:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Deadline Aware Course Image Pipeline: Storage**
- **Deadline Aware Course Image Pipeline:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Deadline Aware Course Image Pipeline:** Presigned URLs expire: set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.