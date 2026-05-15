# Domain Model

## User / Psychologist

Table: `user`

Represents an authenticated psychologist. Important fields:

- `id`
- `name`
- `email`
- `emailVerified`
- `image`
- `phone`
- `crp`
- `city`
- `createdAt`
- `updatedAt`

The UI exposes profile editing through the sidebar profile sheet.

## Patient

Table: `patient`

Patient records are owned by `psychologistId`. Core fields:

- `nome`
- `email`
- `telefone`
- `dataNascimento`
- `cidade`
- `cpf`
- `valorSessao`
- `modeloCobranca`

Extended registration fields include:

- Identity: `nomeSocial`, `rg`, `profissao`
- Address/emergency: `endereco`, `cep`, `uf`, `contatoEmergencia`
- Legal guardian: `respLegalNome`, `respLegalParentesco`, `respLegalCpf`,
  `respLegalTelefone`, `respLegalEmail`
- Contract/source: `servicoContratadoTipo`, `dataInicioAcompanhamento`,
  `formaPagamento`, `formaPagamentoDetalhe`, `responsavelFinanceiroTipo`,
  `responsavelFinanceiroDetalhe`, `origemContato`, `origemContatoDetalhe`

Patient writes go through CQRS commands. Reads use patient projection queries.

## Appointment

Table: `appointment`

Appointments belong to a psychologist and patient. Important fields:

- `psychologistId`
- `patientId`
- `date`
- `startTime`
- `endTime`
- `status`
- `sessionType`
- `type`
- `isRecurring`
- `notes`
- `googleEventId`

Backend statuses include `pending`, `confirmed`, `cancelled`, `completed`.
The frontend maps them to Portuguese display states such as `pendente`,
`confirmado`, `cancelado`, and `concluido`.

Appointment list queries include appointments from psychologists who share a
clinic with the logged-in psychologist.

## Clinic

Tables:

- `clinic`
- `psychologist_clinic`

Clinics are created by one psychologist and can have multiple linked
psychologists. The web app supports:

- Create/update/delete clinics.
- Link psychologist by email.
- Unlink psychologist.
- Display linked professionals.

## Financial Transaction

Table: `financial_transaction`

Transactions are scoped to `psychologistId`. Fields include:

- `type`: `income` or `expense`
- `description`
- `amount`
- `date`
- `category`
- `patientId`
- `status`: defaults to `paid`

The financial module supports listing by date range, CRUD, stats/charts, and CSV
bulk import.

## Document

Table: `document`

Documents can be generic library items or linked to a patient. Fields include:

- `title`
- `content`
- `storageKey`
- `fileName`
- `mimeType`
- `fileSize`
- `type`
- `category`
- `isTemplate`
- `patientId`

Documents support PDF upload through the shared storage service.

## Clinical Record

Table: `clinical_record`

Clinical records are patient-specific and owned by `psychologistId`. Fields
include:

- `patientId`
- `appointmentId`
- `title`
- `category`
- `textContent`
- `fileUrl`
- `storageKey`
- `fileName`
- `mimeType`
- `fileSize`
- `dateOfService`
- `status`: `draft` or `finalized`
- `lockedAt`
- `parentRecordId`

Business rule:

- Finalized clinical records cannot be updated or deleted.
- Finalizing sets `status` to `finalized` and `lockedAt` to the current time.

## Event Store

Table: `event_store`

Stores domain events for CQRS aggregates:

- `aggregateId`
- `aggregateType`
- `type`
- `version`
- `data`
- `metadata`
- `createdAt`

The event store enforces optimistic concurrency by checking expected aggregate
version before appending events.

