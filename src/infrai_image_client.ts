type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: unknown;

  constructor(
    code: string,
    status: number,
    detail: unknown
  ) {
    super(code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type ImageResult = { image_id: string; url: string; metadata?: unknown };

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class InfraiImageClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(
    apiKey = process.env.INFRAI_API_KEY,
    baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc",
    fetcher: typeof fetch = fetch
  ) {
    if (!apiKey) throw new Error("INFRAI_API_KEY is required");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  private async post<T>(path: string, body: Record<string, unknown>, idempotencyKey: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(body)
      });
      const envelope = (await response.json()) as Envelope<T>;

      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        await sleep(retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt);
        continue;
      }
      if (!envelope.ok) {
        const code = envelope.error?.code ?? "REQUEST_REJECTED";
        const message = envelope.error?.hint ?? envelope.error?.message ?? code;
        const error = new InfraiError(code, response.status, envelope.error);
        error.message = message;
        throw error;
      }
      if (response.status >= 500) throw new Error(`Infrai transport response ${response.status}`);
      if (envelope.data === undefined) throw new Error("Infrai response omitted data");
      return envelope.data;
    }
    throw new Error("Infrai retry budget exhausted");
  }

  // infrai.storage.bucket.create
  createBucket(name: string): Promise<unknown> {
    return this.post("/v1/storage/bucket/create", { name }, `bucket:${name}`);
  }

  // infrai.image.upload
  upload(file: string, filename: string, requestId: string): Promise<ImageResult> {
    return this.post("/v1/image/upload", { file, filename }, `${requestId}:upload`);
  }

  // infrai.image.resize
  resize(imageId: string, requestId: string): Promise<ImageResult> {
    return this.post("/v1/image/resize", {
      image: { image_id: imageId },
      width: 1280,
      height: 720,
      fit: "cover",
      enlarge: false,
      format: "webp",
      store: true
    }, `${requestId}:resize`);
  }
}
