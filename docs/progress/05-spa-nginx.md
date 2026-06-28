> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 🧠 11. Arquitetura SPA e o Fim do Nginx (Conceitos Avançados)

Para fins de documentação arquitetural, detalhamos o porquê de termos deletado completamente o container `web` (Frontend/Nginx) do nosso `docker-compose.prod.yml` no EC2.

### A. A Falsa Necessidade de Compute para o Frontend
Diferente da API Backend (em Bun) que precisa de CPU constante para acessar o banco de dados e aplicar regras de negócio, o Frontend moderno (React/Vite) é um **SPA (Single Page Application)**.
Quando rodamos o pipeline de build no GitHub Actions, o código complexo é transformado em arquivos estáticos "mortos" (HTML, JS, CSS) dentro da pasta `dist`. Esses arquivos não executam no servidor; eles são baixados e executados **exclusivamente na memória RAM e processador do navegador do cliente** (Chrome, Safari, etc).
Portanto, provisionar memória RAM em um EC2 apenas para "entregar" um arquivo de texto ao usuário é um desperdício de recursos. O Amazon S3 foi criado exatamente para entregar arquivos estáticos de forma infinita e barata.

### B. O Fim do Nginx e a Evolução do Proxy Reverso
No modelo antigo, usávamos o Nginx dentro do EC2 com dois propósitos:
1. **Servidor Web Estático:** Entregar os arquivos do React (`index.html`).
2. **Proxy Reverso:** Interceptar qualquer chamada HTTP que começasse com `/api` e redirecioná-la internamente para o container da API na porta `3001`, evitando problemas de CORS e portas expostas.

Com a nova arquitetura Serverless:
1. O papel de Servidor Web Estático foi assumido pelo **Amazon S3**.
2. O papel de Proxy Reverso foi integralmente assumido pelo **Amazon CloudFront**. Através dos "Behaviors" (`/api/*` apontando para a origem EC2), o CloudFront age como um super-Nginx global. Ele faz o roteamento inteligente na "borda" (Edge Location) antes mesmo do tráfego chegar ao nosso servidor.

Por este motivo, o container do Nginx tornou-se obsoleto (ghost infrastructure) e foi removido. O servidor EC2 agora atua em sua eficiência máxima, dedicando 100% de sua vCPU e RAM para processar as regras de negócio da API.

---

