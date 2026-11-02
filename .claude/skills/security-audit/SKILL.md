---
name: security-audit
description: Auditoria de segurança do projeto em cinco categorias (isolamento de dono/tenant, permissão só no navegador, IDOR, segredos expostos, XSS/inputs sem tratamento), com relatório em PDF em pt-BR e texto de issues prontas para o GitHub. Use quando o usuário pedir auditoria de segurança, revisão de segurança do código inteiro, ou para regerar o relatório em docs/security-audit/.
---

# Auditoria de segurança (5 categorias) + relatório PDF

Objetivo: revisar o código **inteiro** atrás de cinco classes de falha, reportar só o que
foi verificado no código real e gerar um relatório PDF com issues prontas para o GitHub.

## 0. Detectar a stack antes de tudo

Identifique e anote (vai para a nota metodológica da capa):
- linguagem, framework HTTP/RPC, ORM/query builder, mecanismo de auth e sessão;
- frontend (framework, roteador, como chama a API);
- arquivos de deploy: Docker/Compose, CI (workflows), scripts, IaC, nginx.

Neste repositório (psy-manager), em 2026-11: Bun + Hono + tRPC (`apps/api/src/routes/*`,
`protectedProcedure` em `apps/api/src/trpc`), Drizzle ORM + Postgres, better-auth
(sessão por cookie), CQRS/event store em `apps/api/src/cqrs`, WebSocket de sinalização
em `apps/api/src/ws`, React + Vite + react-router em `apps/web`, deploy por
`docker-compose.prod.yml` + `.github/workflows/deploy.yml` + `scripts/*.sh`.
Confirme isso no código: a stack pode ter mudado.

## 1. As cinco categorias (adapte cada uma à stack detectada)

1. **Banco sem tranca (isolamento de dono/tenant).** Descubra QUAL é o mecanismo de
   isolamento (RLS, middleware de tenant, filtro manual por `psychologistId`/`userId`…).
   Depois percorra toda query de listagem, busca, agregação, relatório e exportação e
   aponte onde o filtro falta ou está furado (JOINs sem condição de dono, subqueries,
   queries compartilhadas como "visão da clínica").
2. **Permissão definida no navegador.** Liste todo gate de papel/privilégio no frontend
   (`isAdmin`, `role`, `isOwner`, `isOthers`, `canEdit`, botões escondidos) e cruze cada um
   com o endpoint chamado. O servidor precisa fazer a mesma verificação.
3. **IDOR.** Percorra TODOS os handlers do backend (tRPC, rotas HTTP, WebSocket) — não
   amostras. Para cada ID vindo de path/query/body/mensagem WS: o objeto é buscado,
   alterado ou excluído com filtro de dono? IDs de objetos *relacionados* (patientId,
   appointmentId, storageKey, clinicId…) também contam.
4. **Chaves expostas.** Procure segredos no código, configs, compose, CI, scripts e docs;
   defaults públicos que viram segredo real (`${VAR:-valor}`); ausência de validação de
   startup que rejeite defaults; segredos no histórico git
   (`git log -p -S'<padrão>'`, `git log --all --diff-filter=D --name-only`); e chaves
   embutidas no bundle do frontend (`VITE_*`, build em `dist/`).
5. **Inputs sem tratamento (XSS).** Frontend: `dangerouslySetInnerHTML`, `innerHTML`,
   markdown/HTML sem sanitização, URLs do usuário em `href`/`src`/`window.open`
   (`javascript:`), `eval`/`new Function`. Backend: input do usuário em HTML de e-mail,
   templates ou respostas sem escape. Verifique se há lib de sanitização e onde é usada.

Se uma categoria não se aplicar à stack, diga isso explicitamente.

## 2. Regras de evidência

- Só achados verificados no código real. Nada de especulação.
- Cada achado: arquivo, linha(s) exata(s), trecho, por que é explorável, severidade
  (crítica/alta/média/baixa/informativa) e condições de explorabilidade.
- Registre também o que está CORRETO, com evidência (vira "pontos fortes" e prova a
  cobertura).
- Liste arquivo por arquivo, linha por linha. Números de linha conferidos com
  `grep -n`/`sed -n` no estado atual do working tree, não de memória.
- Compare com issues de segurança já existentes/fechadas (`docs/security-audit/`, issues
  do GitHub) para não reabrir o que já foi corrigido; cite o que foi corrigido como ponto
  forte.

## 3. Relatório

Os achados vão em `docs/security-audit/findings.json` (dados) e o PDF é gerado por
`docs/security-audit/generate_report.py` (layout). Para uma nova rodada, atualize só o
JSON e regenere.

```bash
cd docs/security-audit
python3 -m venv .venv && .venv/bin/pip install -q --only-binary=:all: -r requirements.txt   # isolado, nunca global
.venv/bin/python generate_report.py            # → relatorio-auditoria-seguranca.pdf
```

Se o `venv` falhar por falta de `ensurepip` (Ubuntu sem `python3-venv`), crie com
`python3 -m venv --without-pip .venv`, baixe `https://bootstrap.pypa.io/get-pip.py` para um
diretório temporário e rode `.venv/bin/python -I <tmp>/get-pip.py`. As versões do
`requirements.txt` têm wheel para Python 3.14; versões mais antigas do matplotlib tentam
compilar e falham. O layout usa as fontes DejaVu de `/usr/share/fonts/truetype/dejavu`.

Conteúdo obrigatório do PDF (A4, margens ~2 cm, cabeçalho/rodapé com nome do relatório e
número de página, pt-BR):
a) capa: "Relatório de Auditoria de Segurança — <projeto>", data, escopo, nota
   metodológica (como cada categoria foi mapeada à stack);
b) resumo executivo: total por severidade, gráfico de rosca por severidade e de barras
   por categoria — paleta crítica #B91C1C, alta #EA580C, média #D97706, baixa #2563EB,
   informativa #6B7280, ponto forte #059669;
c) pontos fortes (com evidência) e pontos fracos (riscos centrais);
d) tabela de achados por categoria: Severidade | Arquivo:linha | Descrição, com chip
   colorido;
e) recomendações priorizadas (P1, P2, P3…);
f) ao final, "ISSUES PARA O GITHUB": para cada achado acionável, o Markdown completo de
   uma issue entre `--- ISSUE n ---` e `--- FIM ISSUE n ---`, com título
   "[Segurança] …", labels (security + severidade), problema, evidência, impacto,
   correção e critérios de aceite em checklist. Agrupe achados triviais do mesmo tema.

## 4. Verificar o PDF antes de entregar

- `pdfinfo` para contar páginas;
- `pdftoppm -r 60 -png` e olhar as páginas rasterizadas (capa, gráficos, tabelas, issues);
- corrigir texto cortado, tabelas estouradas, gráficos sem legenda.

`docs/security-audit/.venv/` e as imagens temporárias não vão para o git.

## 5. Entrega no chat

1. caminho do PDF e de todos os arquivos gerados;
2. lista de achados arquivo por arquivo, linha por linha, com severidade;
3. o que ficou fora do escopo ou não pôde ser verificado (ex.: produção, histórico de
   branches remotas).
