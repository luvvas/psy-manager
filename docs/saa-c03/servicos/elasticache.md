# ElastiCache

**O que é:** cache in-memory gerenciado (Redis aqui). Cacheia listagem de pacientes e compartilha sessões do Better Auth.

**Quando é a resposta certa:** reduzir leitura repetida no banco; compartilhar estado/sessão entre múltiplas instâncias.

## Pontos-chave
- **Redis** (tipos ricos, TTL, pub/sub, persistência) vs **Memcached** (simples, sem persistência).
- **Cache-aside (lazy loading)**: lê do cache; miss → busca no banco + popula.
- **Invalidação explícita** (`DEL`) após escrita; ou expira por **TTL**.
- **Encryption in transit (TLS)** → URL `rediss://`.
- SG aceitando o SG da EC2 (porta 6379).
- Resolve o problema de **estado em memória** em arquitetura multi-instância.

## Pegadinhas
- "2+ instâncias e sessão quebra" → store de sessão compartilhado no Redis.
- `rediss://` (2 s) quando TLS está habilitado — `redis://` falha.
- Cache deve ser **opcional** (degradação graciosa): se cair, app vai no banco.
- Redis vs Memcached: se a pergunta cita pub/sub ou persistência → Redis.

## Como usamos no Psy-Manager
- `secondaryStorage` do Better Auth + cache-aside de pacientes → [§15](../../progress/09-redis.md)
