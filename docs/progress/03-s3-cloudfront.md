> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 🌐 9. Desacoplamento de Frontend Global (Amazon S3 + CloudFront)

Para atingir o padrão máximo de arquitetura **Serverless Frontend** e aderir às melhores práticas da certificação AWS SAA, o frontend React foi removido do servidor EC2 (Nginx) e migrado para uma CDN Global.

### A. Criação do Bucket S3 (Armazenamento de Objetos)
1. Criamos o bucket (ex: `psy-manager-frontent-lucas`).
2. **Bloqueio de Acesso Público**: Mantivemos a opção *Block all public access* **MARCADA**. Isso é vital para segurança moderna; o bucket não pode ser acessado diretamente pela internet.

### B. Distribuição Global com CloudFront (A CDN)
1. Criamos uma distribuição CloudFront apontando para a origem do S3.
2. **Origin Access Control (OAC)**: Habilitamos o OAC. Ele escreve uma Bucket Policy no S3 permitindo que *apenas* o CloudFront consiga ler os arquivos. Acesso direto ao S3 retorna *Access Denied*.
3. **HTTPS Gratuito e Redirecionamento**: Configuramos o CloudFront para forçar HTTPS (*Redirect HTTP to HTTPS*), ganhando o selo de segurança com certificados gerenciados da AWS.
4. **Resolução de Erros de SPA (React Router)**: O S3 não entende pastas dinâmicas (como `/login`). Para evitar erros XML 403/404, criamos **Custom Error Responses** no CloudFront interceptando os erros HTTP 403 e 404 e devolvendo o `/index.html` com o código HTTP 200.

### C. A Arquitetura de "Unified Domain" (Solucionando Mixed Content)
- **O Problema de Segurança**: O navegador proíbe um site seguro (`https://`) no CloudFront de fazer requisições para a API em um servidor não seguro (`http://` IP do EC2). Isso se chama bloqueio de *Mixed Content*.
- **A Solução Elegante**: Adicionamos o **EC2 (Porta 3001)** como uma *Segunda Origem* dentro do CloudFront (usando seu DNS Público `ec2-xxx.compute.amazonaws.com`).
- **Os Comportamentos (Behaviors)**: 
  - Criamos regras no CloudFront orientando que requisições iniciadas com `/api/*` e `/trpc/*` não vão para o S3, mas sim para o EC2.
  - O Cache foi **desativado** nestas rotas de API, e configuramos o repasse total de cabeçalhos e cookies (*AllViewerAndCustomHeaders*) para não quebrar a autenticação.
- O site inteiro (Frontend + Backend) agora opera em 1 único domínio seguro (`https://xxxx.cloudfront.net`).

### D. Segurança Híbrida: Atualizando o CI/CD (GitHub Actions)
Criamos credenciais IAM (Access Key ID e Secret Key) exclusivas para o GitHub. 
O workflow `deploy-ec2.yml` foi atualizado para **duas frentes paralelas**:
1. Conecta no EC2 e sobe os containers do Backend.
2. Simultaneamente, processa o `bun run build` injetando a URL do CloudFront e usa o comando `aws s3 sync ./dist s3://BUCKET --delete` para espalhar os arquivos HTML/JS em segundos por todas as Edge Locations mundiais.

---

