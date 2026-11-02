import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates critical environment variables at startup.
 * Throws a clean, safe configuration error if requirements are not met.
 * Never prints actual secret values in error messages or logs.
 */
export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];

  // Required database connection string
  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI is required.');
  }

  // Required authentication secrets
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required.');
  } else if (isProd && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production.');
  }

  if (!process.env.CSRF_SECRET) {
    errors.push('CSRF_SECRET is required.');
  } else if (isProd && process.env.CSRF_SECRET.length < 32) {
    errors.push('CSRF_SECRET must be at least 32 characters in production.');
  }

  // Cross-domain and origin verification in production
  if (isProd) {
    if (!process.env.FRONTEND_URL) {
      console.warn('[Config Warning] FRONTEND_URL is not set in production. CORS will only allow localhost.');
    }
  }

  if (errors.length > 0) {
    const errorMsg = `[Configuration Error] Server bootstrap aborted due to missing/invalid environment variables:\n - ${errors.join('\n - ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Returns a sanitized configuration summary for safe logging during startup.
 * Secrets, credentials, and passwords are strictly masked.
 */
export function getSanitizedConfig() {
  const uri = process.env.MONGODB_URI || '';
  // Mask username and password in MongoDB URI
  const maskedUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    mongoUriMasked: maskedUri.split('?')[0],
    isCrossDomain: process.env.IS_CROSS_DOMAIN === 'true' || process.env.NODE_ENV === 'production',
    cookieSameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
    cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    hasCsrfSecret: Boolean(process.env.CSRF_SECRET)
  };
}
