---
name: nova-tela
description: Cria uma nova tela no app web do psy-manager (apps/web) seguindo o esqueleto e os padrões visuais das telas existentes — AppHeader com ações, tabela DataTable, formulário em AppSheet, KPI cards, tela de detalhe, rota e item de menu — e, quando preciso, o router tRPC/service na API. Use quando o usuário pedir uma tela, página, módulo, CRUD ou cadastro novo, ou para refazer uma tela fora do padrão.
---

# Nova tela no psy-manager

Objetivo: entregar uma tela nova que pareça ter sido feita junto com as outras. Antes de
inventar qualquer coisa, copie o padrão de uma tela existente. Tudo que o usuário vê é em
**português do Brasil**; nomes de código seguem o que já existe na feature vizinha.

Referências vivas (leia a mais parecida com o pedido antes de escrever):

| Tipo de tela | Copie de |
|---|---|
| CRUD simples (lista + sheet de cadastro) | `apps/web/src/features/clinicas/` |
| CRUD com abas Lista/Importação (CSV) | `apps/web/src/features/pacientes/page.tsx` |
| Tela com KPI cards + gráficos + tabela | `apps/web/src/features/financeiro/page.tsx` |
| Tela que ocupa a altura toda (calendário, board) | `apps/web/src/features/agendamento/` |
| Tela de detalhe de um registro (`/x/:id`) | `apps/web/src/features/pacientes/page-detalhes.tsx` |
| Placeholder "em breve" | `apps/web/src/pages/coming-soon.tsx` |

Modelos prontos para copiar e adaptar estão em `templates/` ao lado deste arquivo.

## 1. Entender o pedido

Antes de codar, defina (pergunte só o que não dá para deduzir):
- nome da tela (pt-BR, plural para listas: "Clínicas") e slug da URL (`/clinicas`, sem acento);
- ícone `lucide-react` (o mesmo vai no header e no menu lateral);
- quais colunas a grid mostra e quais ações por linha;
- campos do formulário, quais são obrigatórios;
- se já existe router tRPC para os dados (`apps/api/src/routes/router.ts`) ou se precisa criar.

## 2. Estrutura de arquivos

```
apps/web/src/features/<feature>/
  index.ts                     # export { XPage } from "./page";
  page.tsx                     # a tela: header, estado, queries/mutations, layout
  page-detalhes.tsx            # (opcional) tela /<feature>/:id
  components/
    <entidade>s-table.tsx      # colunas da DataTable + ações por linha
    <entidade>-form.tsx        # react-hook-form + zod, renderizado dentro do AppSheet
    stats-cards.tsx            # (opcional) monta itens e delega ao StatsCards genérico
```

- `<feature>` é o nome do domínio em pt-BR minúsculo (`pacientes`, `financeiro`).
- A página exporta função nomeada `XPage` (`ClinicasPage`, `PacientesPage`).
- Componentes de UI base ficam em `@/components/ui/*` (shadcn). **Não** edite esses
  arquivos para resolver um caso de uma tela só; passe `className`.

## 3. Ligar a tela ao app

1. **Rota** — `apps/web/src/router.tsx`, dentro de `children` do `AppLayout` (rotas
   autenticadas), antes do `path: "*"`:
   ```tsx
   { path: "<slug>", element: <XPage /> },
   { path: "<slug>/:id", element: <XDetailsPage /> }, // se houver detalhe
   ```
   Importe de `@/features/<feature>` (o `index.ts`).
2. **Menu lateral** — `NAV_ITEMS` em `apps/web/src/components/layout/app-sidebar.tsx`:
   `{ title: "X", url: "/<slug>", icon: Icone, ready: true }`. O item fica ativo por
   `pathname.startsWith(url)`, então a tela de detalhe também acende o menu.
3. Tela ainda sem conteúdo? Use `ComingSoonPage` direto na rota (exemplo: `pagamentos`).

## 4. Esqueleto da página (obrigatório)

Toda tela autenticada é renderizada dentro do `SidebarInset` (já rola verticalmente) e
começa com `AppHeader`. Ver `templates/page.tsx`.

```tsx
return (
    <>
        <AppHeader
            title="Clínicas"
            description="Frase curta dizendo o que se faz nesta tela."
            icon={Building2}
            actions={
                <div className="flex items-center gap-2">
                    {/* secundárias primeiro: variant="outline" size="sm" */}
                    <Button size="sm" className="gap-1.5" onClick={...} id="btn-new-x">
                        <Plus className="size-4" />
                        Nova Clínica
                    </Button>
                </div>
            }
        />

        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
            {/* KPI cards, abas, tabela (a DataTable desenha a própria busca)... */}
        </div>

        <AppSheet ...>{/* formulário */}</AppSheet>
    </>
);
```

As ações da tela ficam sempre no `actions` do `AppHeader`, à direita. Telas só de leitura
(ex.: Início) não têm botões. (Já se testou mover busca e botões para a linha das abas; o
usuário preferiu este layout.)

Regras dos botões (o usuário já cobrou cada uma):
- **Todos** os botões e triggers do header usam `size="sm"` — inclusive date pickers e
  botões de importação. Botão com tamanho padrão no header fica maior que o das outras telas.
- A ação principal é o botão preto padrão (`variant` default) com `<Plus className="size-4" />`
  + texto "Novo X"/"Nova X", **no canto direito**, sempre o último. Secundárias
  (`variant="outline"`, ex. "Importar .csv" com `UploadCloud`) vêm antes dele; esconda as
  secundárias no mobile com `hidden sm:flex` quando apertar.
- Tela de detalhe: "Voltar" (`variant="outline" size="sm"`, `ArrowLeft`) e depois a ação
  principal, ambos no header. Nada de barra de botões solta acima do conteúdo.
- Nunca defina cor de texto/fundo no header na mão: ele usa as variáveis de tema
  (`--app-header-*`) definidas pelo usuário em `lib/theme.ts`, com `--background` como
  fallback (o header é fixo; fundo transparente deixa o conteúdo aparecer ao rolar).

Variações do contêiner de conteúdo:
- Padrão (rola com a página): `flex flex-1 flex-col gap-4 p-4 lg:p-6`.
- Tela que precisa ocupar exatamente a altura disponível (calendário, board):
  `flex flex-col flex-1 min-h-0 gap-4 p-4 lg:p-6 overflow-hidden`, e cada filho que deve
  esticar recebe `flex-1 min-h-0`. Ver `agendamento/page.tsx` + `calendar-dashboard.tsx`.

## 5. Dados (tRPC + React Query)

```tsx
const { data, refetch } = trpc.x.list.useQuery(undefined, { retry: false });

const createMutation = trpc.x.create.useMutation({
    onSuccess: () => { toast.success("X cadastrado com sucesso!"); refetch(); },
    onError: (err) => toast.error(`Erro ao cadastrar: ${err.message}`),
});
```

- Sempre `retry: false` nas queries de tela.
- Depois de mutation: `refetch()` da lista da própria tela, ou
  `trpc.useUtils()` + `utils.x.list.invalidate(...)` quando a lista é de outro componente.
- Mensagens: `toast.success("... com sucesso!")` / ``toast.error(`Erro ao <verbo>: ${err.message}`)``
  (`sonner`). Erros inesperados em `catch`: `logger.error("Erro ao ...", error)` (`@/lib/logger`), nunca `console.log`.
- Converta a resposta para o tipo da tabela num `map` (`DBX`), transformando datas com
  `new Date(...)`. O tipo `DBX` é exportado pelo componente de tabela.
- Exclusão: `window.confirm(\`Deseja realmente excluir "${nome}"?\`)` antes da mutation.
- Edição e criação usam o mesmo sheet: estado `isSheetOpen` + `editingX: DBX | null`.
  Ao fechar o sheet, zere `editingX`.

## 6. Grid (DataTable)

Use sempre `@/components/data-table` (busca, header com cor de tema, estado vazio). Ver
`templates/table.tsx`. A caixa de busca é a da própria `DataTable`, acima da grid.

- Uma coluna por informação, `className` com largura em % (`w-[25%]`). A soma deve dar
  **100%** — passar disso estoura a tabela.
- Célula principal: `font-medium text-foreground`; secundárias: `text-xs text-muted-foreground`,
  com ícone `size-3.5` à esquerda (`Mail`, `Phone`, `MapPin`...). Valor ausente: `"—"`.
- Última coluna, `header: ""`, `className: "w-[12%] text-right"`, com as ações:
  botões `variant="ghost" size="icon" className="size-8"`, ícone `size-3.5`, `title` em pt-BR
  e `e.stopPropagation()` no `onClick`.
- **Ordem das ações: Editar (`Pencil`) → ações específicas da entidade → Deletar (`Trash2`).**
  A ação específica usa um ícone que diga o que ela abre (ex.: prontuário = `ClipboardList`
  em `text-blue-600`), nunca um olho genérico. Deletar usa
  `text-destructive hover:text-destructive hover:bg-destructive/10`.
- `searchFilter` busca nos campos que o usuário digitaria (nome, documento, e-mail);
  `emptyState` com título, descrição e o ícone da tela.

## 7. Formulário (AppSheet + react-hook-form + zod)

Ver `templates/form.tsx`.

- O formulário abre no `AppSheet` (`@/components/layout/app-sheet`, desliza da direita),
  título "Novo X" / "Editar X". Passe `key={editing ? editing.id : "new"}` ao formulário
  para reiniciar o estado ao trocar de registro.
- Schema com `import * as z from "zod/v3"` e mensagens em pt-BR; tipo exportado
  `XFormValues = z.infer<typeof schema>`. Só marque como obrigatório o que o negócio exige.
- Campo: `div.space-y-1.5` com `Label htmlFor` + controle + erro
  `<p className="text-xs text-destructive">{errors.campo.message}</p>`.
  Campos lado a lado: `grid grid-cols-2 gap-3` (ou `grid-cols-3` com `col-span-2`).
- Máscaras: `formatCPF`, `formatCNPJ`, `formatPhone`, `formatCEP`, `formatRG`, `formatCRP`
  de `@/utils/format`, aplicadas com `watch` + `setValue(..., { shouldValidate: true })`.
- Controles prontos — use-os em vez do nativo:
  - data: `DatePicker` (`@/components/date-picker`, aceita digitar dd/mm/aaaa);
  - hora: `TimeInput` (`@/components/time-input`, sempre 24h HH:MM);
  - arquivo: `FileInput` (`@/components/file-input`, textos em pt-BR). **Nunca** um
    `<input type="file">` visível: o navegador mostra "Browse... No file selected" em inglês.
    Input escondido acionado por botão próprio também serve (ex.: "Importar .csv").
  - select: `Select` do shadcn via `Controller`.
- Rodapé: `div.flex.justify-end.gap-2.border-t.pt-4` com "Cancelar" (`variant="outline"`)
  e "Salvar" (submit, `Loader2 animate-spin` enquanto `isSubmitting`), ambos desabilitados
  durante o envio.
- Muitos campos? Divida em `Tabs` dentro do sheet (ex.: `clinic-form.tsx`: Dados / Psicólogos).

## 8. Blocos opcionais

- **KPI cards**: `StatsCards` genérico (`@/components/stats-cards`) com 4 itens
  `{ label, value, icon, color }`, `color` no formato `"text-emerald-600 bg-emerald-500/10"`.
  Crie `components/stats-cards.tsx` na feature que só calcula os itens. Fica no topo do conteúdo.
- **Abas na tela** (`Lista` / `Importação`): `Tabs` controlado, `TabsList className="grid w-full max-w-xs grid-cols-N"`
  (4 abas: `max-w-xl`) numa linha `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`;
  ações que só valem para uma aba aparecem à direita da `TabsList`. Uma aba sozinha não
  justifica `Tabs` — mostre o conteúdo direto.
- **Abas dentro de formulário** com ícone + texto empilhados: `TabsList className="grid w-full grid-cols-N h-auto p-1"`.
  O `h-auto` é necessário (a altura base é 32px) — sem ele o fundo cinza corta as abas.
- **Tela de detalhe** (`templates/details-page.tsx`): `useParams` → `trpc.x.getById`;
  enquanto carrega, `Skeleton`; não achou, estado "X não encontrado" com botão de voltar;
  raiz `div.flex.flex-col.flex-1.h-full`. Na grid, a ação que leva ao detalhe navega com
  `navigate(\`/<slug>/${id}\`)`.
- **Estado vazio fora de tabela**: bloco `border border-dashed rounded-lg bg-muted/10`
  com ícone grande `opacity-20`, título `font-medium` e texto `text-sm text-muted-foreground`.

## 9. Armadilhas visuais já encontradas neste projeto

- **Não use `ScrollArea` (Radix) em volta de grids que precisam esticar ou ter colunas
  exatas.** Ele embrulha o conteúdo numa `div display:table` sem altura e que cresce até a
  largura do conteúdo: `h-full` não funciona e a última coluna sai cortada. Use
  `div.flex-1.min-h-0.overflow-auto`.
- **Divisórias entre colunas são `border-r`/`border-b`, não `gap-px` sobre `bg-border`.**
  Com larguras fracionárias o navegador arredonda metade dos gaps de 1px para zero. Tire a
  borda da última coluna de cada breakpoint para não dobrar com a do contêiner.
- **Contêiner com `overflow-*` corta o que sai dele**, inclusive na horizontal. Elementos
  posicionados com `-left-*` (ex.: ícones de timeline) precisam de margem suficiente no pai.
- Linha de timeline: posicione o ícone pelo centro (metade da largura do círculo + metade da
  linha) e dê ao anel do ícone `bg-background` para cobrir a linha acima do primeiro item.
- Não mude `font-size` do `html` nem aplique zoom global para "aumentar a tela" — quebra
  todas as medidas em `rem` e faz bordas de 1px sumirem.
- Tooltip/hover com conteúdo rico (mais que uma frase): não use o `TooltipContent` preto
  padrão; use `TooltipPrimitive.Content` (`radix-ui`) com visual de popover
  (`bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-md rounded-lg p-3`),
  como em `agendamento/components/appointment-card.tsx`.
- Bordas do tema: `border` (cor `--border`); cards usam o `Card` do shadcn. Não invente cores
  fixas fora dos tokens, exceto os tons de status já usados (emerald, sky, violet, amber, rose).

## 10. API (quando a tela precisa de dados novos)

Stack: Hono + tRPC + Drizzle (Postgres), em `apps/api/src`.

1. Tabela em `db/schema.ts` com `psychologistId` (dono) — toda linha pertence a um psicólogo.
   Gere a migration com `bun run db:generate` dentro de `apps/api`.
2. Service em `services/<x>.service.ts` (objeto `xService` com métodos que recebem
   `psychologistId` como primeiro argumento). **Todo** `select/update/delete` filtra por
   `psychologistId`; IDs vindos do cliente (`patientId` etc.) têm a posse validada.
   Campos sensíveis de paciente usam `encryptField`/`decryptField` (`lib/encryption`).
3. Router em `routes/<x>.ts` com `protectedProcedure`, input `zod`, e
   `TRPCError({ code: "NOT_FOUND", message: "X não encontrado." })` quando o service devolve vazio.
4. Registre em `routes/router.ts` (`appRouter`). O tipo chega ao web sozinho via `AppRouter`.
5. Pacientes e agendamentos usam CQRS (`apps/api/src/cqrs/`): mudanças nesses domínios
   passam pelos comandos/agregados, não por insert direto.

## 11. Conferir antes de entregar

- `npx tsc --noEmit -p .` em `apps/web` (e em `apps/api` se mexeu lá) sem erros.
- Revise a tela contra o checklist: header com `size="sm"` e ação principal à direita;
  textos todos em pt-BR (incluindo `title` dos botões, toasts, placeholders e estado vazio);
  larguras da grid somando 100%; ordem Editar → específicas → Deletar; rota + menu ligados.
- Se der para abrir o app (`run`/navegador), confira a tela de verdade em largura de desktop
  e de celular. Se não der, diga ao usuário que não foi verificado visualmente.
- Commit (só se o usuário pedir) no padrão do `CONTRIBUTING.md`: `feat(<feature>): ...`.
