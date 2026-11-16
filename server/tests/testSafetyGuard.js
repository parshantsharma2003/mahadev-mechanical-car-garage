/**
 * Production Database Test Protection Guard
 * Mahadev Mechanical Car Garage
 *
 * Enforces strict isolation between automated test execution and production databases.
 * Every test suite MUST execute these guards before establishing any DB connection or running cleanups.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicit list of forbidden production hostnames/clusters
export const FORBIDDEN_CLUSTER_HOSTNAMES = [
  'cargaragecluster01.498qhqm.mongodb.net',
  'cargaragecluster01'
];

// Approved test database names. All test databases must match one of these or end with '_test'
export const APPROVED_TEST_DB_NAMES = [
  'mahadev_test',
  'mahadev_garage_test',
  'cargarage_test',
  'garage_test'
];

/**
 * Extracts database name from MongoDB URI
 * @param {string} uri
 * @returns {string|null}
 */
export function extractDatabaseName(uri) {
  if (!uri || typeof uri !== 'string') return null;
  try {
    const sanitized = uri.replace(/^mongodb(?:\+srv)?:\/\//, 'http://');
    const parsed = new URL(sanitized);
    const pathname = parsed.pathname.replace(/^\//, '').split('?')[0].trim();
    return pathname || null;
  } catch {
    const match = uri.match(/(?:mongodb(?:\+srv)?:\/\/[^\/]+\/)([^?]+)/);
    return match ? match[1].trim() : null;
  }
}

/**
 * Checks whether a database name is safe for testing
 * @param {string|null} dbName
 * @returns {boolean}
 */
export function isApprovedTestDatabase(dbName) {
  if (!dbName) return false;
  const lower = dbName.toLowerCase();
  // Forbidden standard / production names
  if (['test', 'admin', 'local', 'config', 'production', 'mahadev', 'cargarage'].includes(lower)) {
    return false;
  }
  return APPROVED_TEST_DB_NAMES.includes(lower) || lower.endsWith('_test');
}

/**
 * Loads test environment variables from .env.test if present.
 * Does not override variables explicitly set in the active process.
 */
export function loadTestEnvironment() {
  const envTestPath = path.resolve(__dirname, '../.env.test');
  dotenv.config({ path: envTestPath, override: false });

  // If TEST_MONGODB_URI is provided, ensure MONGODB_URI uses it for tests
  if (process.env.TEST_MONGODB_URI) {
    process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
  }
}

/**
 * Validates test environment safety BEFORE database connection is attempted.
 * Throws an immediate Error if any production indicators are detected.
 * @param {Record<string, string>} [customEnv]
 */
export function assertSafeTestEnvironment(customEnv = null) {
  const env = customEnv || process.env;

  // 1. Check initial environment before any file loading
  const initialNodeEnv = (env.NODE_ENV || '').trim().toLowerCase();
  const initialUri = (env.TEST_MONGODB_URI || env.MONGODB_URI || '').trim();

  // Requirement 1: Reject execution against NODE_ENV=production
  if (initialNodeEnv === 'production') {
    const msg = '[CRITICAL TEST SAFETY VIOLATION] Execution rejected: Attempted to run test suite with NODE_ENV=production. Automated tests must NEVER run in production mode.';
    console.error(`\n❌ ${msg}\n`);
    throw new Error(msg);
  }

  // Requirement 2: Reject production Atlas hostname regardless of NODE_ENV
  for (const forbiddenHost of FORBIDDEN_CLUSTER_HOSTNAMES) {
    if (initialUri.toLowerCase().includes(forbiddenHost.toLowerCase())) {
      const msg = `[CRITICAL TEST SAFETY VIOLATION] Execution rejected: Production Atlas cluster hostname detected ("${forbiddenHost}"). Tests are strictly forbidden from connecting to production Atlas cluster.`;
      console.error(`\n❌ ${msg}\n`);
      throw new Error(msg);
    }
  }

  // Check initial URI database name if provided in the environment
  if (initialUri) {
    const initialDb = extractDatabaseName(initialUri);
    if (!isApprovedTestDatabase(initialDb)) {
      const msg = `[CRITICAL TEST SAFETY VIOLATION] Execution rejected: Database "${initialDb || 'unspecified'}" is not an approved test database name. Tests require an isolated database ending in "_test" (e.g., "mahadev_test").`;
      console.error(`\n❌ ${msg}\n`);
      throw new Error(msg);
    }
  }

  // 2. Load .env.test if using live process.env and URI is not yet configured
  if (!customEnv) {
    loadTestEnvironment();
  }

  const finalNodeEnv = (env.NODE_ENV || '').trim().toLowerCase();
  const finalUri = (env.TEST_MONGODB_URI || env.MONGODB_URI || '').trim();

  if (finalNodeEnv === 'production') {
    const msg = '[CRITICAL TEST SAFETY VIOLATION] Execution rejected: Attempted to run test suite with NODE_ENV=production. Automated tests must NEVER run in production mode.';
    console.error(`\n❌ ${msg}\n`);
    throw new Error(msg);
  }

  for (const forbiddenHost of FORBIDDEN_CLUSTER_HOSTNAMES) {
    if (finalUri.toLowerCase().includes(forbiddenHost.toLowerCase())) {
      const msg = `[CRITICAL TEST SAFETY VIOLATION] Execution rejected: Production Atlas cluster hostname detected ("${forbiddenHost}"). Tests are strictly forbidden from connecting to production Atlas cluster.`;
      console.error(`\n❌ ${msg}\n`);
      throw new Error(msg);
    }
  }

  // Requirement 3: Require a dedicated test database with an explicitly approved test database name
  const dbName = extractDatabaseName(finalUri);
  if (!isApprovedTestDatabase(dbName)) {
    const msg = `[CRITICAL TEST SAFETY VIOLATION] Execution rejected: Database "${dbName || 'unspecified'}" is not an approved test database name. Tests require an isolated database ending in "_test" (e.g., "mahadev_test").`;
    console.error(`\n❌ ${msg}\n`);
    throw new Error(msg);
  }

  // Ensure NODE_ENV is set to 'test' in the active process
  if (!customEnv) {
    process.env.NODE_ENV = 'test';
  }

  return {
    safe: true,
    dbName,
    nodeEnv: env.NODE_ENV
  };
}

/**
 * Post-connection assertion to verify live Mongoose connection before destructive cleanups
 * @param {import('mongoose').Connection} [connection]
 */
export async function assertConnectedToSafeTestDb(connection) {
  const conn = (connection && connection.connection) ? connection.connection : (connection || mongoose.connection);
  const liveDbName = conn.name;
  const liveHost = conn.host || '';

  // Validate live host against forbidden production clusters
  for (const forbiddenHost of FORBIDDEN_CLUSTER_HOSTNAMES) {
    if (liveHost.toLowerCase().includes(forbiddenHost.toLowerCase())) {
      await mongoose.disconnect();
      const msg = `[CRITICAL TEST SAFETY VIOLATION] Live Mongoose connection was opened to production host: ${liveHost}! Connection terminated immediately.`;
      console.error(`\n💥 ${msg}\n`);
      throw new Error(msg);
    }
  }

  // Validate live database name
  if (!isApprovedTestDatabase(liveDbName)) {
    await mongoose.disconnect();
    const msg = `[CRITICAL TEST SAFETY VIOLATION] Live Mongoose connection active on unapproved database: "${liveDbName}"! Connection terminated immediately.`;
    console.error(`\n💥 ${msg}\n`);
    throw new Error(msg);
  }

  return true;
}
