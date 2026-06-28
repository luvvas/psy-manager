> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 15. 🔴 Cache com Redis: ElastiCache, Sessões Compartilhadas e Cache de Pacientes

Esta seção documenta a implementação de uma camada Redis com duas responsabilidades distintas: **cache do endpoint de listagem de pacientes** e **store compartilhado de sessões Better Auth**. A segunda responsabilidade é um pré-requisito direto para escalonamento horizontal (múltiplas instâncias EC2 atrás de um ALB).

---

### A. O Problema: Por Que Redis?

Antes do Redis, a aplicação tinha dois gargalos silenciosos:

**1. Sessões presas em uma instância**

O Better Auth armazenava sessões na tabela `session` do RDS PostgreSQL. Isso funcionava perfeitamente com uma única EC2. Mas ao adicionar um segundo servidor atrás de um ALB, a sessão criada no servidor A não existia no banco local do servidor B — ela existia no PostgreSQL, mas o Better Auth consultava o PostgreSQL diretamente, então o problema real era a latência e o fato de que sem um store compartilhado em memória, cada instância precisaria ir ao banco a cada requisição autenticada. Com Redis como `secondaryStorage`, a sessão é escrita no Redis após a primeira consulta ao banco e todas as instâncias leem do mesmo Redis.

**2. RDS consultado a cada listagem de pacientes**

A rota `patient.list` executava um `SELECT` no RDS em cada requisição. Listas de pacientes mudam raramente — geralmente só após criar, editar ou excluir um paciente. Cachear essa listagem por 60 segundos no Redis elimina a maioria das consultas repetidas ao banco.

---

### B. Instalação

O cliente Redis escolhido foi o **ioredis**, a biblioteca Node.js mais madura para Redis, com suporte nativo a URLs `redis://` e `rediss://` (TLS):

```bash
bun add ioredis --cwd apps/api
```

O **superjson** já era dependência da API e foi reutilizado para serializar o cache de pacientes — ele preserva tipos JavaScript como `Date` ao serializar/deserializar, o que é importante porque as colunas `dataNascimento`, `createdAt` e `updatedAt` da tabela `patient` são timestamps.

---

### C. O Módulo de Cache (`apps/api/src/lib/cache.ts`)

Este arquivo centraliza toda a lógica Redis da aplicação. Foi criado do zero.

```typescript
import { Redis } from "ioredis";
import superjson from "superjson";

let _client: Redis | null = null;

export function getRedisClient(): Redis | null {
    if (!process.env.REDIS_URL) return null;  // degradação graciosa: sem URL = sem Redis
    if (!_client) {
        _client = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 1,
        });
        _client.on("error", (err: Error) => {
            console.error("[Redis] connection error:", err.message);
        });
    }
    return _client;
}
```

**Por que `getRedisClient()` retorna `null` em vez de lançar erro?**

Degradação graciosa. Se `REDIS_URL` não estiver configurado (ex: ambiente de CI sem Redis), todas as funções de cache simplesmente retornam sem fazer nada — a API continua funcionando normalmente com RDS. Não há crash.

**Por que `maxRetriesPerRequest: 1`?**

Limita quantas vezes ioredis retenta um comando que falhou. Sem esse limite, um Redis instável poderia travar requisições por vários segundos esperando retentativas. Com `1`, um falha rápida ocorre e a requisição cai no fallback do RDS.

> **Armadilha que encontramos:** A primeira versão usava `lazyConnect: true` junto com `enableOfflineQueue: false`. O problema: quando o API iniciava antes do Redis estar pronto, o ioredis criava o cliente mas descartava os primeiros comandos silenciosamente (sem entrar na fila). O cache nunca era populado nas primeiras requisições do browser, mesmo com Redis funcionando. A solução foi remover essas duas opções e deixar o ioredis gerenciar a conexão com seu comportamento padrão (fila habilitada + reconexão automática).

**As três funções de cache de pacientes:**

```typescript
const PATIENT_CACHE_TTL = 60; // segundos

function patientKey(psychologistId: string): string {
    return `patients:${psychologistId}`;  // ex: "patients:yE0pAt5VK9c1..."
}

export async function getCachedPatients<T>(psychologistId: string): Promise<T | null> {
    try {
        const redis = getRedisClient();
        if (!redis) return null;
        const raw = await redis.get(patientKey(psychologistId));
        if (!raw) return null;
        return superjson.parse<T>(raw);  // superjson restaura os tipos Date
    } catch (err) {
        console.error("[Redis] getCachedPatients error:", (err as Error).message);
        return null;  // fallback: retorna null e a rota vai ao RDS
    }
}

export async function setCachedPatients<T>(psychologistId: string, patients: T): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.set(patientKey(psychologistId), superjson.stringify(patients), "EX", PATIENT_CACHE_TTL);
    } catch (err) {
        console.error("[Redis] setCachedPatients error:", (err as Error).message);
    }
}

export async function invalidatePatientCache(psychologistId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.del(patientKey(psychologistId));
    } catch (err) {
        console.error("[Redis] invalidatePatientCache error:", (err as Error).message);
    }
}
```

Todas as funções têm `try/catch` e nunca lançam. Se o Redis cair em produção, as rotas continuam funcionando — a única diferença é que cada requisição vai ao RDS diretamente.

**Por que superjson e não JSON.stringify?**

`JSON.stringify` converte `Date` para string ISO. Quando o tRPC serializa a resposta com SuperJSON (o transformer configurado no cliente React), ele procura por `Date` objects — mas se o cache devolveu strings, o cliente recebe strings em vez de `Date`, quebrando qualquer código que dependa de `.getTime()` ou comparações de data no frontend. O `superjson.stringify` armazena metadados de tipo junto com os dados, e `superjson.parse` restaura os `Date` corretamente.

---

### D. Store de Sessão Better Auth (`apps/api/src/lib/auth.ts`)

O Better Auth expõe uma interface `secondaryStorage` que aceita um objeto com três métodos: `get`, `set` e `delete`. Quando configurado, o Better Auth usa esse store para cachear dados de sessão — lê dele primeiro, só vai ao banco quando não encontra.

```typescript
import { getRedisClient } from "./cache";

function buildSecondaryStorage() {
    const redis = getRedisClient();
    if (!redis) return undefined;  // sem Redis = Better Auth usa só o banco
    return {
        get: (key: string) => redis.get(key),
        set: async (key: string, value: string, ttl?: number) => {
            if (ttl) {
                await redis.set(key, value, "EX", ttl);
            } else {
                await redis.set(key, value);
            }
        },
        delete: async (key: string) => {
            await redis.del(key);
        },
    };
}

export const auth = betterAuth({
    database: drizzleAdapter(db, { ... }),
    secondaryStorage: buildSecondaryStorage(),  // linha adicionada
    ...
});
```

`buildSecondaryStorage()` é chamada uma única vez quando o módulo `auth.ts` é avaliado (na inicialização da API). O cliente Redis retornado por `getRedisClient()` é o mesmo singleton de `cache.ts` — não há duas conexões abertas.

**O que o Better Auth armazena no Redis?**

Após o deploy, inspecionando o Redis em produção (`redis-cli KEYS "*"`), vimos três tipos de chaves:

| Chave | Conteúdo |
|---|---|
| `H0cU96dhucprsC3qkwSbVq45ZVWkvpuT` | Dados da sessão mapeados pelo token |
| `active-sessions-<userId>` | Lista de sessões ativas do usuário (suporte a múltiplos dispositivos) |
| `patients:<psychologistId>` | Cache da lista de pacientes (nosso) |

O impacto no tempo de resposta foi imediato e visível nos logs:

```
GET /api/auth/get-session 200 29ms   ← primeira chamada: consulta o RDS
GET /api/auth/get-session 200  2ms   ← chamadas seguintes: lê do Redis
GET /api/auth/get-session 200  3ms
```

---

### E. Cache na Rota de Listagem (`apps/api/src/routes/patient.ts`)

A rota `patient.list` recebeu a lógica de cache hit/miss:

```typescript
import { getCachedPatients, setCachedPatients } from "../lib/cache";

list: protectedProcedure.query(async ({ ctx }) => {
    const psychologistId = ctx.session.user.id;

    // 1. Tenta o cache
    type PatientList = Awaited<ReturnType<typeof patientQueries.list>>;
    const cached = await getCachedPatients<PatientList>(psychologistId);
    if (cached) return cached;  // cache hit: retorna sem consultar o RDS

    // 2. Cache miss: consulta o RDS e popula o cache
    const patients = await patientQueries.list(psychologistId);
    await setCachedPatients(psychologistId, patients);
    return patients;
}),
```

O tipo genérico `<PatientList>` garante que o TypeScript sabe o que `getCachedPatients` devolve — o mesmo tipo que `patientQueries.list` retornaria. Isso evita casts manuais e mantém a tipagem end-to-end intacta.

**Impacto medido em produção:**

```
patient.list (cache miss) → 17ms
patient.list (cache hit)  →  9ms
```

---

### F. Invalidação nos Command Handlers (`apps/api/src/cqrs/patient/patient.commands.ts`)

O cache precisa ser invalidado sempre que um paciente é criado, atualizado ou excluído. No padrão CQRS do projeto, todas as escritas passam pelos command handlers. Adicionamos `invalidatePatientCache` após o `eventBus.publishAll` em cada um dos três handlers:

```typescript
import { invalidatePatientCache } from "../../lib/cache";

// No handler create, após publishAll:
await invalidatePatientCache(command.psychologistId);

// No handler update, após publishAll:
await invalidatePatientCache(command.psychologistId);

// No handler delete, após publishAll:
await invalidatePatientCache(command.psychologistId);
```

A invalidação ocorre **depois** que os eventos foram publicados e as projeções atualizadas. Isso garante que a próxima requisição de listagem encontre o cache vazio e busque os dados já atualizados do RDS.

---

### G. Docker Compose

**`docker-compose.yml` (desenvolvimento local):**

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"

  db:
    image: postgres:17-alpine
    ...
```

**`docker-compose.prod.yml` (produção no EC2):**

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"

  api:
    ...
    environment:
      ...
      REDIS_URL: ${REDIS_URL}  # injetado pelo script de deploy via SSM
```

Em produção, o serviço `redis` no `docker-compose.prod.yml` não é usado — o `REDIS_URL` aponta para o ElastiCache. O serviço está declarado para paridade local/prod: se alguém rodar `docker compose -f docker-compose.prod.yml up` localmente sem o ElastiCache, o Redis local sobe.

---

### H. Variáveis de Ambiente

**`.env.example`** (adicionado):

```env
# Redis — session store + patient list cache
# Para desenvolvimento local: rode `docker compose up redis`
REDIS_URL=redis://localhost:6379
```

**`.github/workflows/deploy-ec2.yml`** (adicionado no script SSH):

```bash
export REDIS_URL=$(aws ssm get-parameter \
  --region sa-east-1 \
  --name "/psy-manager/prod/REDIS_URL" \
  --query "Parameter.Value" \
  --output text)
```

Note que este parâmetro **não** usa `--with-decryption` porque foi criado como `String` (não `SecureString`) — o endpoint do Redis não é uma credencial de acesso, é um endereço de rede interno à VPC. As credenciais de autenticação do Redis (quando configuradas) seriam `SecureString`.

---

### I. Provisionamento do ElastiCache (Console AWS)

#### Criação do Cluster

```text
ElastiCache > Caches > Create cache
```

Configurações usadas:

| Campo | Valor | Motivo |
|---|---|---|
| Engine | Redis OSS | Compatibilidade com ioredis |
| Deployment option | Node-based cluster | Permite escolher o tipo de nó manualmente |
| Creation method | Cluster cache | Permite configurar tudo, inclusive o security group |
| Cluster mode | Disabled | Não precisamos de múltiplos shards |
| Name | `psy-manager-redis` | — |
| Node type | `cache.t3.micro` | Free Tier por 12 meses |
| Number of replicas | 0 | Single-node, sem Multi-AZ (custo) |
| Multi-AZ | Disabled | Automático quando replicas = 0 |
| VPC | `vpc-08ae7104a7af10eb6` | Mesma VPC do EC2 |
| Subnet group | `psy-manager-redis-subnet` | Criado com as 3 subnets disponíveis |
| Security group | `psy-manager-redis-sg` | Criado separadamente (ver abaixo) |
| Encryption in transit | Enabled (padrão) | Exige `rediss://` na URL |
| Encryption at rest | Enabled (padrão) | AWS managed key |

#### Security Group Dedicado

Criamos um security group exclusivo para o Redis:

```text
EC2 > Security Groups > Create security group
```

- **Name**: `psy-manager-redis-sg`
- **VPC**: `vpc-08ae7104a7af10eb6`
- **Inbound rule**: TCP 6379, source = ID do security group da EC2

Isso cria um vínculo de segurança dinâmico entre recursos: se o IP da EC2 mudar, o acesso continua funcionando automaticamente. Nenhum IP hardcoded.

#### Parâmetro SSM

Após o cluster ficar com status **Available**, copiamos o **Primary endpoint** e criamos o parâmetro:

```bash
aws ssm put-parameter \
  --region sa-east-1 \
  --name "/psy-manager/prod/REDIS_URL" \
  --type "String" \
  --value "rediss://master.psy-manager-redis.8kbstm.sae1.cache.amazonaws.com:6379" \
  --overwrite
```

`rediss://` (dois "s") porque o cluster tem **Encryption in transit** habilitado. O ioredis detecta o esquema `rediss://` e ativa o TLS automaticamente — nenhuma configuração adicional no código foi necessária porque o ElastiCache usa certificado da CA da Amazon, que é confiada pelo Node.js em instâncias EC2 com Amazon Linux/Ubuntu.

---

### J. Verificação em Produção

Após o deploy, verificamos o Redis diretamente do EC2:

```bash
# Instalar redis-cli no Ubuntu (não vem por padrão)
sudo apt-get install -y redis-tools

# Listar todas as chaves
redis-cli -u "rediss://master.psy-manager-redis.8kbstm.sae1.cache.amazonaws.com:6379" --tls KEYS "*"
```

Resultado:
```
1) "active-sessions-lr9j2Cq59d1sBlkDf1GG5bVxndCwBIRE"   ← Better Auth
2) "H0cU96dhucprsC3qkwSbVq45ZVWkvpuT"                   ← Better Auth
3) "patients:lr9j2Cq59d1sBlkDf1GG5bVxndCwBIRE"          ← nosso cache
```

```bash
# Verificar TTL do cache de pacientes (deve contar regressivamente a partir de 60)
redis-cli -u "rediss://..." --tls TTL "patients:lr9j2Cq59d1sBlkDf1GG5bVxndCwBIRE"
# (integer) 49
```

O log de startup da API confirma a conectividade:
```
✅ Redis conectado
```

---

### K. Degradação Graciosa

A implementação garante que a API nunca cai por causa do Redis:

- Se `REDIS_URL` não estiver definido → `getRedisClient()` retorna `null` → todas as funções de cache são no-ops → API funciona somente com RDS.
- Se o Redis ficar indisponível em produção → `try/catch` em cada função → erro logado → `null` retornado → rota vai ao RDS normalmente.
- Se o Redis demorar para conectar na inicialização → ioredis enfileira os primeiros comandos e os executa quando a conexão for estabelecida (comportamento padrão sem `enableOfflineQueue: false`).

---

### L. O Que Cai na SAA-C03

Esta implementação cobre múltiplos tópicos da certificação:

- **ElastiCache Redis**: o serviço gerenciado de cache in-memory da AWS. Diferente do ElastiCache Memcached (simples, sem persistência, sem pub/sub), o Redis suporta tipos de dados ricos, TTL por chave, pub/sub e persistência opcional.
- **Cache-aside pattern (lazy loading)**: a aplicação consulta o cache primeiro; em caso de miss, consulta o banco e popula o cache. É o padrão mais comum para caches de leitura.
- **Cache invalidation**: escrever no banco não atualiza o cache automaticamente. O código precisa explicitamente deletar a chave (`DEL`) após cada escrita para evitar servir dados desatualizados.
- **Encryption in transit (TLS)**: ElastiCache com Redis OSS requer `rediss://` quando `Encryption in transit` está habilitado. A CA da Amazon é confiada pelo Node.js em instâncias EC2 — não é necessário `rejectUnauthorized: false`.
- **Security Group source como outro Security Group**: em vez de um CIDR fixo como `172.31.0.0/16`, a regra de entrada usa o ID do security group da EC2 como fonte. Isso é mais seguro e resiliente a mudanças de IP.
- **SSM Parameter Store — String vs SecureString**: endpoints de rede (sem credenciais) podem ser `String`. Senhas, tokens e chaves de API devem ser `SecureString` (criptografados com KMS).
- **Estado em memória vs Redis**: o mapa de salas WebSocket (`ws/rooms.ts`) demonstra o problema de estado em memória em arquiteturas multi-instância. O Redis é a solução padrão para esse problema — seja via chaves simples (como fizemos com sessões) ou via pub/sub para mensagens em tempo real entre instâncias.

---

