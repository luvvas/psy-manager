> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 🔐 10. Gerenciamento de Segredos (AWS SSM Parameter Store e IAM Roles)

Para aderir ao "Pilar de Segurança" (Security Pillar) do AWS Well-Architected Framework, removemos todas as chaves confidenciais do arquivo estático `.env` do servidor (disco rígido) e implementamos a injeção em tempo de execução via cofre seguro.

### A. AWS Systems Manager (SSM Parameter Store)
Criamos os parâmetros sensíveis no **Parameter Store** utilizando a categoria `SecureString`, que criptografa os dados em repouso utilizando o KMS padrão da AWS (`alias/aws/ssm`).
- `/psy-manager/prod/DATABASE_URL`
- `/psy-manager/prod/BETTER_AUTH_SECRET`
- `/psy-manager/prod/GOOGLE_CLIENT_SECRET`

*(Nota de Arquitetura: Variáveis públicas ou de configuração, como `BETTER_AUTH_URL` e `GOOGLE_CLIENT_ID`, permaneceram no arquivo `.env` para simplificar a manutenção).*

### B. O Princípio do Menor Privilégio (IAM Roles para EC2)
Ao invés de configurarmos chaves de acesso (`AWS_ACCESS_KEY_ID`) manualmente dentro do servidor EC2 (o que é uma vulnerabilidade severa em caso de invasão), "vestimos" a instância com um Perfil de Instância (IAM Role).
1. Criamos a Role `psy-manager-ec2-role` com a política `AmazonSSMReadOnlyAccess`.
2. Atrelamos a Role à instância EC2 (Modify IAM role).
3. Isso permitiu que o servidor acessasse o cofre nativamente, autenticando-se por trás dos panos via Metadados de Instância (IMDSv2).

### C. Automação de Injeção no Deploy (CI/CD)
No GitHub Actions, ajustamos o workflow `deploy-ec2.yml` para baixar e injetar as chaves apenas durante o evento de deploy:
1. Validamos se o pacote **AWS CLI** estava instalado no Ubuntu `noble` (24.04). Devido a ausência no `apt`, configuramos a auto-instalação resiliente via Canonical Snap (`sudo snap install aws-cli --classic`).
2. Adicionamos a substituição no shell:
```bash
export DATABASE_URL=$(aws ssm get-parameter --region sa-east-1 --name "/psy-manager/prod/DATABASE_URL" --with-decryption --query "Parameter.Value" --output text)
```
3. O `docker-compose.prod.yml` usa a interpolação (`DATABASE_URL: ${DATABASE_URL}`) e captura as variáveis diretamente da RAM (ambiente shell) durante a inicialização, dispensando completamente o armazenamento físico das senhas confidenciais.

---

