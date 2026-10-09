import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { courseUploadSchema, deliverCourseImage } from "./course_delivery.js";
import { InfraiError, InfraiImageClient } from "./infrai_image_client.js";

const bucket = process.env.INFRAI_BUCKET ?? "course-media";
const client = new InfraiImageClient();
const bucketReady = client.createBucket(bucket);

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/course-images") {
    send(response, 404, { error: "route_not_found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const parsed = courseUploadSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    await bucketReady;
    send(response, 201, await deliverCourseImage(parsed, client));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      send(response, 400, { error: "invalid_request" });
      return;
    }
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      send(response, error.status, { error: error.code, message: error.message });
      return;
    }
    send(response, 502, { error: "media_processing_failed" });
  }
});

if (process.argv[1]?.endsWith("course_media_server.js")) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Course media service listening on http://localhost:${port}`));
}
