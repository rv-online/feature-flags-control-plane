import assert from "node:assert/strict";
import test from "node:test";
import { FlagStore, stableBucket } from "../src/domain.js";
import { createApp } from "../src/server.js";

async function invoke(
  store: FlagStore,
  method: string,
  path: string,
  body?: object
): Promise<{ status: number; payload: any }> {
  const handler = createApp(store);
  const chunks: Buffer[] = [];
  const request = {
    method,
    url: path,
    [Symbol.asyncIterator]: async function* () {
      if (body) {
        yield Buffer.from(JSON.stringify(body));
      }
    },
  } as any;
  const response = {
    statusCode: 200,
    writeHead(statusCode: number) {
      this.statusCode = statusCode;
    },
    end(chunk?: string) {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
    },
  } as any;

  await handler(request, response);
  return {
    status: response.statusCode,
    payload: chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf-8")) : undefined,
  };
}

test("evaluates matching rules deterministically", async () => {
  const store = new FlagStore();
  await invoke(store, "POST", "/flags", { key: "new-dashboard", description: "gradual rollout", enabled: true });
  await invoke(store, "POST", "/flags/new-dashboard/rules", {
    environment: "prod",
    attribute: "plan",
    equals: "enterprise",
    rolloutPercent: 100,
  });

  const evaluation = await invoke(store, "POST", "/evaluate", {
    key: "new-dashboard",
    actorId: "acct-123",
    environment: "prod",
    attributes: { plan: "enterprise" },
  });

  assert.equal(evaluation.status, 200);
  assert.equal(evaluation.payload.data.enabled, true);
  assert.equal(stableBucket("acct-123:new-dashboard:prod") < 100, true);
});

test("returns disabled when no rule matches", async () => {
  const store = new FlagStore();
  await invoke(store, "POST", "/flags", { key: "search-v2", description: "beta", enabled: true });
  await invoke(store, "POST", "/flags/search-v2/rules", {
    environment: "prod",
    attribute: "country",
    equals: "US",
    rolloutPercent: 100,
  });

  const evaluation = await invoke(store, "POST", "/evaluate", {
    key: "search-v2",
    actorId: "acct-999",
    environment: "prod",
    attributes: { country: "CA" },
  });

  assert.equal(evaluation.payload.data.enabled, false);
  assert.equal(evaluation.payload.data.reason, "no_matching_rule");
});
