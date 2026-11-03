# Task: Web — Fase 6, bundle

Status: review — branch `perf/web-fase-6-bundle` (empilhado sobre a fase 5).

## O que mudou

- Sem barris `features/*/index.ts`: `route-modules.ts` importa cada página direto. Lista e
  detalhe (pacientes, documentos) viraram chunks separados, e a página de entrada do
  paciente na teleconsulta não baixa mais a página da psicóloga.
- Chunks de vendor (`vendor-react`, `vendor-data`) via `rolldownOptions.output.codeSplitting`:
  JS inicial 722 → 707 KB (229 → 221,5 KB gzip) e o código do app fica num chunk de 176 KB
  (55 KB gzip) — um deploy invalida só ele; as bibliotecas continuam no cache.
- Screenshots da landing em WebP: 651 → 222 KB (−66%), sem diferença visual.
- Formulário da agenda lazy e PapaParse dinâmico (fases 2 e 5).

## Não feito (avaliado)

- `AppLayout` lazy: economizaria ~10 KB gzip só para visitantes deslogados (o resto do
  chunk — Radix, floating-ui, sonner, tailwind-merge — também é usado pela landing/login).

## Verificação

`bun run build:web`, `bun test`, lint 0. Manual: abrir landing, login e uma tela interna
com o DevTools > Network e conferir que `vendor-*` vem do cache no segundo acesso.
