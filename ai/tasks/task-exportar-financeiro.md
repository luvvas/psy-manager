# Task: Exportar o financeiro do mês

Status: ready

## Goal

Na tela Financeiro, a psicóloga escolhe um mês e baixa um arquivo que abre direto no Excel
com todas as transações daquele mês.

## Context

- `apps/web/src/features/financeiro/page.tsx` — tela atual (só importação de CSV).
- `apps/api/src/routes/financial.ts` — `financial.list` já aceita `startDate`/`endDate`.
- `apps/web/src/features/financeiro/csv-import.ts` e `apps/web/src/components/csv-import/` —
  `papaparse` já está no web e serve também para gerar CSV (`Papa.unparse`).
- `ai/context/frontend-guidelines.md`.

## Requirements

- Ação "Exportar" no `AppHeader` da tela Financeiro, com seletor de mês (padrão: mês atual).
- Busca pelo `financial.list` com o intervalo do mês; nada de procedure nova se a lista
  já traz os campos necessários.
- CSV em UTF-8 **com BOM** e separador `;` (o Excel em pt-BR abre certo assim), datas
  `dd/mm/aaaa`, valores com vírgula decimal, colunas e cabeçalhos em português.
- Nome do arquivo: `financeiro-AAAA-MM.csv`.
- Linha final com os totais de entradas, saídas e saldo.

## Constraints

- Texto visível em pt-BR. Sem comentários no código.
- Sem dependência nova (`xlsx` não entra; CSV basta).
- Só dados da própria psicóloga (o `financial.list` já filtra pela sessão).

## Acceptance Criteria

- O arquivo abre no Excel e no LibreOffice com acentos e colunas corretos.
- Mês sem transações gera um arquivo só com cabeçalho e totais zerados.
- Teste unitário no web da função que monta o CSV.

## Suggested Verification

```bash
bun run test:web
bun run --filter @psy-manager/web lint
bun run build:web
```
