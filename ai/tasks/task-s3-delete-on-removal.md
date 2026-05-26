# Task: Exclusão de Objetos S3 ao Deletar Documentos e Conta

Status: draft

## Goal

Garantir que arquivos físicos no S3 (PDFs de documentos e prontuários) sejam
removidos do bucket sempre que o registro no banco for excluído — seja por deleção
individual de documento/prontuário, seja por exclusão completa da conta do psicólogo.
Sem isso, arquivos clínicos ficam no S3 indefinidamente, violando o Art. 15/16 da LGPD.

## Context

Relevant files:

- `apps/api/src/services/storage.service.ts` — contém `createUploadTarget` e `createReadUrl`; não possui `deleteObject`
- `apps/api/src/utils/storage.utils.ts` — helpers de S3 (`getS3Client`, `getBucketName`, `getDriver`, etc.)
- `apps/api/src/services/document.service.ts` — `delete()` apaga o registro do BD mas não o objeto S3
- `apps/api/src/services/clinical-record.service.ts` — `delete()` apaga o registro do BD mas não o objeto S3
- `apps/api/src/services/psychologist.service.ts` — `deleteAccount()` deleta o usuário (cascade BD) mas não os objetos S3 dos documentos/prontuários

Existing behavior:

- `document.service.ts::delete` → `db.delete(document)` — `storageKey` apagado do BD, PDF permanece no S3.
- `clinical-record.service.ts::delete` → `db.delete(clinicalRecord)` — mesmo problema.
- `psychologist.service.ts::deleteAccount` → cascade deleta todos os registros do BD, mas todos os PDFs S3 referenciados por `storageKey` permanecem no bucket para sempre.
- `storageService` não tem método `deleteObject`.

## Requirements

### 1. Adicionar `deleteObject` no `storage.service.ts`

- Criar método `async deleteObject(storageKey: string): Promise<void>`:
  - Se `driver === "s3"`: usar `DeleteObjectCommand` do `@aws-sdk/client-s3`.
  - Se `driver === "local"`: usar `unlink` de `fs/promises` para remover o arquivo físico; ignorar erro se o arquivo não existir (`ENOENT`).
  - O método não lança erro se o objeto não existir (idempotente).

### 2. Excluir objeto S3 em `document.service.ts::delete`

- Antes de `db.delete(document)`, buscar o `storageKey` do documento:
  ```
  const [existing] = await db.select({ id, storageKey }).from(document).where(...)
  ```
- Após confirmar que o documento existe e deletar do BD, chamar
  `await storageService.deleteObject(existing.storageKey)` se `storageKey` não for nulo.

### 3. Excluir objeto S3 em `clinical-record.service.ts::delete`

- Mesmo padrão: antes do `db.delete`, buscar também `storageKey` e `fileUrl`.
- Após a deleção do BD, chamar `storageService.deleteObject(storageKey)` se existir.
- Nota: registros `finalized` já lançam erro antes de chegar à deleção — não precisa
  tratar esse caso aqui.

### 4. Excluir todos os objetos S3 em `psychologist.service.ts::deleteAccount`

- Antes de deletar o usuário, coletar todos os `storageKey` não-nulos de:
  - `db.select({ storageKey: document.storageKey }).from(document).where(eq(document.psychologistId, id))`
  - `db.select({ storageKey: clinicalRecord.storageKey }).from(clinicalRecord).where(eq(clinicalRecord.psychologistId, id))`
- Filtrar apenas os não-nulos e chamar `storageService.deleteObject` em paralelo
  (`Promise.allSettled` — não falhar se algum objeto já não existir).
- Em seguida, executar a deleção já existente (event_store + user).

## Constraints

- Usar `Promise.allSettled` (não `Promise.all`) para as deleções em lote — uma
  falha de S3 não deve impedir a exclusão da conta.
- Não alterar a assinatura pública de nenhum serviço além dos listados.
- Manter o driver local funcional para desenvolvimento.
- Seguir o padrão de imports já existente em `storage.service.ts`.
- Não expor `storageKey` para o cliente em nenhum endpoint novo.

## Acceptance Criteria

- Ao deletar um documento com PDF, o objeto é removido do S3/local.
- Ao deletar um prontuário (não finalizado) com PDF, o objeto é removido do S3/local.
- Ao excluir a conta, todos os PDFs do psicólogo são removidos do S3/local antes
  da deleção em cascata do banco.
- `storageService.deleteObject` com uma `storageKey` inexistente não lança erro.
- `bun run build` passa sem erros de tipo.

## Suggested Verification

```bash
bun run build

# Verificação manual (driver local):
# 1. Criar um documento com upload de PDF
# 2. Verificar que o arquivo existe em .storage/
# 3. Deletar o documento pelo painel
# 4. Verificar que o arquivo foi removido de .storage/

# Verificação de conta:
# 1. Criar conta de teste, fazer upload de documento e prontuário
# 2. Excluir a conta (Perfil > Zona de Perigo)
# 3. Verificar que .storage/ não contém arquivos do usuário
```
