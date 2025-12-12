/**
 * Comprehensive Tests for Timezone Utilities (Problem 17)
 * 
 * Tests all timezone-related functions:
 * - getCurrentTimezone()
 * - getTimezoneAbbreviation()
 * - getEventTimeInTimezone()
 * - formatTimeWithTimezone()
 * - formatEventTime()
 * - isValidTimezone()
 * - getCommonTimezones()
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getCurrentTimezone,
  getTimezoneAbbreviation,
  getEventTimeInTimezone,
  formatTimeWithTimezone,
  formatEventTime,
  isValidTimezone,
  getCommonTimezones,
} from './src/utils/timezone';

// Helper function to run tests
function runTest(testName: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${testName}`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${testName}: ${error.message}`);
    console.error('  ', error.stack?.split('\n')[0]);
    return false;
  }
}

// ============================================================================
// SECTION 1: getCurrentTimezone()
// ============================================================================
console.log('\n=== SECTION 1: getCurrentTimezone() ===\n');

let testsPassed = 0;
let testsFailed = 0;

// Test 1.1: Returns a string
if (runTest('1.1: Returns a string', () => {
  const tz = getCurrentTimezone();
  assert(typeof tz === 'string', `Expected string, got ${typeof tz}`);
  assert(tz.length > 0, 'Timezone should not be empty');
})) testsPassed++; else testsFailed++;

// Test 1.2: Returns valid IANA timezone
if (runTest('1.2: Returns valid IANA timezone', () => {
  const tz = getCurrentTimezone();
  assert(isValidTimezone(tz), `Returned timezone "${tz}" is not valid`);
})) testsPassed++; else testsFailed++;

// Test 1.3: Never returns null or undefined
if (runTest('1.3: Never returns null or undefined', () => {
  const tz = getCurrentTimezone();
  assert(tz !== null, 'Should not return null');
  assert(tz !== undefined, 'Should not return undefined');
})) testsPassed++; else testsFailed++;

// ============================================================================
// SECTION 2: getTimezoneAbbreviation()
// ============================================================================
console.log('\n=== SECTION 2: getTimezoneAbbreviation() ===\n');

// Test 2.1: Returns abbreviation for valid timezone
if (runTest('2.1: Returns abbreviation for Europe/London', () => {
  const abbr = getTimezoneAbbreviation('Europe/London');
  assert(typeof abbr === 'string', 'Should return string');
  assert(abbr.length > 0, 'Abbreviation should not be empty');
})) testsPassed++; else testsFailed++;

// Test 2.2: Returns abbreviation for America/New_York
if (runTest('2.2: Returns abbreviation for America/New_York', () => {
  const abbr = getTimezoneAbbreviation('America/New_York');
  assert(typeof abbr === 'string', 'Should return string');
  // Should be EST or EDT depending on DST
  assert(abbr.length >= 3, 'Abbreviation should be at least 3 characters');
})) testsPassed++; else testsFailed++;

// Test 2.3: Handles UTC
if (runTest('2.3: Handles UTC timezone', () => {
  const abbr = getTimezoneAbbreviation('UTC');
  assert(typeof abbr === 'string', 'Should return string');
  assert(abbr.length > 0, 'Abbreviation should not be empty');
})) testsPassed++; else testsFailed++;

// Test 2.4: Returns fallback for invalid timezone
if (runTest('2.4: Returns fallback for invalid timezone', () => {
  const abbr = getTimezoneAbbreviation('Invalid/Timezone');
  assert(typeof abbr === 'string', 'Should return string (fallback)');
  // Should return a fallback (last part of timezone)
  assert(abbr.includes('Timezone'), 'Should return fallback value');
})) testsPassed++; else testsFailed++;

// ============================================================================
// SECTION 3: getEventTimeInTimezone()
// ============================================================================
console.log('\n=== SECTION 3: getEventTimeInTimezone() ===\n');

// Test 3.1: Converts same timezone (should return same time)
if (runTest('3.1: Same timezone returns same time', () => {
  const result = getEventTimeInTimezone('14:00', 'Europe/London', 'Europe/London');
  assert.strictEqual(result, '14:00', 'Same timezone should return same time');
})) testsPassed++; else testsFailed++;

// Test 3.2: Converts UTC to Europe/London (should add offset)
if (runTest('3.2: Converts UTC to Europe/London', () => {
  const result = getEventTimeInTimezone('12:00', 'UTC', 'Europe/London');
  // London is UTC+0 or UTC+1 depending on DST
  // Result should be 12:00 or 13:00
  assert(/^1[23]:00$/.test(result), `Expected 12:00 or 13:00, got ${result}`);
})) testsPassed++; else testsFailed++;

// Test 3.3: Converts America/New_York to Europe/London
if (runTest('3.3: Converts America/New_York to Europe/London', () => {
  const result = getEventTimeInTimezone('09:00', 'America/New_York', 'Europe/London');
  // NY is UTC-5 or UTC-4, London is UTC+0 or UTC+1
  // 09:00 NY should be around 14:00 or 15:00 London
  assert(/^1[45]:00$/.test(result), `Expected 14:00 or 15:00, got ${result}`);
})) testsPassed++; else testsFailed++;

// Test 3.4: Handles invalid time format
if (runTest('3.4: Handles invalid time format gracefully', () => {
  const result = getEventTimeInTimezone('25:00', 'Europe/London', 'Europe/London');
  // Should return original time (fallback)
  assert.strictEqual(result, '25:00', 'Should return original time on error');
})) testsPassed++; else testsFailed++;

// Test 3.5: Handles invalid timezone gracefully
if (runTest('3.5: Handles invalid timezone gracefully', () => {
  const result = getEventTimeInTimezone('14:00', 'Invalid/TZ', 'Europe/London');
  // Should return original time (fallback)
  assert.strictEqual(result, '14:00', 'Should return original time on error');
})) testsPassed++; else testsFailed++;

// Test 3.6: Handles minutes (not just hours)
if (runTest('3.6: Handles minutes correctly', () => {
  const result = getEventTimeInTimezone('14:30', 'UTC', 'Europe/London');
  // Should preserve minutes (or adjust if crossing timezone boundary)
  assert(result.includes(':30'), `Should preserve minutes, got ${result}`);
})) testsPassed++; else testsFailed++;

// ============================================================================
// SECTION 4: formatTimeWithTimezone()
// ============================================================================
console.log('\n=== SECTION 4: formatTimeWithTimezone() ===\n');

// Test 4.1: Same timezone shows only one time
if (runTest('4.1: Same timezone shows only original time', () => {
  const result = formatTimeWithTimezone('14:00', 'Europe/London', 'Europe/London');
  assert.strictEqual(result.original, result.local, 'Same timezone should show same time');
  assert(result.original.includes('14:00'), 'Should include original time');
})) testsPassed++; else testsFailed++;

// Test 4.2: Different timezones show both times
if (runTest('4.2: Different timezones show both times', () => {
  const result = formatTimeWithTimezone('14:00', 'Europe/London', 'America/New_York');
  assert.notStrictEqual(result.original, result.local, 'Different timezones should show different times');
  assert(result.original.includes('14:00'), 'Original should include 14:00');
  assert(result.original.includes('GMT'), 'Original should include timezone abbreviation');
  assert(result.local.includes('('), 'Local should include timezone abbreviation');
})) testsPassed++; else testsFailed++;

// Test 4.3: Returns correct structure
if (runTest('4.3: Returns correct structure with all fields', () => {
  const result = formatTimeWithTimezone('14:00', 'Europe/London', 'America/New_York');
  assert('original' in result, 'Should have original field');
  assert('local' in result, 'Should have local field');
  assert('originalAbbr' in result, 'Should have originalAbbr field');
  assert('localAbbr' in result, 'Should have localAbbr field');
  assert(typeof result.originalAbbr === 'string', 'originalAbbr should be string');
  assert(typeof result.localAbbr === 'string', 'localAbbr should be string');
})) testsPassed++; else testsFailed++;

// ============================================================================
// SECTION 5: formatEventTime()
// ============================================================================
console.log('\n=== SECTION 5: formatEventTime() ===\n');

// Test 5.1: Returns empty string for task without event_time
if (runTest('5.1: Returns empty string for task without event_time', () => {
  const task = { title: 'Test' };
  const result = formatEventTime(task);
  assert.strictEqual(result, '', 'Should return empty string when no event_time');
})) testsPassed++; else testsFailed++;

// Test 5.2: Returns empty string for task without event_timezone
if (runTest('5.2: Returns empty string for task without event_timezone', () => {
  const task = { title: 'Test', event_time: '14:00' };
  const result = formatEventTime(task);
  assert.strictEqual(result, '', 'Should return empty string when no event_timezone');
})) testsPassed++; else testsFailed++;

// Test 5.3: Formats time for same timezone
if (runTest('5.3: Formats time for same timezone', () => {
  const task = { event_time: '14:00', event_timezone: 'Europe/London' };
  const result = formatEventTime(task, 'Europe/London');
  assert(result.includes('14:00'), 'Should include time');
  assert(!result.includes('/'), 'Same timezone should not show / separator');
})) testsPassed++; else testsFailed++;

// Test 5.4: Formats time for different timezone (shows both)
if (runTest('5.4: Formats time for different timezone (shows both)', () => {
  const task = { event_time: '14:00', event_timezone: 'Europe/London' };
  const result = formatEventTime(task, 'America/New_York');
  assert(result.includes('14:00'), 'Should include original time');
  assert(result.includes('/'), 'Different timezone should show / separator');
  assert(result.split('/').length === 2, 'Should have two parts separated by /');
})) testsPassed++; else testsFailed++;

// Test 5.5: Uses current timezone if not provided
if (runTest('5.5: Uses current timezone if localTimezone not provided', () => {
  const task = { event_time: '14:00', event_timezone: getCurrentTimezone() };
  const result = formatEventTime(task);
  assert(result.length > 0, 'Should format time');
  assert(result.includes('14:00'), 'Should include time');
})) testsPassed++; else testsFailed++;

// ============================================================================
// SECTION 6: isValidTimezone()
// ============================================================================
console.log('\n=== SECTION 6: isValidTimezone() ===\n');

// Test 6.1: Returns true for valid timezone
if (runTest('6.1: Returns true for Europe/London', () => {
  assert.strictEqual(isValidTimezone('Europe/London'), true, 'Europe/London should be valid');
})) testsPassed++; else testsFailed++;

// Test 6.2: Returns true for America/New_York
if (runTest('6.2: Returns true for America/New_York', () => {
  assert.strictEqual(isValidTimezone('America/New_York'), true, 'America/New_York should be valid');
})) testsPassed++; else testsFailed++;

// Test 6.3: Returns true for UTC
if (runTest('6.3: Returns true for UTC', () => {
  assert.strictEqual(isValidTimezone('UTC'), true, 'UTC should be valid');
})) testsPassed++; else testsFailed++;

// Test 6.4: Returns false for invalid timezone
if (runTest('6.4: Returns false for invalid timezone', () => {
  assert.strictEqual(isValidTimezone('Invalid/Timezone'), false, 'Invalid timezone should return false');
})) testsPassed++; else testsFailed++;

// Test 6.5: Returns false for empty string
if (runTest('6.5: Returns false for empty string', () => {
  assert.strictEqual(isValidTimezone(''), false, 'Empty string should return false');
})) testsPassed++; else testsFailed++;

// ============================================================================
// SECTION 7: getCommonTimezones()
// ============================================================================
console.log('\n=== SECTION 7: getCommonTimezones() ===\n');

// Test 7.1: Returns array
if (runTest('7.1: Returns array', () => {
  const timezones = getCommonTimezones();
  assert(Array.isArray(timezones), 'Should return array');
})) testsPassed++; else testsFailed++;

// Test 7.2: Returns non-empty array
if (runTest('7.2: Returns non-empty array', () => {
  const timezones = getCommonTimezones();
  assert(timezones.length > 0, 'Should return at least one timezone');
})) testsPassed++; else testsFailed++;

// Test 7.3: Each timezone has correct structure
if (runTest('7.3: Each timezone has correct structure', () => {
  const timezones = getCommonTimezones();
  timezones.forEach((tz, index) => {
    assert('value' in tz, `Timezone ${index} should have value field`);
    assert('label' in tz, `Timezone ${index} should have label field`);
    assert('abbreviation' in tz, `Timezone ${index} should have abbreviation field`);
    assert(typeof tz.value === 'string', `Timezone ${index} value should be string`);
    assert(typeof tz.label === 'string', `Timezone ${index} label should be string`);
    assert(typeof tz.abbreviation === 'string', `Timezone ${index} abbreviation should be string`);
  });
})) testsPassed++; else testsFailed++;

// Test 7.4: Contains expected timezones
if (runTest('7.4: Contains expected popular timezones', () => {
  const timezones = getCommonTimezones();
  const values = timezones.map(tz => tz.value);
  assert(values.includes('Europe/London'), 'Should include Europe/London');
  assert(values.includes('America/New_York'), 'Should include America/New_York');
  assert(values.includes('UTC'), 'Should include UTC');
})) testsPassed++; else testsFailed++;

// Test 7.5: Timezones are sorted alphabetically
if (runTest('7.5: Timezones are sorted alphabetically', () => {
  const timezones = getCommonTimezones();
  const labels = timezones.map(tz => tz.label);
  const sortedLabels = [...labels].sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(labels, sortedLabels, 'Timezones should be sorted alphabetically');
})) testsPassed++; else testsFailed++;

// ============================================================================
// SECTION 8: Integration Tests
// ============================================================================
console.log('\n=== SECTION 8: Integration Tests ===\n');

// Test 8.1: Full flow: create task with event_time, format for display
if (runTest('8.1: Full flow - format task with event_time', () => {
  const task = {
    id: 'test-1',
    title: 'Meeting',
    event_time: '14:00',
    event_timezone: 'Europe/London',
  };
  const formatted = formatEventTime(task, 'America/New_York');
  assert(formatted.includes('14:00'), 'Should include original time');
  assert(formatted.includes('/'), 'Should show both times for different timezones');
})) testsPassed++; else testsFailed++;

// Test 8.2: Round-trip timezone conversion
if (runTest('8.2: Round-trip timezone conversion', () => {
  const originalTime = '14:00';
  const originalTz = 'Europe/London';
  const targetTz = 'America/New_York';
  
  // Convert from London to NY
  const convertedTime = getEventTimeInTimezone(originalTime, originalTz, targetTz);
  
  // Convert back from NY to London
  const backConverted = getEventTimeInTimezone(convertedTime, targetTz, originalTz);
  
  // Should be close to original (within 1 hour due to DST)
  const originalMinutes = 14 * 60;
  const backMinutes = parseInt(backConverted.split(':')[0]) * 60 + parseInt(backConverted.split(':')[1]);
  const diff = Math.abs(backMinutes - originalMinutes);
  
  assert(diff <= 60, `Round-trip should be within 1 hour, got ${backConverted} from ${originalTime}`);
})) testsPassed++; else testsFailed++;

// Test 8.3: Edge case - midnight
if (runTest('8.3: Handles midnight (00:00)', () => {
  const result = getEventTimeInTimezone('00:00', 'UTC', 'Europe/London');
  // Midnight UTC should be 00:00 or 01:00 in London (depending on DST)
  // Normalized from 24:00 if needed
  assert(/^(0[01]|24):00$/.test(result) || result === '00:00' || result === '01:00', 
    `Expected 00:00 or 01:00, got ${result}`);
  // Verify it's valid time format
  const [hours, minutes] = result.split(':').map(Number);
  assert(hours >= 0 && hours <= 23, `Hour should be 0-23, got ${hours}`);
  assert(minutes >= 0 && minutes <= 59, `Minutes should be 0-59, got ${minutes}`);
})) testsPassed++; else testsFailed++;

// Test 8.4: Edge case - 23:59
if (runTest('8.4: Handles late night (23:59)', () => {
  const result = getEventTimeInTimezone('23:59', 'UTC', 'Europe/London');
  assert(result.includes('23') || result.includes('00'), `Should handle late night time, got ${result}`);
})) testsPassed++; else testsFailed++;

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📊 Total:  ${testsPassed + testsFailed}`);
console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60) + '\n');

if (testsFailed > 0) {
  console.error('⚠️  Some tests failed. Please review the output above.');
  process.exit(1);
} else {
  console.log('🎉 All tests passed!');
  process.exit(0);
}

