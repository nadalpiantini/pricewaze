#!/bin/bash

# Script to clear all caches for development
# This helps when you're not seeing frontend changes

echo "🧹 Clearing all caches..."

# Clear Next.js cache
echo "📦 Clearing Next.js cache (.next/)..."
rm -rf .next
echo "✅ Next.js cache cleared"

# Clear TypeScript build info
echo "📝 Clearing TypeScript build info..."
find . -name "*.tsbuildinfo" -delete
echo "✅ TypeScript build info cleared"

# Clear node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
  echo "📦 Clearing node_modules cache..."
  rm -rf node_modules/.cache
  echo "✅ node_modules cache cleared"
fi

echo ""
echo "✅ All caches cleared!"
echo ""
echo "📋 Next steps:"
echo "1. Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)"
echo "2. Open DevTools > Application > Service Workers > Unregister all service workers"
echo "3. Clear browser cache: DevTools > Application > Storage > Clear site data"
echo "4. Restart dev server: pnpm dev"
echo ""
