/**
 * Production-ready Structured Logger for Mahadev Mechanical Car Garage.
 * Automatically redacts sensitive fields like passwords, tokens, cookies, and credentials.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'token',
  'jwt',
  'tokensecret',
  'csrf_secret',
  'jwt_secret',
  'authorization',
  'cookie',
  'cookies',
  'x-csrf-token',
  'cvv',
  'cardnumber'
]);

/**
 * Recursively redacts sensitive keys from an object or array.
 * @param {any} data
 * @returns {any}
 */
export function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatLog(level, event, message, metadata = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    ...(metadata ? { data: sanitizeLogData(metadata) } : {})
  };

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    return JSON.stringify(logEntry);
  }
  return `[${logEntry.timestamp}] [${level.toUpperCase()}] [${event}]: ${message}${metadata ? ' ' + JSON.stringify(sanitizeLogData(metadata)) : ''}`;
}

export const logger = {
  info(event, message, metadata) {
    console.log(formatLog('info', event, message, metadata));
  },
  warn(event, message, metadata) {
    console.warn(formatLog('warn', event, message, metadata));
  },
  error(event, message, metadata) {
    console.error(formatLog('error', event, message, metadata));
  },
  security(event, message, metadata) {
    console.warn(formatLog('security', event, message, metadata));
  },
  audit(event, message, metadata) {
    console.log(formatLog('audit', event, message, metadata));
  }
};
