const BILLING_KEYWORDS = ['refund', 'invoice', 'charge', 'payment'];
const LOGIN_KEYWORDS = ['password', '2fa', 'sign in', 'locked out', 'login'];
const DELIVERY_KEYWORDS = ['package', 'arrived', 'shipping', 'tracking', 'delivery'];
const BUG_KEYWORDS = ['crash', 'error', '500', 'exception', 'broken'];

const URGENT_PRIORITY_KEYWORDS = ['urgent', 'production down', 'locked out'];
const HIGH_PRIORITY_KEYWORDS = ['error', 'refund', 'not arrived'];

/**
 * Classify autoCategory based on combined subject + body.
 * Evaluates rules in strict deterministic order (T-B1).
 * @param {string} text
 * @returns {'BILLING' | 'LOGIN' | 'DELIVERY' | 'BUG' | 'FEATURE_REQUEST'}
 */
function classifyCategory(text = '') {
  const lower = text.toLowerCase();
  if (BILLING_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'BILLING';
  }
  if (LOGIN_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'LOGIN';
  }
  if (DELIVERY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'DELIVERY';
  }
  if (BUG_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'BUG';
  }
  return 'FEATURE_REQUEST';
}

/**
 * Classify initial priority based on combined subject + body.
 * Evaluates rules in strict deterministic order (T-B1).
 * @param {string} text
 * @returns {'URGENT' | 'HIGH' | 'MEDIUM'}
 */
function classifyPriority(text = '') {
  const lower = text.toLowerCase();
  if (URGENT_PRIORITY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'URGENT';
  }
  if (HIGH_PRIORITY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return 'HIGH';
  }
  return 'MEDIUM';
}

/**
 * Auto-triage a ticket from subject and body.
 * @param {string} subject
 * @param {string} body
 * @returns {{ category: string, priority: string }}
 */
function classifyTicket(subject = '', body = '') {
  const combined = `${subject} ${body}`;
  return {
    category: classifyCategory(combined),
    priority: classifyPriority(combined),
  };
}

module.exports = {
  BILLING_KEYWORDS,
  LOGIN_KEYWORDS,
  DELIVERY_KEYWORDS,
  BUG_KEYWORDS,
  URGENT_PRIORITY_KEYWORDS,
  HIGH_PRIORITY_KEYWORDS,
  classifyCategory,
  classifyPriority,
  classifyTicket,
};
