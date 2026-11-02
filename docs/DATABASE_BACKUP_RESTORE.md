# Mahadev Mechanical Car Garage — Database Backup & Restore Strategy

This document establishes the official database backup, verification, and disaster recovery procedures for **Mahadev Mechanical Car Garage**.

---

## 1. MongoDB Atlas Backup Capabilities by Tier

MongoDB Atlas backup capabilities depend on the selected cluster tier. Understand your tier's capabilities before planning disaster recovery:

| Feature | Shared Tiers (M0 Free, M2, M5) | Dedicated Tiers (M10, M20, M30+) |
| :--- | :--- | :--- |
| **Cloud Backups (Automated Snapshots)** | ❌ Not available | ✅ Fully automated cloud snapshots |
| **Point-in-Time Recovery (PITR)** | ❌ Not available | ✅ Available (granular restoration up to 1 second) |
| **Snapshot Schedules** | ❌ None | ✅ Hourly, daily, weekly, and monthly policies |
| **Manual Backup (`mongodump`)** | ✅ Fully supported via URI | ✅ Fully supported via URI |
| **Manual Restore (`mongorestore`)** | ✅ Fully supported via URI | ✅ Fully supported via URI |

> [!IMPORTANT]
> If your production database is running on an `M0` or `M2/M5` tier, you **MUST** run regular automated `mongodump` cron jobs or script-based dumps, as Atlas automated cloud snapshots are exclusive to dedicated tiers (`M10`+).

---

## 2. Backup Frequency & Retention Policy

### Recommended Production Schedule (M10+ Dedicated Cluster)
- **Continuous Backups**: Continuous oplog streaming with 7-day Point-in-Time Recovery (PITR).
- **Daily Snapshots**: Taken daily at 02:00 AM IST (low workshop activity). Retained for **30 days**.
- **Weekly Snapshots**: Taken every Sunday at 03:00 AM IST. Retained for **90 days**.
- **Monthly Snapshots**: Taken on the 1st of every month. Retained for **365 days** (annual financial audit compliance).

### Manual Dump Schedule (M0 / Free / Staging Tiers)
- Run daily before closing the workshop using the manual dump script below.
- Retain archives locally or on an encrypted offsite S3 bucket for at least **30 days**.

---

## 3. Manual Backup Procedure (`mongodump`)

Use the official MongoDB Database Tools (`mongodump`) to create an encrypted, compressed archive backup.

### Prerequisites
Install MongoDB Command Line Database Tools:
- Windows: Download from official MongoDB Tools MSI installer.
- Linux: `sudo apt-get install mongodb-database-tools`
- macOS: `brew install mongodb-database-tools`

### Step 1: Create Backup Directory
```bash
mkdir -p backups
```

### Step 2: Execute `mongodump` with Archive & Compression
Replace `<MONGODB_URI>` with your production connection string:

```bash
# Syntax for Windows PowerShell
$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
mongodump --uri="<MONGODB_URI>" --archive="backups/mahadev_backup_$DATE.archive.gz" --gzip

# Syntax for Linux / macOS Bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="<MONGODB_URI>" --archive="backups/mahadev_backup_${DATE}.archive.gz" --gzip
```

### What this accomplishes:
- `--archive`: Bundles all collections, metadata, and index definitions into a single immutable file.
- `--gzip`: Compresses the archive by up to 80% without data degradation.
- Preserves all 21 models and their schema index definitions.

---

## 4. Backup Verification Procedure

Never assume a backup file is valid without verifying its integrity.

### Step 1: Check File Size & Header
Verify the archive was generated and is not an empty 0-byte file:
```bash
# Windows PowerShell
Get-Item backups/mahadev_backup_*.archive.gz | Select-Object Name, Length, LastWriteTime

# Linux / macOS
ls -lh backups/*.archive.gz
```

### Step 2: Test Archive Structure without Restoring
Inspect the archive contents using `bsondump`:
```bash
# Tests that the archive is a valid gzipped BSON stream
mongorestore --archive="backups/mahadev_backup_<DATE>.archive.gz" --gzip --dryRun
```
*Expected output: Lists each collection (e.g. `users`, `invoices`, `jobcards`, `customers`) with document counts.*

---

## 5. Safe Restore Testing Procedure (Isolated Test Database)

> [!CAUTION]
> **CRITICAL RULE**: NEVER test restore operations against the live production database!
> Always restore to an isolated test database (e.g., `mahadev_garage_restore_test`) or a local MongoDB instance.

### Step 1: Restore to an Isolated Test Database
Use the `--nsFrom` and `--nsTo` flags to rename the target database namespace:

```bash
mongorestore \
  --uri="mongodb://127.0.0.1:27017" \
  --archive="backups/mahadev_backup_<DATE>.archive.gz" \
  --gzip \
  --nsFrom="mahadev_garage.*" \
  --nsTo="mahadev_garage_restore_test.*" \
  --drop
```

### Step 2: Validate Restored Collections & Document Counts
Run a verification query against the restored test database:

```bash
node -e "
import('mongoose').then(async (m) => {
  await m.default.connect('mongodb://127.0.0.1:27017/mahadev_garage_restore_test');
  const collections = await m.default.connection.db.listCollections().toArray();
  console.log('Restored Collections:');
  for (const c of collections) {
    const count = await m.default.connection.db.collection(c.name).countDocuments();
    const indexes = await m.default.connection.db.collection(c.name).indexes();
    console.log(' - ' + c.name + ': ' + count + ' docs, ' + indexes.length + ' indexes');
  }
  await m.default.disconnect();
});
"
```

### Step 3: Validate Restored Indexes
Verify that critical unique indexes were reconstructed:
- `users`: `email_1`
- `customers`: `mobileNumber_1`
- `vehicles`: `registrationNumberClean_1`
- `invoices`: `invoiceNumber_1`
- `payments`: `paymentReference_1`
- `jobcards`: `jobCardNumber_1`

---

## 6. Emergency Production Disaster Recovery Runbook

Follow this emergency runbook ONLY in the event of catastrophic data corruption, unrecoverable disk failure, or accidental administrative deletion.

### Step 1: Immediate Containment
1. In Render Dashboard, temporarily **Suspend** the web service or set it to **Maintenance Mode** to prevent incoming mutations from customers or staff while recovery is in progress.
2. Notify the garage OWNER immediately.

### Step 2: Identify Recovery Point
- If using Atlas M10+ Cloud Backups:
  1. Open MongoDB Atlas -> **Cluster** -> **Backup**.
  2. Select **Point in Time Restore** or select the latest healthy snapshot prior to the incident.
  3. Choose **Restore to a New Cluster** (Recommended to avoid overwriting existing data before confirmation).
- If using `mongodump` manual archive:
  1. Locate the latest verified archive from your offsite backup store.

### Step 3: Execute Restoration to Target Database
```bash
mongorestore \
  --uri="<TARGET_MONGODB_URI>" \
  --archive="backups/verified_backup_file.archive.gz" \
  --gzip \
  --nsInclude="mahadev_garage.*" \
  --drop
```

### Step 4: Run Index Verification & Financial Integrity Check
```bash
cd server
npm run verify-indexes
```

### Step 5: Resume Operations
1. In Render Dashboard, resume the backend web service.
2. Log in as OWNER and verify the dashboard metrics against physical workshop records.
3. Check audit logs to confirm system consistency.
