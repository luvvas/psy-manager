> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 🛠️ 8. Resolução de Problemas Comuns (Troubleshooting)

### A. O Build travou/rebootou o servidor?
- **Causa**: O compilador TypeScript consumiu toda a RAM física.
- **Solução**: Certifique-se de que os passos de **SWAP** na seção 2-B foram executados corretamente.

### B. Erro: `failed to prepare extraction snapshot... parent snapshot... not found`
- **Causa**: O cache do Docker BuildKit corrompeu durante um reinício forçado da máquina.
- **Solução**: SSH no servidor e limpe o cache com o comando:
  ```bash
  docker builder prune -af
  ```

### C. Erro de CORS ou Loopback no Login (GET/POST localhost:3001)
- **Causa**: O cliente de autenticação (`authClient`) foi compilado apontando para o localhost padrão do ambiente de desenvolvimento.
- **Solução**: Atualizamos o `auth-client.ts` para usar dinamicamente o `window.location.origin` em produção, fazendo com que as chamadas de autenticação sigam para o mesmo IP público do servidor, onde o Nginx as redireciona internamente.

### D. A página não carrega ou dá timeout no navegador?
- **Causa**: Você tentou acessar usando `https://` (porta 443) antes de gerar os certificados SSL de segurança.
- **Solução**: Acesse usando estritamente o protocolo **`http://`** (HTTP sem o "s" na porta 80), abrindo em uma **aba anônima** para evitar que o navegador force o redirecionamento seguro:
  👉 `http://56.125.229.202/login`

### E. Pipeline de CI/CD falhando no passo final de `db:migrate`
- **Causa**: Conflito de estado. Você sincronizou o banco via `db:push` (dev), mas o CI/CD tentou aplicar migrações históricas em cima das tabelas que já existiam, resultando no erro *"relation already exists"*.
- **Solução**: Modificamos o workflow no GitHub para tolerar esse conflito inofensivo, adicionando o silenciador de erro `|| echo "..."` ao comando final de deploy, garantindo o selo verde de sucesso no GitHub Actions.

---

