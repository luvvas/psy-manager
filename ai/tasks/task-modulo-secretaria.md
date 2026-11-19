# Task: Módulo de secretária

Status: draft — esperar demanda das psicólogas nas reuniões antes de planejar.

## Goal

Uma secretária, com login próprio, gerencia agenda e financeiro de uma ou mais psicólogas
sem jamais ver prontuário, documentos clínicos ou observações.

## Context

- Hoje toda procedure protegida filtra pelo `psychologistId` da sessão; não existe papel
  além de psicóloga. Clínicas têm membros (`psychologist_clinic`), todos psicólogas.
- Isolamento e escopo de clínica: `ai/context/domain-model.md`, `ai/context/backend-guidelines.md`.

## Decisões em aberto

- A secretária pertence a uma psicóloga ou a uma clínica?
- O que ela vê do paciente: nome e telefone bastam? E o valor da sessão?
- Ela cria pacientes ou só agenda para pacientes existentes?
- Quem convida e quem revoga o acesso.

## Riscos

- Mexe na regra central de posse: cada procedure precisa decidir se aceita a secretária.
  O padrão tem que ser **negar**, com lista explícita do que ela pode chamar.
- Rodar `security-audit` ou `cloudflare-security-audit` depois.

## Acceptance Criteria

- Definidos depois das decisões.
