# Daymark — personal daily tracker

A light, responsive React + Vite + TypeScript frontend and Express + TypeScript API, backed by MongoDB Atlas. Includes private account setup and sign-in, activity creation/editing/archiving/restoring/deletion, a complete monthly checkbox grid, month navigation, today’s checklist, and V2 analytics with charts, comparisons, streaks, and filters.

**The V2 changes have not been run, built, or tested by the coding agent.** The commands below are for you to run when ready. V2 uses existing dependencies; it adds no charting or test packages.

## 1. Install dependencies

Use Node.js 22.12 or newer. From the repository root:

```powershell
npm install
```

The root uses npm workspaces; this installs both applications and the shared development runner. Commit the generated `package-lock.json` after installation. Package ranges are declared in the three `package.json` files; no lockfile has been generated.

## 2. Configure MongoDB Atlas

1. Create an Atlas cluster.
2. In Database Access, create a database user with read/write access to the `daily_tracker` database. These credentials are separate from your Atlas website login.
3. In Network Access, allow the IP address of the machine running the server. For deployment, allow the backend host’s outbound IP.
4. Choose **Connect → Drivers** and copy your `mongodb+srv://...` connection string.
5. Replace the username, password, and cluster host in `server/.env`. URL-encode special characters in the database username/password. Keep `/daily_tracker` before the query string.

Atlas supports the transactions used for checkbox saves and deletion. A standalone local MongoDB instance is insufficient; a local alternative must be configured as a replica set. Models and indexes are initialized when the server starts; no seed script is needed.

## 3. Add your environment values

From the repository root:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Edit `server/.env`:

| Variable | Your value |
| --- | --- |
| `MONGODB_URI` | Your Atlas driver connection string including `/daily_tracker` |
| `SESSION_SECRET` | A cryptographically random secret of at least 32 characters |
| `PERSONAL_EMAIL` | The one email allowed to create and use your account |
| `REGISTRATION_KEY` | A different random secret of at least 32 characters; entered once during account setup |
| `APP_ORIGIN` | `http://localhost:5173` for development; your public HTTPS origin in production |
| `PORT` | `4000` by default |
| `NODE_ENV` | `development` locally; `production` after building for deployment |
| `TRUST_PROXY` | `0` locally; `1` only if there is exactly one trusted reverse proxy in front of Express |

Generate each secret separately with this command:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not put any server secret or database URI in the client environment. Keep `VITE_API_URL=/api`; the client and API are designed to share one public origin. The server intentionally rejects the shipped placeholder secrets and URI.

## 4. Start development

From the root:

```powershell
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` to Express on port 4000. If you change the API port, update the proxy target in `client/vite.config.ts` too. Use the exact hostname and port in `APP_ORIGIN`; mixing `localhost` and `127.0.0.1` will reject write requests.

Select **First time here? Set up your account**. Enter your name, the configured `PERSONAL_EMAIL`, a non-empty password, and `REGISTRATION_KEY`. There are no password-specific length restrictions; the API's overall 16 KB JSON request size limit still applies. The browser’s IANA time zone is saved on your account. On subsequent visits, sign in with email and password. Account registration is restricted to the configured email, and a unique index prevents duplicate accounts.

## Calendar and activity behavior

- Every checkbox is a calendar date (`YYYY-MM-DD`), not a UTC timestamp. Months have their actual day count, including leap years.
- “Today” uses the time zone saved on your account, on both client and server. The page checks for a new day every 30 seconds and on window focus. Navigating to another month does not change the today checklist.
- Only today’s checkmarks can be changed, using the account time zone. Past days are read-only and future dates cannot be checked; the API enforces both restrictions. Dates before an activity’s start date show a dot. A new activity defaults to today; an earlier start date includes past days in totals but does not allow backfilling them. The start date cannot be edited afterward.
- The monthly grid scrolls horizontally on smaller screens, with activity names pinned. Manage controls follow the last day and progress column.
- Today’s percentage is completed active activities / eligible active activities today. Monthly completion is checked days / eligible days across active activities in the selected month, excluding future dates and days before the start date. A month with no eligible dates shows 0% overall and an em dash on rows with no eligible days.
- Archived activities disappear from active summaries and today’s list. The archive displays their saved history as read-only and allows editing details, restoring, or deleting. Archive row percentages use eligible dates through today; archiving is not a pause schedule. Restoring an activity allows today’s checkmark to be edited again; past dates remain read-only.
- Delete requires confirmation and permanently removes the activity and its checkmarks in one database transaction.
- Checkmarks update only after the server confirms the save. Failed requests show a visible error. For a connection failure after a write, use Refresh to confirm whether it reached the database. Refresh also loads changes from another browser tab.
- The account time zone is fixed. Reminders, email reports, and email password recovery remain outside this version. Unused scaffold files for future features are not exposed in the app.

## Authentication and API design

Passwords are salted and hashed with Node’s `scrypt`. Authentication uses server-side MongoDB sessions and an HttpOnly, SameSite=Strict cookie. Production cookies are Secure and require HTTPS. Sessions expire after seven days; signing out destroys the session. The session ID is regenerated after sign-in. Login and setup have request limits; all API endpoints have a general request limit. Limits use in-memory counters, appropriate for a single backend process; multiple replicas would need a shared rate-limit store.

All activity and record queries are scoped to the authenticated account. Inputs are validated with Zod. Mutations require a matching `Origin` header and JSON content type as a CSRF defense; there is no cross-origin API access. Helmet adds security headers. Responses containing API data use `Cache-Control: no-store`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Private account setup: `name`, `email`, `password`, `registrationKey`, `timeZone` |
| POST | `/api/auth/login` | Sign in: `email`, `password` |
| POST | `/api/auth/logout` | Destroy current session; send `{}` |
| GET | `/api/auth/me` | Current account |
| GET | `/api/activities` | All your activities, including archived |
| POST | `/api/activities` | Create: `name`, `description`, `color`, `startDate` |
| PUT | `/api/activities/:id` | Edit: `name`, `description`, `color` |
| PATCH | `/api/activities/:id/archive` | Archive/restore: `archived` boolean |
| DELETE | `/api/activities/:id` | Delete activity and history; send `{}` |
| GET | `/api/records?month=YYYY-MM` | Checked dates in one month |
| PUT | `/api/records` | Set checkbox: `activityId`, `date`, `completed` boolean |
| GET | `/api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD` | Analytics snapshot; optional `activityId` and `includeArchived=true` |

Colors: `violet`, `blue`, `green`, `orange`, `pink`. Only completed records are stored; an unchecked box is the absence of a record. A compound unique index prevents duplicate activity/date records. Record writes touch the parent activity within their transaction to coordinate concurrent archive/delete operations. API errors return `{ "message": "..." }`.

## Production

For a **Render backend and Vercel frontend**, follow [DEPLOYMENT.md](DEPLOYMENT.md). The repository includes deployment configuration for both. The instructions below describe the alternative where Express serves both applications.

Run these yourself after configuration:

```powershell
npm run build
```

Then set `NODE_ENV=production`, `APP_ORIGIN=https://your-domain.example`, production secrets and database access, and the appropriate `TRUST_PROXY` value in `server/.env`. Start with:

```powershell
npm start
```

Express serves `client/dist` and the API from the same origin. Put it behind HTTPS and preserve the browser Origin header. Do not expose a proxy-trusting Express server directly to arbitrary internet traffic. The font stylesheet uses Google Fonts with system-font fallbacks if unavailable.

## Suggested manual checks

These checks have **not** been performed:

1. Register with the correct setup key; reject wrong email/key and duplicate registration. Sign out/in and reload to confirm session persistence.
2. Create an activity, edit its name/color, and check/uncheck a date. Reload and verify the data persists.
3. Navigate between months including February 2028 (29 days), February 2027 (28 days), and December/January. Confirm today’s list remains on today.
4. Check that past dates, future dates, and dates before the start date cannot be written, including through the API. Confirm today can still be checked and unchecked, and that an open tab crossing midnight cannot change yesterday.
5. Archive/restore an activity and verify history remains; delete it and verify all its records disappear.
6. Confirm percentages with two activities having different start dates and with an empty/future month.
7. Try an expired session, an offline server, keyboard-only navigation, the dialog Escape key, and narrow mobile screens.
8. Run `npm run build` to check TypeScript and produce production assets, then verify the HTTPS deployment configuration.

## V2 analytics

Open **Analytics** in the sidebar. Set the date range and activity, then click **Apply filters**, or choose This month, Last month, Last 90 days, or Year to date. The maximum inclusive range is 366 days. Archived activities are excluded by default and can be included with the checkbox. Charts use SVG and CSS, with no external charting package.

- **Daily progress line:** completed / eligible activities for each calendar day. Gaps mean no eligible work. The expandable daily table provides exact counts and keyboard-accessible chart data.
- **Range completion and donut:** completed activity-days / eligible activity-days over the applied date range. The donut splits these into completed and unchecked; it does not count future days as missed.
- **Habit bars:** each selected activity's own completions / eligible days, with current and longest streaks limited to the range.
- **Heatmap:** one cell per date, arranged Sunday through Saturday. Shade encodes completion percentage, not raw record count. Hover, focus, or tap a date for exact counts. Dashed cells have no eligible work, and future cells are faded.
- **Month completion and comparison:** use the month containing the range's end date. A completed historical month compares against the full previous calendar month. The current month compares month-to-date with the same day numbers in the previous month, capped to that month's last day. These cards deliberately show calendar-month metrics separately from custom range totals. Future months have no eligible current data.
- **Percentage-point change:** difference between the two unrounded monthly ratios, rounded once to one decimal. A previous period with no eligible data yields no comparison, not a misleading improvement from zero.
- **Perfect-day streaks:** a successful day has at least one eligible activity and all eligible activities checked. Missed or ineligible days interrupt runs. Unfinished today preserves yesterday's run until the day ends. A range ending in the past has no grace day. Streaks are scoped to the selected range, not lifetime records.

An eligible activity-day is on/after the activity's start date and on/before today in the account time zone. Percentages are weighted by the number of eligible activity-days, not an average of daily percentages. Empty denominators show a dash; an eligible period with no completions shows 0%. Duplicate, orphan, future, and pre-start records do not count. Archived activity inclusion preserves V1 semantics: archive is a visibility/read-only state, not a historical pause schedule, so included archived activities remain eligible from their start date through today.

The analytics endpoint authenticates the session and scopes every database query to its owner. Activities and records are read sequentially in one MongoDB snapshot transaction. The server supplies all chart data in a single response, and the frontend does not recalculate chart totals independently. Navigating to Analytics fetches fresh data; Refresh insights, returning focus to the page, and the account date changing also reload the snapshot. Stale requests are aborted/ignored when filters change. The snapshot time is shown above the cards. Live updates from other tabs are visible after refreshing or refocusing, rather than being streamed continuously.

The response includes `summary`, `daily`, `habits`, `streaks`, `comparison`, available activity options, the applied filters, account time zone, and snapshot time. Date inputs must be valid `YYYY-MM-DD` values between 1900 and 2100. Invalid ranges return 400; an activity not available to the account/filter returns 404.

## V2 tests (written, not executed)

Run the unit suite from the repository root:

```powershell
npm test
```

This uses the existing `tsx` package and Node's built-in test runner. No database, .env, or app server is used. It covers leap-year and century rules, year/month boundaries, DST and time-zone dates, frontend/backend calendar agreement, streak interruptions and grace days, weighted totals, filters, orphan/duplicate/future records, comparison windows, rounding, and reconciliation between daily/habit/summary totals.

The optional integration suite reads/writes fixture records in a **dedicated test database on Atlas or a replica set**. Create a test database user with read/write access to that database, then set its URI in your terminal (use your actual URI, not the placeholder):

```powershell
$env:TEST_MONGODB_URI = 'mongodb+srv://TEST_USER:TEST_PASSWORD@YOUR_CLUSTER.mongodb.net/daily_tracker_test?retryWrites=true&w=majority'
npm run test:integration
Remove-Item Env:TEST_MONGODB_URI
```

Use the full Atlas-provided standard `mongodb://` URI if SRV DNS is unavailable. Keep the database name `daily_tracker_test` and preserve the generated TLS, replica-set, and authentication options. The integration suite does not read `server/.env`, refuses a database name without `test`, and deletes only its own randomly scoped fixture records afterward. It does not drop the database. Without `TEST_MONGODB_URI`, it reports a skipped test. The suite checks persisted counts, ownership isolation, filtering, and the effect of saves, unchecking, and deletion on the analytics service.

For a manual end-to-end check, create two activities with different start dates and check today’s activities. Open Analytics for that exact date range, reconcile the daily table with the grid, then filter each activity and include/exclude archived activities. Repeat after editing checkmarks and after deleting an activity. Build and browser validation still need to be performed.
