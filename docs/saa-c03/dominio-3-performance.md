# Domínio 3 — Design High-Performing Architectures (24%)

Foca em: escolher o serviço certo pra cada carga, cache, CDN, escalabilidade elástica
e desacoplamento de performance.

## Conceitos-chave

- **CloudFront (CDN)**: entrega conteúdo na **edge** (perto do usuário). Behaviors com path patterns diferentes podem apontar pra origens diferentes (`/*`→S3, `/api/*`→EC2, `/ws/*`→EC2).
- **Cache-aside (lazy loading)**: consulta o cache; em miss, busca no banco e popula o cache. Padrão mais comum de cache de leitura (ElastiCache).
- **TTL + invalidação**: escrever no banco não atualiza o cache — é preciso `DEL` explícito (ou expirar por TTL).
- **S3 para estáticos**: servir HTML/JS/CSS do S3+CloudFront em vez de gastar CPU/RAM de EC2.
- **Cache-Control correto**: assets com hash → cache longo (`immutable`); `index.html` → sem cache (aponta pros hashes atuais).
- **Read Replicas**: escalam leitura distribuindo `SELECT`s.
- **Serverless elástico**: Lambda escala automaticamente por invocação, sem gerenciar capacidade.
- **WebSocket no CloudFront**: suportado nativamente com behavior `CachingDisabled` + `AllViewerExceptHostHeader`.
- **Artifact integrity**: buildar uma vez e implantar o mesmo artefato evita variância e retrabalho (build reproduzível).

## Como o projeto exercita

| Tema | Onde foi feito | Seção |
|---|---|---|
| CDN global + behaviors (`/*`, `/api/*`, `/ws/*`) | CloudFront na frente de S3 e EC2 | [§9](../progress/03-s3-cloudfront.md) · [§14](../progress/08-webrtc.md) |
| Cache-aside no Redis | `getCachedPatients`/`setCachedPatients` | [§15](../progress/09-redis.md) |
| Session cache (29ms → 2ms) | `secondaryStorage` no Better Auth | [§15](../progress/09-redis.md) |
| Cache-Control: assets vs app shell | sync separado no `deploy-ec2.yml` | [§13](../progress/07-cloudfront-cache.md) |
| Estáticos no S3 (libera CPU da EC2) | remoção do Nginx; frontend no S3 | [§11](../progress/05-spa-nginx.md) |
| Serverless elástico (lembretes) | Lambda invocado sob demanda | [§17](../progress/11-eventbridge-lambda.md) |
| Build once (artefato consistente) | imagem no ECR por digest | [§20](../progress/14-ecr-build-once.md) |

## Pegadinhas comuns da prova

- "Reduzir latência global de conteúdo estático" → **CloudFront** (edge). "Reduzir carga de leitura repetida no banco" → **ElastiCache** (cache-aside).
- "Escalar leitura do banco" → **Read Replica**. "Disponibilidade do banco" → **Multi-AZ** (cuidado, é Domínio 2).
- Erro de MIME type em SPA → mismatch de cache do CloudFront: assets com cache longo, `index.html` sem cache, + invalidation `/*`.
- WebSocket atrás de CDN precisa de behavior dedicado sem cache — senão o handshake falha.
- ElastiCache **Redis** (tipos ricos, pub/sub, persistência) vs **Memcached** (simples, sem persistência).
