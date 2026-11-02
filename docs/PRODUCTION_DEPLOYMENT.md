# Mahadev Mechanical Car Garage — Production Deployment Guide

This guide describes the complete, step-by-step production deployment workflow for **Mahadev Mechanical Car Garage**.

---

## 1. Production Architecture Overview

The system runs on a modern, decoupled cloud architecture designed for high availability, zero cold-start latency on client assets, and strict security isolation:

```
[ Customer & Admin Browsers ]
             │
             ├─────────────────────────────────────────┐
             │ HTTPS                                   │ HTTPS + HttpOnly Cookies
             ▼                                         ▼
   [ Vercel CDN Edge ]                      [ Render Web Service ]
  Static Assets & React SPA                 Node.js / Express Backend
 (www.mahadevgarage.com)                   (api.mahadevgarage.com)
             │                                         │
             │                                         ▼
             │                              [ MongoDB Atlas Cluster ]
             └────────────────────────────► Multi-Document ACID Replica Set
                                              Automated Backups & Sharding
```

- **Frontend**: React + Vite SPA deployed on **Vercel** with global CDN caching and automatic HTTPS.
- **Backend**: Node.js + Express API server deployed on **Render** (Singapore / Low-latency region).
- **Database**: **MongoDB Atlas** 3-node replica set with transactions, encryption at rest, and automated backup snapshots.

---

## 2. Environment Variables Specification

### A. Frontend (Vercel Environment Variables)
| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | Fully qualified URL of the deployed Render backend | `https://api.mahadevgarage.com` or `https://mahadev-garage-backend.onrender.com` |

*Note: In local development, leaving `VITE_API_URL` blank automatically defaults to the local Vite proxy (`/api/v1` -> `http://localhost:5000`).*

### B. Backend (Render Environment Variables)
| Variable | Required | Description | Example / Recommendations |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | Server execution mode | `production` |
| `PORT` | Auto | Assigned automatically by Render | `10000` |
| `FRONTEND_URL` | **Yes** | Canonical origin of the frontend for CORS allowlist | `https://www.mahadevgarage.com` or `https://mahadev-mechanical-car-garage.vercel.app` |
| `MONGODB_URI` | **Yes** | Atlas connection string (Replica set) | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/mahadev_garage?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | Min 32-char cryptographically strong random secret | Generated via `crypto.randomBytes(32).toString('hex')` |
| `CSRF_SECRET` | **Yes** | Min 32-char cryptographically strong random secret | Generated via `crypto.randomBytes(32).toString('hex')` |
| `IS_CROSS_DOMAIN` | **Yes** | Set `true` if frontend & backend are on different domains | `true` (when using Vercel & Render default domains) |
| `COOKIE_SAME_SITE` | **Yes** | SameSite attribute for auth & CSRF cookies | `none` (for cross-domain HTTPS) or `lax` (for shared parent domain) |
| `COOKIE_SECURE` | **Yes** | Enforces HTTPS cookie transmission | `true` |
| `COOKIE_DOMAIN` | Optional | Shared root domain (only when using custom domains) | `.mahadevgarage.com` |
| `RATE_LIMIT_WINDOW_MS` | Optional | General API rate limiting window in ms | `900000` (15 mins) |
| `RATE_LIMIT_MAX` | Optional | Max requests per 15 mins per IP | `300` |
| `AUTH_RATE_LIMIT_MAX` | Optional | Max login attempts per 15 mins per IP | `15` |

---

## 3. Database Setup: MongoDB Atlas

1. **Create an Atlas Cluster**:
   - Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
   - Deploy an `M10` (or `M0` during staging) cluster in the `ap-south-1` (Mumbai) or `ap-southeast-1` (Singapore) region.
   - Ensure the cluster is configured as a **Replica Set** (required for multi-document ACID transactions).

2. **Database Access (User Authentication)**:
   - Go to **Security** -> **Database Access**.
   - Create a dedicated production user (e.g., `mahadev_app_user`).
   - Assign the built-in role: `readWrite@mahadev_garage`.
   - Store credentials securely in your password manager. Never use admin credentials.

3. **Network Access (IP Whitelist)**:
   - Go to **Security** -> **Network Access**.
   - Click **Add IP Address**.
   - For Render dynamic IPs, add `0.0.0.0/0` (Allow Access from Anywhere) with strong password authentication, or configure Render Static Outbound IPs (available on Render Team/Organization plans).

4. **Verify Database Indexes**:
   Before routing production traffic, run the index synchronization script:
   ```bash
   cd server
   npm run verify-indexes
   ```
   Ensure all 21 models report `SYNCHRONIZED` and all 16 unique constraints report `VERIFIED`.

---

## 4. Backend Deployment: Render

### Method A: Using Render Blueprint (`render.yaml`)
1. Push your repository to GitHub.
2. In the Render Dashboard, click **New** -> **Blueprint**.
3. Select the `mahadev-mechanical-car-garage` repository.
4. Render will detect `render.yaml` and configure the web service with:
   - Root directory: `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check: `/health`
5. Supply the prompted secret environment variables: `MONGODB_URI` and `FRONTEND_URL`.
6. Click **Apply**.

### Method B: Manual Web Service Setup
1. In Render Dashboard, click **New** -> **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name**: `mahadev-garage-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. In the **Environment Variables** tab, add all variables defined in Section 2B.
5. Deploy the service and record your backend URL:
   `https://mahadev-garage-backend.onrender.com`

---

## 5. Frontend Deployment: Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
2. Import the `mahadev-mechanical-car-garage` repository.
3. Project Configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (project root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_API_URL` = `https://mahadev-garage-backend.onrender.com` (or your custom API domain)
5. Click **Deploy**.
6. Verify SPA routes by directly navigating to `/` and admin routes. `vercel.json` rewrites all requests to `/index.html`.

---

## 6. Custom Domain & HTTPS Configuration

To deploy on a custom brand domain (e.g., `mahadevgarage.com`):

### DNS Configuration Records
| Type | Name / Host | Value / Target | Purpose |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Points apex domain to Vercel CDN |
| **CNAME** | `www` | `cname.vercel-dns.com.` | Points www subdomain to Vercel CDN |
| **CNAME** | `api` | `mahadev-garage-backend.onrender.com.` | Points API subdomain to Render |

### Cookie Settings for Custom Subdomains
When both frontend and backend share the parent domain `mahadevgarage.com`:
- Set `COOKIE_SAME_SITE` = `lax`
- Set `COOKIE_DOMAIN` = `.mahadevgarage.com`
- Set `IS_CROSS_DOMAIN` = `false`
- Update `FRONTEND_URL` on Render to `https://www.mahadevgarage.com`
- Update `VITE_API_URL` on Vercel to `https://api.mahadevgarage.com`

---

## 7. Post-Deployment Verification Checklist

Execute these checks immediately after deployment:

1. **Liveness Check**:
   ```bash
   curl -i https://<YOUR_BACKEND_URL>/health
   # Expected: HTTP 200 {"success":true,"status":"healthy",...}
   ```
2. **Readiness Check**:
   ```bash
   curl -i https://<YOUR_BACKEND_URL>/ready
   # Expected: HTTP 200 {"success":true,"status":"ready","database":"connected",...}
   ```
3. **CORS Allowlist Test**:
   ```bash
   curl -i -H "Origin: https://malicious-website.com" https://<YOUR_BACKEND_URL>/api/v1/public/services
   # Expected: HTTP 403 Forbidden (CORS_ORIGIN_BLOCKED)
   ```
4. **Admin Authentication & CSRF**:
   - Open frontend in incognito browser.
   - Navigate to admin portal, log in as OWNER.
   - Inspect network headers: verify `Set-Cookie` contains `mahadev_admin_token` (`HttpOnly`, `Secure`, `SameSite=None` or `Lax`) and `mahadev_csrf_token`.
   - Submit a test mutation (e.g., update a business setting or status). Verify request includes `X-CSRF-Token` header.
5. **Scorpio-N 3D Hero Validation**:
   - Open public landing page.
   - Verify 3D Scorpio-N canvas mounts smoothly with realistic lighting and turntable rotation.
   - Test on mobile browser to verify performance fallback.

---

## 8. Rollback Procedure

In case of a critical issue during or after deployment:

1. **Frontend Rollback (Vercel)**:
   - In Vercel dashboard -> **Deployments**.
   - Locate the previous stable deployment.
   - Click **...** -> **Promote to Production**. Instant rollback takes < 5 seconds.

2. **Backend Rollback (Render)**:
   - In Render dashboard -> **Deploys**.
   - Locate the last verified deployment commit.
   - Click **Rollback to this deploy**.

3. **Database Rollback**:
   - Refer to `docs/DATABASE_BACKUP_RESTORE.md` for point-in-time snapshot recovery.
