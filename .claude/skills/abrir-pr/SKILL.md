---
name: abrir-pr
description: Abre (ou atualiza) o pull request do branch atual do psy-manager com o gh — confere branch, mensagens de commit, verificações, rebase em origin/master, push e descrição no padrão do projeto, e devolve o link. Use quando o usuário pedir para abrir PR, mandar para revisão, "subir" o branch, ou no fim da skill entregar-task.
---

# Abrir PR

Chamar esta skill é a autorização para dar **push do branch atual** e criar ou editar o
PR dele. Não autoriza merge, push no `master`, `--force` sem lease, nem apagar branch.

## 1. Pré-condições (pare e avise se alguma falhar)

- `gh auth status` logado.
- Branch atual não é `master`.
- `git status --short` limpo. Mudança não commitada: pergunte se entra no PR; nunca
  commite arquivo que não é do assunto do branch nem `.env*`.
- Pelo menos um commit em `origin/master..HEAD`.

## 2. Atualizar sobre o master

```bash
git fetch origin
git rebase origin/master
```

Conflito: siga a skill `atualizar-branch`. Não continue com conflito aberto.

## 3. Conferir commits

Para cada commit de `origin/master..HEAD`, valide a mensagem com o hook (ele roda mesmo
sem o bit de execução):

```bash
for c in $(git rev-list origin/master..HEAD); do
  git log -1 --format=%B "$c" > "$SCRATCH/msg" && bash .githooks/commit-msg "$SCRATCH/msg" || echo "falhou: $c"
done
```

`$SCRATCH` é o diretório temporário da sessão. Mensagem inválida: proponha a correção ao
usuário antes de reescrever histórico.

## 4. Verificações

Rode só o que os arquivos alterados (`git diff --name-only origin/master...HEAD`) pedem:

| Mudou | Rode |
|---|---|
| `apps/api/**` | `bun run test:api`, `bun run build:api` |
| `apps/api/src/{routes,services,cqrs,db}/**` ou `drizzle/**` | `bun run test:integration` (sobe o banco com `bun run test:integration:db` se preciso) |
| `apps/web/**` | `bun run test:web`, `bun run --filter @psy-manager/web lint`, `bun run build:web` |
| fluxo de tela, rota ou contrato tRPC | `bun run test:e2e` |
| `apps/api/src/db/schema.ts` | confira que há migration nova em `apps/api/drizzle/` |
| só `ai/`, `.claude/`, `*.md` | nada além do hook |

Falhou: pare, mostre a saída e não abra o PR.

## 5. Push

```bash
git push --force-with-lease -u origin HEAD
```

## 6. Criar ou atualizar o PR

`gh pr view --json url,state` diz se já existe. Título: o assunto do commit principal
(um commit → o assunto dele). Corpo em pt-BR:

```markdown
## O que muda
<2–5 bullets do ponto de vista de quem usa ou mantém>

## Por quê
<motivo; link da task em ai/tasks/ se houver>

## Verificação
<comandos rodados e resultado; teste manual feito; o que não foi verificado>

## Riscos
<o que pode quebrar; migração; flag>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Novo: `gh pr create --base master --title "<título>" --body-file "$SCRATCH/pr.md"`.
Existente: `gh pr edit --body-file "$SCRATCH/pr.md"` só se o conteúdo mudou.

## 7. Relatório

Link do PR, verificações rodadas com resultado, e `gh pr checks` se o CI já começou.
Não faça merge: o merge é do usuário.
