import { z } from "zod";
import { InfraiImageClient } from "./infrai_image_client.js";

export const courseUploadSchema = z.object({
  requestId: z.string().min(8).max(100).regex(/^[A-Za-z0-9_-]+$/),
  courseId: z.string().min(1).max(80),
  lessonId: z.string().min(1).max(80),
  educatorId: z.string().min(1).max(80),
  learnerIds: z.array(z.string().min(1).max(80)).min(1).max(500),
  deadline: z.string().datetime({ offset: true }),
  filename: z.string().min(1).max(160),
  imageBase64: z.string().min(16)
}).strict();

export type CourseUpload = z.infer<typeof courseUploadSchema>;
export type DeadlineState = "open" | "due_soon" | "closed";

export function deadlineState(deadline: string, now: Date): DeadlineState {
  const remaining = new Date(deadline).getTime() - now.getTime();
  if (remaining <= 0) return "closed";
  if (remaining <= 48 * 60 * 60 * 1000) return "due_soon";
  return "open";
}

export function educatorReport(input: CourseUpload, state: DeadlineState) {
  return {
    educatorId: input.educatorId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    assignedLearners: input.learnerIds.length,
    deadline: input.deadline,
    deadlineState: state
  };
}

export async function deliverCourseImage(
  raw: unknown,
  client: InfraiImageClient,
  now = new Date()
) {
  const input = courseUploadSchema.parse(raw);
  const state = deadlineState(input.deadline, now);
  const uploaded = await client.upload(input.imageBase64, input.filename, input.requestId);
  const stored = await client.resize(uploaded.image_id, input.requestId);

  return {
    requestId: input.requestId,
    delivery: {
      courseId: input.courseId,
      lessonId: input.lessonId,
      imageId: stored.image_id,
      image: stored.url,
      state: "ready" as const
    },
    learners: input.learnerIds.map((learnerId) => ({ learnerId, deadlineState: state })),
    report: educatorReport(input, state)
  };
}
