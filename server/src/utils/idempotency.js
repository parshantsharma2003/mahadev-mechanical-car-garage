import crypto from 'crypto';
import { IdempotencyRecord } from '../models/IdempotencyRecord.js';

/**
 * Validates whether a given string is a valid RFC 4122 UUIDv4.
 *
 * @param {string} uuid
 * @returns {boolean}
 */
export function isValidUUIDv4(uuid) {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv4Regex.test(uuid.trim());
}

/**
 * Deterministically stringifies and computes a SHA-256 hex digest of a payload.
 * Recursively sorts keys so property ordering does not alter the fingerprint.
 *
 * @param {any} obj
 * @returns {string} SHA-256 hex hash
 */
export function computePayloadFingerprint(obj) {
  const normalize = (value) => {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(normalize);
    }
    const sorted = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        sorted[key] = normalize(value[key]);
      });
    return sorted;
  };

  const normalized = normalize(obj || {});
  const serialized = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Finds an existing idempotency record by key and endpoint.
 *
 * @param {string} key
 * @param {string} endpoint
 * @param {Object} [options]
 * @param {import('mongoose').ClientSession} [options.session]
 * @returns {Promise<import('../models/IdempotencyRecord.js').IdempotencyRecord|null>}
 */
export async function findIdempotencyRecord(key, endpoint, { session } = {}) {
  const query = IdempotencyRecord.findOne({ key: key.trim(), endpoint });
  if (session) query.session(session);
  return query;
}

/**
 * Stores a new idempotency record.
 * Handles race conditions gracefully.
 *
 * @param {Object} params
 * @param {string} params.key
 * @param {string} params.endpoint
 * @param {number} [params.statusCode]
 * @param {any} [params.responseBody]
 * @param {string} params.requestFingerprint
 * @param {'PENDING'|'COMPLETED'|'FAILED'} [params.status='COMPLETED']
 * @param {Object} [options]
 * @param {import('mongoose').ClientSession} [options.session]
 * @returns {Promise<import('../models/IdempotencyRecord.js').IdempotencyRecord>}
 */
export async function saveIdempotencyRecord(
  {
    key,
    endpoint,
    statusCode,
    responseBody,
    requestFingerprint,
    status = 'COMPLETED'
  },
  { session } = {}
) {
  try {
    const doc = new IdempotencyRecord({
      key: key.trim(),
      endpoint,
      status,
      statusCode,
      responseBody,
      requestFingerprint
    });
    return await doc.save({ session });
  } catch (err) {
    if (err.code === 11000) {
      // Key was inserted concurrently by another request
      const existingQuery = IdempotencyRecord.findOne({ key: key.trim() });
      if (session) existingQuery.session(session);
      const existing = await existingQuery;
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Deletes an idempotency record if an operation aborted or failed.
 * Ensures a failed transaction or error does not leave a permanently pending record.
 *
 * @param {string} key
 * @param {string} endpoint
 * @param {Object} [options]
 * @param {import('mongoose').ClientSession} [options.session]
 */
export async function deleteIdempotencyRecord(key, endpoint, { session } = {}) {
  const query = IdempotencyRecord.deleteOne({ key: key.trim(), endpoint });
  if (session) query.session(session);
  return query;
}

