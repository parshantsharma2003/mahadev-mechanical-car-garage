/**
 * Utility normalizers for Indian phone numbers and vehicle registration plates.
 */

/**
 * Normalizes an Indian mobile number to a strict 10-digit string.
 * Strips formatting, leading '+91', '91', and leading '0'.
 * Validates against standard Indian cellular range [6-9]XXXXXXXXX.
 *
 * @param {string|number} input
 * @returns {string} 10-digit normalized phone number
 * @throws {Error} If phone number is invalid or cannot be normalized
 */
export function normalizeIndianPhone(input) {
  if (!input) {
    throw new Error('Phone number is required.');
  }

  let cleaned = String(input).replace(/[\s\-\(\)\.]/g, '').trim();

  // Handle +91 prefix
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  }
  // Handle 91 prefix when followed by 10 digits
  else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  // Handle leading 0 trunk prefix when followed by 10 digits
  else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Must match exactly 10 digits starting with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    throw new Error(
      `Invalid mobile number: "${input}". Must be a valid 10-digit Indian mobile number starting with 6-9.`
    );
  }

  return cleaned;
}

/**
 * Normalizes an Indian vehicle registration number.
 * Returns an object with:
 * - clean: Alphanumeric uppercase string (e.g., "HR11AA1234") or null if not provided
 * - display: Cleanly formatted plate string (e.g., "HR 11 AA 1234") or null if not provided
 *
 * @param {string} input
 * @returns {{ clean: string|null, display: string|null }}
 */
export function normalizeRegistrationNumber(input) {
  if (!input || typeof input !== 'string') {
    return { clean: null, display: null };
  }

  // Remove spaces, hyphens, dots and convert to uppercase
  const rawClean = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();

  if (!rawClean || rawClean.length < 4) {
    return { clean: null, display: null };
  }

  // Format standard Indian state plate: e.g. HR11AA1234 -> HR 11 AA 1234
  // Pattern: 2 letters state + 1-2 digits RTO + 0-3 letters series + 1-4 digits number
  const plateMatch = rawClean.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/);
  let display = rawClean;
  if (plateMatch) {
    const [, state, rto, series, num] = plateMatch;
    display = [state, rto, series, num].filter(Boolean).join(' ');
  }

  return {
    clean: rawClean,
    display: display
  };
}
