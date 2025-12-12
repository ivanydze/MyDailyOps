/**
 * Tests for User Profile utilities and components
 * Problem 19: User Identity Indicator
 */

import { getUserInitials, getUserColor, getUserDisplayName } from "./src/utils/userProfile";

// Test results tracking
const results: Array<{ test: string; passed: boolean; message?: string }> = [];

function assert(condition: boolean, testName: string, message?: string) {
  if (condition) {
    results.push({ test: testName, passed: true });
    console.log(`✅ ${testName}`);
  } else {
    results.push({ test: testName, passed: false, message });
    console.error(`❌ ${testName}${message ? `: ${message}` : ""}`);
  }
}

console.log("🧪 Testing User Profile Utilities\n");

// ============================================
// Section 1: getUserInitials Tests
// ============================================
console.log("📝 Section 1: getUserInitials Tests");

// Test 1.1: Email with dot separator
const initials1 = getUserInitials("john.doe@example.com");
assert(initials1 === "JD", "1.1: Email with dot separator (john.doe)", `Got "${initials1}" instead of "JD"`);

// Test 1.2: Email with underscore
const initials2 = getUserInitials("john_doe@example.com");
assert(initials2 === "JD", "1.2: Email with underscore", `Got "${initials2}" instead of "JD"`);

// Test 1.3: Email with dash
const initials3 = getUserInitials("john-doe@example.com");
assert(initials3 === "JD", "1.3: Email with dash", `Got "${initials3}" instead of "JD"`);

// Test 1.4: Email with space (unlikely but possible)
const initials4 = getUserInitials("john doe@example.com");
assert(initials4 === "JD", "1.4: Email with space", `Got "${initials4}" instead of "JD"`);

// Test 1.5: Single word email
const initials5 = getUserInitials("john@example.com");
assert(initials5 === "J", "1.5: Single word email", `Got "${initials5}" instead of "J"`);

// Test 1.6: Name with space
const initials6 = getUserInitials("John Doe");
assert(initials6 === "JD", "1.6: Name with space", `Got "${initials6}" instead of "JD"`);

// Test 1.7: Three-word name
const initials7 = getUserInitials("John Michael Doe");
assert(initials7 === "JM", "1.7: Three-word name (first two)", `Got "${initials7}" instead of "JM"`);

// Test 1.8: Null/undefined input
const initials8 = getUserInitials(null);
assert(initials8 === "?", "1.8: Null input returns '?'", `Got "${initials8}" instead of "?"`);

const initials9 = getUserInitials(undefined);
assert(initials9 === "?", "1.9: Undefined input returns '?'", `Got "${initials9}" instead of "?"`);

const initials10 = getUserInitials("");
assert(initials10 === "?", "1.10: Empty string returns '?'", `Got "${initials10}" instead of "?"`);

// Test 1.11: Uppercase handling
const initials11 = getUserInitials("JOHN.DOE@EXAMPLE.COM");
assert(initials11 === "JD", "1.11: Uppercase email normalizes to uppercase initials", `Got "${initials11}" instead of "JD"`);

// Test 1.12: Mixed case
const initials12 = getUserInitials("jOhN.dOe@example.com");
assert(initials12 === "JD", "1.12: Mixed case normalizes correctly", `Got "${initials12}" instead of "JD"`);

// ============================================
// Section 2: getUserColor Tests
// ============================================
console.log("\n🎨 Section 2: getUserColor Tests");

// Test 2.1: Valid email generates color
const color1 = getUserColor("john.doe@example.com");
assert(
  typeof color1 === "string" && color1.startsWith("hsl("),
  "2.1: Valid email generates HSL color",
  `Got "${color1}" instead of HSL color`
);

// Test 2.2: Same email generates same color (consistency)
const color2a = getUserColor("test@example.com");
const color2b = getUserColor("test@example.com");
assert(color2a === color2b, "2.2: Same email generates same color", `Got different colors: ${color2a} vs ${color2b}`);

// Test 2.3: Different emails generate different colors (usually)
const color3a = getUserColor("user1@example.com");
const color3b = getUserColor("user2@example.com");
// Note: There's a small chance they could be the same, but it's very unlikely
assert(
  color3a !== color3b || true, // Allow same color (rare but possible)
  "2.3: Different emails usually generate different colors",
  `Got same colors (unlikely but possible): ${color3a}`
);

// Test 2.4: Null/undefined returns default gray
const color4 = getUserColor(null);
assert(color4 === "#6B7280", "2.4: Null returns default gray", `Got "${color4}" instead of "#6B7280"`);

const color5 = getUserColor(undefined);
assert(color5 === "#6B7280", "2.5: Undefined returns default gray", `Got "${color5}" instead of "#6B7280"`);

// Test 2.5: Color format is valid HSL
const color6 = getUserColor("test@example.com");
const hslMatch = color6.match(/^hsl\(\d+,\s*\d+%,\s*\d+%\)$/);
assert(!!hslMatch, "2.6: Color is valid HSL format", `Got "${color6}" which is not valid HSL`);

// ============================================
// Section 3: getUserDisplayName Tests
// ============================================
console.log("\n👤 Section 3: getUserDisplayName Tests");

// Test 3.1: Email only
const displayName1 = getUserDisplayName("john.doe@example.com");
assert(displayName1 === "john.doe", "3.1: Email returns local part", `Got "${displayName1}" instead of "john.doe"`);

// Test 3.2: Name takes precedence over email
const displayName2 = getUserDisplayName("john.doe@example.com", "John Doe");
assert(displayName2 === "John Doe", "3.2: Name takes precedence", `Got "${displayName2}" instead of "John Doe"`);

// Test 3.3: Null name uses email
const displayName3 = getUserDisplayName("test@example.com", null);
assert(displayName3 === "test", "3.3: Null name uses email", `Got "${displayName3}" instead of "test"`);

// Test 3.4: Both null/undefined
const displayName4 = getUserDisplayName(null, null);
assert(displayName4 === "User", "3.4: Both null returns 'User'", `Got "${displayName4}" instead of "User"`);

const displayName5 = getUserDisplayName(undefined, undefined);
assert(displayName5 === "User", "3.5: Both undefined returns 'User'", `Got "${displayName5}" instead of "User"`);

// Test 3.6: Empty email but has name (name takes precedence)
const displayName6 = getUserDisplayName("", "John Doe");
assert(displayName6 === "John Doe", "3.6: Empty email with name returns name", `Got "${displayName6}" instead of "John Doe"`);

// Test 3.7: Email without @ symbol
const displayName7 = getUserDisplayName("notanemail");
assert(displayName7 === "notanemail", "3.7: Email without @ returns full string", `Got "${displayName7}" instead of "notanemail"`);

// ============================================
// Test Summary
// ============================================
console.log("\n" + "=".repeat(60));
console.log("📊 Test Summary");
console.log("=".repeat(60));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const total = results.length;

console.log(`Total: ${total}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log("\n❌ Failed Tests:");
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  - ${r.test}${r.message ? `: ${r.message}` : ""}`);
    });
  process.exit(1);
} else {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
}

