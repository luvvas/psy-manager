> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 12. Upload Privado de Documentos: Amazon S3 Presigned URLs

Depois de migrar o frontend estático para S3 + CloudFront, adicionamos um segundo uso de S3: armazenamento privado de documentos clínicos e administrativos.

Este bucket é diferente do bucket do frontend. O bucket do frontend entrega arquivos públicos da aplicação via CloudFront. O bucket de documentos guarda PDFs privados de pacientes/modelos e não deve ser público.

### A. Diferença Entre os Dois Buckets

**Bucket do Frontend**
- Exemplo: `psy-manager-frontent-lucas`
- Conteúdo: `index.html`, JavaScript, CSS, favicon e assets do React/Vite.
- Acesso do usuário: pelo CloudFront.
- Escrita: GitHub Actions faz `aws s3 sync`.
- Leitura: CloudFront acessa o S3 usando Origin Access Control (OAC).
- O navegador não faz upload direto para este bucket.

**Bucket de Documentos**
- Exemplo: `psy-manager-documents-lucas`
- Conteúdo: PDFs enviados pelo usuário.
- Acesso do usuário: via URL temporária assinada.
- Escrita: o navegador envia o arquivo diretamente para o S3 com uma `presigned URL`.
- Leitura: a API gera outra `presigned URL` temporária para visualizar/baixar.
- O bucket continua privado com `Block all public access` ligado.

### B. Arquitetura do Fluxo de Upload

O fluxo implementado no Psy-Manager é:

```text
1. Usuário escolhe um PDF no navegador.
2. Frontend chama a API: "prepareUpload".
3. API valida tipo/tamanho e gera uma chave S3:
   documents/{psychologistId}/{uuid}.pdf
4. API, rodando na EC2, usa a IAM Role para criar uma presigned URL de PUT.
5. Frontend envia o PDF direto para o S3 usando essa URL temporária.
6. Frontend chama a mutation de criação/edição do documento.
7. RDS salva apenas metadados:
   storageKey, fileName, mimeType, fileSize.
```

O arquivo não passa pela memória da API. Isso é importante porque reduz carga no EC2, evita Base64 no banco e se aproxima do padrão cobrado na SAA-C03 para uploads grandes.

### C. Criação do Bucket de Documentos

No console AWS:

```text
S3 > Create bucket
```

Configuração usada:

- **Bucket name**: `psy-manager-documents-lucas`
- **Region**: `sa-east-1`
- **Object Ownership**: ACLs disabled
- **Block all public access**: marcado
- **Bucket Versioning**: opcional, mas recomendado para estudo
- **Default encryption**: SSE-S3
- **Static website hosting**: desabilitado

Este bucket não precisa de CloudFront no primeiro momento. Como os documentos são privados, a aplicação entrega acesso temporário por presigned URLs.

### D. CORS do Bucket de Documentos

Como o navegador envia o PDF diretamente para o S3, o bucket precisa permitir requisições vindas da origem do app.

No bucket:

```text
Permissions > Cross-origin resource sharing (CORS)
```

Configuração:

```json
[
  {
    "AllowedHeaders": ["Content-Type"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": [
      "https://dswfc48bg9ft6.cloudfront.net",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Por que o bucket do frontend não precisou disso?

Porque no frontend estático o navegador só baixa arquivos via CloudFront. Ele não faz `PUT` direto no S3. Já no bucket de documentos, o navegador faz `PUT` para uma URL do S3; sem CORS, o browser bloqueia a requisição mesmo que a URL esteja assinada.

### E. Permissão na IAM Role da EC2

A API roda dentro da EC2 usando a role:

```text
psy-manager-ec2-role
```

Ela precisa ter permissão real para `s3:PutObject` e `s3:GetObject`, porque a presigned URL só delega uma permissão que a API já possui.

No console:

```text
IAM > Roles > psy-manager-ec2-role > Permissions > Add permissions > Create inline policy > JSON
```

Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PsyManagerDocumentsObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::psy-manager-documents-lucas/documents/*"
    }
  ]
}
```

Nome sugerido:

```text
psy-manager-documents-s3-access
```

Essa policy não torna o bucket público. Ela apenas permite que a EC2, através da role, gere URLs assinadas para objetos dentro do prefixo `documents/`.

Se no futuro a aplicação também remover o arquivo do S3 ao excluir um documento no sistema, adicionar:

```json
"s3:DeleteObject"
```

### F. Parameter Store Para o Nome do Bucket

O nome do bucket foi salvo no SSM Parameter Store para não ficar fixo no servidor.

No console:

```text
Systems Manager > Parameter Store > Create parameter
```

Configuração:

- **Name**: `/psy-manager/prod/AWS_DOCUMENTS_BUCKET`
- **Type**: `String`
- **Value**: `psy-manager-documents-lucas`

No deploy da EC2, o GitHub Actions busca esse valor:

```bash
export STORAGE_DRIVER=s3
export AWS_REGION=sa-east-1
export AWS_DOCUMENTS_BUCKET=$(aws ssm get-parameter \
  --region sa-east-1 \
  --name "/psy-manager/prod/AWS_DOCUMENTS_BUCKET" \
  --query "Parameter.Value" \
  --output text)
```

O `docker-compose.prod.yml` injeta as variáveis no container da API:

```yaml
environment:
  STORAGE_DRIVER: ${STORAGE_DRIVER}
  AWS_REGION: ${AWS_REGION}
  AWS_DOCUMENTS_BUCKET: ${AWS_DOCUMENTS_BUCKET}
```

### G. Desenvolvimento Local Sem Usar o Bucket de Produção

Em desenvolvimento local usamos storage local, não S3.

`.env` local:

```env
STORAGE_DRIVER=local
LOCAL_STORAGE_DIR=./.storage
```

Nesse modo, o backend salva PDFs localmente e gera URLs temporárias internas:

```text
/api/storage/local-upload/{token}
/api/storage/local-download/{token}
```

Isso permite testar upload, preview e download sem encostar no bucket de produção.

### H. Migração de Banco

Para parar de salvar Base64 em colunas de texto, adicionamos metadados de storage nas tabelas:

```text
document.storage_key
document.file_name
document.mime_type
document.file_size

clinical_record.storage_key
clinical_record.file_name
clinical_record.mime_type
clinical_record.file_size
```

Migração criada:

```text
apps/api/drizzle/0006_cultured_spot.sql
```

Comandos:

```bash
bun run db:generate
bun run db:migrate
```

### I. O Que Cai na SAA-C03

Este desenho exercita vários pontos importantes da prova:

- **S3 privado**: documentos não ficam publicamente acessíveis.
- **IAM Role para EC2**: a aplicação não usa access key fixa no servidor.
- **Least privilege**: a role acessa apenas `documents/*` no bucket de documentos.
- **Presigned URLs**: delegação temporária de upload/download.
- **CORS**: necessário quando o browser fala diretamente com S3.
- **RDS para metadados**: banco guarda referência ao objeto, não o arquivo.
- **SSM Parameter Store**: configuração centralizada e sem hardcode.
- **Serverless data plane**: o upload pesado vai direto para S3, não para o EC2.

---

