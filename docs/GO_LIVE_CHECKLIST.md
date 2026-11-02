# Mahadev Mechanical Car Garage — Go-Live Verification Checklist

This checklist must be executed and approved before announcing the platform live to customers or workshop staff.

---

## Stage 1: Pre-Launch Technical Verification (T-24 Hours)

- [ ] **Environment Secrets Audit**:
  - `JWT_SECRET` generated using 64-character cryptographic random hex.
  - `CSRF_SECRET` generated using 64-character cryptographic random hex.
  - No secret tokens, API keys, or database credentials committed to Git.
  - `.env` files confirmed in `.gitignore`.
- [ ] **Database Readiness**:
  - MongoDB Atlas cluster deployed with a 3-node Replica Set.
  - Database user created with `readWrite` privilege on `mahadev_garage` only.
  - Atlas Network Access allows backend connections.
  - Index verification script executed successfully:
    ```bash
    npm run verify-indexes
    ```
    *Result: All 21 models SYNCHRONIZED, all 16 unique constraints VERIFIED.*
- [ ] **Automated Test Suite Regression**:
  - All automated test suites (Phases 1 through 10) pass 100%:
    ```bash
    cd server && npm test
    ```
- [ ] **Frontend Production Build**:
  - Production bundle builds cleanly without errors or broken dependencies:
    ```bash
    npm run build
    ```
  - Output directory `dist` contains generated HTML, CSS, and JS chunks.

---

## Stage 2: Launch Day Execution (T-0 Hours)

- [ ] **1. Deploy Backend on Render**:
  - Set all production environment variables in Render Dashboard.
  - Verify build and deployment logs show clean startup.
  - Test liveness probe:
    ```bash
    curl -I https://api.mahadevgarage.com/health
    # Must return HTTP 200
    ```
  - Test readiness probe:
    ```bash
    curl -I https://api.mahadevgarage.com/ready
    # Must return HTTP 200 with database: connected
    ```
- [ ] **2. Deploy Frontend on Vercel**:
  - Verify `VITE_API_URL` is set to the production backend URL.
  - Deploy and confirm Vercel deployment status is `Ready`.
- [ ] **3. DNS & SSL Verification**:
  - Verify DNS records resolve to Vercel and Render targets.
  - Verify SSL certificates are active (valid HTTPS padlock in browser).
- [ ] **4. Seed Initial Garage Owner Account**:
  - If database is fresh, run the secure provisioning script:
    ```bash
    cd server && npm run seed
    ```
  - Verify OWNER credentials in a secure environment.
  - Immediately log in and change the default password via **Admin Profile** -> **Change Password**.

---

## Stage 3: Post-Launch Smoke Testing (T+1 Hour)

- [ ] **Workflow A (Public Customer Booking)**:
  - Submit an appointment through the public booking form on `https://www.mahadevgarage.com`.
  - Verify appointment appears in real-time on the Admin Appointments dashboard.
- [ ] **Workflow B (Workshop Job Card Creation)**:
  - Open the confirmed appointment as OWNER or SUPER_ADMIN.
  - Convert into a Job Card with vehicle intake and odometer reading.
- [ ] **Workflow C (Estimate & Approval)**:
  - Generate an estimate with labour and parts.
  - Record customer approval.
- [ ] **Workflow D (Billing & Payment)**:
  - Issue an invoice upon service completion.
  - Record a partial payment (Cash or UPI).
  - Verify customer digital khatta updates the remaining ledger balance.
- [ ] **Workflow E (Security Validation)**:
  - Confirm that unauthenticated users cannot access `/api/v1/admin/*` endpoints (returns HTTP 401).
  - Confirm that SUPER_ADMIN cannot access OWNER-only audit logs or analytics (returns HTTP 403).
  - Confirm that CORS blocks requests from unauthorized domains.
- [ ] **3D Visual Asset Validation**:
  - Confirm the interactive Mahindra Scorpio-N 3D hero renders with smooth turntable controls on desktop and displays graceful fallback on low-power mobile devices.

---

## Stage 4: Go-Live Sign-Off

| Milestone | Verified By | Date | Signature / Status |
| :--- | :--- | :--- | :--- |
| **Backend & Database Infrastructure** | Lead Engineer | ____________ | [ ] APPROVED |
| **Frontend & UI/UX Readiness** | Frontend Lead | ____________ | [ ] APPROVED |
| **Security & Compliance Audit** | Security Officer | ____________ | [ ] APPROVED |
| **Final Operational Sign-Off** | Garage OWNER | ____________ | [ ] APPROVED |
