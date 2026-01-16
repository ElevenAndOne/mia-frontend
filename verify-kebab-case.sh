#!/bin/bash

# Script to verify all files are in kebab-case format
# Run this after completing all renames

echo "=== Checking for remaining PascalCase files ==="
echo ""

PASCAL_FILES=$(find src -type f \( -name "*.tsx" -o -name "*.ts" \) -name "*[A-Z]*" | grep -v node_modules)

if [ -z "$PASCAL_FILES" ]; then
    echo "✅ Success! All TypeScript files are now in kebab-case."
    echo ""
else
    echo "❌ The following files still have uppercase letters:"
    echo ""
    echo "$PASCAL_FILES"
    echo ""
    echo "Total files remaining: $(echo "$PASCAL_FILES" | wc -l)"
fi

echo ""
echo "=== Summary ==="
TOTAL_TS_FILES=$(find src -type f \( -name "*.tsx" -o -name "*.ts" \) | grep -v node_modules | wc -l)
echo "Total TypeScript files: $TOTAL_TS_FILES"

if [ -n "$PASCAL_FILES" ]; then
    REMAINING=$(echo "$PASCAL_FILES" | wc -l)
    echo "Files still to rename: $REMAINING"
    exit 1
else
    echo "All files are properly named! ✅"
    exit 0
fi
