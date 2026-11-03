# Task: Web — Fase 7, polimento

Status: review — branch `refactor/web-fase-7-polimento` (empilhado sobre a fase 6).

## O que mudou

- Toasts de erro com prefixo "Erro ao …" (clínicas: convites, sair, salas); "Sala removida
  com sucesso!"; logger de clínica em pt-BR.
- Badge de cancelado em `rose` (paleta permitida) no lugar de `red`.
- Botões só com ícone sem rótulo ganharam `title` (navegação do calendário, remover
  vínculo de psicólogo, que também ganhou o hover destrutivo do padrão).
- Itens de polimento das fases anteriores já entregues: `LegalLayout`, `Button asChild` na
  landing, lightbox com `Dialog`, `index.html` com título/descrição, textos de
  acessibilidade do `ui/` em pt-BR.

## Mantido de propósito

- `text-blue-600` no ícone de prontuário da tabela de pacientes (prescrito pela nova-tela).
- Cores `zinc`/`red` da sala de teleconsulta (tela cheia escura).
