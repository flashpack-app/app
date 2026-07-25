# Security Policy  
  
## Supported Versions  
  
flash. is under active development. Only the latest release on the `main`  
branch receives security fixes.  
  
| Version | Supported |  
| ------- | --------- |  
| latest (`main`) | :white_check_mark: |  
| older builds    | :x: |  
  
## Reporting a Vulnerability  
  
**Please do not open a public GitHub issue for security vulnerabilities.**  
  
If you discover a security issue, report it privately:  
  
- Email: **security@flash.app** (or **support@flash.app**)  
- Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)  
  on this repository.  
  
Please include:  
- A description of the vulnerability and its impact.  
- Steps to reproduce (proof-of-concept if possible).  
- Affected version / commit and platform (iOS / Android).  
  
We will acknowledge your report, investigate, and keep you updated on the fix.  
Please give us reasonable time to remediate before any public disclosure.  
  
## Scope  
  
This repository (`flashpack-app/app`) contains the Expo / React Native client  
and configuration. The backend runs from a separate private repository  
(`flashpack-app/server`) linked here as a submodule. Vulnerabilities in either  
the client or the server are in scope.  
  
## Known Security Considerations  
  
These are intentional, documented characteristics of the current build — please  
factor them into any report:  
  
- **Bearer tokens are currently the user UUID, not signed JWTs.** The client  
  sends `Authorization: Bearer <token>` on every request, and the token is the  
  user id. Migrating to signed/expiring tokens is planned before public launch.  
- **Session storage is unencrypted.** The session (`token` + `user`) is  
  persisted in `AsyncStorage` under `flash.session.v1`, which is not encrypted  
  at rest.  
- **Auth is OTP-based (phone / email).** There is no password; account access  
  depends on OTP delivery. OTP has expiry and attempt limits.  
- **Content moderation.** Photo uploads and comments run through ML moderation  
  (OpenAI `omni-moderation-latest`). Behavior on API failure is controlled by  
  `MODERATION_FAIL_CLOSED`.  
- **Screenshot protection is best-effort.** Screenshots are blocked  
  (`FLAG_SECURE` on Android) and/or detected on some surfaces; this is a  
  deterrent, not a guarantee.  
  
## Secrets & Configuration  
  
- Never commit secrets. All keys/DSNs (`OPENAI_API_KEY`, `RESEND_API_KEY`,  
  `REDIS_URL`, `DATABASE_URL`, Sentry/PostHog keys, etc.) must come from  
  environment variables.  
- `.env` files are gitignored and must stay that way. If a secret is ever  
  committed, rotate it immediately.  
  
## Our Commitment  
  
- We will respond to valid reports and work on a fix as a priority.  
- We will credit reporters who wish to be acknowledged, once a fix ships.
