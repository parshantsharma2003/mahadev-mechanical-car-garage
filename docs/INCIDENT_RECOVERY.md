# Mahadev Mechanical Car Garage — Incident Recovery & Disaster Runbooks

This document contains standard operating procedures (SOPs) for responding to, diagnosing, and resolving production incidents.

---

## 1. Incident Severity Definitions & Response SLAs

| Severity | Definition | Examples | Response SLA | Target Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **P1 — Critical** | Total system outage or severe financial data compromise | API returning 500/503, database connectivity lost, unable to bill or release vehicles | **15 minutes** | < 2 hours |
| **P2 — Major** | Key operational feature degraded with available workaround | Admin login failing for some users, estimate approval notifications delayed | **1 hour** | < 6 hours |
| **P3 — Minor** | Non-blocking aesthetic or reporting anomaly | CSV export styling glitch, minor dashboard chart lag | **4 hours** | < 24 hours |

---

## 2. P1 Runbook: Backend API Downtime (502 / 503 Bad Gateway)

### Symptom:
Customers or staff report "Cannot connect to server" or browser receives `HTTP 502 / 503`.

### Step-by-Step Diagnosis:
1. **Check Backend Liveness Probe**:
   ```bash
   curl -i https://<BACKEND_URL>/health
   ```
   - If response is `502 / 503` or connection times out: Render web service process has crashed or is undergoing a cold restart.
2. **Inspect Render Deployment Logs**:
   - Log in to the [Render Dashboard](https://dashboard.render.com).
   - Navigate to `mahadev-garage-backend` -> **Logs**.
   - Check for fatal errors:
     - `UNCAUGHT_EXCEPTION` or `UNHANDLED_REJECTION`
     - `MONGODB_URI is required` (Missing environment variables)
     - `Error: listen EADDRINUSE` (Port collision)
3. **Check Database Readiness Probe**:
   ```bash
   curl -i https://<BACKEND_URL>/ready
   ```
   - If `/health` is 200 but `/ready` returns 503 with `"database":"disconnected"`: The Node backend is healthy, but MongoDB Atlas is unreachable.

### Immediate Remediation:
- If process crashed due to bad deploy: Click **Deploys** -> **Rollback to Previous Deploy** in Render.
- If memory limit exceeded: In Render service settings, increase instance RAM tier from Free/Starter to Standard.
- If stuck: Trigger a **Manual Deploy** -> **Clear build cache & deploy**.

---

## 3. P1 Runbook: Database Connectivity Loss & Atlas Failover

### Symptom:
Application logs show `[DB_DISCONNECTED]: Mongoose connection lost` or `MongooseError: operation timed out`.

### Step-by-Step Diagnosis:
1. **Check MongoDB Atlas Status**:
   - Visit [MongoDB Status Page](https://status.mongodb.com/) to rule out global cloud provider outages.
   - Log in to the [MongoDB Atlas Dashboard](https://cloud.mongodb.com/).
   - Inspect cluster health metrics: Primary node CPU, Memory, IOPS, and Active Connections.
2. **Verify Network Access Allowlist**:
   - Check if Render's outbound IP was blocked or if Network Access rules were altered.
3. **Verify Replica Set Primary Node Election**:
   - In Atlas, verify that a healthy Primary node is elected. During automatic failovers (e.g. node maintenance), the cluster briefly becomes read-only for 5–10 seconds. The backend's connection pool will automatically reconnect (`reconnected` event).

### Immediate Remediation:
- If connection string credentials expired: Update `MONGODB_URI` in Render and trigger a zero-downtime redeploy.
- If primary node deadlocked: In Atlas cluster view, click **...** -> **Restart Cluster**.

---

## 4. P2 Runbook: Authentication, Session Drops & CSRF Failures

### Symptom:
Admin users get logged out immediately after page refresh or receive `403 Forbidden: CSRF token mismatch`.

### Step-by-Step Diagnosis:
1. **Check Cookie Domain & SameSite Settings**:
   - If frontend is on Vercel (`*.vercel.app`) and backend is on Render (`*.onrender.com`):
     - `IS_CROSS_DOMAIN` must be `true`.
     - `COOKIE_SAME_SITE` must be `none`.
     - `COOKIE_SECURE` must be `true` (HTTPS is required for `SameSite=None`).
2. **Verify Token Version Invalidation**:
   - Check if an administrator recently triggered a password reset or toggled status, incrementing `tokenVersion`. Ask the affected user to re-login with their updated credentials.
3. **Verify CSRF Header**:
   - In browser DevTools -> **Network**, inspect the failing mutation request:
     - Header `X-CSRF-Token` must be present and match the value in cookie `mahadev_csrf_token`.
     - If missing, clear browser cookies for the site and log in again to establish a fresh CSRF session.

---

## 5. P2 Runbook: Financial Discrepancy & Ledger Inconsistency

### Symptom:
An invoice balance or customer/supplier ledger total does not match physical cash/bank receipts.

### Remediation Protocol:
1. **Never Manually Edit MongoDB Documents**:
   - Manual updates to balance fields bypass audit logs and break the append-only ledger chain.
2. **Inspect Audit Trail**:
   - Log in as OWNER. Navigate to **Audit Logs**.
   - Filter by `entityType: "Invoice"` or `entityType: "Payment"` to identify the exact actor, timestamp, and before/after snapshot.
3. **Execute Reversals via Authorized Owner Workflow**:
   - If a payment was recorded in error: Use **Reverse Payment** with a mandatory recorded reason. The system automatically creates a counter-balancing ledger entry (`PAYMENT_REVERSED`) and restores the invoice outstanding balance.
   - If an expense was misattributed: Use **Reverse Expense** with OWNER credentials.
   - For opening balance corrections: Use **Record Ledger Adjustment** (`ADJUSTMENT`) with justification notes.

---

## 6. Escalation Hierarchy

| Level | Role | Contact Channels | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Tier 1** | Workshop Super Admin | Workshop Desk / Phone | Log incident, verify customer-facing impact, provide manual receipt if needed |
| **Tier 2** | Technical Lead / DevOps | GitHub Issues / Emergency Alert | Diagnose server logs, execute service restart, rollback deployments |
| **Tier 3** | Garage OWNER | Direct Phone / Admin Dashboard | Authorize financial adjustments, approve disaster recovery restores |

---

## 7. Incident Post-Mortem Template

Following resolution of any P1 or P2 incident, complete the following within 24 hours:

```markdown
# Incident Post-Mortem: [Incident Title]
**Date**: YYYY-MM-DD
**Duration**: X minutes
**Impact**: [Description of customer/staff impact]
**Root Cause**: [Detailed technical cause]

### Timeline
- **HH:MM** — Incident detected by [Alert / Staff report].
- **HH:MM** — Triage commenced by [Engineer].
- **HH:MM** — Remediation applied: [Action taken].
- **HH:MM** — Services confirmed fully operational.

### Corrective & Preventative Actions
1. [Action item 1]
2. [Action item 2]
```
