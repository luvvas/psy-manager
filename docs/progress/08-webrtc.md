> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 14. 🎥 Videochamada em Tempo Real (WebRTC + WebSocket)

Este é provavelmente o capítulo mais complexo do projeto, então vamos devagar. Ao final, você vai entender como dois navegadores em redes diferentes conseguem trocar vídeo ao vivo **diretamente entre si**, sem precisar de um servidor de vídeo no meio.

### A. O Problema: Como Duas Pessoas se Veem ao Vivo?

Quando você assiste a um vídeo no YouTube, o fluxo é simples: servidor → seu navegador. Mas em uma videochamada, o fluxo precisa ser **bidirecional e em tempo real**: o vídeo da câmera do psicólogo vai para o paciente, e o vídeo do paciente vai para o psicólogo, ao mesmo tempo, com latência mínima.

Existem duas abordagens comuns:
1. **Servidor de mídia centralizado** (ex: Twilio, Daily.co): toda a mídia passa por um servidor na nuvem. Simples, mas caro.
2. **WebRTC peer-to-peer (P2P)**: os navegadores se conectam **diretamente** um ao outro. Gratuito, mas você precisa ajudar os dois lados a se descobrirem na internet primeiro.

Escolhemos a abordagem P2P com WebRTC para não depender de serviços de terceiros com cobrança por minuto.

O problema é: como o navegador do psicólogo sabe o endereço IP e as capacidades de mídia do navegador do paciente? Eles precisam **trocar mensagens de apresentação** antes de conectar. É aí que entra o **servidor de sinalização (signaling server)** — um canal temporário via WebSocket que ajuda os dois lados a se encontrarem. Depois que a conexão P2P está estabelecida, o WebSocket não é mais necessário para a mídia.

```
Psicólogo ←—WebSocket sinalização—→ Servidor (EC2) ←—WebSocket sinalização—→ Paciente
     ↑                                                                              ↑
     └─────────────────── vídeo/áudio P2P direto (WebRTC) ────────────────────────┘
```

---

### B. Os Três Conceitos Que Você Precisa Entender

Antes de ver o código, você precisa entender três siglas:

**1. SDP (Session Description Protocol)**

É um bloco de texto que descreve "o que eu consigo fazer": quais codecs de vídeo e áudio eu suporto, em qual resolução, etc. Funciona como um currículo que cada lado manda para o outro.

- O psicólogo cria uma **offer** (oferta) com seu SDP.
- O paciente recebe, lê o currículo, e responde com um **answer** (resposta) com seu próprio SDP.
- Depois disso, os dois sabem exatamente como se comunicar.

**2. ICE (Interactive Connectivity Establishment)**

É o processo pelo qual o navegador descobre todos os caminhos de rede possíveis para alcançar o outro lado. Ele gera **candidatos ICE** — endereços/portas que podem funcionar:
- **host**: o IP local da sua máquina (ex: `192.168.1.10`)
- **srflx (server-reflexive)**: seu IP público, descoberto via servidor STUN
- **relay**: um servidor TURN que retransmite os pacotes quando P2P direto falha

**3. STUN e TURN**

- **STUN**: servidor simples que te diz "seu IP público é X.X.X.X". Usamos o do Google (`stun.l.google.com:19302`) gratuitamente.
- **TURN**: servidor que fica no meio e retransmite os pacotes de vídeo quando P2P direto é impossível (ex: redes corporativas com NAT simétrico, CGNAT de operadoras). É o plano B. Nós rodamos o **coturn** no próprio EC2.

---

### C. Banco de Dados — A Tabela `video_session`

Toda sessão de vídeo precisa ser registrada no banco para que:
1. O paciente possa entrar via link (magic link) sem ter conta.
2. A API saiba se a sessão ainda está válida ou já foi encerrada.

Adicionamos a tabela ao schema do Drizzle em `apps/api/src/db/schema.ts`:

```typescript
export const videoSession = pgTable("video_session", {
    id: text("id").primaryKey(),
    appointmentId: text("appointment_id").references(() => appointment.id, { onDelete: "set null" }),
    psychologistId: text("psychologist_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    patientToken: text("patient_token").notNull().unique(),
    status: text("status").notNull().default("pending"), // pending, active, ended
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    endedAt: timestamp("ended_at"),
});
```

Campos importantes:
- `patientToken`: um token aleatório de 24 bytes em base64url que vira o link do paciente. É único e secreto — quem tiver esse token pode entrar na consulta.
- `expiresAt`: o link expira em 24 horas.
- `status`: começa como `pending`, vai para `ended` quando o psicólogo encerra.

Para criar a migration corretamente (sem usar `db:push` que pode causar inconsistências em produção):

```bash
# Gera o arquivo SQL da migration
bun run db:generate

# Aplica localmente
bun run db:migrate
```

Isso cria o arquivo `apps/api/drizzle/0008_curved_wild_child.sql` com o SQL exato:

```sql
CREATE TABLE "video_session" (
    "id" text PRIMARY KEY NOT NULL,
    "appointment_id" text,
    "psychologist_id" text NOT NULL,
    "patient_token" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "expires_at" timestamp NOT NULL,
    "ended_at" timestamp,
    CONSTRAINT "video_session_patient_token_unique" UNIQUE("patient_token")
);
```

Em produção, o `db:migrate` roda automaticamente no deploy (o workflow do GitHub Actions executa `docker compose exec -T api bun run db:migrate` após subir os containers).

> **Lição importante**: Sempre use `db:generate` + `db:migrate` em vez de `db:push` em projetos com banco de produção. O `db:push` faz diff direto e pode perguntar se você quer apagar dados — e em CI/CD sem terminal interativo, ele simplesmente trava.

---

### D. Backend — Gerenciamento de Salas em Memória (`ws/rooms.ts`)

Criamos o arquivo `apps/api/src/ws/rooms.ts`. Pense nele como o **porteiro do edifício**: ele sabe em qual sala está cada participante.

```typescript
import { randomBytes } from "crypto";
import type { WebSocket } from "ws";

interface Room {
    psychologist?: WebSocket;
    patient?: WebSocket;
    pendingAuthTokens: Map<string, number>; // token → timestamp de expiração
}

const rooms = new Map<string, Room>();
```

O mapa `rooms` vive na memória do processo Node.js. A chave é o `sessionId` (UUID da sessão), e o valor é a sala com as referências WebSocket dos dois participantes.

Funções exportadas:

**`createAuthToken(sessionId)`** — chamado quando o psicólogo cria a sessão via tRPC. Gera um token de 16 bytes em hex com validade de 10 minutos. Esse token é enviado para o frontend e usado uma única vez para autenticar o WebSocket do psicólogo:

```typescript
export function createAuthToken(sessionId: string): string {
    const token = randomBytes(16).toString("hex");
    const room = getOrCreate(sessionId);
    room.pendingAuthTokens.set(token, Date.now() + 10 * 60 * 1000); // 10 min
    return token;
}
```

**`consumeAuthToken(sessionId, token)`** — valida e **consome** o token (deleta do mapa). Token de uso único: depois que o psicólogo conectar, o token some e não pode ser reutilizado.

**`pruneRoom(sessionId)`** — remove a sala da memória quando os dois participantes desconectaram e não há tokens pendentes. Evita memory leak.

> **Limitação importante**: Esse mapa vive **dentro de um único processo**. Se você tiver dois servidores EC2 rodando a API (atrás de um load balancer), uma sala criada no servidor A não é visível no servidor B. Para multi-instância, você precisaria substituir esse mapa por **Redis pub/sub**. Por enquanto, com um único EC2, funciona perfeitamente.

---

### E. Backend — O Servidor de Sinalização (`ws/signaling.ts`)

Criamos `apps/api/src/ws/signaling.ts`. Esta é a peça central: ela recebe mensagens WebSocket e as retransmite para o outro participante. Pense nela como um **carteiro que entrega envelopes entre dois quartos sem ler o conteúdo**.

```typescript
export function handleSignaling(ws: WebSocket, sessionId: string): void {
    ws.on("message", async (raw) => {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "join") {
            // Autenticação de quem está entrando
            if (msg.role === "psychologist") {
                if (!consumeAuthToken(sessionId, msg.wsAuthToken)) {
                    ws.close(1008, "Unauthorized");
                    return;
                }
                room.psychologist = ws;
                // Se o paciente já está na sala, avisa os dois que podem começar
                if (room.patient) {
                    send(ws, { type: "ready" });
                    send(room.patient, { type: "ready" });
                }
            }

            if (msg.role === "patient") {
                // Valida o patientToken no banco de dados
                const [s] = await db.select().from(videoSession).where(eq(videoSession.id, sessionId));
                if (!s || s.patientToken !== msg.token || s.status === "ended" || now > s.expiresAt) {
                    ws.close(1008, "Unauthorized");
                    return;
                }
                room.patient = ws;
                if (room.psychologist) {
                    send(room.psychologist, { type: "ready" });
                    send(ws, { type: "ready" });
                }
            }
        }

        // Para offer/answer/ice: apenas repassa para o outro lado
        const peer = isPsychologist ? room.patient : room.psychologist;
        if (peer && (msg.type === "offer" || msg.type === "answer" || msg.type === "ice")) {
            send(peer, msg);
        }
    });

    ws.on("close", () => {
        // Avisa o outro participante que o parceiro saiu
        if (peer) send(peer, { type: "peer_left" });
        pruneRoom(sessionId);
    });
}
```

O fluxo de mensagens completo é:

```
Psicólogo                     Servidor                      Paciente
    |                             |                              |
    |── join {role: "psychologist", wsAuthToken} ──→|           |
    |                             |── (aguarda paciente)        |
    |                             |←── join {role: "patient", token} ──|
    |                             |                              |
    |←── ready ───────────────────|───────────── ready ─────────|
    |                             |                              |
    |── offer {sdp} ─────────────→|─────────── offer {sdp} ────→|
    |                             |                              |
    |←── answer {sdp} ────────────|←─────────── answer {sdp} ───|
    |                             |                              |
    |── ice {candidate} ──────────→|──────────── ice {candidate}→|
    |←── ice {candidate} ─────────|←──────────── ice {candidate}|
    |                             |                              |
    |←════════════ conexão P2P direta estabelecida ═════════════→|
```

---

### F. Backend — Rotas tRPC (`routes/video-session.ts`)

Criamos `apps/api/src/routes/video-session.ts` com quatro procedimentos tRPC:

**`create` (protegido)** — psicólogo cria uma sessão:
```typescript
create: protectedProcedure
    .input(z.object({ appointmentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
        const { id, patientToken } = await videoSessionService.create(ctx.session.user.id, input.appointmentId);
        const wsAuthToken = createAuthToken(id); // token de 10 min para autenticar o WS
        const patientJoinUrl = `${PUBLIC_URL}/consulta/entrar/${patientToken}`;
        return { sessionId: id, patientJoinUrl, wsAuthToken };
    }),
```

**`get` (protegido)** — psicólogo busca dados da sessão, incluindo a lista de servidores ICE (STUN + TURN):
```typescript
get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
        const s = await videoSessionService.getById(ctx.session.user.id, input.id);
        return { ...s, iceServers: getIceServers() };
    }),
```

**`end` (protegido)** — psicólogo encerra a sessão (marca `status = "ended"` no banco).

**`validateToken` (público)** — paciente valida o magic link antes de entrar. Não requer login:
```typescript
validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
        const s = await videoSessionService.validateToken(input.token);
        if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido ou não encontrado." });
        if (s.status === "ended") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Esta sessão já foi encerrada." });
        if (new Date() > new Date(s.expiresAt)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Este link expirou." });
        return { sessionId: s.id, psychologistName: s.psychologistName, iceServers: getIceServers() };
    }),
```

Os servidores ICE são montados a partir de variáveis de ambiente:
```typescript
function getIceServers(): IceServer[] {
    const servers = [{ urls: "stun:stun.l.google.com:19302" }];
    if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
        servers.push({ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL });
    }
    return servers;
}
```

---

### G. Backend — Integrando o WebSocket no Servidor Hono (`index.ts`)

O Hono é um framework HTTP, não um servidor WebSocket. Para aceitar conexões WebSocket, precisamos interceptar o evento `upgrade` do servidor HTTP Node.js subjacente.

O problema inicial: a versão `@hono/node-server@1.14.1` não exporta um módulo `/ws` para isso. A solução foi instalar o pacote `ws` diretamente:

```bash
bun add ws @types/ws
```

E então modificar `apps/api/src/index.ts` para capturar o evento de upgrade:

```typescript
import { WebSocketServer } from "ws";
import { handleSignaling } from "./ws/signaling";

const port = Number(process.env.API_PORT) || 3001;
const server = serve({ fetch: app.fetch, port });

// WebSocket server separado — não interfere com o HTTP do Hono
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);
    // Só aceita upgrades para /ws/signaling/:sessionId
    const match = url.pathname.match(/^\/ws\/signaling\/([^/]+)$/);
    if (match) {
        wss.handleUpgrade(request, socket, head, (ws) => {
            handleSignaling(ws, match[1]); // match[1] é o sessionId
        });
    } else {
        socket.destroy(); // rejeita qualquer outro upgrade
    }
});
```

`noServer: true` significa que o `WebSocketServer` não abre uma porta própria — ele apenas sabe lidar com conexões quando você passa uma para ele via `handleUpgrade`. O evento `upgrade` é disparado toda vez que um navegador tenta trocar o protocolo HTTP por WebSocket (enviando o header `Upgrade: websocket`).

---

### H. Frontend — O Hook `useWebRtcCall`

Criamos `apps/web/src/features/consulta/hooks/use-webrtc-call.ts`. Este hook encapsula **todo o ciclo de vida** da chamada WebRTC. É o coração do frontend.

```typescript
const WS_BASE =
    (import.meta.env.VITE_WS_URL as string | undefined) ??
    (import.meta.env.VITE_API_URL as string | undefined) ??
    "http://localhost:3001";

function getWsUrl(sessionId: string): string {
    return `${WS_BASE.replace(/^http/, "ws")}/ws/signaling/${sessionId}`;
}
```

O URL WebSocket é derivado da variável de ambiente `VITE_API_URL`, substituindo `https://` por `wss://` (ou `http://` por `ws://`). Isso garante que em produção a conexão WS vai para o mesmo host da API, passando pelo CloudFront.

**As referências mais importantes do hook:**

```typescript
const wsRef = useRef<WebSocket | null>(null);        // conexão de sinalização
const pcRef = useRef<RTCPeerConnection | null>(null); // conexão P2P WebRTC
const localStreamRef = useRef<MediaStream | null>(null); // câmera/mic local
const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]); // fila de candidatos ICE
const remoteDescriptionSet = useRef(false); // flag: SDP remoto já foi configurado?
```

**O fluxo do `startCall`:**

1. Pede permissão para câmera e microfone: `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
2. Cria o `RTCPeerConnection` com os `iceServers` recebidos da API
3. Adiciona as tracks de vídeo/áudio ao peer connection
4. Abre o WebSocket e envia `join` com as credenciais
5. Quando recebe `ready`, o psicólogo cria e envia a `offer`; o paciente aguarda

**O fluxo de sinalização no frontend:**

```typescript
ws.onmessage = async (e) => {
    const msg = JSON.parse(e.data);

    if (msg.type === "ready" && role === "psychologist") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWs({ type: "offer", sdp: pc.localDescription });
    }

    if (msg.type === "offer" && role === "patient") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        remoteDescriptionSet.current = true;
        // Descarrega a fila de candidatos que chegaram antes do SDP
        for (const c of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => null);
        }
        iceCandidateQueue.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendWs({ type: "answer", sdp: pc.localDescription });
    }

    if (msg.type === "ice") {
        if (remoteDescriptionSet.current) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => null);
        } else {
            iceCandidateQueue.current.push(msg.candidate); // enfileira para depois
        }
    }
};
```

---

### I. Bug Crítico #1 — A Fila de Candidatos ICE

Este foi o bug que fazia a chamada cair em produção. Entender ele é fundamental.

**O problema:** Os candidatos ICE chegam **enquanto** o SDP está sendo negociado. O `addIceCandidate` só funciona **depois** que o `setRemoteDescription` foi chamado. Se um candidato chegar antes, você recebe um erro silencioso — ele é simplesmente ignorado.

**Por que acontecia em produção e não em desenvolvimento local?**

Em desenvolvimento, o psicólogo e o paciente estão na mesma máquina. A rede é muito rápida, então os candidatos ICE chegam depois do SDP. Em produção, com dois computadores em redes diferentes, os candidatos chegam em ordem imprevisível — muitos chegam antes do SDP, e eram silenciosamente descartados.

**A solução:** Uma fila simples de candidatos pendentes:

```typescript
const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
const remoteDescriptionSet = useRef(false);

// Quando o SDP remoto chegar:
remoteDescriptionSet.current = true;
for (const c of iceCandidateQueue.current) {
    await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => null);
}
iceCandidateQueue.current = [];

// Quando um candidato ICE chegar:
if (remoteDescriptionSet.current) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => null);
} else {
    iceCandidateQueue.current.push(candidate); // guarda para depois
}
```

---

### J. Bug Crítico #2 — O Estado `disconnected` é Transitório

O segundo bug que fazia a chamada cair era no tratamento do estado de conexão:

**O problema original (código errado):**
```typescript
pc.onconnectionstatechange = () => {
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        updateStatus("ended"); // ERRADO: "disconnected" não é terminal
    }
};
```

**Por que estava errado:** O estado `"disconnected"` é **transitório**. Ele acontece quando há perda de pacotes temporária (ex: o Wi-Fi oscilou por um segundo). O browser automaticamente tenta reconectar por ~5 segundos antes de ir para `"failed"`. Ao tratar `"disconnected"` como terminal, a chamada encerrava no primeiro soluço de rede.

**A correção:**
```typescript
pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") updateStatus("active");
    // Só "failed" e "closed" são realmente terminais
    if (["failed", "closed"].includes(pc.connectionState)) {
        updateStatus("ended");
    }
};
```

---

### K. Frontend — A Sala de Consulta (`ConsultaRoom`)

Criamos `apps/web/src/features/consulta/components/consulta-room.tsx`. É a tela de videochamada em si.

Layout da tela:
```
┌─────────────────────────────────────────┐
│ [Consulta em andamento]    [Copiar link] │  ← top bar
│                                         │
│                                         │
│         vídeo remoto (fundo)            │  ← video remoto ocupa tela cheia
│                                         │
│                                         │
│                           ┌───────────┐ │
│                           │  eu (PiP) │ │  ← vídeo local em Picture-in-Picture
│                           └───────────┘ │
│           [ ☎ Encerrar ]               │  ← botão centralizado na base
└─────────────────────────────────────────┘
```

O ponto importante é que não existe `<video src="...">` — a câmera é atribuída via JavaScript no `useEffect`:

```typescript
const remoteVideoRef = useRef<HTMLVideoElement>(null);
const localVideoRef = useRef<HTMLVideoElement>(null);

useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
}, [remoteStream]);

useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
}, [localStream]);
```

`srcObject` é uma propriedade especial do `<video>` que aceita um `MediaStream` ao vivo — não é uma URL, é um fluxo direto da câmera ou da conexão P2P.

---

### L. Frontend — As Páginas (`PsychologistPage` e `JoinPage`)

**`PsychologistPage`** (`apps/web/src/features/consulta/psychologist-page.tsx`) — rota protegida em `/consulta/:sessionId`:

1. Lê o `wsAuthToken` e o `patientJoinUrl` do `location.state` (passados pelo `navigate` quando o psicólogo cria a sessão na agenda).
2. Busca a sessão via `videoSession.get` para obter os `iceServers`.
3. Inicia a chamada automaticamente via `useEffect` (com `startedRef` para evitar double-render):
```typescript
const startedRef = useRef(false);
useEffect(() => {
    if (session && wsAuthToken && !startedRef.current) {
        startedRef.current = true;
        startCall();
    }
}, [session, wsAuthToken, startCall]);
```

**`JoinPage`** (`apps/web/src/features/consulta/join-page.tsx`) — rota pública em `/consulta/entrar/:token`:

1. Valida o token via `videoSession.validateToken` (procedimento público — sem login).
2. Exibe tela de pré-entrada com o nome do psicólogo.
3. Quando o paciente clica "Entrar na consulta", chama `startCall()` e mostra o `ConsultaRoom`.

O paciente não precisa de conta. O `token` da URL **é** a credencial — ele é enviado no `join` via WebSocket e validado pelo servidor no banco de dados.

---

### M. Frontend — Roteamento e Botão na Agenda

Em `apps/web/src/router.tsx`, adicionamos duas rotas:

```tsx
// Rota pública — deve vir ANTES do AuthGuard
<Route path="/consulta/entrar/:token" element={<JoinPage />} />

// Rota protegida — dentro do AppLayout
<Route path="consulta/:sessionId" element={<PsychologistPage />} />
```

A ordem importa: a rota pública do paciente deve ser declarada antes do bloco de rotas que exige autenticação, senão o guard de autenticação redireciona o paciente para o login.

No card de agendamento (`appointment-card.tsx`), adicionamos o botão que cria a sessão e navega:

```typescript
const handleStartVideo = async () => {
    const result = await createVideoSession.mutateAsync({ appointmentId: appointment.id });
    navigate(`/consulta/${result.sessionId}`, {
        state: {
            wsAuthToken: result.wsAuthToken,
            patientJoinUrl: result.patientJoinUrl,
        },
    });
};
```

O `wsAuthToken` e o `patientJoinUrl` são passados via `state` do React Router — eles não aparecem na URL, não são armazenados no banco, e vivem apenas na memória do browser naquela navegação.

---

### N. Infraestrutura — Servidor TURN com coturn no EC2

O STUN resolve endereços públicos, mas não consegue ajudar quando há NAT simétrico (ex: operadoras com CGNAT) ou redes corporativas com firewall agressivo. Para esses casos, o TURN retransmite toda a mídia pelo servidor.

Instalamos o **coturn** no mesmo EC2 da API:

```bash
sudo apt install coturn -y
```

Configuração em `/etc/turnserver.conf`:

```ini
# Porta padrão do TURN
listening-port=3478

# Seu IP público do EC2
external-ip=SEU_IP_PÚBLICO/SEU_IP_PRIVADO

# Credenciais (usuário:senha estáticas para simplicidade)
user=psy:SUA_SENHA_AQUI

# Realm — pode ser qualquer string (geralmente o domínio)
realm=psy-manager

# Sem autenticação anônima
no-tls
no-dtls
fingerprint
lt-cred-mech

# Logs
log-file=/var/log/turnserver.log
```

Inicializar e habilitar:

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
sudo systemctl status coturn
```

**Security Group do EC2** — abrir as portas:

```text
UDP  3478    0.0.0.0/0    # TURN
TCP  3478    0.0.0.0/0    # TURN (fallback TCP)
UDP  49152-65535  0.0.0/0  # Portas de mídia TURN (relay range)
```

As credenciais do TURN são salvas no SSM Parameter Store:

```bash
aws ssm put-parameter --name "/psy-manager/prod/TURN_URL" --value "turn:SEU_IP:3478" --type String --region sa-east-1
aws ssm put-parameter --name "/psy-manager/prod/TURN_USERNAME" --value "psy" --type String --region sa-east-1
aws ssm put-parameter --name "/psy-manager/prod/TURN_CREDENTIAL" --value "SUA_SENHA" --type SecureString --region sa-east-1
```

---

### O. Infraestrutura — CloudFront e o Comportamento `/ws/*`

Aqui está um dos problemas mais traiçoeiros da produção. O CloudFront ficava na frente de tudo, e quando o navegador tentava fazer um upgrade WebSocket para `wss://meu-dominio.cloudfront.net/ws/signaling/xxx`, o CloudFront não sabia o que fazer com isso — ele mandava a requisição para o bucket S3 (onde está o frontend estático), que obviamente não sabe lidar com WebSocket.

**A solução:** Criar um **comportamento específico** no CloudFront para o path `/ws/*` que aponta diretamente para o EC2.

No console AWS:

```text
CloudFront > Distributions > sua distribuição > Behaviors > Create behavior
```

Configurações:

```text
Path pattern:              /ws/*
Origin:                    EC2 origin (não o S3!)
Viewer protocol policy:    Redirect HTTP to HTTPS
Cache policy:              CachingDisabled
Origin request policy:     AllViewerExceptHostHeader
```

A política `AllViewerExceptHostHeader` é crucial: ela encaminha todos os headers do navegador para o EC2 (incluindo `Upgrade: websocket`, `Connection: upgrade`, `Sec-WebSocket-Key`, etc.) exceto o `Host`, que seria o domínio do CloudFront em vez do EC2. Sem isso, o handshake WebSocket falha silenciosamente.

O CloudFront suporta WebSocket desde 2018 — ele detecta o header `Upgrade: websocket` e automaticamente mantém a conexão TCP persistente.

> **Mistura de conteúdo (mixed content):** Quando o site serve por HTTPS, o navegador bloqueia conexões `ws://` (sem criptografia). Você DEVE usar `wss://` (WebSocket sobre TLS). Roteando pelo CloudFront com HTTPS, isso acontece automaticamente — o CloudFront termina o TLS e fala HTTP/WS simples com o EC2 na rede interna privada.

---

### P. Infraestrutura — Variáveis de Ambiente em Produção

Adicionamos as variáveis ao workflow de deploy em `.github/workflows/deploy-ec2.yml`:

```yaml
# No script SSH do deploy-backend:
export PUBLIC_URL=$(aws ssm get-parameter --region sa-east-1 \
  --name "/psy-manager/prod/PUBLIC_URL" --query "Parameter.Value" --output text)
export TURN_URL=$(aws ssm get-parameter --region sa-east-1 \
  --name "/psy-manager/prod/TURN_URL" --query "Parameter.Value" --output text)
export TURN_USERNAME=$(aws ssm get-parameter --region sa-east-1 \
  --name "/psy-manager/prod/TURN_USERNAME" --query "Parameter.Value" --output text)
export TURN_CREDENTIAL=$(aws ssm get-parameter --region sa-east-1 \
  --name "/psy-manager/prod/TURN_CREDENTIAL" --with-decryption \
  --query "Parameter.Value" --output text)
```

E ao `docker-compose.prod.yml` para que os valores sejam injetados no container:

```yaml
services:
  api:
    environment:
      PUBLIC_URL: ${PUBLIC_URL}
      TURN_URL: ${TURN_URL}
      TURN_USERNAME: ${TURN_USERNAME}
      TURN_CREDENTIAL: ${TURN_CREDENTIAL}
```

> **Bug que pegamos na produção:** O `PUBLIC_URL` estava sendo exportado no shell do deploy, mas não estava no `docker-compose.prod.yml`. Resultado: dentro do container, `process.env.PUBLIC_URL` era `undefined`, e o link gerado para o paciente era `undefined/consulta/entrar/TOKEN` — um URL obviamente quebrado. A lição: exportar no shell só resolve para comandos que rodam diretamente no shell. O Docker Compose precisa da declaração explícita em `environment:`.

---

### Q. O Que Cai na SAA-C03

Esta feature toca em vários tópicos da certificação:

- **CloudFront Behaviors**: você aprendeu que behaviors com path patterns diferentes podem apontar para origins diferentes dentro da mesma distribuição. `/ws/*` vai para EC2; `/*` vai para S3.
- **WebSocket no CloudFront**: CloudFront suporta WebSocket nativamente via behaviors com `CachingDisabled` + `AllViewerExceptHostHeader`. Isso é perguntado em cenários de aplicações em tempo real.
- **SSM Parameter Store**: `SecureString` vs `String`. Credenciais (como `TURN_CREDENTIAL`) vão como `SecureString`; valores não-sensíveis (como a URL do TURN) podem ser `String`. O IAM Role do EC2 permite `ssm:GetParameter` sem expor chaves de acesso.
- **Single-instance vs multi-instance state**: estado em memória (como o mapa de salas WebSocket) é uma armadilha clássica em arquiteturas horizontalmente escaláveis. O exame adora perguntar: "se você adicionar um segundo servidor, o que quebra?". A resposta é: qualquer estado em memória local. A solução é ElastiCache (Redis) ou DynamoDB.
- **Security Groups para UDP**: TURN usa UDP na faixa de portas 49152-65535 para os fluxos de mídia. Não esquecer de abrir no Security Group — TCP sozinho não funciona para TURN relay.
- **Mixed Content**: HTTPS → WebSocket requer `wss://`. O CloudFront com HTTPS resolve isso de forma transparente, pois o TLS é terminado no edge e o backend só vê conexões HTTP/WS simples.

---

