---
name: recriar-ambiente
description: Limpa o banco de desenvolvimento do psy-manager (apaga e recria o database), aplica as migrations e roda o seed de novo, conferindo que o login do seed funciona. Use quando o usuário pedir para recriar o ambiente, limpar/zerar/resetar o banco local ou rodar o seed do zero.
---

# Limpar o banco de dev e rodar o seed

Chamar esta skill já é a autorização para apagar o banco de **desenvolvimento**
(`psy-manager-db`). Não peça confirmação; execute os passos e relate.

## Regras

- Só o container `psy-manager-db`. Nunca toque no `psy-manager-db-test` nem em produção.
- **Não leia o `.env`.** As credenciais ficam dentro do container: use
  `docker exec psy-manager-db sh -c '... "$POSTGRES_USER" ... "$POSTGRES_DB"'`.
- Use `db:migrate`, nunca `db:push` (alguns índices só existem nas migrations).

## Passos

Tudo a partir da raiz do repositório.

1. Banco de pé:

   ```bash
   docker compose up -d --wait db
   ```

   Se falhar por falta de `.env`/`POSTGRES_PASSWORD`, pare e avise o usuário.

2. Apagar e recriar o database:

   ```bash
   docker exec psy-manager-db sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\" WITH (FORCE)" -c "CREATE DATABASE \"$POSTGRES_DB\""'
   ```

3. Migrations e seed:

   ```bash
   bun run db:migrate
   bun run db:seed
   ```

4. Conferir:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3001/api/auth/sign-in/email \
     -H 'content-type: application/json' -H 'origin: http://localhost:5173' \
     -d '{"email":"lucas@psymanager.com","password":"12345678"}'
   ```

   Só se a API de dev estiver rodando (porta 3001). `200` = ok; `429` = limite de tentativas
   em memória, peça ao usuário para reiniciar `bun run dev`; `500` = a API está com schema
   antigo carregado, peça para reiniciar.

## Relatório

- Banco apagado e recriado, migrations aplicadas e o resumo que o seed imprime
  (pacientes, sessões, cobranças, pagamentos).
- Logins: `lucas@psymanager.com` / `12345678` e as colegas `ana.seed`, `bruno.seed`,
  `carla.seed` `@psymanager.dev` / `Seed@12345` (flag `pagamentos` ligada para todas).
- Resultado do teste de login, ou que a API não estava rodando.
