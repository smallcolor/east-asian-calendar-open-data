#!/usr/bin/env node
/**
 * Deterministic dataset generator for smallcolor/east-asian-calendar-open-data.
 *
 * All astronomical and calendrical values are computed strictly from koyomidays
 * deterministic engines (VSOP87D solar longitude, lunar-hko/2, lunar-jst/1,
 * almanac/1, rokuyo/1, vn-lunar.js + astronomy-engine 2.1.19 for UTC+7).
 *
 * Usage:
 *   KOYO_OPS_DIR=/Users/jimme/Projects/koyo-ops node scripts/generate.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');

const KOYO_OPS_DIR = process.env.KOYO_OPS_DIR || '/Users/jimme/Projects/koyo-ops';
const KD_DIR = path.join(KOYO_OPS_DIR, 'koyomidays');
const KD_SRC = path.join(KD_DIR, 'src');

const modUrl = (rel) => pathToFileURL(path.join(KD_SRC, rel)).href;

const { termsOfYear } = await import(modUrl('pages/zh-hant-calendar/data.js'));
const { dateFromJDMinute, jdnFromYMD, SOLAR_RULE } = await import(modUrl('core/astro.js'));
const { solarToLunar, lunarToSolar, LUNAR_RULE } = await import(modUrl('core/lunar.js'));
const { ganzhi } = await import(modUrl('core/ganzhi.js'));
const { dayAlmanac, ALMANAC_RULE_VERSION } = await import(modUrl('core/almanac.js'));
const { solarToLunarJst, lunarToSolarJst, LUNAR_JST_RULE } = await import(modUrl('core-ext/lunar-jst.js'));
const { rokuyo, ROKUYO_RULE } = await import(modUrl('core-ext/rokuyo.js'));
const { getMonthInfo } = await import(modUrl('core-ext/vn-lunar.js'));

const pad2 = (n) => String(n).padStart(2, '0');
const isoDate = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
const mod = (n, m) => ((n % m) + m) % m;

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeDataset(name, meta, items, columns) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const jsonPath = path.join(DATA_DIR, `${name}.json`);
  const csvPath = path.join(DATA_DIR, `${name}.csv`);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ meta, count: items.length, items }, null, 2) + '\n',
    'utf8'
  );

  const header = columns.join(',');
  const rows = items.map((row) => columns.map((c) => csvEscape(row[c])).join(','));
  fs.writeFileSync(csvPath, [header, ...rows].join('\n') + '\n', 'utf8');

  return { name, count: items.length, jsonPath, csvPath };
}

function eachDay(startYear, endYear, fn) {
  const start = Date.UTC(startYear, 0, 1);
  const end = Date.UTC(endYear + 1, 0, 1);
  for (let t = start; t < end; t += 86400000) {
    const d = new Date(t);
    fn(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCDay());
  }
}

const TERM_EN = {
  xiaohan: 'Minor Cold',
  dahan: 'Major Cold',
  lichun: 'Start of Spring',
  yushui: 'Rain Water',
  jingzhe: 'Awakening of Insects',
  chunfen: 'Vernal Equinox',
  qingming: 'Clear and Bright',
  guyu: 'Grain Rain',
  lixia: 'Start of Summer',
  xiaoman: 'Grain Buds',
  mangzhong: 'Grain in Ear',
  xiazhi: 'Summer Solstice',
  xiaoshu: 'Minor Heat',
  dashu: 'Major Heat',
  liqiu: 'Start of Autumn',
  chushu: 'End of Heat',
  bailu: 'White Dew',
  qiufen: 'Autumn Equinox',
  hanlu: 'Cold Dew',
  shuangjiang: 'Frost Descent',
  lidong: 'Start of Winter',
  xiaoxue: 'Minor Snow',
  daxue: 'Major Snow',
  dongzhi: 'Winter Solstice',
};

const TERM_JA = {
  xiaohan: '小寒',
  dahan: '大寒',
  lichun: '立春',
  yushui: '雨水',
  jingzhe: '啓蟄',
  chunfen: '春分',
  qingming: '清明',
  guyu: '穀雨',
  lixia: '立夏',
  xiaoman: '小満',
  mangzhong: '芒種',
  xiazhi: '夏至',
  xiaoshu: '小暑',
  dashu: '大暑',
  liqiu: '立秋',
  chushu: '処暑',
  bailu: '白露',
  qiufen: '秋分',
  hanlu: '寒露',
  shuangjiang: '霜降',
  lidong: '立冬',
  xiaoxue: '小雪',
  daxue: '大雪',
  dongzhi: '冬至',
};

const ANIMALS_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_KO = ['일', '월', '화', '수', '목', '금', '토'];
const PASARAN = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
const PASARAN_NEPTU = [5, 9, 7, 4, 8];
const ID_WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAY_NEPTU = [5, 4, 3, 7, 8, 6, 9];

const formatIsoOffset = (dateObj, offsetMinutes, suffix) => {
  const shifted = new Date(dateObj.getTime() + offsetMinutes * 60000);
  return shifted.toISOString().slice(0, 16) + ':00' + suffix;
};

const summary = [];

// 1. Solar Terms 2020-2035 (VSOP87D exact minutes)
{
  const items = [];
  for (let year = 2020; year <= 2035; year++) {
    for (const t of termsOfYear(year)) {
      const utcDate = dateFromJDMinute(t.jd);
      items.push({
        year,
        term_index: t.k,
        term_slug: t.slug,
        term_en: TERM_EN[t.slug],
        term_zh_hant: t.name,
        term_ja: TERM_JA[t.slug],
        longitude_deg: t.lon,
        is_jie: t.jie,
        utc_iso: formatIsoOffset(utcDate, 0, 'Z'),
        jst_iso: formatIsoOffset(utcDate, 540, '+09:00'),
        cst_iso: formatIsoOffset(utcDate, 480, '+08:00'),
      });
    }
  }
  summary.push(
    writeDataset(
      'solar-terms-2020-2035',
      {
        dataset: 'solar-terms-2020-2035',
        generator: 'koyomidays.com',
        license: 'CC BY 4.0',
        rule_version: SOLAR_RULE,
        precision: 'exact_minute',
        years: '2020-2035',
      },
      items,
      ['year', 'term_index', 'term_slug', 'term_en', 'term_zh_hant', 'term_ja', 'longitude_deg', 'is_jie', 'utc_iso', 'jst_iso', 'cst_iso']
    )
  );
}

// 2. Lunar New Moons (朔日, lunar month day 1) 2020-2035 in UTC+8 (lunar-hko/2)
{
  const items = [];
  eachDay(2020, 2035, (y, m, d) => {
    const lun = solarToLunar(y, m, d);
    if (lun.day === 1) {
      items.push({
        cst_date: isoDate(y, m, d),
        lunar_year: lun.year,
        lunar_month: lun.month,
        is_leap: lun.isLeap,
        lunar_month_name: lun.monthName,
        phase: 'new_moon',
      });
    }
  });
  summary.push(
    writeDataset(
      'lunar-new-moons-2020-2035',
      {
        dataset: 'lunar-new-moons-2020-2035',
        generator: 'koyomidays.com',
        license: 'CC BY 4.0',
        rule_version: LUNAR_RULE,
        timezone: 'UTC+8',
        years: '2020-2035',
        note: 'Civil new moon days (lunar day 1) under lunar-hko/2 (UTC+8).',
      },
      items,
      ['cst_date', 'lunar_year', 'lunar_month', 'is_leap', 'lunar_month_name', 'phase']
    )
  );
}

// 3. Lunar New Year Cross-Timezone 2020-2035 (CN UTC+8 / VN UTC+7 / KR UTC+9)
{
  const pyOut = execFileSync(
    'python3',
    [
      '-c',
      `import sys, json; sys.path.insert(0, ${JSON.stringify(path.join(KD_DIR, 'engine'))}); import lunar_engine as L; print(json.dumps({y: s.isoformat() for s, y, m, lp in L.months(7, 2020, 2036) if m == 1 and lp == 0 and 2020 <= y <= 2035}))`,
    ],
    { encoding: 'utf8' }
  );
  const vnEngineMap = JSON.parse(pyOut.trim());

  const items = [];
  for (let y = 2020; y <= 2035; y++) {
    const cnObj = lunarToSolar(y, 1, 1, false);
    const cnDate = isoDate(cnObj.year, cnObj.month, cnObj.day);
    const jstObj = lunarToSolarJst(y, 1, 1, false);
    const krDate = isoDate(jstObj.year, jstObj.month, jstObj.day);
    const vnDate = y >= 2026 && y <= 2030 ? getMonthInfo(y, 1).start : vnEngineMap[String(y)];
    const gz = ganzhi(y - 4).name;
    const zodiac = ANIMALS_EN[mod(y - 4, 12)];
    items.push({
      lunar_year: y,
      ganzhi: gz,
      zodiac_en: zodiac,
      china_utc8_date: cnDate,
      vietnam_utc7_date: vnDate,
      korea_utc9_date: krDate,
      differs_cn_vn: cnDate !== vnDate,
      differs_cn_kr: cnDate !== krDate,
    });
  }
  summary.push(
    writeDataset(
      'lunar-new-year-cross-tz-2020-2035',
      {
        dataset: 'lunar-new-year-cross-tz-2020-2035',
        generator: 'koyomidays.com',
        license: 'CC BY 4.0',
        rules: {
          china_utc8: LUNAR_RULE,
          korea_utc9: LUNAR_JST_RULE,
          vietnam_utc7: 'vn-lunar.js (2026-2030) + astronomy-engine 2.1.19 UTC+7 (2020-2025, 2031-2035); unverified against official VN table',
        },
        years: '2020-2035',
      },
      items,
      ['lunar_year', 'ganzhi', 'zodiac_en', 'china_utc8_date', 'vietnam_utc7_date', 'korea_utc9_date', 'differs_cn_vn', 'differs_cn_kr']
    )
  );
}

// 4. Japanese Almanac 2025-2030 (JST UTC+9)
{
  // Precompute Doyo windows: from doyo-enter-{season} through the day before the next 立* term
  // Spring doyo: 27 deg -> 45 deg (lixia); Summer: 117 -> 135 (liqiu); Autumn: 207 -> 225 (lidong); Winter: 297 -> 315 (lichun)
  // Using dayAlmanac observances + term transitions in JST.
  const raw = [];
  eachDay(2025, 2030, (y, m, d, w) => {
    const a = dayAlmanac(y, m, d, { tzOffsetMinutes: 540 });
    const lun = solarToLunarJst(y, m, d);
    const rk = rokuyo(y, m, d, { calendar: 'jst' });
    const jpObs = (a.observances || []).filter((o) => o.region === 'JP' && (o.dayIndex || 1) === 1).map((o) => o.id);
    const doyoObs = jpObs.find((id) => id.startsWith('doyo-enter-'));
    const dayBranch = a.dayPillar[1];
    raw.push({
      date: isoDate(y, m, d),
      weekday_en: WD_EN[w],
      day_pillar: a.dayPillar,
      day_branch: dayBranch,
      month_pillar: a.monthPillar,
      year_pillar: a.yearPillar,
      lunar_year: lun.year,
      lunar_month: lun.month,
      lunar_day: lun.day,
      lunar_is_leap: lun.isLeap,
      rokuyo: rk.name,
      ichiryumanbaibi: jpObs.includes('ichiryu-manbai'),
      tenshabi: jpObs.includes('tensha'),
      tora_no_hi: dayBranch === '寅',
      minohi: dayBranch === '巳',
      tsuchinoto_mi: a.dayPillar === '己巳',
      doyo_enter: doyoObs ? doyoObs.replace('doyo-enter-', '') : '',
      _termName: a.term.daysToNext === 0 ? a.term.next : a.term.current,
      _isTermDay: !!a.term.isTermDay,
    });
  });

  // Compute in_doyo and doyo_season across the 2025-2030 span
  // Check 2024-12-31 for winter doyo? In 2025-01, winter doyo enters around Jan 17 (lon 297), ends Feb 2 (day before lichun).
  let activeDoyo = '';
  const DOYO_END_TERM = {
    spring: '立夏',
    summer: '立秋',
    autumn: '立冬',
    winter: '立春',
  };
  const items = raw.map((row) => {
    if (row.doyo_enter) {
      activeDoyo = row.doyo_enter;
    } else if (activeDoyo && row._isTermDay && row._termName === DOYO_END_TERM[activeDoyo]) {
      activeDoyo = '';
    }
    const { _termName, _isTermDay, ...clean } = row;
    return {
      ...clean,
      in_doyo: activeDoyo !== '',
      doyo_season: activeDoyo,
    };
  });

  summary.push(
    writeDataset(
      'jp-almanac-2025-2030',
      {
        dataset: 'jp-almanac-2025-2030',
        generator: 'koyomidays.com',
        license: 'CC BY 4.0',
        rules: {
          almanac: ALMANAC_RULE_VERSION,
          lunar: LUNAR_JST_RULE,
          rokuyo: ROKUYO_RULE,
        },
        timezone: 'JST (UTC+9)',
        years: '2025-2030',
      },
      items,
      [
        'date', 'weekday_en', 'day_pillar', 'day_branch', 'month_pillar', 'year_pillar',
        'lunar_year', 'lunar_month', 'lunar_day', 'lunar_is_leap', 'rokuyo',
        'ichiryumanbaibi', 'tenshabi', 'tora_no_hi', 'minohi', 'tsuchinoto_mi',
        'doyo_enter', 'in_doyo', 'doyo_season',
      ]
    )
  );
}

// 5. Korean Son-eomneun-nal (손 없는 날) 2025-2030 (KST UTC+9, lunar day ends with 9 or 0)
{
  const items = [];
  eachDay(2025, 2030, (y, m, d, w) => {
    const lun = solarToLunarJst(y, m, d);
    const lastDigit = lun.day % 10;
    if (lastDigit === 9 || lastDigit === 0) {
      items.push({
        date: isoDate(y, m, d),
        weekday_en: WD_EN[w],
        weekday_ko: WD_KO[w],
        lunar_year: lun.year,
        lunar_month: lun.month,
        lunar_day: lun.day,
        lunar_is_leap: lun.isLeap,
        lunar_day_last_digit: lastDigit,
      });
    }
  });
  summary.push(
    writeDataset(
      'ko-son-eomneun-nal-2025-2030',
      {
        dataset: 'ko-son-eomneun-nal-2025-2030',
        generator: 'koyomidays.com',
        license: 'CC BY 4.0',
        rule_version: LUNAR_JST_RULE,
        timezone: 'KST (UTC+9)',
        years: '2025-2030',
        rule: 'Lunar day ending in 9 or 0 (9, 10, 19, 20, 29, 30) in KST (UTC+9).',
      },
      items,
      ['date', 'weekday_en', 'weekday_ko', 'lunar_year', 'lunar_month', 'lunar_day', 'lunar_is_leap', 'lunar_day_last_digit']
    )
  );
}

// 6. Indonesian Javanese Pasaran & Weton Cycle 2025-2030
{
  const items = [];
  eachDay(2025, 2030, (y, m, d) => {
    const jdn = jdnFromYMD(y, m, d);
    const weekdayIdx = mod(jdn + 1, 7);
    const pasaranIdx = mod(jdn, 5);
    const weekdayName = ID_WEEKDAYS[weekdayIdx];
    const pasaranName = PASARAN[pasaranIdx];
    const dayNeptu = DAY_NEPTU[weekdayIdx];
    const pasaranNeptu = PASARAN_NEPTU[pasaranIdx];
    items.push({
      date: isoDate(y, m, d),
      jdn,
      weekday_id: weekdayName,
      pasaran: pasaranName,
      weton: `${weekdayName} ${pasaranName}`,
      day_neptu: dayNeptu,
      pasaran_neptu: pasaranNeptu,
      neptu: dayNeptu + pasaranNeptu,
    });
  });
  summary.push(
    writeDataset(
      'id-javanese-pasaran-2025-2030',
      {
        dataset: 'id-javanese-pasaran-2025-2030',
        generator: 'koyomidays.com',
        license: 'CC BY 4.0',
        years: '2025-2030',
        rule: 'Deterministic 5-day Pasaran cycle (JDN mod 5) paired with 7-day Pancawara/Saptawara weekday ((JDN + 1) mod 7) and traditional Javanese Neptu sum.',
      },
      items,
      ['date', 'jdn', 'weekday_id', 'pasaran', 'weton', 'day_neptu', 'pasaran_neptu', 'neptu']
    )
  );
}

console.log(JSON.stringify(summary, null, 2));
