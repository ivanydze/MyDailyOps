# Watermark Logo File

To enable the branded watermark background:

1. Place your logo file as `logo.webp` in this directory (`apps/desktop/public/logo.webp`)
2. The watermark will automatically appear behind all app content
3. Opacity is set to 0.04 (light mode) and 0.03 (dark mode) for subtle visibility

**File Requirements:**
- Format: WebP (or PNG/JPG if you update the path in App.tsx)
- Recommended size: 1200x800px or similar for best quality at 70% scale
- Transparent background preferred

The watermark is implemented in `src/App.tsx` and styles are defined in `src/styles.css`.

