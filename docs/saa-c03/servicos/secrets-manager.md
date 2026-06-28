# Secrets Manager

**O que é:** cofre de segredos com **rotação automática** nativa (ex.: credencial de RDS).

**Quando é a resposta certa:** "rotacionar credencial de banco automaticamente, a cada N dias, sem downtime".

## Pontos-chave
- **Rotator nativo pro RDS**: gera nova senha → atualiza no RDS → atualiza o secret, sem janela de indisponibilidade.
- Rotação custom via Lambda rotator.
- Custo: ~$0.40/secret/mês + $0.05/10K chamadas.
- Integra com RDS, Redshift, DocumentDB.

## Pegadinhas
- **Secrets Manager vs Parameter Store** é pergunta direta: rotação automática / credencial de banco → **Secrets Manager**; config geral sem rotação → **Parameter Store** (grátis).
- Tem custo por secret — não use pra config trivial.

## Como usamos no Psy-Manager
- Ainda não — `POSTGRES_PASSWORD` está em SSM SecureString. Plano: migrar pro rotator nativo → [§18](../../progress/12-key-rotation.md) · [ROADMAP #10](../../ROADMAP.md)
