# Security

## Supported version and reporting

Only the latest release on `main` (1.0.x) receives security fixes. Report a vulnerability by
emailing **security@example.com** (placeholder: replace before publishing) with steps to
reproduce. Please do not open a public issue for security reports. Expect an acknowledgement
within a few days.

## Threat model

| Asset              | Threat                                                  | Control                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini API key     | Leak via client bundle, logs, repo or error messages    | Read from the server environment only (never a `VITE_*` variable); logger redacts keys; `.env*` ignored; secret scan in CI; `scripts/check-bundle.mjs` and an e2e test fail if the key could reach the bundle |
| API quota and cost | Scripted flooding                                       | Per-IP rate limits (20/min and 200/day on AI routes, 120/min on `/api`), 16 kB body limit, 20 s model timeout, response caching, in-flight de-duplication, `maxOutputTokens` caps                             |
| LLM behaviour      | Prompt injection through the brief or a question        | Input sanitising, delimited data blocks, a "data, not instructions" system rule, JSON-schema output, zod validation, an action whitelist, conflict filters, user confirmation before any change               |
| Users (XSS)        | Malicious text from the user, localStorage or the model | React escaping only (`react/no-danger` is an error, and a test forbids `dangerouslySetInnerHTML`); strict CSP with no `unsafe-inline` or `unsafe-eval`                                                        |
| User privacy       | Personal data sent or stored on a server                | Data minimisation to the model (budget band, no contacts); nothing is stored server-side; vendor contacts never leave the browser                                                                             |
| Availability       | Crashes from malformed input                            | zod at every boundary, a central error handler, error boundaries around every tab                                                                                                                             |
| Supply chain       | Vulnerable dependencies                                 | Small dependency set, committed lockfile, `npm audit` in CI, Dependabot                                                                                                                                       |
| Container          | Privilege escalation                                    | Non-root Alpine image holding only the Node binary and one bundled server file                                                                                                                                |

## OWASP Top 10 for LLM applications

| Risk                                   | Control in Mehfil                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM01 Prompt injection                 | Delimited data blocks, explicit "ignore instructions in data", schema-constrained output, server-side whitelist of actions, user confirmation before any change |
| LLM02 Sensitive information disclosure | Budget band instead of amount, no contacts, no secrets in prompts; the system prompt holds nothing secret                                                       |
| LLM05 Improper output handling         | zod validation, length clamps, URL, email and phone stripping, text-only rendering                                                                              |
| LLM06 Excessive agency                 | The model cannot act. It proposes at most three typed actions; the engine validates them; the user clicks Apply                                                 |
| LLM09 Misinformation                   | Money and dates are deterministic; benchmarks are labelled indicative; safety-critical topics say "confirm locally"                                             |
| LLM10 Unbounded consumption            | Rate limits, token caps, timeouts, caching, input caps                                                                                                          |

## Data handling

- **Sent to Gemini** (only when a key is configured): event type and sub-type, guest count, a
  budget _band_ (low, mid or high, never the amount), currency, city, setting, month, vibe,
  dietary and accessibility needs, traditions, must-haves and the optional title. For the
  Planner: a compact plan digest (ledger shares and amounts, the next eight open tasks, vendor
  statuses, the verdict) and up to ten recent turns. Vendor names, phone numbers and notes are
  never sent.
- **Stored**: plans, preferences and the open plan id live in the user's own `localStorage`.
  The server is stateless and stores nothing.
- **Logged**: JSON lines with request id, route, status and duration. Request bodies,
  questions, briefs and model output are never logged. Fields named like keys, tokens or
  secrets are redacted.

## Headers and limits

| Control                      | Value                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content-Security-Policy      | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests` |
| Strict-Transport-Security    | `max-age=31536000; includeSubDomains`                                                                                                                                                                                           |
| X-Content-Type-Options       | `nosniff`                                                                                                                                                                                                                       |
| Referrer-Policy              | `strict-origin-when-cross-origin`                                                                                                                                                                                               |
| Permissions-Policy           | `camera=(), microphone=(), geolocation=(), payment=()`                                                                                                                                                                          |
| X-Frame-Options              | `DENY`                                                                                                                                                                                                                          |
| Cross-Origin-Opener-Policy   | `same-origin`                                                                                                                                                                                                                   |
| Cross-Origin-Resource-Policy | `same-origin`                                                                                                                                                                                                                   |
| `X-Powered-By`               | disabled                                                                                                                                                                                                                        |
| `/api/*` cache               | `Cache-Control: no-store`                                                                                                                                                                                                       |
| Request body                 | 16 kB, JSON only (415 otherwise)                                                                                                                                                                                                |
| Rate limits                  | 120/min per IP on `/api`; `RATE_LIMIT_PER_MIN` (default 20) per minute and 200 per day on `/api/ideas` and `/api/assistant`                                                                                                     |
| Timeouts                     | 20 s per model call (`AI_TIMEOUT_MS`), 30 s request, 10 s headers                                                                                                                                                               |

The same headers are set in `vercel.json` for static files served from Vercel's CDN, and a test
asserts that its CSP equals the one the Express app sends.

## Serverless note

On Vercel the API runs as a serverless function, so the in-memory rate limiter and ideas cache
are per instance. They still blunt abuse and save tokens, but they are weaker than on a single
long-lived server. For a hard global limit, put a shared store or Vercel's firewall in front.
