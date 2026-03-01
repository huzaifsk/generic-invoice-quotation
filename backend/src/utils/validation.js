function isNonEmptyString(value, min = 1) {
  return typeof value === 'string' && value.trim().length >= min;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function isISODate(value) {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function sanitizeString(value) {
  return String(value || '').trim();
}

function assert(condition, message, status = 400) {
  if (!condition) {
    const error = new Error(message);
    error.statusCode = status;
    throw error;
  }
}

module.exports = {
  isNonEmptyString,
  normalizeEmail,
  isValidEmail,
  isISODate,
  toNumber,
  sanitizeString,
  assert,
};
