# Deploy: profile verification failure

The reported Vietnamese error is emitted only after `User/profile` returns an unsuccessful HTTP response other than 401/403. The original log omits that status, so it cannot identify the underlying backend/configuration failure. It is not evidence of a frontend layout defect. Network errors/timeouts previously threw a different fetch error.

Public checks on 2026-10-06: `https://admin.bbookmakeup.com/login` returned 200; `https://beautybook-13zj.onrender.com/api/User/profile` returned 401 without credentials. These checks do not establish which backend URL Render uses, or whether an authenticated profile request succeeds.

## Changes

- Shared profile verification for protected pages and login. 401 means invalid session; 403/non-admin means forbidden; other statuses, connection failures and malformed successful responses mean verification unavailable.
- Protected pages display a retry screen when verification is unavailable. Keep the cookie; render no Admin data; validate with the backend again on retry. No JWT-only fallback, auth bypass or automatically repeated requests.
- Login no longer labels backend 5xx/404 as lack of Admin permissions; no session cookie is created until profile verification succeeds.
- Server logs `[admin-session] Profile verification unavailable` with only `reason` and `status`. Never include token, credentials, upstream URL/body or personal data.

## Production configuration and diagnosis

Set these server environment variables on the Admin service (not NEXT_PUBLIC variables):

```
BACKEND_API_URL=https://beautybook-13zj.onrender.com/api
APP_ORIGIN=https://admin.bbookmakeup.com
```

Use the actual deployed backend URL if it differs. Do not use localhost on Render; include `/api` exactly once; use the final HTTPS endpoint without redirects. APP_ORIGIN must match the browser's intended primary origin. A secondary Render domain cannot submit login/mutations while APP_ORIGIN is pinned to the custom domain; use the primary domain.

After deploying the patch, inspect the new log and backend logs at the same timestamp:

| reason/status | Next action |
| --- | --- |
| http / 404 | Verify base URL, `/api`, and deployed UserController route. With the correct route, backend can also return 404 for a missing user; verify the account exists in the intended database. Do not automatically invalidate all 404 sessions. |
| http / 429 | Check upstream rate limiting; retry after the applicable delay. |
| http / 500 | Inspect backend exception and database connectivity/schema. Apply only migrations actually required by the deployed backend; do not reset the database or infer missing migrations from this frontend log alone. |
| http / 502,503,504 | Check backend service health, deploy/restart events and reverse proxy availability. |
| connection / null | Check configured URL, DNS/TLS/reachability and the existing 20-second request timeout. Configuration errors also fall into this category. |
| invalid-json or invalid-profile | Check backend DTO contract and whether a proxy returned HTML/another success payload. |

401 redirects to login; 403 goes to access-denied as before. Do not disable Secure cookies, Origin validation or authorization to work around the failure. No production settings, production data or remote deployment were changed by this patch.

## Verification limits

Unit tests exercise valid Admin profiles, 401, 403, non-admin roles, 404/429/5xx, connection errors and malformed responses. An authenticated production request and root backend diagnosis still require the deployed environment values and corresponding backend logs; no production credentials were requested or used.

Validation passed: TypeScript, ESLint, 35 tests, production build and git diff whitespace checks. Browser verification used the existing isolated local backend and existing test session: an intentionally nonexistent local route returned real HTTP 404, the retry screen rendered, Retry entered its pending state, and server diagnostics reported only `reason: http, status: 404`. Restoring the correct local base URL and clicking Retry returned to `/styles` using the original cookie without a new login. No business records were changed. This is a local recovery check, not a verified fix of the production backend failure.
