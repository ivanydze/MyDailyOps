# Recurring Task Edge Case Test Suite - Execution Instructions

## ⚠️ IMPORTANT
**DO NOT modify code yet. First run all tests, analyze results, then fix issues when instructed.**

## Prerequisites
1. Desktop app running in dev mode
2. Logged into test account
3. Mobile app ready for sync verification

---

## SETUP PHASE

### Step 1: Start Desktop App
```bash
pnpm --filter @mydailyops/desktop tauri dev
```

### Step 2: Login
- Use credentials: `ivanydze@gmail.com` / `London2010`
- Wait for sync to complete

### Step 3: Clear All Tasks
**Method 1: Via Supabase Dashboard**
1. Open Supabase Dashboard
2. Go to Table Editor → `tasks`
3. Delete ALL rows for your user_id
4. Refresh Desktop app

**Method 2: Via Desktop App**
1. Delete all tasks manually one by one
2. Verify task list is empty
3. Sync to confirm

### Step 4: Verify Clean State
- Desktop: 0 tasks
- Mobile: 0 tasks (after sync)
- Supabase: 0 tasks for your user

---

## TEST EXECUTION

For each test case, follow these steps:

1. **Create Task** via Desktop UI with exact config from test case
2. **Wait for Generation** - Check console logs for generation messages
3. **Collect Data** - Note all generated instance dates
4. **Verify Count** - Check expected vs actual count
5. **Check Dates** - Verify dates match expected behavior
6. **Log Results** - Record PASS/FAIL in test results

---

## TEST GROUP 1: MONTHLY (DATE)

### Test 1.1: Monthly - Day 31 (3 months ahead)
**Config:**
- Type: Monthly (Date)
- Day: 31
- Generate Ahead: 3 months
- Start Date: Today (note the month)

**Expected Behavior:**
- ✅ Generate for months with 31 days: January, March, May, July, August, October, December
- ❌ Skip February (28/29 days), April (30 days), June (30 days), September (30 days), November (30 days)

**Verification:**
- [ ] Check which months generated tasks
- [ ] Verify February was skipped
- [ ] Verify April was skipped
- [ ] Verify June was skipped (if in range)
- [ ] Record all generated dates

**Log:**
```
Test 1.1 - Monthly Day 31:
Generated dates: [list all dates]
Months skipped: February, April, June
Status: PASS / FAIL
Issues: [any issues]
```

---

### Test 1.2: Monthly - Day 30 (3 months ahead)
**Config:**
- Type: Monthly (Date)
- Day: 30
- Generate Ahead: 3 months

**Expected Behavior:**
- ✅ Generate for all months EXCEPT February
- ❌ Skip February (only has 28/29 days)

**Verification:**
- [ ] Verify February was skipped
- [ ] Verify all other months generated

**Log:**
```
Test 1.2 - Monthly Day 30:
Generated dates: [list]
Months skipped: February
Status: PASS / FAIL
```

---

### Test 1.3: Monthly - Day 29 (6 months ahead)
**Config:**
- Type: Monthly (Date)
- Day: 29
- Generate Ahead: 6 months

**Expected Behavior:**
- ✅ Generate for all months EXCEPT February in non-leap years
- ✅ Generate for February in leap years (2028, 2032, etc.)

**Verification:**
- [ ] Check current year (leap or non-leap)
- [ ] If non-leap: February should be skipped
- [ ] If leap: February should generate on Feb 29

**Log:**
```
Test 1.3 - Monthly Day 29:
Current year: [year] (leap: yes/no)
Generated dates: [list]
February generated: yes/no
Status: PASS / FAIL
```

---

### Test 1.4: Monthly - Day 28
**Config:**
- Type: Monthly (Date)
- Day: 28
- Generate Ahead: 3 months

**Expected Behavior:**
- ✅ Generate for ALL months including February

**Verification:**
- [ ] Verify February generated
- [ ] Verify all other months generated

**Log:**
```
Test 1.4 - Monthly Day 28:
Generated dates: [list]
February included: yes
Status: PASS / FAIL
```

---

## TEST GROUP 2: MONTHLY (WEEKDAY)

### Test 2.1: 1st Monday of Each Month (4 months)
**Config:**
- Type: Monthly (Weekday)
- Weekday: Monday
- Week Number: 1st
- Generate Ahead: 4 months

**Expected Behavior:**
- ✅ Generate exactly 4 tasks (one per month)
- ✅ All should be Mondays
- ✅ All should be 1st Monday of their month

**Verification:**
- [ ] Count = 4
- [ ] All are Mondays
- [ ] All are within first 7 days of month

**Log:**
```
Test 2.1 - 1st Monday:
Generated dates: [list]
Count: 4
All Mondays: yes/no
All 1st Monday: yes/no
Status: PASS / FAIL
```

---

### Test 2.2: Last Friday of Each Month (4 months)
**Config:**
- Type: Monthly (Weekday)
- Weekday: Friday
- Week Number: Last
- Generate Ahead: 4 months

**Expected Behavior:**
- ✅ Generate exactly 4 tasks
- ✅ All should be Fridays
- ✅ All should be last Friday (within last 7 days)

**Verification:**
- [ ] Count = 4
- [ ] All are Fridays
- [ ] Test especially: February (28/29 days), April (30 days), June (30 days)
- [ ] All within last 7 days of month

**Log:**
```
Test 2.2 - Last Friday:
Generated dates: [list]
Count: 4
All Fridays: yes/no
February date: [date]
April date: [date]
Status: PASS / FAIL
```

---

### Test 2.3: 5th Monday of Each Month (6 months)
**Config:**
- Type: Monthly (Weekday)
- Weekday: Monday
- Week Number: 5th
- Generate Ahead: 6 months

**Expected Behavior:**
- ✅ ONLY generate in months that have 5 Mondays
- ❌ Skip months with only 4 Mondays
- ⚠️ CRITICAL: This is the most complex edge case

**Verification:**
- [ ] Manually count Mondays in each month
- [ ] Verify only months with 5 Mondays generated instances
- [ ] Verify months with 4 Mondays were skipped

**How to check if month has 5 Mondays:**
1. Count all Mondays in the month
2. If count = 5 → should generate
3. If count = 4 → should skip

**Log:**
```
Test 2.3 - 5th Monday:
Generated dates: [list]
Months with 5 Mondays: [list months that should generate]
Months with 4 Mondays: [list months that should skip]
Actual generated: [list]
Status: PASS / FAIL
Issues: [detailed issues]
```

---

## TEST GROUP 3: WEEKLY

### Test 3.1: Weekly - Tuesday + Friday (4 weeks)
**Config:**
- Type: Weekly
- Weekdays: Tuesday, Friday
- Generate Ahead: 4 weeks

**Expected Behavior:**
- ✅ Generate exactly 8 tasks (2 per week × 4 weeks)
- ✅ Alternating Tuesday/Friday pattern
- ✅ No duplicates
- ✅ No past dates

**Verification:**
- [ ] Count = 8
- [ ] All are Tuesdays or Fridays
- [ ] Pattern: Tue, Fri, Tue, Fri...
- [ ] No duplicates
- [ ] All future dates

**Log:**
```
Test 3.1 - Weekly Tue+Fri:
Generated dates: [list all 8 dates]
Count: 8
Pattern correct: yes/no
Duplicates: none
Status: PASS / FAIL
```

---

## TEST GROUP 4: INTERVAL

### Test 4.1: Interval - Every 3 Days (9 days ahead)
**Config:**
- Type: Interval
- Interval: 3 days
- Generate Ahead: 9 days

**Expected Behavior:**
- ✅ Generate exactly 3 tasks
- ✅ Dates: Day 3, Day 6, Day 9 (from start)
- ✅ Correct interval spacing

**Verification:**
- [ ] Count = 3
- [ ] Date 1: Start + 3 days
- [ ] Date 2: Start + 6 days
- [ ] Date 3: Start + 9 days

**Log:**
```
Test 4.1 - Interval 3 days:
Start date: [date]
Generated dates: [list 3 dates]
Interval correct: yes/no
Status: PASS / FAIL
```

---

## TEST GROUP 5: DAILY

### Test 5.1: Daily - 7 Days
**Config:**
- Type: Daily
- Generate Ahead: 7 days

**Expected Behavior:**
- ✅ Generate exactly 7 tasks
- ✅ One per day, consecutive
- ✅ No gaps

**Verification:**
- [ ] Count = 7
- [ ] Consecutive days
- [ ] No gaps

**Log:**
```
Test 5.1 - Daily 7 days:
Generated dates: [list 7 dates]
Count: 7
Consecutive: yes/no
Gaps: none
Status: PASS / FAIL
```

---

## TEST GROUP 6: CLEANUP VALIDATION

### Test 6.1: Delete Template (Test 1.1)
**Action:**
1. Delete the template task from Test 1.1
2. Verify behavior

**Expected Behavior:**
- ✅ All FUTURE instances are deleted
- ✅ PAST instances are NOT deleted (if any)
- ✅ Template is deleted
- ✅ Sync to Mobile - verify consistency

**Verification:**
- [ ] Future instances deleted: yes/no
- [ ] Past instances kept: yes/no (if applicable)
- [ ] Template deleted: yes
- [ ] Mobile sync: all changes reflected

**Log:**
```
Test 6.1 - Delete Template:
Future instances deleted: yes/no
Past instances kept: yes/no
Mobile sync: consistent/errors
Status: PASS / FAIL
```

---

### Test 6.2: Delete Single Instance (Interval Test)
**Action:**
1. From Test 4.1 (Interval), delete ONE instance
2. Verify template and other instances remain

**Expected Behavior:**
- ✅ Template remains
- ✅ Other instances remain
- ✅ Only deleted instance is removed

**Verification:**
- [ ] Template exists: yes
- [ ] Other instances exist: yes
- [ ] Deleted instance removed: yes

**Log:**
```
Test 6.2 - Delete Instance:
Template remains: yes/no
Other instances remain: yes/no
Status: PASS / FAIL
```

---

## MOBILE VERIFICATION

### After All Desktop Tests Complete:

1. **Launch Mobile App**
   ```bash
   pnpm dev:mobile
   ```

2. **Sync Tasks**
   - Pull to refresh or wait for auto-sync
   - Verify all generated instances appear

3. **Verify Each Test Case:**
   - [ ] Test 1.1 (Monthly 31) - All instances match Desktop
   - [ ] Test 1.2 (Monthly 30) - All instances match Desktop
   - [ ] Test 1.3 (Monthly 29) - All instances match Desktop
   - [ ] Test 1.4 (Monthly 28) - All instances match Desktop
   - [ ] Test 2.1 (1st Monday) - All instances match Desktop
   - [ ] Test 2.2 (Last Friday) - All instances match Desktop
   - [ ] Test 2.3 (5th Monday) - All instances match Desktop
   - [ ] Test 3.1 (Weekly) - All instances match Desktop
   - [ ] Test 4.1 (Interval) - All instances match Desktop
   - [ ] Test 5.1 (Daily) - All instances match Desktop

4. **Check for Issues:**
   - [ ] Missing tasks
   - [ ] Duplicate tasks
   - [ ] Wrong dates
   - [ ] Sync errors

---

## FINAL REPORT TEMPLATE

```
============================================
RECURRING TASK EDGE CASE TEST REPORT
============================================
Date: [date]
Tester: [name]
Desktop Version: [version]
Mobile Version: [version]

TEST GROUP 1: MONTHLY (DATE)
----------------------------------------
Test 1.1 - Monthly Day 31:     [PASS/FAIL]
Test 1.2 - Monthly Day 30:     [PASS/FAIL]
Test 1.3 - Monthly Day 29:     [PASS/FAIL]
Test 1.4 - Monthly Day 28:     [PASS/FAIL]

TEST GROUP 2: MONTHLY (WEEKDAY)
----------------------------------------
Test 2.1 - 1st Monday:         [PASS/FAIL]
Test 2.2 - Last Friday:        [PASS/FAIL]
Test 2.3 - 5th Monday:         [PASS/FAIL]

TEST GROUP 3: WEEKLY
----------------------------------------
Test 3.1 - Weekly Tue+Fri:     [PASS/FAIL]

TEST GROUP 4: INTERVAL
----------------------------------------
Test 4.1 - Interval 3 days:    [PASS/FAIL]

TEST GROUP 5: DAILY
----------------------------------------
Test 5.1 - Daily 7 days:       [PASS/FAIL]

TEST GROUP 6: CLEANUP
----------------------------------------
Test 6.1 - Delete Template:    [PASS/FAIL]
Test 6.2 - Delete Instance:    [PASS/FAIL]

MOBILE SYNC VERIFICATION
----------------------------------------
All tests synced correctly:    [YES/NO]
Missing tasks:                 [count]
Duplicate tasks:               [count]
Sync errors:                   [list]

SUMMARY
----------------------------------------
Total Tests: 12
Passed: [count]
Failed: [count]
Success Rate: [percentage]%

FAILED TESTS DETAILS
----------------------------------------
[List each failed test with detailed explanation]

ISSUES FOUND
----------------------------------------
1. [Issue description]
2. [Issue description]
...

RECOMMENDATIONS
----------------------------------------
[Any recommendations for fixes]
```

---

## NEXT STEPS

After completing all tests:
1. **Share the full report** with all PASS/FAIL results
2. **Wait for instruction**: "Fix all failing tests"
3. **Then implement fixes** for any failing behaviors

---

## NOTES

- Take screenshots of generated tasks for reference
- Check browser DevTools console for generation logs
- Verify database directly if needed (SQLite for Desktop)
- Document any unexpected behaviors
- Note any performance issues (slow generation, etc.)

