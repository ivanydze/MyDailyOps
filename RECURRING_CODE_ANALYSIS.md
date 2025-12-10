# Recurring Task Code Analysis - Potential Issues

## Code Review Before Testing

Based on analysis of `apps/desktop/src/utils/recurring.ts`, here are potential issues to watch for during testing:

---

## ⚠️ POTENTIAL ISSUE 1: Monthly Date - Day 31 Behavior

**Location:** Lines 213-222

**Code:**
```typescript
case 'monthly_date': {
  currentDate = addMonths(currentDate, 1);
  const targetDay = Math.min(options.dayOfMonth, getDate(endOfMonth(currentDate)));
  nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
  break;
}
```

**Expected Behavior:**
- Day 31 should generate in months with 31 days
- Day 31 should be SKIPPED in months with fewer days

**Actual Behavior:**
- Day 31 will generate in ALL months
- For months with 30 days, it will generate on the 30th
- For February (28/29 days), it will generate on Feb 28/29

**Issue:** This might NOT match expected behavior. If user selects "Day 31", they might expect it to ONLY occur in months that actually have a 31st, not be adjusted to the last day of shorter months.

**Test Focus:** Verify if this is desired behavior or a bug.

---

## ⚠️ POTENTIAL ISSUE 2: Monthly Weekday - 5th Weekday Not Validated

**Location:** Lines 60-86, 224-252

**Code:**
```typescript
function getNthWeekdayInMonth(year, month, weekday, weekNumber) {
  // ... calculates nth weekday
  if (weekNumber === -1) {
    // Last weekday logic
  } else {
    const targetDate = new Date(year, month, 1 + offset + (weekNumber - 1) * 7);
    const endDate = endOfMonth(firstOfMonth);
    if (targetDate > endDate) {
      return endDate; // Returns last day of month if overflow
    }
    return targetDate;
  }
}
```

**Expected Behavior:**
- 5th Monday should ONLY generate in months that have 5 Mondays
- Months with only 4 Mondays should be SKIPPED

**Actual Behavior:**
- If weekNumber = 5 and month only has 4 Mondays, the function will:
  - Calculate `targetDate = 1 + offset + (5-1)*7 = 1 + offset + 28`
  - This will likely overflow the month
  - It will return `endDate` (last day of month)
  - This might NOT be a Monday!

**Issue:** The function doesn't validate if the month actually has 5 occurrences of the weekday. It may return the wrong date or generate incorrectly.

**Test Focus:** This is CRITICAL - Test 2.3 must verify this behavior.

---

## ⚠️ POTENTIAL ISSUE 3: Weekly Generation - Start Date Inclusion

**Location:** Lines 130-131

**Code:**
```typescript
// Start from the day after the start date to avoid including the template's deadline
let currentDate = addDays(start, 1);
```

**Expected Behavior:**
- Template task has deadline = Today
- Generated instances should start from Tomorrow (or next occurrence)

**Actual Behavior:**
- Starts from `start + 1 day`
- This seems correct, but verify it doesn't skip valid occurrences

**Test Focus:** Verify no valid weekdays are skipped.

---

## ⚠️ POTENTIAL ISSUE 4: Interval Calculation

**Location:** Lines 299-336

**Code:**
```typescript
case 'interval': {
  const intervalDays = options.interval_days || 1;
  currentDate = addDays(currentDate, intervalDays);
  nextDate = new Date(currentDate);
  break;
}
```

**Expected Behavior:**
- Every 3 days: Day 0, Day 3, Day 6, Day 9
- If generate_value = 9 days, should generate 3 tasks (Days 3, 6, 9)

**Actual Behavior:**
- Uses count-based generation
- `calculateInstanceCount` for interval returns `value` directly
- If generate_value = 9, it will generate 9 instances (Days 3, 6, 9, 12, 15, 18, 21, 24, 27)

**Issue:** The calculation might be wrong. If generate_unit = "days" and generate_value = 9, it should generate instances UP TO day 9, not 9 instances.

**Test Focus:** Test 4.1 will reveal this issue.

---

## ⚠️ POTENTIAL ISSUE 5: Monthly Weekday - Date Comparison

**Location:** Lines 238-247

**Code:**
```typescript
// Ensure it's after the current date
if (!isAfter(candidate, startDate) || isEqual(candidate, startDate)) {
  currentDate = addMonths(currentDate, 1);
  candidate = getNthWeekdayInMonth(...);
}
```

**Expected Behavior:**
- First generated instance should be after the template's deadline

**Potential Issue:**
- If template deadline is Dec 31 and "1st Monday" for January is Jan 1, this should work
- But if the candidate date equals startDate, it will skip to next month - might be too aggressive

**Test Focus:** Verify first instance is correct.

---

## SUMMARY OF CRITICAL TESTS

1. **Monthly Day 31** - Verify if it generates in short months or skips them
2. **Monthly 5th Weekday** - CRITICAL: Verify it only generates when month has 5 occurrences
3. **Interval Generation** - Verify count calculation is correct
4. **Weekly Range** - Verify all occurrences in range are generated
5. **Date Comparisons** - Verify no past dates, correct first instance

---

## EXPECTED TEST RESULTS (Based on Code Analysis)

Based on the code, here's what I predict:

| Test | Expected Issue | Severity |
|------|----------------|----------|
| Monthly Day 31 | May generate on 30th/28th instead of skipping | Medium |
| Monthly 5th Weekday | May generate in months with only 4 occurrences | **HIGH** |
| Interval 3 days | May generate wrong count (9 instead of 3) | **HIGH** |
| Weekly Tue+Fri | Should work correctly | Low |
| Daily 7 days | Should work correctly | Low |
| Monthly Day 30/29/28 | Should work correctly | Low |

---

## RECOMMENDATION

Run tests in this order:
1. Start with simple tests (Daily, Weekly) to verify basic functionality
2. Then test Monthly Day 28/29/30 (should work)
3. Test Monthly Day 31 (may have issue)
4. Test Interval (likely has issue)
5. Test Monthly 5th Weekday (CRITICAL - likely broken)

