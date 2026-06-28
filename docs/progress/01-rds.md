> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 6. 🗄️ Migração para Banco de Dados Gerenciado: AWS RDS

Para escalar a aplicação e garantir que seus dados estejam seguros contra falhas de hardware do servidor EC2, migramos o banco de dados para o serviço especializado **Amazon RDS (Relational Database Service)**.

### A. Provisionamento do RDS (Postgres Free Tier)
1. **Engine**: PostgreSQL (Versão 16 ou 17).
2. **Templates**: Selecionado **"Free Tier"** (Camada Gratuita) — Crucial para evitar cobranças!
3. **Settings**:
   - **Credentials Management**: Escolha "Self managed".
   - **Master Password**: Defina uma senha forte e anote (ela será usada no `.env` final).
4. **Instance Config**: Classe `db.t4g.micro` (Aprovada para Free Tier) com 20 GB de armazenamento **gp2**.
5. **Storage**: **DESMARCAR** a opção *"Enable storage autoscaling"* (Para travar nos 20 GB gratuitos e evitar custos surpresa).
6. **Connectivity**: 
   - **Acesso Público**: Configurado como **"Não"** (Melhor prática de segurança). O banco fica invisível na internet e acessível apenas de dentro da sua rede AWS.
   - **VPC**: Colocado na mesma VPC padrão da sua instância EC2.
7. **Additional Configuration** (Rodapé da página):
   - **Initial database name**: Digite `psy_manager` (Se deixar vazio, o RDS cria o servidor sem o banco, gerando erros de conexão na API).

### B. 🧱 Isolamento e Firewall de Rede (Security Group Dedicado)
Para garantir a segurança máxima, não reaproveitamos o grupo padrão. Criamos um firewall isolado exclusivo para o banco de dados.

1. **Criação do Grupo**: Na tela de criação do RDS, em *VPC Security Group*, selecionado **"Create new"** e nomeado como `psy-manager-rds-sg`.
2. **Regra de Entrada (Inbound Rule)**: Após a criação, acessamos este grupo no console AWS e configuramos a entrada:
   - **Tipo**: PostgreSQL (TCP porta 5432)
   - **Origem**: Selecionar o **ID do Security Group da Instância EC2** (ex: `sg-XXXXXXXX`).
💡 *Por que isso cai na prova do SAA?* Isso cria um vínculo dinâmico de segurança entre recursos em vez de IPs fixos. Se a EC2 trocar de IP amanhã, ela continua tendo acesso automático e invisível pela internet, sem que você precise editar as regras manualmente.

### C. Exigência de SSL (Segurança em Trânsito)
O AWS RDS exige criptografia por padrão. Para evitar erros de handshake na aplicação (`no pg_hba.conf entry`), ajustamos a URL de conexão no `.env` adicionando o sufixo de segurança:
```env
DATABASE_URL="postgres://postgres:SUA_SENHA@SEU_ENDPOINT_RDS.sa-east-1.rds.amazonaws.com:5432/postgres?sslmode=require"
```

---

