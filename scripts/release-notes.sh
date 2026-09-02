#!/usr/bin/env bash
#
# Gera notas de versao em Markdown a partir do historico de commits.
# O historico de commits e a fonte da verdade: nao existe changelog manual.
#
# Uso:
#   scripts/release-notes.sh                 # da ultima tag ate HEAD
#   scripts/release-notes.sh v1.0.0          # de v1.0.0 ate HEAD
#   scripts/release-notes.sh v1.0.0 v1.1.0   # entre as duas tags
set -euo pipefail

FROM="${1:-}"
TO="${2:-HEAD}"

if [ -z "$FROM" ]; then
    FROM=$(git describe --tags --abbrev=0 "${TO}^" 2>/dev/null || echo "")
fi

if [ -n "$FROM" ]; then
    RANGE="${FROM}..${TO}"
    CABECALHO="Comparando \`${FROM}\` com \`${TO}\`."
else
    RANGE="$TO"
    CABECALHO="Primeira versao: todo o historico ate \`${TO}\`."
fi

# %s e sempre uma unica linha, entao hash<TAB>assunto e seguro para ler linha a linha.
LISTA=$(git log --no-merges --reverse --format='%h%x09%s' "$RANGE")

# Hashes cujo CORPO declara BREAKING CHANGE (--grep varre a mensagem inteira).
QUEBRAS=$(git log --no-merges --format='%h' --grep='^BREAKING CHANGE:' "$RANGE" 2>/dev/null || true)

eh_quebra() {
    local hash="$1" assunto="$2"
    case "$assunto" in *'!:'*) return 0 ;; esac
    printf '%s\n' "$QUEBRAS" | grep -qx "$hash"
}

formata() {
    local hash="$1" assunto="$2" escopo texto
    escopo=$(printf '%s' "$assunto" | sed -nE 's/^[a-z]+\(([a-z0-9./-]+)\)!?:.*/\1/p')
    texto=$(printf '%s' "$assunto" | sed -E 's/^[a-z]+(\([a-z0-9./-]+\))?!?: *//')
    if [ -n "$escopo" ]; then
        printf -- '- **%s:** %s (`%s`)\n' "$escopo" "$texto" "$hash"
    else
        printf -- '- %s (`%s`)\n' "$texto" "$hash"
    fi
}

secao() {
    local titulo="$1" filtro="$2" so_quebras="${3:-nao}" saida="" hash assunto
    while IFS=$'\t' read -r hash assunto; do
        [ -z "${hash:-}" ] && continue
        if [ "$so_quebras" = sim ]; then
            eh_quebra "$hash" "$assunto" || continue
        else
            eh_quebra "$hash" "$assunto" && continue
            printf '%s' "$assunto" | grep -qE "$filtro" || continue
        fi
        saida="${saida}$(formata "$hash" "$assunto")"$'\n'
    done <<< "$LISTA"
    [ -n "$saida" ] && printf '### %s\n\n%s\n' "$titulo" "$saida"
    return 0
}

echo "$CABECALHO"
echo
secao "Mudancas incompativeis" '.' sim
secao "Novidades"           '^feat(\(|!|:)'
secao "Correcoes"           '^fix(\(|!|:)'
secao "Performance"         '^perf(\(|!|:)'
secao "Refatoracoes"        '^refactor(\(|!|:)'
secao "Documentacao"        '^docs(\(|!|:)'
secao "Infra e manutencao"  '^(ci|build|chore|test|style)(\(|!|:)'
