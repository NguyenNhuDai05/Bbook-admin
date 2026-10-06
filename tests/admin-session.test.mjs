import test from "node:test";
import assert from "node:assert/strict";
import {
  readAdminProfile,
  AuthorizationError,
  SessionUnavailableError,
} from "../src/lib/admin-session.mjs";

const admin = {
  userId: "admin-id",
  fullName: "Admin",
  email: "admin@example.test",
  role: "Admin",
};
test("session: 401 expires session; 403 and non-admin deny access", async () => {
  assert.equal(
    await readAdminProfile(async () => new Response(null, { status: 401 })),
    null,
  );
  await assert.rejects(
    readAdminProfile(async () => new Response(null, { status: 403 })),
    AuthorizationError,
  );
  await assert.rejects(
    readAdminProfile(async () => Response.json({ ...admin, role: "Customer" })),
    AuthorizationError,
  );
});
test("session: upstream failure is recoverable, never mistaken for unauthenticated or forbidden", async () => {
  for (const status of [404, 429, 500, 502, 503, 504]) {
    await assert.rejects(
      readAdminProfile(
        async () => new Response("private upstream body", { status }),
      ),
      (error) =>
        error instanceof SessionUnavailableError &&
        error.status === status &&
        !error.message.includes("private"),
    );
  }
  await assert.rejects(
    readAdminProfile(async () => {
      throw new Error("secret connection detail");
    }),
    (error) =>
      error instanceof SessionUnavailableError &&
      error.reason === "connection" &&
      !error.message.includes("secret"),
  );
});
test("session: malformed successful responses do not admit access", async () => {
  for (const body of [null, {}, { role: "Admin" }, { ...admin, role: null }])
    await assert.rejects(
      readAdminProfile(async () => Response.json(body)),
      SessionUnavailableError,
    );
  await assert.rejects(
    readAdminProfile(async () => new Response("<html>proxy</html>")),
    SessionUnavailableError,
  );
  assert.deepEqual(
    await readAdminProfile(async () => Response.json(admin)),
    admin,
  );
});
