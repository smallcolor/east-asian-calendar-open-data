# @koyomidays/solar-terms

Zero-dependency ESM lookup helpers for the 24 solar terms (2020-2035), computed with VSOP87D at exact minute precision in UTC, JST (`UTC+9`), and CST (`UTC+8`).

## Installation

```bash
npm install @koyomidays/solar-terms
```

## Usage

```js
import {
  getSolarTerms,
  getSolarTerm,
  getSolarTermOnDate,
  getCurrentSolarTerm,
} from '@koyomidays/solar-terms';

const terms2026 = getSolarTerms(2026);
const lichun = getSolarTerm(2026, 'lichun');
const todayTerm = getSolarTermOnDate('2026-02-04', 'jst');
const context = getCurrentSolarTerm('2026-02-04T00:00:00Z');
```

## API

- `YEAR_RANGE`: `{ min: 2020, max: 2035 }`
- `SOLAR_TERM_SLUGS`: 24 term slugs ordered from `lichun` (315 deg) to `dahan` (300 deg)
- `getSolarTerms(year)`: returns all 24 solar term records for `year` in chronological order
- `getSolarTerm(year, slugOrIndex)`: looks up a single solar term by slug or `term_index` (0..23)
- `getSolarTermOnDate(dateStr, tz = 'utc')`: returns the solar term falling on `YYYY-MM-DD` in `'utc'`, `'jst'`, or `'cst'`, or `null`
- `getCurrentSolarTerm(instant)`: returns `{ current, next }` for any Date or ISO 8601 timestamp within 2020-2035

## License

CC BY 4.0 — Koyomi Days (https://koyomidays.com/en/open-data/)
