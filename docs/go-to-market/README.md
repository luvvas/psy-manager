# 🚀 Go-to-Market — Psy-Manager

Documentos da fase de lançamento: levar o produto (já em produção) pras mãos de
mais psicólogos. Aqui ficam estratégia, formulários e checklists de GTM — separado
do progresso técnico (`../progress/`) e do estudo (`../saa-c03/`).

## Conteúdo

| Documento | O que é |
|---|---|
| [release-plan.md](release-plan.md) | Plano de lançamento em fases (beta fechado → aberto → pago), precificação, capacidade da infra |
| [beta-form.md](beta-form.md) | Formulário de interesse/triagem do beta (pronto pra montar no Google Forms) |
| `../../ai/tasks/task-go-to-market.md` | Checklist acionável dos bloqueios (nome → domínio → email/SMTP → WhatsApp → form) |

## Fase atual

**Beta fechado** — recrutar 15–30 psicólogos, acesso por convite, app 100% gratuito,
canal de feedback (WhatsApp). Ver `release-plan.md` Fase 1.

## 🔑 Bloqueio-chave

O **nome do app** ainda não foi decidido e trava: domínio, e-mail, SMTP-from,
template do WhatsApp e a publicação do formulário de beta. Ver `task-go-to-market.md`.

## 🛡️ Backup e durabilidade do banco

O Postgres roda em container no EC2 (RDS foi revertido). Status da proteção de dados:

- ✅ **`pg_dump` diário → S3**: **funcionando** — backups diários em
  `s3://psy-manager-documents-lucas/db-backups/`, sem falhar desde 22/mai/2026.
  O cron e a permissão `s3:PutObject` já estão configurados.
- ✅ **EBS `Delete on termination = False`**: ajustado — se a instância for
  *terminated* por acidente, o volume (com o banco) **não** é apagado junto.
  (Antes estava `True`; o backup diário já cobria, isto é a rede de segurança extra.)
- 💡 **Teste de restore**: restaurar um dump pelo menos uma vez — backup nunca
  testado é esperança, não backup.
- ✅ **Retenção (lifecycle S3)**: regra `expire-db-backups-after-90d` expira
  backups com mais de 90 dias no prefixo `db-backups/` (fonte versionada:
  `scripts/s3-backups-lifecycle-policy.json`). Escopada só nesse prefixo — não
  afeta `documents/`.
