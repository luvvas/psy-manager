# RDS (Relational Database Service)

**O que é:** banco relacional gerenciado (PostgreSQL aqui). Backups, patches e failover por conta da AWS.

**Quando é a resposta certa:** banco SQL sem querer gerenciar o servidor. Para separar a camada de dados da de compute (resiliência).

## Pontos-chave
- **Multi-AZ** = réplica **síncrona** em outra AZ pra **failover** (disponibilidade).
- **Read Replica** = réplica **assíncrona** pra **escalar leitura** (performance).
- **Backups automáticos** + snapshots manuais.
- **Acesso privado** (sem IP público) + SG aceitando o SG da EC2.
- **SSL/TLS**: `sslmode=require` na connection string.
- Free tier: `db.t3.micro`, 20 GB; **desligar storage autoscaling** pra não estourar.

## Pegadinhas
- **Multi-AZ ≠ Read Replica** (a prova adora confundir): HA vs performance de leitura.
- Connection string precisa de `?sslmode=require` ou dá erro de `pg_hba.conf`.
- "Initial database name" vazio → RDS sobe sem o banco → erro de conexão na app.

## Como usamos no Psy-Manager
- Migração do Postgres (Docker→RDS), SG dedicado, SSL → [§6](../../progress/01-rds.md)
