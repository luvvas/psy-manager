# Task: Isolar TURN Credentials do Endpoint Público de Vídeo

Status: draft

## Goal

Remover as credenciais do servidor TURN da resposta do endpoint público
`validateToken` (usado pelo paciente para entrar na sala de vídeo), evitando
que qualquer pessoa com um token de consulta possa abusar do servidor TURN como
relay de tráfego arbitrário.

## Context

Relevant files:

- `apps/api/src/routes/video-session.ts` — `validateToken` (publicProcedure) e `get` (protectedProcedure)
- `apps/web/src/features/consulta/join-page.tsx` — página do paciente; chama `validateToken`
- `apps/web/src/features/consulta/hooks/use-webrtc-call.ts` — recebe ICE servers e inicia a chamada

Existing behavior:

- `validateToken` (público, apenas token de paciente) retorna:
  ```typescript
  { sessionId, psychologistName, iceServers: getIceServers() }
  ```
  onde `getIceServers()` pode conter `{ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }`.
- Qualquer pessoa com qualquer token de paciente (ativo ou expirado) pode obter as
  credenciais TURN chamando `validateToken`.
- `videoSession.get` (protectedProcedure, psicólogo autenticado) já retorna
  `{ ...session, iceServers }` com credenciais TURN — esse fluxo é adequado.

## Requirements

### Backend — `apps/api/src/routes/video-session.ts`

**`validateToken`** — remover `iceServers` da resposta:

```diff
  return {
      sessionId: s.id,
      psychologistName: s.psychologistName,
-     iceServers: getIceServers(),
  };
```

**`validateToken`** — retornar apenas STUN público (sem TURN) para o paciente:

```diff
  return {
      sessionId: s.id,
      psychologistName: s.psychologistName,
+     iceServers: [{ urls: "stun:stun.l.google.com:19302" }] as IceServer[],
  };
```

> Justificativa: o paciente usa STUN para a maioria das conexões. TURN é necessário
> principalmente quando há NAT simétrico. Se o ambiente do paciente realmente
> precisar de TURN, a alternativa correta é implementar credenciais TURN efêmeras
> via HMAC com TTL curto (ver "Melhoria Futura" abaixo).

### Frontend — `apps/web/src/features/consulta/join-page.tsx`

Verificar se a página do paciente usa `iceServers` da resposta de `validateToken`.
Se sim, adaptar para usar o valor retornado (que agora só terá STUN) sem quebrar
a tipagem.

### Frontend — `apps/web/src/features/consulta/hooks/use-webrtc-call.ts`

Verificar se o hook aceita o array de ICE servers reduzido sem alteração de tipo.
O tipo `RTCIceServer[]` já aceita apenas `{ urls: string }`.

## Constraints

- Não quebrar o fluxo de vídeo existente entre psicólogo e paciente.
- O psicólogo ainda recebe `iceServers` completo via `videoSession.get`
  (protectedProcedure) — não alterar esse endpoint.
- Manter o tipo `IceServer` interno ao módulo `video-session.ts`.
- Não alterar `getIceServers()` — ela continua sendo usada em `videoSession.get`.

## Acceptance Criteria

- `trpc.videoSession.validateToken` não retorna `TURN_CREDENTIAL` nem
  `TURN_USERNAME` na resposta.
- A sala de vídeo do paciente (`/consulta/entrar/:token`) ainda carrega e conecta
  via WebRTC (com STUN).
- O psicólogo na sala (`/consulta/:sessionId`) ainda recebe ICE servers completos.
- `bun run build` passa sem erros de tipo.

## Melhoria Futura (fora do escopo desta task)

Para suportar TURN para pacientes em redes com NAT simétrico sem expor credenciais
estáticas, implementar credenciais TURN efêmeras:
- Gerar `username = timestamp:pacientId` e `credential = HMAC-SHA256(secret, username)`.
- TTL de 1 hora.
- Retornar essas credenciais efêmeras em `validateToken` sem expor o secret TURN.

## Suggested Verification

```bash
bun run build

# Verificar resposta de validateToken
curl http://localhost:3001/trpc/videoSession.validateToken?input={"token":"<token>"}
# Esperado: NÃO deve conter TURN_URL, TURN_USERNAME, TURN_CREDENTIAL

# Verificar que a sala do paciente ainda carrega
# Criar uma sessão de vídeo e acessar o link do paciente
# Confirmar que WebRTC conecta (pode usar apenas STUN em rede local)
```
