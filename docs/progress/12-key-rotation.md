> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 18. 🔐 Estratégia de Rotação de Chaves (Key Rotation)

Esta seção documenta a análise de segredos do projeto e a decisão sobre o que automatizar versus o que manter manual.

### A. Auditoria Completa de Onde Estão os Segredos

| Secret | Dev | Produção | Tipo |
|---|---|---|---|
| `POSTGRES_PASSWORD` | `.env` local | SSM SecureString | Credencial de banco |
| `BETTER_AUTH_SECRET` | `.env` local | SSM SecureString | Segredo de sessão |
| `ENCRYPTION_KEY` | `.env` local | SSM SecureString | Chave criptográfica |
| `GOOGLE_CLIENT_SECRET` | `.env` local | SSM SecureString | OAuth secreto |
| `SMTP_PASS` | `.env` local | SSM SecureString | Senha de email |
| `TURN_CREDENTIAL` | `.env` local | SSM SecureString | Credencial TURN |
| `META_API_TOKEN` | `.env` local | SSM SecureString (pendente) | Token de API externa |
| `EC2_SSH_KEY` | não usado localmente | GitHub Secret | Chave SSH de deploy |
| AWS credentials (CI/CD) | não existem | **Eliminadas com OIDC** | Credenciais temporárias |

### B. A Decisão: O Que Merece Automação

O princípio não é "automatizar tudo" — é entender o modelo de ameaça de cada credencial e responder proporcionalmente.

**Automatizar: `POSTGRES_PASSWORD` via Secrets Manager**

AWS Secrets Manager tem um rotator nativo para RDS. O fluxo é:
1. Secrets Manager gera nova senha.
2. Atualiza diretamente no RDS.
3. Atualiza o valor do secret.
4. A aplicação busca o novo valor na próxima conexão.

Não há janela de indisponibilidade. Esta é a credencial de maior impacto (acesso a todos os dados de pacientes) e a única com um rotator gerenciado disponível.

**Eliminar em vez de rotacionar: AWS credentials**

Já feito com OIDC. Credenciais temporárias por design — expiram em 1 hora, sem rotação necessária.

**Substituir por KMS em vez de rotacionar: `ENCRYPTION_KEY`**

Rotacionar uma chave AES-256 bruta significa re-encriptar todos os dados do banco — risco de perda permanente se o processo falhar. A solução da AWS é o **KMS**:

- Você nunca vê a chave em si — o KMS faz `encrypt(plaintext)` e `decrypt(ciphertext)` via API.
- O KMS suporta rotação automática anual do material criptográfico **sem** re-encriptar os dados — ele guarda versões antigas das chaves e sabe qual usar para cada ciphertext.
- Nenhuma chave fica em arquivo `.env` ou SSM.

A fase 4 do projeto (key ring com array no SSM) é uma solução de transição. O destino final é KMS.

**Manual com agendamento: o restante**

| Credencial | Frequência sugerida | Motivo para não automatizar |
|---|---|---|
| `BETTER_AUTH_SECRET` | Anual ou pós-incidente | Rotação = logout de todos os usuários |
| `EC2_SSH_KEY` | Anual ou pós-incidente | Melhor eliminar com SSM Session Manager |
| `META_API_TOKEN` | Anual ou pós-incidente | Lifecycle gerenciado pela Meta |
| `GOOGLE_CLIENT_SECRET` | Anual ou pós-incidente | Lifecycle gerenciado pelo GCP |
| `SMTP_PASS` | Anual ou pós-incidente | Gerenciado pelo provedor de email |

### C. SSM Parameter Store vs Secrets Manager

A SAA-C03 pergunta frequentemente a diferença:

| | SSM Parameter Store | Secrets Manager |
|---|---|---|
| Custo | Gratuito (parâmetros padrão) | $0.40/secret/mês + $0.05/10K chamadas |
| Rotação automática | Não | Sim (com Lambda rotator) |
| Integração RDS | Não | Sim (rotator nativo) |
| Versioning | Sim | Sim |
| Cross-account | Limitado | Sim |
| Caso de uso | Configuração, parâmetros não-críticos | Credenciais que precisam de rotação automática |

**Regra prática para a prova**: se o enunciado fala em "rotação automática" ou "credenciais de banco de dados", a resposta é **Secrets Manager**. Para configuração geral e segredos sem rotação automática, **SSM Parameter Store**.

### D. O Que Cai na SAA-C03

- **Secrets Manager auto-rotation**: Lambda rotator nativo para RDS. O exame adora cenários do tipo "a empresa precisa rotacionar credenciais do banco automaticamente a cada 30 dias sem downtime".
- **KMS key rotation**: rotação automática do material criptográfico sem re-encriptar dados. A chave lógica (Key ID) permanece a mesma; apenas o material muda. Os ciphertexts antigos ainda são decriptados pelo material antigo que o KMS mantém internamente.
- **IAM OIDC (já documentado na Seção 16)**: elimina completamente a necessidade de gerenciar credenciais AWS em sistemas externos.
- **SSM SecureString**: criptografado com KMS. O IAM Role da EC2 precisa de `kms:Decrypt` sobre a chave que encriptou o parâmetro (ou usar a chave padrão `alias/aws/ssm`, que a policy `AmazonSSMReadOnlyAccess` já cobre).
- **Least privilege no tempo**: credenciais temporárias (OIDC, Instance Profile) são superiores a credenciais permanentes porque limitam a janela de exposição mesmo em caso de vazamento.

---

