# Formulário de Beta Fechado (Google Forms)

> ⚠️ **Placeholder do nome**: substitua `[NOME DO APP]` pelo nome final antes de
> publicar (ver `ai/tasks/task-go-to-market.md` — o nome é o keystone). Dá pra
> montar o form agora e só trocar o nome depois.

Objetivo do form: **lista de interesse + triagem** pra um beta fechado e gratuito.
Acesso por convite manual — o form não libera nada sozinho.

---

## Título e descrição (abertura do form)

**Título:** `[NOME DO APP] — Lista de espera do Beta (para psicólogos)`

**Descrição:**
> `[NOME DO APP]` é um sistema de gestão para o consultório do psicólogo: agenda,
> pacientes, prontuário, financeiro, documentos, clínicas e videochamada — tudo em
> um só lugar.
>
> Estamos abrindo um **beta fechado e gratuito**. Vagas limitadas, acesso por convite.
>
> ⚠️ Beta = produto em evolução: alguns módulos (Pagamentos, Exames, Buscar
> Psicólogos) ainda estão em desenvolvimento. Em troca do acesso gratuito, queremos
> seu **feedback**.
>
> Leva ~2 minutos. Se houver fit, a gente entra em contato. Seus dados serão usados
> apenas para gerenciar o beta e falar com você (LGPD).

---

## Seção 1 — Contato

| # | Pergunta | Tipo | Obrigatório | Observação |
|---|---|---|:--:|---|
| 1 | Nome completo | Resposta curta | ✅ | |
| 2 | E-mail | Resposta curta (validação: e-mail) | ✅ | |
| 3 | WhatsApp (com DDD) | Resposta curta | ✅ | "usamos para o convite e o grupo de feedback" |

## Seção 2 — Você é psicólogo(a)?

| # | Pergunta | Tipo | Obrigatório | Opções |
|---|---|---|:--:|---|
| 4 | Tem registro ativo no CRP? | Múltipla escolha | ✅ | Sim · Em processo · Não sou psicólogo(a) |
| 5 | Número do CRP (ex: 06/123456) | Resposta curta | ⬜ | |
| 6 | Estado (UF) de atuação | Lista suspensa | ✅ | AC…TO |

> 💡 Na pergunta 4, configure **"ir para seção com base na resposta"**: se for
> "Não sou psicólogo(a)", pule direto pro fim com uma mensagem educada.

## Seção 3 — Sua prática

| # | Pergunta | Tipo | Obrigatório | Opções |
|---|---|---|:--:|---|
| 7 | Há quanto tempo atende? | Múltipla escolha | ✅ | <1 ano · 1–3 · 3–5 · 5–10 · 10+ |
| 8 | Como atende hoje? | Caixas de seleção | ✅ | Presencial · Online · Híbrido |
| 9 | Abordagem principal | Caixas de seleção | ⬜ | TCC · Psicanálise · Humanista · Sistêmica · ACT · Outra |
| 10 | Pacientes ativos por semana (média) | Múltipla escolha | ✅ | 1–5 · 6–15 · 16–30 · 30+ |
| 11 | Atende sozinho(a) ou em clínica? | Múltipla escolha | ✅ | Sozinho(a) · Clínica com outros · Os dois |

## Seção 4 — Como você se organiza hoje

| # | Pergunta | Tipo | Obrigatório | Opções |
|---|---|---|:--:|---|
| 12 | Como gerencia agenda/prontuário/financeiro hoje? | Caixas de seleção | ✅ | Papel/caderno · Planilha · Agenda do celular/WhatsApp · Outro software · Não organizo formalmente |
| 13 | Se usa algum software, qual? | Resposta curta | ⬜ | *(inteligência competitiva)* |
| 14 | Qual a sua **maior dor** na gestão do consultório hoje? | Parágrafo | ✅ | *(ouro pra roadmap)* |
| 15 | O que um sistema precisaria ter pra você largar o que usa hoje? | Parágrafo | ⬜ | |

## Seção 5 — Sobre o beta

**Texto da seção:**
> Durante o beta o app é **100% gratuito**. Em troca, esperamos que você use de
> verdade e compartilhe feedback. Quando lançarmos a versão paga, quem participou
> do beta terá condição especial (meses grátis).

| # | Pergunta | Tipo | Obrigatório | Opções |
|---|---|---|:--:|---|
| 16 | Toparia usar como ferramenta **principal** no beta? | Múltipla escolha | ✅ | Sim, quero adotar de vez · Quero testar em paralelo primeiro · Só quero dar uma olhada |
| 17 | Topa participar do grupo de feedback (WhatsApp) e responder perguntas rápidas? | Múltipla escolha | ✅ | Sim · Talvez · Não |
| 18 | Quais funcionalidades **mais** te interessam? | Caixas de seleção | ⬜ | Agenda · Pacientes · Prontuário · Financeiro · Documentos · Clínicas · Videochamada |
| 19 | De 0 a 10, quão provável você recomendaria uma ferramenta dessas a um colega? | Escala linear 0–10 | ⬜ | |

## Seção 6 — Consentimento

| # | Pergunta | Tipo | Obrigatório | Opções |
|---|---|---|:--:|---|
| 20 | Autorizo contato por e-mail e WhatsApp sobre o beta | Caixa de seleção | ✅ | "Sim, autorizo" |

**Nota LGPD (texto):**
> Seus dados (nome, e-mail, WhatsApp e respostas) serão usados exclusivamente para
> gerenciar o beta e entrar em contato com você. Você pode pedir a remoção a
> qualquer momento pelo e-mail de suporte.

---

## Mensagem de confirmação (após enviar)

> Obrigado! 🧠 Recebemos seu interesse no beta do `[NOME DO APP]`. As vagas são
> limitadas e o acesso é por convite — se houver fit, a gente te chama pelo
> WhatsApp ou e-mail. Enquanto isso, fique à vontade para compartilhar com colegas.

---

## Como usar as respostas (triagem de quem convidar primeiro)

**Priorize** (tiram valor real e dão retorno):
- CRP ativo **+** atende online/híbrido **+** 6–30 pacientes/semana
- Respondeu "Sim, quero adotar de vez" (16) **e** "Sim" pro feedback (17)

**Segure pra depois:**
- "Só quero dar uma olhada" (16) ou "Não" pro feedback (17)
- Sem CRP / "Não sou psicólogo(a)" (4)

**Use como insumo de produto:**
- Perguntas **14 e 15** (dores e gaps) → priorização de roadmap e quais placeholders remover primeiro.
- Pergunta **13** (software atual) → inteligência competitiva.
- Pergunta **18** → confirma quais módulos focar no onboarding.

## Dicas de montagem no Google Forms

- Campos obrigatórios: marque o toggle "Obrigatória" nas perguntas com ✅.
- Pergunta 2: ative validação de resposta → "Texto" → "E-mail".
- Pergunta 4: use "Ir para seção com base na resposta" para encerrar quem não é psicólogo.
- Vagas limitadas: o Forms **não** limita automaticamente — controle pelo convite manual. Se quiser, em *Configurações → Apresentação*, ative "Limitar a 1 resposta" (exige login Google).
- Depois de publicar, encurte o link (o próprio Forms gera um, ou use o domínio quando existir).
