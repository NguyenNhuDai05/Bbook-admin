import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as policy from "../src/lib/policy.mjs";
import * as errors from "../src/lib/login-errors.mjs";

test("login rate limit preserves seconds/date Retry-After and safely handles missing headers", () => {
  assert.equal(
    errors.retryAfterSeconds(new Headers({ "Retry-After": "75" })),
    75,
  );
  const now = Date.parse("2026-11-04T00:00:00Z");
  assert.equal(
    errors.retryAfterSeconds(
      new Headers({ "Retry-After": "Wed, 04 Nov 2026 00:02:00 GMT" }),
      null,
      now,
    ),
    120,
  );
  assert.equal(
    errors.retryAfterSeconds(new Headers(), { retryAfterSeconds: 90 }),
    90,
  );
  for (const value of ["garbage", "-1", "0"])
    assert.equal(
      errors.retryAfterSeconds(new Headers({ "Retry-After": value })),
      60,
    );
  assert.equal(
    errors.loginFailure(401, new Headers()).payload.message,
    "Email hoặc mật khẩu không chính xác.",
  );
});

function route(status, headers = {}) {
  let calls = 0;
  let cookieWrites = 0;
  const compiled = ts.transpileModule(
    readFileSync(
      new URL("../src/app/api/session/route.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const target = { exports: {} };
  const mocks = {
    "next/server": {
      NextResponse: { json: (data, init) => Response.json(data, init) },
    },
    "next/headers": {
      cookies: async () => ({
        set: () => {
          cookieWrites++;
        },
      }),
    },
    "@/lib/policy.mjs": policy,
    "@/lib/login-errors.mjs": errors,
    "@/lib/server": {
      requestOrigin: () => "https://admin.example",
      upstream: async () => {
        calls++;
        return new Response("private upstream content", { status, headers });
      },
      AuthorizationError: class extends Error {},
    },
  };
  vm.runInNewContext(compiled, {
    exports: target.exports,
    module: target,
    require: (name) => {
      if (!(name in mocks)) throw new Error(name);
      return mocks[name];
    },
    process: { env: { NODE_ENV: "production" } },
  });
  return {
    post: (body) =>
      target.exports.POST(
        new Request("https://admin.example/api/session", {
          method: "POST",
          headers: {
            Origin: "https://admin.example",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
      ),
    counts: () => ({ calls, cookieWrites }),
  };
}

test("session POST propagates 429 cooldown without creating a cookie or leaking upstream content", async () => {
  const handler = route(429, { "Retry-After": "87" });
  const response = await handler.post({
    email: "synthetic@example.invalid",
    password: "synthetic",
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "87");
  const body = await response.json();
  assert.equal(body.retryAfterSeconds, 87);
  assert.equal(body.code, "LOGIN_RATE_LIMITED");
  assert.doesNotMatch(JSON.stringify(body), /private|synthetic/);
  assert.equal(handler.counts().cookieWrites, 0);
});

test("session POST keeps wrong credentials distinct and rejects null input before contacting backend", async () => {
  const invalid = route(401);
  assert.equal((await invalid.post(null)).status, 400);
  assert.equal(invalid.counts().calls, 0);
  const badCredentials = await invalid.post({
    email: "synthetic@example.invalid",
    password: "synthetic",
  });
  assert.equal(badCredentials.status, 401);
  assert.equal(
    (await badCredentials.json()).message,
    "Email hoặc mật khẩu không chính xác.",
  );
});
