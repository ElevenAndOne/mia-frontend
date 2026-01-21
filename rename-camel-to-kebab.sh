find . -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  dir="$(dirname "$file")"
  base="$(basename "$file")"

  kebab="$(echo "$base" \
    | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g' \
    | sed -E 's/([A-Z])([A-Z][a-z])/\1-\2/g' \
    | tr '[:upper:]' '[:lower:]')"

  if [ "$base" != "$kebab" ]; then
    mv -n "$file" "$dir/$kebab"
  fi
done
