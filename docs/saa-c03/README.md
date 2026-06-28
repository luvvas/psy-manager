# 🎓 Estudo AWS SAA-C03 — Psy-Manager

Portal de estudo pra certificação **AWS Solutions Architect Associate (SAA-C03)**.
A ideia: cada coisa que você construiu neste projeto vira material de estudo
**vinculado a um caso real** — não é teoria solta, é "eu fiz isso, e cai assim na prova".

## Os 4 domínios do exame (e o peso de cada um)

| Domínio | Peso | Foco | Ficha |
|---|:--:|---|---|
| 1. Design Secure Architectures | **30%** | IAM, criptografia, rede segura, segredos | [dominio-1-seguranca.md](dominio-1-seguranca.md) |
| 2. Design Resilient Architectures | **26%** | Alta disponibilidade, desacoplamento, multi-AZ | [dominio-2-resiliencia.md](dominio-2-resiliencia.md) |
| 3. Design High-Performing Architectures | **24%** | Cache, CDN, escalabilidade, serverless | [dominio-3-performance.md](dominio-3-performance.md) |
| 4. Design Cost-Optimized Architectures | **20%** | Free tier, serverless vs always-on, sizing | [dominio-4-custo.md](dominio-4-custo.md) |

> Segurança é o maior peso (30%) — e, não por acaso, é onde este projeto tem mais
> material (OIDC, SSM, IAM Roles, presigned URLs, KMS).

## Fichas rápidas por serviço

Pra revisão antes da prova: [servicos/](servicos/README.md) — uma ficha por serviço
AWS (o que é, quando é a resposta certa, pegadinhas, e como usamos no projeto).

## Catálogo de IAM policies

[iam-policies.md](iam-policies.md) — todas as policies do projeto (trust + inline +
managed), **templatizadas** (seguras pra repo público), com explicação de
least-privilege. Material denso de Domínio 1 (o de maior peso).

## Como usar este material

1. **Estude por domínio** quando estiver aprendendo um tema novo (segue a estrutura da prova).
2. **Revise por serviço** (fichas) na reta final — é o formato que mais ajuda em simulados.
3. **Volte ao caso real**: cada nota linka pro documento do estágio em [progress/](../progress/README.md)
   onde aquilo foi implementado de verdade. Lembrar do contexto prático fixa melhor que decorar.

## De onde vem este conteúdo

As notas "O Que Cai na SAA-C03" estavam espalhadas nos documentos de estágio
(`progress/`). Aqui elas estão **reorganizadas por domínio e por serviço**,
sem perder o link de volta pro contexto onde apareceram.

## Mapa rápido: estágio do projeto → domínio principal

| Estágio | Domínio que mais exercita |
|---|---|
| S3 + CloudFront (§9) | Performance + Custo |
| RDS (§6) | Resiliência |
| SSM Parameter Store (§10) | Segurança |
| Presigned URLs (§12) | Segurança |
| WebRTC + WebSocket (§14) | Performance + Resiliência (estado em memória) |
| Redis / ElastiCache (§15) | Performance + Resiliência |
| IAM OIDC (§16) | Segurança |
| EventBridge + Lambda (§17) | Resiliência + Custo |
| Rotação de chaves / KMS (§18) | Segurança |
| SSM Session Manager (§19) | Segurança |
| ECR + Trivy (§20) | Segurança + Performance (artifact integrity) |
