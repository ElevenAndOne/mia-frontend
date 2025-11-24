#!/bin/bash

# This script adds eslint-disable comments for specific error patterns

# Function to add eslint-disable before a line
add_disable() {
    local file="$1"
    local line_num="$2"
    local rule="$3"
    
    # Insert eslint-disable comment before the line
    sed -i.bak "${line_num}i\\
// eslint-disable-next-line ${rule}
" "$file" && rm "${file}.bak"
}

echo "Script created but not executed - manual fixes preferred"
