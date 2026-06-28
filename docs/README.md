# 📚 Documentação — Psy-Manager

Portal central da documentação do projeto. Três pilares:

| Pilar | O que é | Onde |
|---|---|---|
| 🛠️ **Progresso** | Estágios de desenvolvimento, cada um com seu documento detalhado (passo a passo, bugs, comandos) | [progress/](progress/README.md) |
| 🎓 **Estudo SAA-C03** | Material de certificação organizado pelos 4 domínios do exame + fichas de serviço | [saa-c03/](saa-c03/README.md) |
| 🗺️ **Roadmap** | O que está pronto e o que vem a seguir, com prioridade e custo | [ROADMAP.md](ROADMAP.md) |

## Estrutura

```
docs/
├── README.md              ← você está aqui (portal)
├── ROADMAP.md             ← roadmap (concluído + próximos passos)
├── progress/
│   ├── README.md          ← índice de estágios → arquivos → documento
│   ├── 00-base-infra.md   ┐
│   ├── 01-rds.md          │  um arquivo por estágio,
│   ├── ...                │  com o passo a passo completo
│   ├── 14-ecr-build-once.md ┘
│   └── troubleshooting.md ← problemas comuns (referência cruzada)
└── saa-c03/
    ├── README.md          ← portal de estudo (4 domínios + como estudar)
    ├── dominio-1-seguranca.md … dominio-4-custo.md
    └── servicos/          ← fichas rápidas por serviço AWS
```

> Os arquivos `step-by-step.md` e `next-step.md` (que ficavam na raiz) foram
> **aposentados**: o conteúdo do diário virou os documentos por estágio em
> `progress/`, e o roadmap virou o `ROADMAP.md`.

## Como os pilares se conectam

- **`progress/`** é a fonte de verdade do *como* e *por quê* de cada estágio. Cada
  documento traz o contexto, os comandos, os bugs encontrados e uma seção
  "O Que Cai na SAA-C03".
- **`saa-c03/`** reorganiza as notas de certificação (que vivem dentro dos
  documentos de estágio) por **domínio do exame** e por **serviço**, com link de
  volta pro estágio onde aquilo foi implementado de verdade.
- **`ROADMAP.md`** amarra tudo: cada item concluído aponta pro estágio, e cada
  item planejado aponta pro domínio que ele exercita.

## Convenção de manutenção (pra continuar sustentável)

Ao concluir um novo estágio:

1. Crie `progress/NN-nome.md` seguindo o padrão (contexto → passos → bugs → "O Que Cai na SAA-C03").
2. Adicione uma linha na tabela de [progress/](progress/README.md).
3. Mapeie o aprendizado de certificação no domínio correspondente em [saa-c03/](saa-c03/README.md).
4. Atualize o status no [ROADMAP.md](ROADMAP.md).

Cada documento fica pequeno e focado — a navegação (índices) continua plana e fácil de consultar.
