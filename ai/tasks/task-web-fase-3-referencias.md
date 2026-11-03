# Task: Web — Fase 3, telas de referência

Status: review — branch `refactor/web-fase-3-referencias` (empilhado sobre `chore/remove-comentarios`).

## Goal

Fazer as telas que a skill `nova-tela` manda copiar seguirem a própria skill.

## O que mudou

- Pacientes: larguras da tabela somavam 107% → 100%; tipo `Patient` da API no lugar do
  `DBPatient` escrito à mão; a página passa os dados da API direto (sem mapeamento) e o
  formulário de edição recebe o registro sem conversão. Na API, `decryptPatient` declara
  `dataNascimento: Date | null` (era um cast que dizia `string`) e `decryptField` ganhou
  sobrecarga (entrada não nula → `string`).
- Clínicas e Documentos: `AppSheet` saiu de dentro das ações do header; ações num
  `div.flex.gap-2` como no template; títulos do sheet batem com o botão.
- Tabela de clínicas: `title` nos botões, célula principal `font-medium`, ações 12%,
  "1 profissional"; tipo `Clinic` da API.
- Tabela de transações: ações no padrão (title, stopPropagation, ícones 3.5, Deletar
  destrutivo), "—", larguras 100%, `confirm` com a descrição e exclusão com `onError`.
- Detalhe do paciente: contêiner de altura total com `min-h-0 gap-4`.
- `isLoading` ligado nas tabelas de pacientes e clínicas.

## Verificação

`bun run build:web`, `bun test` 10/10, API 105/105, lint 10 (mesmos da fase 2).
Manual: abrir Pacientes, Clínicas, Documentos e Financeiro em desktop e 390px; editar um
paciente e conferir que as abas mantêm os dados; criar/editar clínica com o sheet.
