# Recurring Task Edge Case Test Report

**Date:** December 9, 2025  
**Test Method:** Automated (programmatic testing of generation logic)  
**Total Tests:** 10  
**Passed:** 6  
**Failed:** 4  
**Success Rate:** 60.0%

---

## ✅ PASSED TESTS

1. **Monthly Day 29 (6 months)** - ✅ PASS
   - Generates correctly for all months except February in non-leap years
   - Handles leap year logic properly

2. **Monthly Day 28** - ✅ PASS
   - Generates for ALL months including February

3. **Monthly - 1st Monday (4 months)** - ✅ PASS
   - Generates exactly 4 instances
   - All are Mondays
   - All are within first 7 days of month

4. **Monthly - Last Friday (4 months)** - ✅ PASS
   - Generates exactly 4 instances
   - All are Fridays
   - All are within last 7 days of month

5. **Weekly - Tuesday + Friday (4 weeks)** - ✅ PASS
   - Generates exactly 8 instances (2 per week × 4 weeks)
   - All are Tuesdays or Fridays
   - No duplicates
   - Correct pattern

6. **Daily - 7 Days** - ✅ PASS
   - Generates exactly 7 instances
   - Consecutive days, no gaps

---

## ❌ FAILED TESTS

### 🔴 CRITICAL ISSUE 1: Monthly Date - Day 31/30 Generating in Short Months

**Test 1.1: Monthly Day 31 (3 months ahead)**
- **Status:** ❌ FAIL
- **Expected:** Should generate ONLY in months with 31 days, skip February/April/June
- **Actual:** Generated in February (on day 28 instead of skipping)
- **Generated Dates:** `2026-01-31, 2026-02-28, 2026-03-31`
- **Issue:** 
  - Code uses `Math.min(options.dayOfMonth, getDate(endOfMonth(currentDate)))` 
  - This adjusts day 31 → 28 for February instead of skipping the month
  - **Expected Behavior:** If a month doesn't have the target day, skip it entirely

**Test 1.2: Monthly Day 30 (3 months ahead)**
- **Status:** ❌ FAIL
- **Expected:** Should skip February (only has 28/29 days)
- **Actual:** Generated in February (on day 28)
- **Generated Dates:** `2026-01-30, 2026-02-28, 2026-03-30`
- **Issue:** Same as above - adjusts to last day instead of skipping

**Root Cause:** 
- `computeNextNDates` function in `apps/desktop/src/utils/recurring.ts` (line 218)
- Uses `Math.min(dayOfMonth, lastDayOfMonth)` which adjusts the date
- Should check if `dayOfMonth > lastDayOfMonth` and skip the month entirely

---

### 🔴 CRITICAL ISSUE 2: Monthly Weekday - 5th Weekday Generation Broken

**Test 2.3: Monthly - 5th Monday (6 months)**
- **Status:** ❌ FAIL
- **Expected:** Should ONLY generate in months that actually have 5 Mondays
- **Actual:** 
  - Generated in months with only 4 Mondays (January, February, April, May)
  - Generated dates are NOT even Mondays!
- **Generated Dates:** `2026-01-31, 2026-02-28, 2026-03-30, 2026-04-30, 2026-05-31, 2026-06-29`
  - January 31, 2026 = Sunday ❌ (should be Monday)
  - February 28, 2026 = Saturday ❌ (should be Monday)
  - April 30, 2026 = Thursday ❌ (should be Monday)
  - May 31, 2026 = Sunday ❌ (should be Monday)

**Root Cause:**
- `getNthWeekdayInMonth` function (line 60-86)
- When `weekNumber = 5` and month only has 4 occurrences:
  - Calculates: `targetDate = 1 + offset + (5-1)*7 = 1 + offset + 28`
  - This overflows the month
  - Returns `endDate` (last day of month) which may not be the correct weekday
- **Fix Required:** 
  - Validate if month has N occurrences before calculating
  - Skip month if it doesn't have 5 occurrences
  - Return `null` and skip in `computeNextNDates`

---

### 🔴 CRITICAL ISSUE 3: Interval Generation Count Bug

**Test 4.1: Interval - Every 3 Days (9 days ahead)**
- **Status:** ❌ FAIL
- **Expected:** Generate exactly 3 tasks (on days 3, 6, 9 from start)
- **Actual:** Generated 9 tasks
- **Generated Dates:** `2025-12-12, 2025-12-15, 2025-12-18, 2025-12-21, 2025-12-24, 2025-12-27, 2025-12-30, 2026-01-02, 2026-01-05`

**Root Cause:**
- `calculateInstanceCount` function (line 329-331)
- For `interval` type, it returns `value` directly
- If `generate_unit = "days"` and `generate_value = 9`, it returns `9`
- This is interpreted as "generate 9 instances" instead of "generate instances within 9 days"
- **Fix Required:**
  - For interval type with `generate_unit = "days"`, calculate: `Math.floor(value / interval_days)`
  - Example: `9 days / 3 days = 3 instances`

---

## 📊 Summary by Test Group

### TEST GROUP 1: MONTHLY (DATE)
- ✅ Day 29: PASS
- ✅ Day 28: PASS
- ❌ Day 31: FAIL (generates in short months)
- ❌ Day 30: FAIL (generates in February)

**Success Rate:** 50% (2/4)

### TEST GROUP 2: MONTHLY (WEEKDAY)
- ✅ 1st Monday: PASS
- ✅ Last Friday: PASS
- ❌ 5th Monday: FAIL (generates in wrong months, wrong dates)

**Success Rate:** 66.7% (2/3)

### TEST GROUP 3: WEEKLY
- ✅ Tuesday + Friday: PASS

**Success Rate:** 100% (1/1)

### TEST GROUP 4: INTERVAL
- ❌ Every 3 days: FAIL (wrong count calculation)

**Success Rate:** 0% (0/1)

### TEST GROUP 5: DAILY
- ✅ Daily 7 days: PASS

**Success Rate:** 100% (1/1)

---

## 🔍 Detailed Analysis

### Issue Severity Breakdown

**🔴 CRITICAL (3 issues):**
1. Monthly 5th Weekday - Completely broken, generates wrong dates
2. Monthly Day 31/30 - Incorrect behavior for edge cases
3. Interval Count - Wrong calculation logic

**🟡 MEDIUM (0 issues):**
- None

**🟢 LOW (0 issues):**
- None

---

## 📋 Code Locations for Fixes

### Issue 1: Monthly Date Edge Cases
**File:** `apps/desktop/src/utils/recurring.ts`  
**Function:** `computeNextNDates` (lines 213-222)  
**Current Code:**
```typescript
case 'monthly_date': {
  currentDate = addMonths(currentDate, 1);
  const targetDay = Math.min(options.dayOfMonth, getDate(endOfMonth(currentDate)));
  nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
  currentDate = new Date(nextDate);
  break;
}
```

**Required Fix:**
- Check if `dayOfMonth > lastDayOfMonth`
- If true, skip this month and move to next
- Only generate if month has the target day

---

### Issue 2: Monthly 5th Weekday
**File:** `apps/desktop/src/utils/recurring.ts`  
**Functions:** 
- `getNthWeekdayInMonth` (lines 60-86)
- `computeNextNDates` (lines 224-252)

**Required Fix:**
1. Add validation in `getNthWeekdayInMonth`:
   - Count actual occurrences in month
   - If `weekNumber > actualCount`, return `null`
2. Handle `null` in `computeNextNDates`:
   - If `null`, skip month and try next month
   - Continue until valid date found

---

### Issue 3: Interval Count
**File:** `apps/desktop/src/utils/recurring.ts`  
**Function:** `calculateInstanceCount` (lines 299-336)  
**Current Code (lines 329-331):**
```typescript
case 'interval':
  return value;
```

**Required Fix:**
```typescript
case 'interval':
  const intervalDays = options.interval_days || 1;
  const unit = options.generate_unit || 'days';
  const value = options.generate_value || 7;
  
  if (unit === 'days') {
    // Calculate how many intervals fit in the time range
    return Math.floor(value / intervalDays);
  }
  // Handle other units...
  return value;
```

---

## 🎯 Expected Behavior After Fixes

### Monthly Day 31 (3 months):
**Before:** `2026-01-31, 2026-02-28, 2026-03-31` ❌  
**After:** `2026-01-31, 2026-03-31, 2026-05-31` ✅ (skip February, April)

### Monthly Day 30 (3 months):
**Before:** `2026-01-30, 2026-02-28, 2026-03-30` ❌  
**After:** `2026-01-30, 2026-03-30, 2026-04-30` ✅ (skip February)

### Monthly 5th Monday (6 months):
**Before:** `2026-01-31 (Sun!), 2026-02-28 (Sat!), ...` ❌  
**After:** `2026-03-30 (Mon), 2026-06-29 (Mon)` ✅ (only months with 5 Mondays)

### Interval 3 Days (9 days):
**Before:** 9 instances ❌  
**After:** 3 instances (days 3, 6, 9) ✅

---

## 📝 Recommendations

1. **Fix Monthly Date Logic:** Implement month skipping for days that don't exist
2. **Fix 5th Weekday:** Add validation and skip months without N occurrences  
3. **Fix Interval Count:** Calculate based on time range, not direct value
4. **Add Unit Tests:** Create automated tests for edge cases
5. **Update Mobile App:** Ensure same fixes applied to mobile recurring logic

---

## 🚀 Next Steps

**Wait for instruction:** "Fix all failing tests"

Then implement:
1. Fix Monthly Date edge cases (skip months)
2. Fix Monthly 5th Weekday validation
3. Fix Interval count calculation
4. Re-run tests to verify fixes
5. Test with Desktop UI to confirm behavior
6. Verify Mobile sync consistency

---

**Report Generated:** December 9, 2025  
**Test Script:** `apps/desktop/test-recurring-automated.ts`  
**Results File:** `apps/desktop/test-results.json`

