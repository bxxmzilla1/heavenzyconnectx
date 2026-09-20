# Connect Pages

A small Next.js app that gives you shareable pages (`https://yourdomain.com/<slug>`), each with one big **Connect Instagram** button. When a visitor connects, the app:

1. creates a new team in your [bundle.social](https://bundle.social) organization,
2. sends the visitor through bundle.social's Instagram OAuth flow,
3. renames that team to the connected Instagram username.

Pages can be protected with their own passcode, and the admin area is protected with a password (`ADMIN_PASSWORD` env var). Everything is stored in Supabase.

## Stack

- Next.js 16 (App Router, server actions, Node runtime) + Tailwind CSS 4
- Supabase (Postgres) via the service-role key, server-side only
- bundle.social REST API (`x-api-key`)
- Deploys to Vercel with zero config

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.
3. In **Project Settings → API** copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY`

Row-level security is enabled on every table with no policies, so the anon/public key cannot read anything. The app only ever uses the service-role key on the server.

## 2. Environment variables

Copy `.env.example` to `.env.local` for local development and set the same values in Vercel.

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase service-role key (server only) |
| `ADMIN_PASSWORD` | yes | Password to open `/admin` |
| `SESSION_SECRET` | yes | Random string used to sign session cookies |
| `ENCRYPTION_KEY` | yes | Random string used to encrypt the bundle.social API key at rest |
| `NEXT_PUBLIC_SITE_URL` | no | Public origin, e.g. `https://connect.yourdomain.com`. Derived from the request when omitted. |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in with `ADMIN_PASSWORD`, then go to **Settings** and paste your bundle.social API key (created in the bundle.social dashboard under *API Keys*). The key is verified against the API before it is saved.

## 4. Deploy to Vercel

1. Push this repository to GitHub:

   ```bash
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```

2. In Vercel, **Add New → Project**, import the repo. The Next.js preset is detected automatically.
3. Add the environment variables from the table above under **Settings → Environment Variables**.
4. Deploy. Then add your custom domain under **Settings → Domains**. Pages will be reachable at `https://yourdomain.com/<slug>`.

No `vercel.json` is needed. All routes run on the Node.js runtime; the admin gate runs in the proxy (`src/proxy.ts`).

## How it works

```
/admin                 pages list + create form (admin password)
/admin/pages/[id]      edit title/slug, set/remove passcode, delete, connection history
/admin/settings        bundle.social API key (encrypted), Instagram connection options
/login                 admin password
/[slug]                public page: optional passcode wall → big Connect button
/api/connect/start     POST { slug } → creates a placeholder team, returns bundle.social OAuth URL
/api/connect/callback  bundle.social redirects here → reads the Instagram account → renames team
/api/connect/choose    POST { connectionId, channelId } → picks an account when several are available
```

### Connection flow in detail

1. Visitor clicks **Connect**. The server creates a bundle.social team named `Pending · <slug> · xxxx` and stores a `connections` row with status `pending`.
2. The server calls `POST /api/v1/social-account/connect` with `type: "INSTAGRAM"`, that `teamId`, and `redirectUrl = <site>/api/connect/callback?c=<connectionId>`. The visitor is redirected to the returned OAuth URL.
3. bundle.social redirects back to the callback. The server fetches the team's Instagram account (`GET /api/v1/social-account/by-type`).
   - Account present → team is renamed to the Instagram username (`PATCH /api/v1/team/{id}`), row becomes `connected`.
   - **Instagram via Facebook** with several Instagram accounts → row becomes `needs_channel` and the visitor picks one; the app calls `set-channel`, then renames the team.
   - No account → row becomes `failed`, the empty placeholder team is deleted, and the visitor sees a friendly error.

### Instagram connection methods (Settings)

- **Direct Instagram login** (default): visitor logs in with Instagram and picks the account during OAuth. No channel selection needed.
- **Instagram via Facebook login**: required for Facebook-backed features (comments, insights, audio search). May require picking an account after login.

## Security notes

- Admin and page sessions are HMAC-signed, HttpOnly cookies (`SESSION_SECRET`).
- Page passcodes are hashed with scrypt; the admin password is compared in constant time.
- The bundle.social API key is stored AES-256-GCM encrypted (`ENCRYPTION_KEY`) and only decrypted server-side.
- All pages send `noindex`.
