# SSM (AWS Systems Manager)

**O que é:** caixa de ferramentas de gestão de instâncias. Usamos Parameter Store, Session Manager e Run Command.

**Quando é a resposta certa:** guardar config/segredos (Parameter Store), acessar EC2 sem SSH (Session Manager), rodar comando remoto (Run Command).

## Pontos-chave
- **Parameter Store**: `String` (config) vs `SecureString` (segredo, KMS). **Grátis** no tier padrão.
- **Session Manager**: shell/túnel na EC2 **sem porta 22 e sem chave SSH**; auditado no CloudTrail.
- **Run Command**: executa script remoto e retorna stdout/stderr (usado no deploy via `send-command` + polling).
- Requer **SSM Agent** + `AmazonSSMManagedInstanceCore` na Instance Role.
- Comunicação iniciada **de dentro** da instância (HTTPS saída) — sem regra de entrada no SG.

## Pegadinhas
- Run Command (automação/CI) vs Session Manager (shell interativo) — saber qual responde a pergunta.
- Agent sem a policy → loop de `400 RequestError`.
- "Eliminar SSH e porta 22" → Session Manager.
- Parameter Store (grátis, sem rotação) vs Secrets Manager (pago, com rotação).

## Como usamos no Psy-Manager
- Segredos em Parameter Store injetados no deploy → [§10](../../progress/04-ssm-secrets.md)
- Deploy via Run Command (sem SSH) + túnel SSH local → [§19](../../progress/13-ssm-session-manager.md)
