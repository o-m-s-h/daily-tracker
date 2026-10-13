# Daymark — personal daily tracker

A light, responsive React + Vite + TypeScript frontend and Express + TypeScript API, backed by MongoDB Atlas. V1 includes private account setup and sign-in, activity creation/editing/archiving/restoring/deletion, a complete monthly checkbox grid, month navigation, today’s checklist, and completion percentages.

**Packages have not been installed, and the application, builds, and tests have not been run.** The commands below are for you to run when ready.

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
- Future dates are visible but cannot be checked. Dates before an activity’s start date show a dot. A new activity defaults to today; choose an earlier start date to backfill history. The start date cannot be edited afterward.
- The monthly grid scrolls horizontally on smaller screens, with activity names pinned. Manage controls follow the last day and progress column.
- Today’s percentage is completed active activities / eligible active activities today. Monthly completion is checked days / eligible days across active activities in the selected month, excluding future dates and days before the start date. A month with no eligible dates shows 0% overall and an em dash on rows with no eligible days.
- Archived activities disappear from active summaries and today’s list. The archive displays their saved history as read-only and allows editing details, restoring, or deleting. Archive row percentages use eligible dates through today; archiving is not a pause schedule. Restoring an activity makes its past dates editable again.
- Delete requires confirmation and permanently removes the activity and its checkmarks in one database transaction.
- Checkmarks update only after the server confirms the save. Failed requests show a visible error. For a connection failure after a write, use Refresh to confirm whether it reached the database. Refresh also loads changes from another browser tab.
- The account time zone is fixed in V1. There are no reminders, reports, advanced analytics, or email password recovery in this version. Empty files for those later features were already present in the scaffold and are not imported or exposed in the app.

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

Colors: `violet`, `blue`, `green`, `orange`, `pink`. Only completed records are stored; an unchecked box is the absence of a record. A compound unique index prevents duplicate activity/date records. Record writes touch the parent activity within their transaction to coordinate concurrent archive/delete operations. API errors return `{ "message": "..." }`.

## Production

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
4. Check that future dates and dates before the start date cannot be written, including through the API.
5. Archive/restore an activity and verify history remains; delete it and verify all its records disappear.
6. Confirm percentages with two activities having different start dates and with an empty/future month.
7. Try an expired session, an offline server, keyboard-only navigation, the dialog Escape key, and narrow mobile screens.
8. Run `npm run build` to check TypeScript and produce production assets, then verify the HTTPS deployment configuration.
