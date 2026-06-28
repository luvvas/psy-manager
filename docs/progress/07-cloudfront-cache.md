> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 13. Cache do CloudFront, Invalidation e Erro de MIME Type

Durante o deploy do frontend Vite no S3, encontramos o erro:

```text
Failed to load module script:
Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "text/html".
```

### A. Causa Real

O navegador pediu um arquivo JavaScript:

```text
/assets/index-CdVjFcHR.js
```

Mas recebeu HTML (`index.html`) no lugar.

Isso acontece quando:

1. O `index.html` aponta para um asset com hash novo.
2. O asset ainda não existe no S3, foi deletado por `--delete`, ou o CloudFront está servindo uma versão antiga do `index.html`.
3. A regra de SPA do CloudFront intercepta o 403/404 e devolve `/index.html`.
4. O browser esperava JavaScript, recebeu HTML e bloqueou por MIME type.

### B. Relação Com a Regra de SPA

A regra de SPA continua correta e necessária:

```text
/login -> S3 não acha arquivo -> CloudFront devolve /index.html
/pacientes -> S3 não acha arquivo -> CloudFront devolve /index.html
```

O efeito colateral aparece quando um asset também cai nessa regra:

```text
/assets/index-XYZ.js -> arquivo ausente -> CloudFront devolve /index.html
```

Então a regra não é o erro original. Ela apenas mascara o problema real: mismatch entre `index.html`, assets e cache do CloudFront.

### C. Correção no GitHub Actions

O deploy passou a separar cache de assets e cache do app shell:

```yaml
- name: Sync immutable assets to S3 Bucket
  run: |
    aws s3 sync ./apps/web/dist/assets s3://psy-manager-frontent-lucas/assets \
      --delete \
      --cache-control "public,max-age=31536000,immutable"

- name: Sync app shell to S3 Bucket
  run: |
    aws s3 sync ./apps/web/dist s3://psy-manager-frontent-lucas \
      --delete \
      --exclude "assets/*" \
      --cache-control "no-cache,no-store,must-revalidate"

- name: Invalidate CloudFront cache
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
      --paths "/*"
```

Por que isso funciona:

- `/assets/*` recebe cache longo porque os nomes têm hash.
- `index.html` recebe cache curto/sem cache porque aponta para os hashes atuais.
- A invalidation força os edge locations do CloudFront a buscar a versão nova.

### D. Secret do GitHub Para CloudFront

No GitHub:

```text
Repository > Settings > Secrets and variables > Actions > New repository secret
```

Criar:

```text
CLOUDFRONT_DISTRIBUTION_ID
```

Valor:

```text
E123ABC456XYZ
```

O ID fica em:

```text
CloudFront > Distributions > selecionar distribuição > Distribution ID
```

### E. Permissão IAM Para o GitHub Invalidar CloudFront

O usuário IAM usado no GitHub Actions:

```text
github-actions-deployer
```

precisa ter permissão para:

```text
cloudfront:CreateInvalidation
```

No console:

```text
IAM > Users > github-actions-deployer > Permissions > Add permissions > Create inline policy > JSON
```

Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontInvalidationForPsyManager",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::952078551945:distribution/SEU_DISTRIBUTION_ID"
    }
  ]
}
```

Nome sugerido:

```text
psy-manager-cloudfront-invalidation
```

Se aparecer este erro no pipeline:

```text
AccessDenied: not authorized to perform: cloudfront:CreateInvalidation
```

significa que essa policy ainda não foi adicionada ou o `Resource` está apontando para uma distribuição diferente.

### F. Correção Manual Emergencial

Se o site quebrar depois de um deploy, fazer invalidation manual:

```text
CloudFront > Distributions > sua distribuição > Invalidations > Create invalidation
```

Path:

```text
/*
```

Depois aguardar alguns minutos e fazer hard refresh no navegador.

### G. Checklist de Diagnóstico

Quando aparecer erro de MIME type em módulo JS:

1. Abrir o `index.html` atual no S3 e verificar qual arquivo JS ele referencia.
2. Conferir se esse arquivo existe no bucket em `assets/`.
3. Abrir a URL direta do JS no navegador.
4. Se vier HTML, o asset está ausente ou o CloudFront está devolvendo a fallback page.
5. Criar invalidation `/*`.
6. Confirmar que o pipeline está fazendo sync dos assets antes do app shell.
7. Confirmar que o GitHub Actions tem permissão `cloudfront:CreateInvalidation`.

### H. O Que Cai na SAA-C03

Este problema ajuda a estudar:

- **CloudFront cache behavior**: objetos ficam em edge locations.
- **Invalidation**: força atualização antes do TTL expirar.
- **S3 static hosting vs REST origin com OAC**: no nosso caso, usamos origem privada com OAC.
- **SPA fallback**: Custom Error Responses 403/404 para `/index.html`.
- **Cache-Control**: assets versionados podem ter cache longo; `index.html` não.
- **IAM least privilege**: GitHub Actions precisa só da permissão de invalidar a distribuição correta.

---

