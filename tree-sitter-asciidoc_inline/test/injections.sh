#!/bin/sh
set -eu

fixture=$(mktemp)
trap 'rm -f "$fixture"' EXIT
printf '%s\n' 'stem:[s] asciimath:[a] latexmath:[l]' >"$fixture"

output=$(tree-sitter query queries/injections.scm "$fixture" --captures 2>/dev/null)
content_count=$(printf '%s\n' "$output" | awk '/capture: [0-9]+ - injection.content/{count++} END{print count+0}')
asciimath_count=$(printf '%s\n' "$output" | awk '/_asciimath.*text: `(stem|asciimath)`/{count++} END{print count+0}')
latex_count=$(printf '%s\n' "$output" | awk '/_latex.*text: `latexmath`/{count++} END{print count+0}')

if [ "$content_count" -ne 3 ] || [ "$asciimath_count" -ne 2 ] || [ "$latex_count" -ne 1 ]; then
  printf '%s\n' "$output"
  exit 1
fi
