# Task: Instrumentos e cartões diários enviados ao paciente

Status: draft — precisa de decisões com as psicólogas antes de virar tasks menores.

## Goal

A psicóloga monta um instrumento (escala, questionário, cartão diário da DBT), envia ao
paciente com recorrência, e acompanha as respostas no prontuário em tabela e gráfico.

## Context

- Não existe nada disso hoje: nem criador de formulário, nem acesso do paciente ao sistema.
- Depende do agendador de `task-lembrete-sessao-email.md`.
- Prontuário e posse: `ai/context/domain-model.md`. Dado de resposta é dado de saúde.

## Decisões em aberto

- Tipos de pergunta do primeiro corte (escala 0–5, sim/não, texto curto, número).
- Instrumentos prontos (PHQ-9, GAD-7) entram? Conferir licença e uso livre de cada um.
- Acesso do paciente: link com token de uso único por envio, sem conta (recomendado), ou
  portal com login.
- Recorrência: diária, semanal, dias da semana escolhidos; até quando.
- Canal: e-mail no primeiro corte; WhatsApp depois da task da cobrança.
- Edição de um instrumento já respondido: versionar para não mudar respostas antigas.

## Quebra sugerida depois das decisões

1. Backend: modelo de instrumento, versão, envio e resposta + migration.
2. Web: criador de instrumento (skill `nova-tela`).
3. Página pública de resposta por token, mobile-first.
4. Envio recorrente pelo agendador.
5. Painel de respostas no paciente (tabela + gráfico).

## Constraints

- Token de resposta não revela nome do paciente nem da psicóloga na URL.
- Resposta só legível pela psicóloga dona do paciente.
- Sem IA.

## Acceptance Criteria

- Definidos na quebra.
