# Task: WhatsApp Appointment Reminder

Status: draft

## Goal

Psicólogo clica em um botão na tela de agendamento e o paciente recebe uma mensagem de lembrete via WhatsApp, enviada em nome da plataforma Psy Manager.

## Context

Relevant files:

- `apps/api/src/services/email.service.ts` — padrão de service a seguir
- `apps/api/src/routes/appointment.ts` — router onde a mutation será adicionada
- `apps/api/src/db/schema.ts` — modelos de Appointment e Patient (phone já existe em Patient)
- `apps/web/src/` — frontend onde o botão será adicionado na view de agendamento
- `apps/api/.env` — variáveis de ambiente AWS já configuradas (S3)

Existing behavior:

- Psicólogo visualiza agendamentos mas não tem canal de comunicação direta com o paciente pelo sistema
- Email já é enviado para reset de senha (padrão Nodemailer em `email.service.ts`)
- AWS SDK já é usado para S3 — credenciais IAM já existem

## Requirements

### Setup externo (único, feito uma vez pela equipe Psy Manager)

1. Criar conta no [Meta Business Manager](https://business.facebook.com) para a plataforma Psy Manager
2. Verificar o negócio junto à Meta (processo manual, ~1-3 dias úteis)
3. Registrar um número de telefone dedicado como WhatsApp Business
4. Criar e submeter template de mensagem para aprovação da Meta (~24h):
   ```
   Nome: appointment_reminder
   Idioma: pt_BR
   Corpo: "Olá {{1}}, lembramos que você tem uma consulta com {{2}} em {{3}} às {{4}}. Qualquer dúvida, entre em contato."
   ```
5. Ativar o canal WhatsApp no Amazon Pinpoint e vincular o número registrado

### IAM

- Adicionar permissão `mobiletargeting:SendMessages` (Pinpoint) à role/user AWS existente

### Backend

- Criar `apps/api/src/services/whatsapp.service.ts` com função `sendAppointmentReminder(phone, patientName, psychologistName, date, time)`
- Usar `@aws-sdk/client-pinpoint` (mesmo padrão do S3 com `@aws-sdk/client-s3`)
- Adicionar mutation `sendReminder` no router de appointment (`apps/api/src/routes/appointment.ts`)
  - Recebe `appointmentId`
  - Busca dados do agendamento + paciente + psicólogo
  - Valida que o paciente tem telefone cadastrado
  - Chama o service
  - Registra log da ação (campo `reminderSentAt` no appointment ou tabela de auditoria)
- Variáveis de ambiente a adicionar:
  - `AWS_PINPOINT_APP_ID`
  - `AWS_PINPOINT_WHATSAPP_PHONE_NUMBER` (número registrado na Meta)

### Frontend

- Adicionar botão "Enviar lembrete" na tela/card de agendamento
- Estado: idle → loading → sucesso/erro
- Desabilitar botão se paciente não tiver telefone cadastrado (exibir tooltip explicativo)
- Toast de confirmação em caso de sucesso
- Não reenviar se `reminderSentAt` já estiver preenchido (ou exibir aviso de "Lembrete já enviado")

## Constraints

- Keep user-facing text in pt-BR.
- Follow existing patterns in nearby files.
- Do not touch unrelated modules.
- Do not read or expose `.env` secrets.
- Não usar Baileys ou qualquer biblioteca não-oficial do WhatsApp — risco de ban da Meta e violação de termos de uso.
- Mensagens devem usar template pré-aprovado pela Meta (obrigatório para mensagens proativas).
- O número de telefone do paciente deve ser tratado como dado sensível (já é — campo `phone` é encriptado no schema).
- LGPD: o envio de lembrete é uso legítimo dentro da relação de prestação de serviço; nenhum dado é compartilhado com terceiros além do necessário para entrega da mensagem.

## Acceptance Criteria

- Psicólogo consegue clicar em "Enviar lembrete" em um agendamento e o paciente recebe a mensagem no WhatsApp
- Se o paciente não tiver telefone cadastrado, o botão é desabilitado com explicação
- Se o lembrete já foi enviado, o sistema exibe aviso em vez de reenviar
- A ação fica registrada (campo `reminderSentAt` ou equivalente)
- Nenhuma credencial ou dado sensível é exposto no cliente
- Relevant checks pass ou são documentados

## Suggested Verification

```bash
bun run build
```

### Teste manual
1. Cadastrar paciente com número de telefone real
2. Criar agendamento para esse paciente
3. Clicar em "Enviar lembrete"
4. Confirmar recebimento no WhatsApp do paciente
5. Verificar que botão muda de estado e `reminderSentAt` é preenchido

## Dependências externas antes de implementar

- [ ] Conta Meta Business verificada
- [ ] Número WhatsApp Business registrado
- [ ] Template `appointment_reminder` aprovado pela Meta
- [ ] Amazon Pinpoint configurado e vinculado ao número
- [ ] `AWS_PINPOINT_APP_ID` e `AWS_PINPOINT_WHATSAPP_PHONE_NUMBER` disponíveis no `.env`
