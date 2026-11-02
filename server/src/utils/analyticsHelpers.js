/**
 * Analytics date range resolver and CSV formula injection sanitizer.
 */

export function resolveDateRange(preset = 'this_month', customFrom = null, customTo = null) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  const normalized = String(preset || '').trim().toLowerCase();

  switch (normalized) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case 'this_week': {
      // Start of week (Monday)
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }

    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;

    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'custom':
    default:
      if (customFrom) {
        const parsedFrom = new Date(customFrom);
        if (isNaN(parsedFrom.getTime())) {
          const err = new Error('Invalid dateFrom format.');
          err.code = 'INVALID_DATE';
          err.statusCode = 400;
          throw err;
        }
        parsedFrom.setHours(0, 0, 0, 0);
        start = parsedFrom;
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }

      if (customTo) {
        const parsedTo = new Date(customTo);
        if (isNaN(parsedTo.getTime())) {
          const err = new Error('Invalid dateTo format.');
          err.code = 'INVALID_DATE';
          err.statusCode = 400;
          throw err;
        }
        parsedTo.setHours(23, 59, 59, 999);
        end = parsedTo;
      } else {
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  if (start > end) {
    const err = new Error('Start date cannot be after end date.');
    err.code = 'INVALID_DATE_RANGE';
    err.statusCode = 400;
    throw err;
  }

  return {
    preset: normalized || 'this_month',
    startDate: start,
    endDate: end,
    startDateIso: start.toISOString(),
    endDateIso: end.toISOString()
  };
}

/**
 * Sanitizes cell values to prevent CSV formula injection vulnerabilities.
 * Prepend a single quote if the cell begins with dangerous spreadsheet execution symbols (=, +, -, @, \t, \r).
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Strip or quote characters that trigger formula execution in Excel/Sheets
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some((p) => str.startsWith(p))) {
    str = `'${str}`;
  }

  // Escape internal double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Converts array of records into a secure CSV formatted string.
 */
export function jsonToCsv(headers, rows) {
  const headerLine = headers.map((h) => sanitizeCsvCell(h.label)).join(',');
  const rowLines = rows.map((row) => {
    return headers.map((h) => sanitizeCsvCell(row[h.key])).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}
