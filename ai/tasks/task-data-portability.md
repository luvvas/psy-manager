# Task: Portabilidade de Dados — Exportação de Conta (LGPD Art. 18, V)

Status: draft

## Goal

Implementar o direito de portabilidade da LGPD: o psicólogo deve poder exportar
todos os seus dados em formato estruturado (JSON) antes de excluir a conta ou a
qualquer momento. O arquivo exportado cobre pacientes, prontuários, documentos
(metadados), transações financeiras e agendamentos — tudo desencriptado.

## Context

Relevant files:

- `apps/api/src/routes/psychologist.ts` — adicionar procedure `exportData`
- `apps/api/src/services/psychologist.service.ts` — adicionar método `exportData`
- `apps/api/src/cqrs/patient/patient.queries.ts` — `list(psychologistId)` já existe
- `apps/api/src/services/clinical-record.service.ts` — `list(psychologistId)` já existe
- `apps/api/src/services/document.service.ts` — `list(psychologistId)` já existe
- `apps/api/src/services/financial.service.ts` — verificar método `list`
- `apps/api/src/cqrs/appointment/appointment.queries.ts` — verificar método `list`
- `apps/web/src/components/layout/profile-form.tsx` — adicionar botão "Exportar meus dados"

Existing behavior:

- Nenhum endpoint de exportação existe.
- A exclusão de conta (Zona de Perigo) não oferece exportação prévia.
- Todos os serviços já têm métodos `list` que retornam dados desencriptados do psicólogo.

## Requirements

### Backend

#### `apps/api/src/services/psychologist.service.ts` — método `exportData`

Adicionar método `async exportData(psychologistId: string)` que agrega:

```typescript
{
  exportedAt: string,           // ISO timestamp
  psychologist: { id, name, email, crp, phone, city },
  patients: Patient[],          // via patientQueries.list
  clinicalRecords: ClinicalRecord[],  // via clinicalRecordService.list
  documents: Document[],        // via documentService.list (sem content blob grande)
  financialTransactions: FinancialTransaction[],
  appointments: Appointment[],
}
```

- Importar os serviços/queries necessários dentro do método para não criar
  dependência circular no módulo (ou criar um módulo de agregação separado).
- `documents`: incluir metadados mas **não** `content` (campo `content` pode ser
  grande e contém HTML/JSON). Incluir `title`, `type`, `fileName`, `storageKey` (sem URL).
- Dados já são desencriptados pelos serviços existentes — não reencriptar.

#### `apps/api/src/routes/psychologist.ts` — procedure `exportData`

Adicionar:

```typescript
exportData: protectedProcedure.query(async ({ ctx }) => {
    return psychologistService.exportData(ctx.session.user.id);
}),
```

> Usar `query` (não mutation) para permitir download via link direto no futuro.
> O dado é grande — SuperJSON serializa corretamente com datas.

### Frontend

#### `apps/web/src/components/layout/profile-form.tsx`

Adicionar botão **"Exportar meus dados"** acima da Zona de Perigo existente:

- Usar `trpc.psychologist.exportData.useQuery({ enabled: false })` com `refetch`
  manual ao clicar.
- Ao clicar: mostrar `Loader2` durante o fetch, depois acionar download do JSON:

```typescript
const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `psy-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
a.click();
URL.revokeObjectURL(url);
```

- Exibir toast de sucesso após o download iniciar.
- Exibir toast de erro se a query falhar.
- Adicionar parágrafo explicativo acima do botão:
  _"Baixe uma cópia de todos os seus dados em formato JSON. O arquivo inclui
  pacientes, prontuários, documentos, transações e agendamentos."_

## Constraints

- Não incluir `content` de documentos (pode ser muito grande) nem `screenshotBase64`
  de feedbacks.
- Não incluir dados de outros psicólogos nem dados de sessões de vídeo ativas.
- Manter texto em pt-BR.
- O export não deve incluir dados de outros usuários mesmo que vinculados à mesma clínica.
- `bun run build` deve passar sem erros de tipo.

## Acceptance Criteria

- Botão "Exportar meus dados" aparece no Perfil acima da Zona de Perigo.
- Clicar no botão inicia download de um arquivo `.json` com os dados do psicólogo.
- O JSON contém `patients`, `clinicalRecords`, `documents`, `financialTransactions`,
  `appointments` e `exportedAt`.
- Dados de pacientes no JSON estão desencriptados (nome legível, não ciphertext).
- `bun run build` passa sem erros de tipo.

## Suggested Verification

```bash
bun run build

# Acessar Perfil > clicar em "Exportar meus dados"
# Verificar download de arquivo psy-manager-export-<data>.json
# Abrir o JSON e confirmar:
#   - "exportedAt" presente
#   - "patients" contém nomes legíveis (não ciphertext v1:...)
#   - "clinicalRecords" contém apenas registros do psicólogo logado
```
