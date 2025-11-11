#!/bin/bash
# Automated script to add .js extensions to relative imports for NodeNext compatibility
#
# This script:
# 1. Finds all TypeScript files with relative imports
# 2. Adds .js extension to imports that don't have an extension
# 3. Preserves imports that already have .js, .json, etc.
# 4. Works with both single and double quotes

set -e

echo "🔍 Finding TypeScript files with missing .js extensions..."

# Find all .ts files (excluding .d.ts, node_modules, dist)
FILES=$(find packages -name "*.ts" \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -name "*.d.ts")

FIXED_COUNT=0
TOTAL_FILES=0

for file in $FILES; do
  if grep -qE "from ['\"]\\.[^'\"]*['\"]" "$file" 2>/dev/null; then
    # Check if file has imports without extensions
    if grep -E "from ['\"]\\.[^'\"]*['\"]" "$file" | grep -qvE "\\.(js|json|mjs|cjs)['\"]"; then
      TOTAL_FILES=$((TOTAL_FILES + 1))
      echo "  📝 Fixing: $file"

      # Create backup
      cp "$file" "$file.bak"

      # Fix single-quote imports: from './path' -> from './path.js'
      # Fix double-quote imports: from "../path" -> from "../path.js"
      # Only add .js if there's no extension already
      sed -i -E \
        -e "s|from (['\"])(\\.[^'\"]*?)(['\"])|from \\1\\2.js\\3|g" \
        -e "s|\\.js\\.js|.js|g" \
        -e "s|\\.json\\.js|.json|g" \
        -e "s|\\.mjs\\.js|.mjs|g" \
        -e "s|\\.cjs\\.js|.cjs|g" \
        "$file"

      # Verify the fix worked
      if [ $? -eq 0 ]; then
        FIXED_COUNT=$((FIXED_COUNT + 1))
        rm "$file.bak"
      else
        echo "  ❌ Error fixing $file, restoring backup"
        mv "$file.bak" "$file"
      fi
    fi
  fi
done

echo ""
echo "✅ Fixed $FIXED_COUNT out of $TOTAL_FILES files"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test build: pnpm run build"
echo "  3. If issues, revert: git checkout -- packages"
