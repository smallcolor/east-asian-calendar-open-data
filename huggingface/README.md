---
license: cc-by-4.0
language:
- en
- ja
- zh
- ko
- vi
- id
task_categories:
- tabular-classification
- time-series-forecasting
tags:
- calendar
- astronomy
- solar-terms
- lunisolar
- vsop87d
- east-asia
- rokuyo
- pasaran
pretty_name: East Asian Calendar & Solar Terms Open Data (2020-2035)
size_categories:
- 1K<n<10K
---

# East Asian Calendar & Solar Terms Open Data (2020-2035)

Deterministic JSON and CSV reference datasets for East and Southeast Asian calendrical systems, generated from VSOP87D solar longitude calculations and timezone-specific lunisolar tables by [Koyomi Days](https://koyomidays.com/en/open-data/).

## Included Tables

- `data/solar-terms-2020-2035.csv` / `.json` (384 rows): 24 solar terms (2020-2035) with exact minute timestamps in UTC, JST (`UTC+9`), and CST (`UTC+8`).
- `data/lunar-new-moons-2020-2035.csv` / `.json` (198 rows): Civil new moon days (`朔日`, lunar day 1) under `lunar-hko/2` (`UTC+8`).
- `data/lunar-new-year-cross-tz-2020-2035.csv` / `.json` (16 rows): Side-by-side Lunar New Year dates across China (`UTC+8`), Vietnam (`UTC+7`), and Korea (`UTC+9`).
- `data/jp-almanac-2025-2030.csv` / `.json` (2,191 rows): Daily Japanese almanac in JST (`UTC+9`), including Rokuyo, Ichiryumanbaibi, Tenshabi, Tora-no-hi, Minohi (`巳`), and Doyo windows.
- `data/ko-son-eomneun-nal-2025-2030.csv` / `.json` (409 rows): Korean Son-eomneun-nal (`손 없는 날`) dates where the KST lunar day ends in 9 or 0.
- `data/id-javanese-pasaran-2025-2030.csv` / `.json` (2,191 rows): Daily Javanese 5-day Pasaran (`Legi`, `Pahing`, `Pon`, `Wage`, `Kliwon`), 7-day Weton, and Neptu values.

## License & Attribution

Licensed under CC BY 4.0. Please attribute Koyomi Days (`https://koyomidays.com/en/open-data/`).
