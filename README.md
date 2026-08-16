# LUM NG — Admin Dashboard

Standalone admin app for LUM NG. This is a **separate deployable frontend** from the storefront (`../frontend`) — it has its own `package.json`, its own build, and can be deployed to its own host/subdomain. The only thing it shares with the storefront is the backend API.

## Why separate?

- **Independent deploys** — ship an admin fix without rebuilding/redeploying the storefront, and vice versa.
- **Independent scaling** — the admin panel gets a handful of internal users; the storefront gets real customer traffic. No reason to bundle them.
- **Smaller, safer storefront bundle** — the public-facing app no longer ships admin code (dashboard UI, product forms, etc.) that customers never touch.
- **Real access control at the network layer, if you want it** — since it's a separate host, you can put it behind a VPN, IP allowlist, or a different auth layer entirely, independent of the storefront's public hosting.

## Setup

```bash
npm install
cp .env.example .env
# edit .env — VITE_API_URL should point at your backend deployment
npm run dev      # → http://localhost:5174
```

## Auth

Login calls the real backend (`POST /auth/login`), which returns a JWT. That token is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every request (see `src/api/index.js`). There's no hardcoded fallback password — if the backend rejects the credentials, login fails. If a token expires or is rejected mid-session, the API client automatically clears it and redirects to `/login`.


## Data

Everything in this app — products, orders, and site content (hero copy, testimonials, SEO, etc.) — is read from and written to the real backend. Nothing is stored locally beyond the JWT itself, so a fresh browser/device pointed at the same `VITE_API_URL` sees the exact same data.

## Deploying

Build with `npm run build`, deploy the `dist/` folder to any static host (Vercel, Netlify, S3+CloudFront, etc.), and set `VITE_API_URL` (and optionally `VITE_STOREFRONT_URL`, used only for the "View Site" links) as build-time environment variables. Make sure the backend's CORS config allows requests from wherever this ends up hosted.
