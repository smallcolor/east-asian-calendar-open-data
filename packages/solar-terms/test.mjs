import assert from 'node:assert/strict';
import {
  YEAR_RANGE,
  RULE_VERSION,
  SOLAR_TERM_SLUGS,
  getSolarTerms,
  getSolarTerm,
  getSolarTermOnDate,
  getCurrentSolarTerm,
} from './index.js';

assert.deepEqual(YEAR_RANGE, { min: 2020, max: 2035 });
assert.equal(typeof RULE_VERSION, 'string');
assert.equal(SOLAR_TERM_SLUGS.length, 24);
assert.equal(SOLAR_TERM_SLUGS[0], 'lichun');
assert.equal(SOLAR_TERM_SLUGS[23], 'dahan');

for (let y = 2020; y <= 2035; y++) {
  const terms = getSolarTerms(y);
  assert.equal(terms.length, 24, `Expected 24 terms for ${y}`);
  for (let i = 1; i < terms.length; i++) {
    assert.ok(terms[i].utc_ms > terms[i - 1].utc_ms, `Terms not strictly increasing in ${y}`);
  }
}

const lichun2026 = getSolarTerm(2026, 'lichun');
assert.ok(lichun2026);
assert.equal(lichun2026.longitude_deg, 315);
assert.equal(lichun2026.term_index, 0);
assert.equal(lichun2026.cst_iso.slice(0, 16), '2026-02-04T04:02');
assert.equal(lichun2026.jst_iso.slice(0, 16), '2026-02-04T05:02');

const byIndex = getSolarTerm(2026, 0);
assert.equal(byIndex.term_slug, 'lichun');

const onDateCst = getSolarTermOnDate('2026-02-04', 'cst');
assert.equal(onDateCst.term_slug, 'lichun');

const onDateUtc = getSolarTermOnDate('2026-02-03', 'utc');
assert.equal(onDateUtc.term_slug, 'lichun');

const none = getSolarTermOnDate('2026-02-05', 'cst');
assert.equal(none, null);

const ctx = getCurrentSolarTerm('2026-02-04T00:00:00Z');
assert.equal(ctx.current.term_slug, 'lichun');
assert.equal(ctx.next.term_slug, 'yushui');

assert.throws(() => getSolarTerms(2019), RangeError);
assert.throws(() => getSolarTerms(2036), RangeError);
assert.throws(() => getSolarTermOnDate('2026-02-04', 'pst'), RangeError);

console.log('All @koyomidays/solar-terms tests passed.');
