# Testing & Verification Directive

## Goal
Establish a deterministic, automated test suite for all critical business logic in AeroCheck (UH Crew Training Level). Prevent regressions, calculation errors in compliance dates, accidental data overwriting in Smart Merge, and discrepancies in flight/block time accounting.

## Background & Architecture
AeroCheck operates in a safety-critical aviation domain. Errors in certificate validity calculation, leap year edge cases, or Excel data merging directly affect flight dispatch eligibility and compliance.
Following the 3-Layer Architecture:
- **Layer 1 (Directive):** This SOP defines testing rules and verification invariants.
- **Layer 2 (Orchestration):** The AI Agent runs tests before and after modifying core business logic.
- **Layer 3 (Execution):** Deterministic Node.js scripts in `execution/` using Node's native test runner (`node --test`).

## Core Invariants to Test

### 1. Compliance Engine (`compliance_rules.js`, `compliance_calculator.js`)
* **Flight Crew Expiry:** Default `end_of_month_default: true` — expiry shifts to the last day of the calendar month (e.g. completion 2026-03-15 + 6 months for OPC -> 2026-09-30).
* **Expiry Overrides:** Specific certifications like DG (24 months) and AV_SEC (36 months) do NOT shift to the end of the month (remain exact date).
* **Cabin Crew Expiry:** Specific validity durations (OPC: 12 months, etc.).
* **Non-expiring Certifications:** Certifications outside `EXPIRING_PREPARATIONS` (e.g., Bird Strike, GI 275) must return completion date and status 'NEUTRAL'.
* **Date Rollover & Leap Years:** Adding months from Aug 31 must clamp to Feb 28 (or Feb 29 in leap years), never spilling into March.
* **Status Thresholds:**
  * Past expiration -> `EXPIRED`
  * Within 7 days -> `WARNING_ORANGE`
  * Within 30 days -> `WARNING_YELLOW`
  * More than 30 days -> `VALID`
  * Empty / '-' -> `MISSING`

### 2. Smart Merge Engine (`data_merger.js`)
* **Zero-Deletion Guarantee:** Existing crew members are NEVER deleted if omitted from incoming import files.
* **Chronological Overwrite Only:**
  * Empty/missing/dash incoming dates NEVER overwrite existing cached dates.
  * Older dates NEVER overwrite newer dates.
  * Valid newer dates DO overwrite older dates.
  * Valid dates fill empty fields.
* **Changelog Generation:** Every modification produces a structured audit log entry.

### 3. Flight Calculations & Crew Matching (`scan_ocr_parser.js`)
* **Block Time >= Flight Time:** Block time can never be less than Flight Time.
* **Time Fallback & Proportional Distribution:** Auto-derives Block Day / Block Night from flight times if missing.
* **Duplicate Detection:** Correctly identifies duplicate flights by date, helicopter registration, and flight/duty times.
* **Smart Crew Matching:** Transliteration and phonetic matching between Ukrainian and Latin surnames.

## Execution Tools
* `execution/run_tests.mjs` - Unified test runner executing all test suites.
* `execution/test_compliance.mjs` - Test suite for compliance calculator and rules.
* `execution/test_data_merger.mjs` - Test suite for Smart Merge logic and invariants.
* `execution/test_flight_logic.mjs` - Test suite for flight time normalization and crew matching.

## Pass Criteria
* 100% of test suites must pass without errors.
* Zero regressions on updates.
