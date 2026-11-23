import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dataset = require('./solar-terms-2020-2035.json');

export const YEAR_RANGE = Object.freeze({ min: 2020, max: 2035 });
export const RULE_VERSION = dataset.meta.rule_version;

const ITEMS = dataset.items.map((item) =>
  Object.freeze({
    ...item,
    utc_ms: Date.parse(item.utc_iso),
  })
);

const BY_YEAR = new Map();
for (const item of ITEMS) {
  let list = BY_YEAR.get(item.year);
  if (!list) {
    list = [];
    BY_YEAR.set(item.year, list);
  }
  list.push(item);
}
for (const [y, list] of BY_YEAR.entries()) {
  BY_YEAR.set(y, Object.freeze(list));
}

export const SOLAR_TERM_SLUGS = Object.freeze(
  BY_YEAR.get(2020)
    .slice()
    .sort((a, b) => a.term_index - b.term_index)
    .map((t) => t.term_slug)
);

function assertYear(year) {
  if (!Number.isInteger(year) || year < YEAR_RANGE.min || year > YEAR_RANGE.max) {
    throw new RangeError(`Year must be an integer between ${YEAR_RANGE.min} and ${YEAR_RANGE.max}; got ${year}`);
  }
}

/**
 * Return all 24 solar terms for a given Gregorian year (2020-2035) in chronological order.
 */
export function getSolarTerms(year) {
  assertYear(year);
  return BY_YEAR.get(year);
}

/**
 * Look up a single solar term in a year by slug (e.g. 'lichun') or term_index (0..23).
 */
export function getSolarTerm(year, slugOrIndex) {
  const terms = getSolarTerms(year);
  if (typeof slugOrIndex === 'number') {
    return terms.find((t) => t.term_index === slugOrIndex) ?? null;
  }
  const key = String(slugOrIndex || '').trim().toLowerCase();
  return terms.find((t) => t.term_slug === key) ?? null;
}

const TZ_FIELD = {
  utc: 'utc_iso',
  jst: 'jst_iso',
  cst: 'cst_iso',
  'utc+9': 'jst_iso',
  'utc+8': 'cst_iso',
};

/**
 * Find the solar term (if any) occurring on a given YYYY-MM-DD civil date in 'utc', 'jst', or 'cst'.
 */
export function getSolarTermOnDate(dateStr, tz = 'utc') {
  const field = TZ_FIELD[String(tz).toLowerCase()];
  if (!field) {
    throw new RangeError(`Unsupported timezone key: ${tz}. Use 'utc', 'jst', or 'cst'.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
    throw new RangeError(`Expected YYYY-MM-DD date string; got ${dateStr}`);
  }
  const year = Number(dateStr.slice(0, 4));
  assertYear(year);
  return BY_YEAR.get(year).find((t) => t[field].startsWith(dateStr)) ?? null;
}

/**
 * Return the active (most recent) and next solar terms at a given ISO timestamp or Date.
 */
export function getCurrentSolarTerm(instant) {
  const ms = instant instanceof Date ? instant.getTime() : Date.parse(String(instant));
  if (!Number.isFinite(ms)) {
    throw new RangeError(`Invalid date or ISO timestamp: ${instant}`);
  }
  if (ms < ITEMS[0].utc_ms || ms > ITEMS[ITEMS.length - 1].utc_ms) {
    throw new RangeError(`Timestamp must fall within ${ITEMS[0].utc_iso} .. ${ITEMS[ITEMS.length - 1].utc_iso}`);
  }
  let lo = 0;
  let hi = ITEMS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ITEMS[mid].utc_ms <= ms) lo = mid;
    else hi = mid - 1;
  }
  return {
    current: ITEMS[lo],
    next: ITEMS[lo + 1] ?? null,
  };
}
