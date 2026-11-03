# Task: Web — Fase 1, bugs visíveis ao usuário

Status: review — implementado no branch `fix/web-fase-1-bugs`; falta o roteiro manual abaixo.

Parte do plano de refatoração do `apps/web` (skills `react-best-practices` + `nova-tela`).
A Fase 0 (edição de paciente apagando campos) foi um hotfix separado.

## Goal

Corrigir os bugs que a auditoria de novembro/2026 encontrou e que a usuária vê, sem
refatorar estrutura (isso é das fases seguintes).

## O que mudou

| Bug | Correção |
|---|---|
| Menu não abria no celular | `SidebarTrigger` no `AppHeader` (`md:hidden`) |
| Logout deixava cache e cores da conta anterior | `lib/session.ts` `signOutAndReset()`; `queryClient` de módulo em `lib/query-client.ts`; `queryClient.clear()` também no login/cadastro |
| Erros tratados sumiam em produção | `lib/logger.ts` manda para o Sentry fora do dev |
| Login ignorava a página de origem | Guards com `<Navigate state={{ from }}>` + `PageLoader`; `use-redirect-after-login.ts` |
| Botões de login/cadastro/redefinir giravam para sempre sem rede | `try/finally` (`run`) e `formState.isSubmitting` |
| KPI "Total na semana" contava todos os períodos | Semana da data selecionada, só as minhas, sem canceladas; `agendamento/lib/dates.ts` |
| Início contava sessões de colegas | Filtro por `psychologistId` da sessão (decisão da usuária) |
| Paciente não reentrava na chamada; sinalização com erro travava em "aguardando" | `use-webrtc-call.ts`: reentrada a partir de `ended`/`error`, try/catch no `onmessage` |
| Sessão de vídeo inexistente abria sala vazia | Estado "Sessão não encontrada" + `retry: false` |
| Tooltip do gráfico de receitas transparente | `var(--popover)` sem `hsl()` (tokens são oklch) |
| CSV gravava "hoje" em data inválida; `2026-03-05` virava 26/03/2005 | `parseDate` estrito, ancorado, devolve `null`; erro com número da linha; toast no import |
| Erro de rota na tela padrão em inglês | `components/route-error.tsx` como `errorElement` da raiz |
| Prévia de cor ficava ao fechar o perfil sem salvar | Restaura o tema salvo ao desmontar |
| Textos | "Novo Agendamento" na view Dia; 404 volta para `/inicio`; acentos no upload |

Também: `main.tsx` só inicializa; providers em `app.tsx` (fecha o lint `only-export-components`).

## Verificação feita

- `bun run build:web` ok; `bun test` 9/9 (novo `tests/csv.test.ts`); lint 75 → 69, nenhum novo.

## Suggested Verification (manual, falta fazer)

1. Celular (DevTools, 390px): o botão de menu no header abre a sidebar.
2. Logout com tema customizado → `/login` sem as cores; entrar com outra conta não mostra
   por instantes a lista de pacientes da anterior.
3. Deslogada, abrir `/pacientes/<id>` → login → volta para `/pacientes/<id>`.
4. Agenda: navegar para outra semana muda "Total na semana"; sessões de colegas não contam.
5. Teleconsulta: paciente clica Encerrar, volta ao lobby e entra de novo.
6. `/consulta/<id-inexistente>` vindo da agenda → "Sessão não encontrada".
7. Financeiro: passar o mouse no gráfico de movimentação → tooltip com fundo.
8. Importar CSV com uma data `31/02/2026` → toast "Linha N: data inválida…".
9. Produção: um erro tratado aparece no Sentry com a tag `context`.
