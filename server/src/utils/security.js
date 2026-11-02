import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

export const AUTH_COOKIE_NAME = 'mahadev_admin_token';
export const CSRF_COOKIE_NAME = 'mahadev_csrf_token';

/**
 * Generates options for the HTTP-only JWT authentication cookie.
 * Configured for both local development and Vercel <-> Render cross-domain architecture.
 *
 * @returns {import('express').CookieOptions}
 */
export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const isCrossDomain = process.env.IS_CROSS_DOMAIN === 'true' || isProd;
  const sameSiteSetting = process.env.COOKIE_SAME_SITE 
    ? process.env.COOKIE_SAME_SITE.toLowerCase() 
    : (isCrossDomain && isProd ? 'none' : 'lax');

  /** @type {import('express').CookieOptions} */
  const options = {
    httpOnly: true, // Prevents access from client-side JavaScript
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
    sameSite: sameSiteSetting,
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    path: '/'
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
}

/**
 * Generates options for the readable CSRF token cookie.
 * Double-submit pattern requires client JavaScript to read this cookie
 * and echo it in the X-CSRF-Token request header.
 *
 * @returns {import('express').CookieOptions}
 */
export function getCsrfCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const isCrossDomain = process.env.IS_CROSS_DOMAIN === 'true' || isProd;
  const sameSiteSetting = process.env.COOKIE_SAME_SITE 
    ? process.env.COOKIE_SAME_SITE.toLowerCase() 
    : (isCrossDomain && isProd ? 'none' : 'lax');

  /** @type {import('express').CookieOptions} */
  const options = {
    httpOnly: false, // Must be readable by client JS for double-submit header
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
    sameSite: sameSiteSetting,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/'
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
}

/**
 * Sign JWT for authenticated session.
 * @param {Object} payload - { userId, role, tokenVersion }
 * @param {string} [expiresIn='12h']
 * @returns {string} Signed JWT
 */
export function signAuthToken(payload, expiresIn = '12h') {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify and decode JWT.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyAuthToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return jwt.verify(token, secret);
}

/**
 * Generates a cryptographically secure random token for CSRF protection.
 * @returns {string} 64-character hex string
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates matching double-submit CSRF token using timing-safe comparison.
 * @param {string} headerToken - From X-CSRF-Token header
 * @param {string} cookieToken - From mahadev_csrf_token cookie
 * @returns {boolean} True if tokens match
 */
export function validateCsrfToken(headerToken, cookieToken) {
  if (!headerToken || !cookieToken) {
    return false;
  }
  if (typeof headerToken !== 'string' || typeof cookieToken !== 'string') {
    return false;
  }
  if (headerToken.length !== cookieToken.length) {
    return false;
  }
  try {
    const a = Buffer.from(headerToken, 'utf-8');
    const b = Buffer.from(cookieToken, 'utf-8');
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
