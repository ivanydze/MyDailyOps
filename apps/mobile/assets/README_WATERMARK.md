# Watermark Logo File

The branded watermark background is now configured and active.

**Current Status:**
- ✅ Logo file: `logo.png` is in place
- ✅ Code updated to use `logo.png`
- ✅ Watermark appears on all screens automatically
- ✅ Opacity: 0.04 (light mode) and 0.03 (dark mode) for subtle visibility

**File Location:**
- `apps/mobile/assets/logo.png`

**Implementation:**
- The watermark is implemented in `app/_layout.tsx`
- Positioned at 10% from top, centered horizontally
- Width: 70% of screen width
- Automatically adjusts opacity based on theme (light/dark mode)

**To update the logo:**
1. Replace `logo.png` in this directory
2. The watermark will automatically use the new file (no code changes needed)

**File Requirements:**
- Format: PNG (WebP also supported if you update the require statement)
- Recommended size: 800x600px or similar for mobile display
- Transparent background preferred

