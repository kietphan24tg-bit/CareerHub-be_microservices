# Auth Live Verification

## Scope

Current live verification focuses on the flows that already run end-to-end without test-only failure hooks:

- candidate register -> login -> me -> profile get/update -> refresh -> logout
- employer register -> login -> me -> profile get/update -> refresh -> logout
- forgot-password returns a generic accepted response for unknown email
- candidate password reset through MailHog
- employer password reset through MailHog
- reset token is one-time use only

The live E2E entry point is:

```bash
MAILHOG_API_BASE_URL=http://127.0.0.1:8025 pnpm test:password-reset:e2e
```

The current implementation lives in:

- [auth.live.e2e.spec.ts](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/services/gateway/src/presentation/http/tests/auth.live.e2e.spec.ts)
- [auth-smoke.ps1](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/scripts/auth-smoke.ps1)

## Password Reset Expectations

Expected behavior in live verification:

1. `POST /auth/forgot-password` returns success even when the email does not exist.
2. A known email receives a reset mail in MailHog.
3. `POST /auth/reset-password` accepts the token once.
4. Reusing the same token fails with `VALIDATION_ERROR`.
5. Login with the old password fails.
6. Login with the new password succeeds.

## Compensation Status

Registration compensation is implemented in the gateway orchestration layer and covered by unit/service tests:

- profile creation fails -> cancel pending IAM identity
- activation fails after profile creation -> delete downstream profile + cancel pending IAM identity
- retry-like cases are tolerated:
  - profile already exists
  - identity already active
  - compensation call failure keeps the original business error

Relevant files:

- [gateway-auth.service.ts](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/services/gateway/src/application/gateway-auth.service.ts)
- [gateway-auth.service.spec.ts](/d:/Workspace/Microservices/CareerHub/CareerHub-be-microservices/services/gateway/src/application/gateway-auth.service.spec.ts)

There is no dedicated live fail-injection hook yet for forcing downstream compensation paths in E2E. If full live compensation verification becomes necessary, add a small test-only failure hook instead of overloading production code paths.
