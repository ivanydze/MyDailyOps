# Branded Watermark Implementation

## Summary

Subtle branded watermark background has been added to both Desktop and Mobile applications. The watermark is non-intrusive, doesn't affect readability, and automatically adjusts for light/dark modes.

## Implementation Details

### Desktop App (Tauri + React)

**File:** `apps/desktop/src/App.tsx`

- Watermark overlay added as a fixed-position div
- Positioned at 18% from top, centered horizontally
- Size: 70% of container width
- Opacity: 0.04 (light mode), 0.03 (dark mode)
- Uses CSS variable `--watermark-opacity` for theme-aware opacity
- `z-index: -1` ensures it stays behind all content
- `pointer-events: none` prevents interaction blocking

**CSS:** `apps/desktop/src/styles.css`
- Added CSS variables for watermark opacity
- Dark mode uses slightly lower opacity (0.03 vs 0.04)

**Logo File Location:**
- Place `logo.webp` in `apps/desktop/public/logo.webp`
- Vite will serve it from the root (`/logo.webp`)

### Mobile App (React Native)

**File:** `apps/mobile/app/_layout.tsx`

- Watermark added using React Native `Image` component
- Positioned at 10% from top, centered horizontally
- Width: 70% of screen width
- Maintains aspect ratio using `aspectRatio: 3/2`
- Opacity: 0.04 (light mode), 0.03 (dark mode)
- Dynamically adjusts based on `useColorScheme()` hook
- `zIndex: -1` ensures it stays behind all content

**Logo File Location:**
- Place `logo.webp` in `apps/mobile/assets/logo.webp`
- Imported using `require('../assets/logo.webp')`

## Setup Instructions

### 1. Add Logo File to Desktop

1. Copy your `logo.webp` file to `apps/desktop/public/logo.webp`
2. The watermark will automatically appear in the app

**Alternative formats:** If using PNG or JPG, update line 119 in `apps/desktop/src/App.tsx`:
```tsx
backgroundImage: 'url(/logo.png)',  // Change .webp to .png or .jpg
```

### 2. Add Logo File to Mobile

1. Copy your `logo.webp` file to `apps/mobile/assets/logo.webp`
2. The watermark will automatically appear in the app

**Alternative formats:** If using PNG, update line 59 in `apps/mobile/app/_layout.tsx`:
```tsx
source={require('../assets/logo.png')}  // Change .webp to .png
```

**Note:** React Native `require()` must point to a file that exists at build time. If the file doesn't exist, the build will fail with a clear error message.

## Visual Specifications

### Desktop
- **Position:** Center horizontally, 18% from top
- **Size:** 70% of container width
- **Opacity:**
  - Light mode: 0.04 (4%)
  - Dark mode: 0.03 (3%)
- **Layering:** Behind all UI elements (`z-index: -1`)

### Mobile
- **Position:** Center horizontally, 10% from top
- **Size:** 70% of screen width
- **Aspect Ratio:** 3:2 (adjust in `styles.watermark.aspectRatio` if needed)
- **Opacity:**
  - Light mode: 0.04 (4%)
  - Dark mode: 0.03 (3%)
- **Layering:** Behind all UI elements (`zIndex: -1`)

## Design Considerations

1. **Non-intrusive:** Opacity set very low (3-4%) to ensure readability
2. **Theme-aware:** Automatically adjusts opacity for dark mode
3. **Performance:** Uses fixed positioning for minimal re-renders
4. **Accessibility:** `pointer-events: none` ensures no interaction issues
5. **Responsive:** Scales proportionally on all screen sizes

## Testing Checklist

- [ ] Desktop Light Mode: Watermark visible but subtle
- [ ] Desktop Dark Mode: Watermark visible but subtle (slightly lighter)
- [ ] Mobile Light Mode: Watermark visible but subtle
- [ ] Mobile Dark Mode: Watermark visible but subtle (slightly lighter)
- [ ] All UI elements remain fully readable
- [ ] No interaction issues (buttons, links work normally)
- [ ] No layout shifts or scrolling issues
- [ ] Watermark appears on all screens (Today, All Tasks, New Task, Edit Task, etc.)

## Troubleshooting

### Desktop: Watermark not appearing
- Check that `logo.webp` exists in `apps/desktop/public/`
- Verify the file path in browser DevTools Network tab
- Check browser console for 404 errors

### Mobile: Build fails
- Ensure `logo.webp` exists in `apps/mobile/assets/`
- Verify the import path matches the file location
- Try clearing Metro bundler cache: `npx expo start -c`

### Watermark too visible/not visible enough
- Adjust opacity values in:
  - Desktop: `apps/desktop/src/styles.css` (CSS variables)
  - Mobile: `apps/mobile/app/_layout.tsx` (line 49)

### Watermark position incorrect
- Desktop: Adjust `backgroundPosition` in `App.tsx` (line 121)
- Mobile: Adjust `top` value in `styles.watermark` (line 83)

## Files Modified

1. `apps/desktop/src/App.tsx` - Added watermark overlay div
2. `apps/desktop/src/styles.css` - Added CSS variables for opacity
3. `apps/mobile/app/_layout.tsx` - Added watermark Image component
4. `apps/desktop/public/README_WATERMARK.md` - Setup instructions
5. `apps/mobile/assets/README_WATERMARK.md` - Setup instructions

## Notes

- The watermark will not display if the logo file is missing (Desktop shows nothing, Mobile build fails)
- Aspect ratio for mobile is set to 3:2 - adjust if your logo has different proportions
- All functionality remains unchanged - this is a visual enhancement only

