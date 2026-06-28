# CloudFront

**O que é:** CDN da AWS — entrega conteúdo na edge, perto do usuário. Serve o frontend e faz proxy de API/WebSocket.

**Quando é a resposta certa:** reduzir latência global, HTTPS grátis, proteger origem, servir estáticos do S3.

## Pontos-chave
- **Behaviors** com path patterns → origens diferentes (`/*`→S3, `/api/*`→EC2, `/ws/*`→EC2).
- **OAC (Origin Access Control)**: só o CloudFront lê o S3 privado.
- **Cache policies**: assets com hash = cache longo; `index.html` = sem cache.
- **Invalidation** `/*`: força buscar versão nova antes do TTL.
- **WebSocket**: behavior com `CachingDisabled` + `AllViewerExceptHostHeader`.
- Certificado (ACM) **obrigatoriamente em us-east-1**.
- SPA fallback: Custom Error 403/404 → `/index.html` (200).

## Pegadinhas
- Cert do CloudFront NÃO pode estar na região do projeto — só us-east-1.
- Erro de MIME type em SPA = cache desencontrado → separar cache + invalidation.
- OAC (atual) substitui OAI (legado).

## Como usamos no Psy-Manager
- Frontend (S3) + `/api/*`,`/trpc/*`,`/ws/*` (EC2) num só domínio → [§9](../../progress/03-s3-cloudfront.md) · [§14](../../progress/08-webrtc.md)
- Cache assets vs app shell + invalidation → [§13](../../progress/07-cloudfront-cache.md)
