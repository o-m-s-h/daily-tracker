# Deploy Daymark: Render API + Vercel frontend

The repository includes `render.yaml` and `vercel.json`. Replace the Render hostname in `vercel.json` before the final frontend deployment. No deployment, installation, build, or tests have been run by the coding agent.

The browser calls `/api` on your Vercel domain. Vercel proxies that path to Render. Cookies remain on the Vercel domain, so the existing HttpOnly/Secure/SameSite=Strict session setup can work without cross-site cookies or CORS changes. MongoDB Atlas stores both your application data and sessions.

## 1. Prepare the repository

- Push the code and root `package-lock.json` to the Git repository you will connect to both services. Run `npm install` locally if you need to generate or synchronize that lockfile.
- Keep real credentials in local `.env` files and hosting environment settings. If you have `.env.example` files, keep only placeholders in them.
- Use the **repository root** for both deployments. Do not set either project's Root Directory to `client` or `server`. The npm workspace lockfile lives at the root, and the client imports an analytics type contract from the server source.

## 2. Create the Render backend

In Render, choose **New → Web Service**, connect the repository, and use:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root Directory | Leave blank (repository root) |
| Build Command | `npm ci --include=dev && npm run build -w server` |
| Start Command | `npm run start -w server` |
| Health Check Path | `/healthz` |

Alternatively, create a Render Blueprint using the root `render.yaml`; it declares the same service and prompts for the private values. The Blueprint requests a free instance. Choose your desired instance type in Render if using the manual flow.

Add these environment variables in Render's Environment settings. Enter values without surrounding quotes:

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.x` |
| `SERVE_CLIENT` | `false` |
| `TRUST_PROXY` | `1` |
| `APP_ORIGIN` | Your final frontend origin, e.g. `https://your-daymark.vercel.app` |
| `MONGODB_URI` | Your Atlas URI with the correct credentials and `/daily_tracker` database |
| `PERSONAL_EMAIL` | The email allowed to sign in/register |
| `SESSION_SECRET` | A private random value of at least 32 characters |
| `REGISTRATION_KEY` | A separate private random value of at least 32 characters |

Render supplies `PORT`; leave it unset. The server binds to `0.0.0.0`. Development dependencies are explicitly included during the build so TypeScript is available even with `NODE_ENV=production`.

If you do not yet know your Vercel URL, use `https://frontend-not-configured.invalid` temporarily for `APP_ORIGIN`. This allows backend startup and health checks while intentionally rejecting browser writes. Replace it with the exact production Vercel origin after creating the frontend. Do not include a path such as `/api`.

If creating the Render service manually, generate each secret separately on your machine:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The Blueprint generates both secrets automatically. If you reuse the same Atlas database as local development, your existing account and activities remain; sign in with the existing app password. Changing `REGISTRATION_KEY` does not change that password. Use the same `PERSONAL_EMAIL` as the existing account.

## 3. Allow Render to reach Atlas

Open the Render service's **Connect → Outbound** view and copy its outbound IP ranges. Add those ranges to the Atlas project's **Network Access** IP access list. Your laptop's allowed IP does not cover Render.

Use the full Atlas-provided connection string. Either SRV (`mongodb+srv://`) or standard (`mongodb://`) is supported. With the standard URI, preserve all node addresses and the generated `ssl`, `replicaSet`, and `authSource` options; keep `/daily_tracker` before `?`. The database user's password must be URL-encoded when it contains reserved URI characters.

Redeploy after configuration. Once healthy, opening `https://YOUR_RENDER_SERVICE.onrender.com/healthz` should return:

```json
{ "status": "ok" }
```

This endpoint checks the database connection state and bypasses authentication. The bare backend `/` URL is not a frontend page when `SERVE_CLIENT=false`.

## 4. Point Vercel at Render

Edit the root `vercel.json`. Replace just `REPLACE_RENDER_SERVICE` with the actual hostname prefix shown by Render:

```json
"destination": "https://YOUR_RENDER_SERVICE.onrender.com/api/:path*"
```

Keep `/api/:path*` at the end and keep this rewrite before the SPA fallback. Use the actual public URL from Render, which may differ from the requested service name. Commit and push this file.

The rewrite destination is literal configuration. Setting a Vercel environment variable does not substitute the placeholder in `vercel.json`.

## 5. Create the Vercel frontend

In Vercel, choose **Add New → Project**, import the same repository, and use:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | Repository root (`./`) |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build -w client` |
| Output Directory | `client/dist` |
| Node.js Version | 22.x |

The checked-in `vercel.json` supplies the install/build/output settings. If Vercel suggests the `client` subdirectory, override it to the repository root.

Add one frontend environment variable for Production:

```env
VITE_API_URL=/api
```

Keep this relative path. Setting it to the Render URL would bypass the proxy and break this same-origin cookie arrangement. Do not add your MongoDB URI, session secret, or registration key to Vercel or to any `VITE_*` variable.

Deploy the frontend. Copy its stable production URL, such as `https://your-daymark.vercel.app`, into Render's `APP_ORIGIN`, then save/redeploy the backend. Use that stable URL to sign in. Unique preview deployment URLs are deliberately not authorized by the production backend. Changing to a custom domain also requires updating `APP_ORIGIN` and signing in on the new domain.

## 6. Verify the deployment yourself

1. Open Render's `/healthz` and confirm it returns `status: ok`.
2. Open the stable Vercel production URL and sign in (or set up the account using Render's registration key if this database has no account).
3. In browser DevTools → Network, authentication requests should use `https://YOUR_FRONTEND/api/auth/...`, not the Render domain directly.
4. Reload the page and confirm you remain signed in. Add/check an activity, reload, and open Analytics to verify persistence.
5. Sign out, then confirm protected data is no longer accessible.

If a request fails:

| Symptom | Check |
| --- | --- |
| Vercel build cannot find the shared analytics types | Root Directory must be the repository root, not `client` |
| `npm ci` fails | Commit an up-to-date root `package-lock.json` matching the manifests |
| `tsc` is missing on Render | The build command must include `npm ci --include=dev` |
| API returns HTML, 502, or 504 | Replace the rewrite hostname, check Render startup logs and `/healthz`, then retry if a free service is waking up |
| `Request origin or content type is not allowed` | `APP_ORIGIN` must exactly match the frontend origin used in the browser; use the production URL |
| Login works but the next request is unauthorized | Keep `VITE_API_URL=/api`, use HTTPS, set `TRUST_PROXY=1` on Render, and inspect whether the login response sets `daymark.sid` |
| MongoDB connection fails | Check the database credentials, database user permissions, and Render outbound IP ranges in Atlas |

The current API uses process-local rate limits and is intended for one backend instance. `TRUST_PROXY=1` trusts Render's nearest proxy; with Vercel in front, the reported client IP may be a Vercel proxy address, so limits can be shared across requests. Keep this setting scoped to the hosted Render service rather than enabling it on a publicly exposed standalone server.

Render free services can spin down when idle; the first request after inactivity can be slow or time out. If a startup request fails, retry once Render is awake. The app already provides retry actions.

Official references: [Render Express deployment](https://render.com/docs/deploy-node-express-app), [Render Node versions](https://render.com/docs/node-version), [Render outbound IPs](https://render.com/docs/outbound-ip-addresses), [Vercel external rewrites](https://vercel.com/docs/routing/rewrites), [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json).
