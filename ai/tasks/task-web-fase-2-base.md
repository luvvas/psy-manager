# Task: Web — Fase 2, base compartilhada

Status: review — implementado no branch `refactor/web-fase-2-base` (empilhado sobre a Fase 1).

## Goal

Criar a base que as fases seguintes usam e que gerava os `any` e a duplicação: tipos do
tRPC, política de queries, helpers, import de CSV único, DataTable 2.0, e alinhar a skill
`nova-tela` e os templates com ela.

## O que mudou

- **Tipos da API** — `RouterOutputs`/`RouterInputs` em `lib/trpc.ts`. A API tipa colunas
  `text` com `.$type<>()` + `z.enum` na entrada (agendamento: `type`/`sessionType`;
  transação: `type`/`status`), sem migration. `inferAdditionalFields` no auth client.
- **Queries** — retry global em `lib/query-client.ts` (4xx não repete, rede/5xx uma vez) e
  401 → `/login`; os 22 `retry: false` por tela saíram. `staleTime` fica para a Fase 4,
  junto com a invalidação (sem ela o Início ficaria até 30 s velho).
- **Helpers** — `formatCurrency` (7 cópias de `Intl.NumberFormat`) e `getErrorMessage` em
  `utils/format.ts`; `src/vite-env.d.ts`.
- **CSV** — `components/csv-import/` (`useCsvImport`, `CsvColumnMapper`, tipos); campos e
  mapeadores em `features/{financeiro,pacientes}/csv-import.ts`; PapaParse dinâmico (19 KB
  fora do chunk do financeiro); os dois importadores duplicados foram apagados.
- **DataTable** — `isLoading` (esqueleto), chave por `item.id`, colunas por índice,
  busca com `useDeferredValue`. Ligar `isLoading` nas telas é da Fase 4.
- **use-mobile** — `useSyncExternalStore` + `matchMedia` (sem flash da sidebar de desktop).
- **ESLint** — override só em `components/ui/**` (código gerado); strings de acessibilidade
  do `ui/` em pt-BR; `catch {}` vazios do sidebar comentados.
- **Landing** — listener do carrossel removido no cleanup (vazava).
- **Skill nova-tela + templates** — rotas lazy, sem `retry:false`, `RouterOutputs`,
  invalidação, `isLoading`, registro completo no form de edição, CSV compartilhado.

## Verificação feita

- `bun run build:web` ok; `bun test` 10/10; `bun run test:api` 105/105.
- Lint 69 → 12. Restam: 6 avisos `incompatible-library` (`watch` → `useWatch`, Fase 5),
  `set-state-in-effect` em `profile-form` e `consulta-room` (Fase 5), e 2 `any` em
  `pacientes/page.tsx:77` e `patient-form.tsx:74` deixados de propósito para não conflitar
  com o hotfix `fix/paciente-edicao-apaga-campos` (que já corrige o do form).
- Entrada: 711 → 720 KB por remanejamento de chunk (núcleo do React/lucide passou de um
  chunk vizinho para a entrada); o total do primeiro acesso não mudou.

## Suggested Verification (manual)

1. Importar CSV em Pacientes e em Financeiro: mapear, importar, ver os registros.
2. Sessão expirada (apagar o cookie com a tela aberta e trocar de aba do app) → vai ao login.
3. Agenda e financeiro: criar/editar continuam funcionando (enums novos na API).
4. Celular: abrir o app direto em 390px — a sidebar não pisca no layout de desktop.
