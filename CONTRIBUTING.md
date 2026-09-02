# Padrões do repositório

## Commits são a fonte da verdade

Não existe changelog mantido à mão. As notas de cada versão são geradas a partir
das mensagens de commit, por `scripts/release-notes.sh`. Uma mensagem mal escrita
vira uma linha ruim na release — escreva pensando em quem vai ler depois.

## Formato

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```
<tipo>(<escopo opcional>)<! se breaking>: <descrição no imperativo>

<corpo opcional: o porquê, não o quê>

<rodapé opcional: BREAKING CHANGE: ...>
```

### Tipos

| Tipo | Quando usar | Aparece na release |
|---|---|---|
| `feat` | Nova funcionalidade | **Novidades** |
| `fix` | Correção de bug | **Correções** |
| `perf` | Melhoria de performance | **Performance** |
| `refactor` | Mudança de código sem alterar comportamento | **Refatorações** |
| `docs` | Apenas documentação | **Documentação** |
| `ci` | Pipeline, workflows, deploy | **Infra e manutenção** |
| `build` | Build, bundler, Dockerfile | **Infra e manutenção** |
| `chore` | Manutenção, dependências, limpeza | **Infra e manutenção** |
| `test` | Apenas testes | **Infra e manutenção** |
| `style` | Formatação, sem efeito em lógica | **Infra e manutenção** |
| `revert` | Reversão de um commit anterior | conforme o tipo revertido |

### Escopos

Opcional, sempre minúsculo. Use o domínio quando a mudança for de produto e a
camada quando for técnica:

**Domínio:** `agendamento`, `pacientes`, `prontuario`, `documentos`, `financeiro`,
`clinicas`, `consulta`, `auth`, `feedback`

**Técnico:** `api`, `web`, `lambda`, `deps`, `db`, `storage`

Prefira o singular e mantenha consistência — `appointment` e `appointments` como
escopos diferentes poluem a release.

### Mudanças incompatíveis

Duas formas, ambas reconhecidas pelo gerador, e as duas podem ser usadas juntas:

```
chore!: remove aplicativo desktop Electron
```

```
feat(api): altera formato de resposta de /trpc/patient.list

BREAKING CHANGE: o campo `nome` passa a vir dentro de `patient`.
```

Elas sobem para a seção **Mudanças incompatíveis**, no topo das notas.

### Exemplos

```
feat(agendamento): adiciona lembrete por WhatsApp
fix(auth): restaura SameSite=Lax no cookie de sessão
perf(pacientes): substitui N subqueries por um único IN
docs: documenta rotação da chave de criptografia
ci: publica imagem por digest em vez de tag mutável
chore(deps): atualiza drizzle-orm para 0.44.2
```

## Ative o hook de validação

Uma vez por clone:

```bash
git config core.hooksPath .githooks
```

A partir daí, `.githooks/commit-msg` rejeita mensagens fora do padrão antes de o
commit ser criado. Merges e reverts gerados pelo git passam direto.

## Versionamento e releases

Usamos [SemVer](https://semver.org/lang/pt-BR/): `MAJOR.MINOR.PATCH`.

- **MAJOR** — mudança incompatível (commit com `!` ou `BREAKING CHANGE:`)
- **MINOR** — novo `feat` compatível
- **PATCH** — apenas `fix` / `perf`

### Publicar uma versão

```bash
# 1. veja como as notas vão ficar
bash scripts/release-notes.sh

# 2. atualize a versão nos package.json (raiz, apps/api, apps/web)

# 3. commit da release
git commit -am "chore(release): v1.1.0"

# 4. tag anotada — nunca leve
git tag -a v1.1.0 -m "v1.1.0"
git push origin master --follow-tags
```

O push da tag dispara `.github/workflows/release.yml`, que roda o gerador e
publica a GitHub Release com as notas.

**A tag não faz deploy.** O deploy continua sendo disparado pelo push em `master`
(`.github/workflows/deploy-ec2.yml`). Tagueie depois que o CI passar, para que a
tag nunca aponte para um build quebrado.
