# CloudWatch

**O que é:** observabilidade da AWS — métricas, alarmes e logs. Monitora a CPU da EC2.

**Quando é a resposta certa:** "ser avisado quando X", "monitorar métrica", "centralizar logs", "disparar escala automática".

## Pontos-chave
- **Métricas** (ex.: `CPUUtilization`) + **Alarmes** (limiar por N períodos).
- Alarme → ação: notificar via **SNS** (email/SMS) ou acionar **Auto Scaling**.
- **CloudWatch Logs**: centraliza logs de aplicação/serviços.
- Métricas básicas (5 min) grátis; **detailed monitoring** (1 min) custa.
- Base pro **target tracking** do ASG (escala por métrica).

## Pegadinhas
- CloudWatch (métrica/alarme/log) ≠ **CloudTrail** (auditoria de chamadas de API). A prova confunde os dois.
- Alarme não "faz" nada sozinho — precisa de uma ação (SNS, ASG policy).

## Como usamos no Psy-Manager
- Alarme de `CPUUtilization > 80%` → SNS → [ROADMAP #4 (concluído)](../../ROADMAP.md)
- Futuro: métrica-base pro Auto Scaling Group → [ROADMAP #13](../../ROADMAP.md)
