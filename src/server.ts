import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { FlagStore } from "./domain.js";

async function readJson(request: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

export function createApp(store: FlagStore) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const method = request.method ?? "GET";
    const url = request.url ?? "/";

    if (method === "GET" && url === "/health") {
      send(response, 200, { ok: true });
      return;
    }

    if (method === "POST" && url === "/flags") {
      const body = await readJson(request);
      const flag = store.createFlag(body.key, body.description ?? "", body.enabled ?? true);
      send(response, 201, { data: flag });
      return;
    }

    if (method === "POST" && url.startsWith("/flags/") && url.endsWith("/rules")) {
      const key = url.replace("/flags/", "").replace("/rules", "");
      const rule = store.addRule(key, await readJson(request));
      send(response, 201, { data: rule });
      return;
    }

    if (method === "POST" && url === "/evaluate") {
      const decision = store.evaluate(await readJson(request));
      send(response, 200, { data: decision });
      return;
    }

    if (method === "GET" && url === "/flags") {
      send(response, 200, { data: store.listFlags() });
      return;
    }

    send(response, 404, { error: "not_found" });
  };
}

const entrypoint = process.argv[1]?.replaceAll("\\", "/");
const isDirectRun = entrypoint !== undefined && import.meta.url.endsWith(entrypoint);

if (isDirectRun) {
  const server = createServer(createApp(new FlagStore()));
  server.listen(3000, () => {
    console.log("feature-flags-control-plane listening on :3000");
  });
}
