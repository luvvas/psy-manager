# Task: Web — Fase 5, componentização das telas grandes

Status: review — branch `refactor/web-fase-5-componentes` (merge de quatro branches de área,
empilhado sobre a fase 4).

## O que mudou

- Agenda: `appointment-form.tsx` 802 → 273 linhas e `page.tsx` 438 → 175, divididos em
  schema, mappers, hooks (`use-slot-availability`, `use-appointment-mutations`,
  `use-calendar-navigation`, `use-only-mine-filter`) e componentes; `useWatch`; estado
  derivado por `slotKey` no lugar do efeito de reset; `VideoCallButton` compartilhado (cards
  sem `useSession`/`useMutation` cada); formulário lazy (agenda 39,6 → 22,5 KB); mapas de
  status compartilhados com o Início.
- Consulta: troca de microfone/câmera durante a chamada (`replaceTrack`, sem renegociar),
  dispositivos reenumerados após a permissão e em `devicechange`; estado de mic/câmera
  derivado das trilhas (sem `set-state-in-effect`).
- Documentos: tabela no padrão (ordem e classes das ações, larguras em %), visualizador
  como rota `documentos/:id`, uma tabela para as três abas, `PdfFileField` compartilhado;
  o formulário de registro clínico foi para `pacientes/`.
- Financeiro: `TransactionTypeSelect` e `RecentTransactions`; gráficos com
  `ChartContainer` e cores do tema; eixo Y em moeda compacta pt-BR.
- Autenticação: `page.tsx` 402 → 82 (login, cadastro e recuperação em componentes próprios
  com `isSubmitting`); máscaras com `Controller`; erros só no banner; link inválido de
  redefinição detectado na hora.
- Shell: tema salvo aplicado antes do primeiro paint (sem flash); perfil separado em
  carregamento + campos (sem `set-state-in-effect`), máscaras e rodapé padrão; arrasto da
  sidebar sem re-renderizar o app a cada pixel; imagens da landing com hash e dimensões;
  lightbox com `Dialog`; `LegalLayout`; `index.html` com título e descrição.

## Verificação

`bun run build:web`, `bun test` 10/10, **lint 0 problemas** (era 75 no início do plano).

## Suggested Verification (manual)

Agenda: criar/editar com conflito e sala; iniciar videochamada. Consulta: trocar microfone e
câmera durante a chamada (dois navegadores). Documentos: abrir, baixar, excluir.
Financeiro: tooltip e cores em modo claro/escuro. Login/cadastro/esqueci a senha. Perfil:
trocar cor, fechar sem salvar, recarregar (sem flash). Arrastar a borda da sidebar.
