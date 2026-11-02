# Mahadev Mechanical Car Garage — Production Security Checklist & Hardening Guide

This document catalogs all security controls, threat mitigations, and compliance verifications implemented across the application architecture.

---

## 1. Security Controls Summary Matrix

| Threat Category | Implemented Protection | Location / Middleware | Status |
| :--- | :--- | :--- | :--- |
| **Brute Force & DoS** | IP rate limiting (General: 300/15m; Auth: 15/15m) | `server/src/app.js` (`express-rate-limit`) | **ACTIVE** |
| **Cross-Site Scripting (XSS)** | React JSX escaping, Helmet security headers, `nosniff`, `X-XSS-Protection` | `server/src/app.js` & `vercel.json` | **ACTIVE** |
| **Cross-Site Request Forgery (CSRF)** | Cryptographic Double-Submit Cookie pattern with timing-safe comparison | `server/src/middleware/auth.js` (`validateCsrfToken`) | **ACTIVE** |
| **Credential Theft** | `HttpOnly` JWT cookie, `Secure: true`, configurable `SameSite` | `server/src/utils/security.js` | **ACTIVE** |
| **Broken Access Control & IDOR** | Strict RBAC (`OWNER`, `SUPER_ADMIN`), tokenVersion revocation, user active check | `server/src/middleware/auth.js` (`authenticate`, `requireRole`) | **ACTIVE** |
| **NoSQL Query Injection** | Mongoose strict schema casting, parameterized queries, explicit object validation | Mongoose Model Schemas & Controllers | **ACTIVE** |
| **Unrestricted Resource Consumption** | 2MB JSON body cap, pagination parameters clamped | `server/src/app.js` (`express.json({ limit: '2mb' })`) | **ACTIVE** |
| **Sensitive Data Exposure** | Password hashes excluded (`select: false`), credit cards/tokens redacted in logs | `server/src/models/User.js`, `server/src/utils/logger.js` | **ACTIVE** |
| **Duplicate Financial Submissions** | Idempotency keys on bookings, unique transaction references, atomic MongoDB sessions | `server/src/utils/idempotency.js`, Mongoose unique indexes | **ACTIVE** |
| **Unsafe CORS Access** | Exact origin allowlist check, no wildcards allowed with credentials | `server/src/app.js` (`cors({ origin })`) | **ACTIVE** |

---

## 2. Authentication & Session Security

1. **HttpOnly Cookie Architecture**:
   - Authentication tokens are stored in an `HttpOnly` cookie named `mahadev_admin_token`.
   - JavaScript cannot read, inspect, or modify the authentication token, neutralizing token theft via XSS.
   - In production, `secure: true` guarantees tokens are transmitted solely over TLS/HTTPS.

2. **Session Invalidation & Revocation**:
   - Every `User` document maintains a `tokenVersion` counter.
   - When a password is changed or an admin status is toggled, `tokenVersion` increments, instantly invalidating all existing active sessions.
   - Deactivated users (`isActive: false`) are rejected at the middleware layer before any controller executes.

3. **Double-Submit CSRF Protection**:
   - Every authenticated state-changing mutation (`POST`, `PUT`, `PATCH`, `DELETE`) requires a matching `X-CSRF-Token` header.
   - The token is verified against the readable `mahadev_csrf_token` cookie using Node's `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

---

## 3. Role-Based Access Control (RBAC) Matrix

Strict privilege separation is enforced at the route middleware level:

| Feature / Resource | Public Guest | SUPER_ADMIN | OWNER |
| :--- | :---: | :---: | :---: |
| **Public Garage Website & Services** | ✅ | ✅ | ✅ |
| **Book Appointment & Submit Enquiry** | ✅ | ✅ | ✅ |
| **View Dashboard Stats** | ❌ | ✅ | ✅ |
| **Manage Appointments & Enquiries** | ❌ | ✅ | ✅ |
| **Create & Update Job Cards** | ❌ | ✅ | ✅ |
| **Create & Revise Service Estimates** | ❌ | ✅ | ✅ |
| **Issue Invoices & Collect Payments** | ❌ | ✅ | ✅ |
| **Customer Digital Khatta (Read & Normal Payments)** | ❌ | ✅ | ✅ |
| **Customer Khatta Manual Adjustments** | ❌ | ❌ | ✅ (OWNER only) |
| **Record Normal Expenses** | ❌ | ✅ | ✅ |
| **Reverse an Expense** | ❌ | ❌ | ✅ (OWNER only) |
| **Manage Suppliers & Purchases** | ❌ | ✅ | ✅ |
| **Supplier Khatta Manual Adjustments** | ❌ | ❌ | ✅ (OWNER only) |
| **Supplier Payment Reversals** | ❌ | ❌ | ✅ (OWNER only) |
| **Payment Reversals (Customer/Supplier)** | ❌ | ❌ | ✅ (OWNER only) |
| **User Management (Create/Toggle Super Admins)** | ❌ | ❌ | ✅ (OWNER only) |
| **Audit Logs Inspection** | ❌ | ❌ | ✅ (OWNER only) |
| **Financial Analytics & Export** | ❌ | ❌ | ✅ (OWNER only) |

---

## 4. Privacy & Sensitive Information Filtering

1. **Customer & Staff Privacy**:
   - Public APIs (`/api/v1/public/*`) never return customer internal notes, staff notes, admin comments, or financial ledgers.
   - Password hashes are marked `{ select: false }` on the `User` schema and are stripped from API outputs.

2. **Structured Logging Redaction**:
   - The centralized logger (`server/src/utils/logger.js`) scans and redacts:
     - `password`, `newPassword`, `currentPassword`
     - `token`, `jwt`, `authorization`, `cookie`
     - `x-csrf-token`
     - `cvv`, `cardNumber`
     - MongoDB connection credentials
   - Server startup logs mask database connection strings.

---

## 5. Network & Infrastructure Hardening

1. **Helmet HTTP Headers**:
   - `Cross-Origin-Resource-Policy: cross-origin`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY` (prevents clickjacking)
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`

2. **Reverse Proxy Trust**:
   - `app.set('trust proxy', 1)` enables correct client IP detection behind Render's edge load balancer for accurate rate limiting.

3. **Safe Health Endpoints**:
   - `GET /health`: Returns application liveness (`status: healthy`). No infrastructure details leaked.
   - `GET /ready`: Returns sanitized database readiness (`database: connected` or `disconnected`). Internal topology and connection strings are masked.
