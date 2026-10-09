import { readFile } from "node:fs/promises";
import { deliverCourseImage } from "./course_delivery.js";
import { InfraiImageClient } from "./infrai_image_client.js";

const imagePath = process.argv[2];
if (!imagePath) throw new Error("Usage: npm run example -- path/to/course-image.jpg");

const bytes = await readFile(imagePath);
const result = await deliverCourseImage({
  requestId: `demo-${Date.now()}`,
  courseId: "biology-201",
  lessonId: "cell-structure",
  educatorId: "educator-42",
  learnerIds: ["learner-7", "learner-9"],
  deadline: "2026-10-01T16:00:00.000Z",
  filename: imagePath.split("/").pop(),
  imageBase64: bytes.toString("base64")
}, new InfraiImageClient());

console.log(JSON.stringify(result, null, 2));
