# WEB v1.7.0

**Released:** November 07, 2026
**Feature:** Rate-limit abuse notice on the home page

## Changes

- Added `AbuseNoticeBanner` to the home page: a dismissible fair-use notice
  explaining that automated bulk collection, AI training crawls and repeated
  calls to the simulation/Ask Me endpoints are rate-limited, with a link to
  the usage policy on `/about`. Dismissal is stored in `localStorage`.
- `robots.txt` tightened: disallows `/api/proxy`, `/docs`, `/openapi.json`,
  `/redoc`, `/scalar/`, `/conversation`, `/house-keeping/`, `/releases/` and
  `/qrcode`; blocks GPTBot, CCBot, ClaudeBot, Bytespider, Amazonbot and
  Google-Extended.
- 76 web tests pass, lint 0 errors, tsc clean, production build OK.
