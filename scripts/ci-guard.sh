#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-origin/${GITHUB_BASE_REF:-master}}"
ALLOW_SKIP="${ALLOW_SKIP:-false}"

TEST_FILES='^apps/[^/]+/(tests|tests-integration)/|\.(test|spec)\.tsx?$'
SKIP_CALL='\.(skip|only|todo|fixme)\('
PROTECTED='^(\.github/|docker/|scripts/|\.githooks/|package\.json$|apps/[^/]+/package\.json$|bun\.lock$|apps/api/drizzle/|apps/api/src/lib/auth\.ts$|apps/e2e/playwright\.config\.ts$|docker-compose[^/]*\.yml$|\.trivyignore$)'

failed=0

deleted=$(git diff --name-only --diff-filter=D "$BASE"...HEAD | grep -E "$TEST_FILES" || true)
if [ -n "$deleted" ]; then
    echo "::error::Arquivos de teste apagados neste PR:"
    echo "$deleted" | sed 's/^/  - /'
    failed=1
fi

changed_tests=$(git diff --name-only --diff-filter=AMR "$BASE"...HEAD | grep -E "$TEST_FILES" || true)
if [ -n "$changed_tests" ]; then
    added_skips=""
    while IFS= read -r file; do
        hits=$(git diff -U0 "$BASE"...HEAD -- "$file" | grep -E '^\+[^+]' | grep -E "$SKIP_CALL" || true)
        if [ -n "$hits" ]; then
            added_skips+="$file"$'\n'"$(echo "$hits" | sed 's/^+/    /')"$'\n'
        fi
    done <<< "$changed_tests"

    if [ -n "$added_skips" ]; then
        if [ "$ALLOW_SKIP" = "true" ]; then
            echo "::warning::.skip/.only/.todo/.fixme novos liberados pela label allow-skip:"
            printf '%s' "$added_skips"
        else
            echo "::error::.skip/.only/.todo/.fixme novos em testes (use a label allow-skip se for intencional):"
            printf '%s' "$added_skips"
            failed=1
        fi
    fi
fi

protected=$(git diff --name-only "$BASE"...HEAD | grep -E "$PROTECTED" || true)
if [ -n "$protected" ]; then
    echo "Caminhos protegidos alterados (exigem revisão manual):"
    echo "$protected" | sed 's/^/  - /'
    touched=true
else
    touched=false
fi
if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "protected=$touched" >> "$GITHUB_OUTPUT"
fi

if [ "$failed" -eq 0 ]; then
    echo "Guard OK."
fi
exit "$failed"
