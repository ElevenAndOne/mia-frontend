#!/usr/bin/env python3
"""
Update all import statements after file renaming.
This script is more reliable than sed-based approaches.
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Tuple

# Load the rename mapping
SCRIPT_DIR = Path(__file__).parent
MAPPING_FILE = SCRIPT_DIR / 'rename-mapping.json'

def load_mappings() -> List[Tuple[str, str]]:
    """Load rename mappings from JSON file."""
    with open(MAPPING_FILE, 'r') as f:
        data = json.load(f)

    mappings = []
    for category in data['rename_mappings'].values():
        if isinstance(category, list):
            for item in category:
                old_path = item['from'].replace('src/', '')
                new_path = item['to'].replace('src/', '')
                # Remove file extensions for matching
                old_path = re.sub(r'\.(tsx?|jsx?)$', '', old_path)
                new_path = re.sub(r'\.(tsx?|jsx?)$', '', new_path)
                mappings.append((old_path, new_path))

    return mappings

def update_import_in_line(line: str, mappings: List[Tuple[str, str]]) -> str:
    """Update import statement in a single line."""
    original_line = line

    for old_path, new_path in mappings:
        old_file = os.path.basename(old_path)
        new_file = os.path.basename(new_path)
        old_dir = os.path.dirname(old_path)
        new_dir = os.path.dirname(new_path)

        # Pattern 1: Exact full path match
        # from './components/OldFile' or from '../components/OldFile'
        pattern1 = rf"(from\s+['\"`])(\./|\.\./)({re.escape(old_path)})(['\"`])"
        replacement1 = rf"\1\2{new_path}\4"
        line = re.sub(pattern1, replacement1, line)

        # Pattern 2: File name only (when in same/parent dir)
        # from './OldFile'
        if old_file != new_file:
            pattern2 = rf"(from\s+['\"`](?:\./|\.\./)?)({re.escape(old_file)})(['\"`])"
            replacement2 = rf"\1{new_file}\3"
            line = re.sub(pattern2, replacement2, line)

        # Pattern 3: Alias imports (if using @/ or similar)
        pattern3 = rf"(from\s+['\"`]@/)({re.escape(old_path)})(['\"`])"
        replacement3 = rf"\1{new_path}\3"
        line = re.sub(pattern3, replacement3, line)

    return line

def process_file(file_path: Path, mappings: List[Tuple[str, str]]) -> int:
    """Process a single file and update imports."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        updated_lines = []
        changes = 0

        for line in lines:
            updated_line = update_import_in_line(line, mappings)
            if updated_line != line:
                changes += 1
            updated_lines.append(updated_line)

        if changes > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(updated_lines)

        return changes
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return 0

def find_typescript_files(src_dir: Path) -> List[Path]:
    """Find all TypeScript and JavaScript files."""
    extensions = ['.ts', '.tsx', '.js', '.jsx']
    files = []

    for ext in extensions:
        files.extend(src_dir.rglob(f'*{ext}'))

    return [f for f in files if 'node_modules' not in str(f)]

def main():
    """Main execution."""
    print("=== Import Update Script (Python) ===\n")

    # Load mappings
    print("Loading rename mappings...")
    mappings = load_mappings()
    print(f"Found {len(mappings)} file renames\n")

    # Find all TypeScript files
    src_dir = SCRIPT_DIR / 'src'
    if not src_dir.exists():
        print(f"Error: src directory not found at {src_dir}")
        return 1

    print("Finding TypeScript files...")
    files = find_typescript_files(src_dir)
    print(f"Found {len(files)} files to process\n")

    # Process each file
    print("Updating imports...")
    total_changes = 0
    files_changed = []

    for file_path in files:
        changes = process_file(file_path, mappings)
        if changes > 0:
            total_changes += changes
            files_changed.append(file_path)
            relative_path = file_path.relative_to(SCRIPT_DIR)
            print(f"  ✓ {relative_path} ({changes} change{'s' if changes != 1 else ''})")

    # Summary
    print(f"\n{'='*50}")
    print("Summary:")
    print(f"  Files processed: {len(files)}")
    print(f"  Files modified: {len(files_changed)}")
    print(f"  Total changes: {total_changes}")

    if files_changed:
        print(f"\n{'='*50}")
        print("Modified files:")
        for file_path in files_changed:
            print(f"  - {file_path.relative_to(SCRIPT_DIR)}")

    print(f"\n{'='*50}")
    if total_changes > 0:
        print("✅ Import updates complete!")
        print("\nNext steps:")
        print("  1. Run: npm run type-check")
        print("  2. Run: npm run build")
        print("  3. Review changes: git diff")
    else:
        print("ℹ️  No import statements needed updating.")

    return 0

if __name__ == '__main__':
    exit(main())
