> [📚 Docs](../README.md) · [🛠️ Progresso](README.md) · [🗺️ Roadmap](../ROADMAP.md)

## 🗺️ Visão Geral da Arquitetura de Deploy

O fluxo de implantação contínua (CI/CD) funciona da seguinte forma:
1. Você envia o código para a branch `master` no GitHub.
2. O **GitHub Actions** dispara o pipeline automatizado.
3. Através de uma conexão segura **SSH (porta 22)** usando sua chave `.pem`, o GitHub se conecta ao servidor **AWS EC2**.
4. O servidor puxa o código atualizado, reconstrói os containers otimizados usando **Docker Compose** e inicializa os serviços.
5. O **Nginx** atua como proxy reverso na porta **80**, servindo o frontend estático e roteando requisições `/api` e `/trpc` diretamente para o container do backend Bun na porta **3001**.
6. As migrações do banco de dados PostgreSQL são executadas automaticamente de forma isolada dentro do container da API.

---

## 1. ☁️ Configuração da Infraestrutura AWS EC2

### A. Criação da Instância (Console AWS)
- **Nome**: `psy-manager-prod`
- **Sistema Operacional (AMI)**: `Ubuntu Server 24.04 LTS` (Elegível para Free Tier).
- **Tipo de Instância**: `t3.micro` ou `t2.micro` (1 vCPU, 1 GB RAM — 750 horas mensais gratuitas).
- **Chave de Acesso (Key Pair)**: Criada no formato **`.pem`** (RSA) com o nome `psy-manager-key.pem`.
- **Armazenamento (Storage)**: Alterado de 8 GB padrão para **30 GB (SSD gp3)** (Limite máximo gratuito do Free Tier).

### B. Firewall & Segurança (Security Groups)
As seguintes portas foram abertas no grupo de segurança para o tráfego de entrada:
- **Porta 22 (SSH)**: Origem `0.0.0.0/0` (Permite conexão do terminal local e dos runners do GitHub Actions).
- **Porta 80 (HTTP)**: Origem `0.0.0.0/0` (Acesso público ao aplicativo).
- **Porta 443 (HTTPS)**: Origem `0.0.0.0/0` (Pronto para tráfego criptografado futuro).

---

## 2. 🐧 Configuração Interna do Servidor EC2 (SSH)

Conecte ao seu servidor via terminal local (Powershell no Windows):
```powershell
# Ajustar permissões da chave .pem (Exclusivo Windows)
icacls.exe .\psy-manager-key.pem /inheritance:r /grant:r "${env:USERNAME}:(R)"
icacls.exe psy-manager-key.pem /inheritance:r /grant:r "${env:USERNAME}:(R)"

# Conectar ao servidor
ssh -i .\.ssh\psy-manager-key.pem ubuntu@56.125.229.202
ssh -i .ssh/psy-manager-key.pem ubuntu@56.125.229.202
```

### A. Instalação do Docker & Docker Compose
Dentro da máquina Ubuntu, execute para instalar a engine moderna do Docker:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
newgrp docker
```

### B. Configuração de SWAP (Memória Virtual de 2 GB) — 🔥 *Essencial para o Free Tier*
Como a instância `t3.micro` possui apenas 1 GB de RAM física, a compilação do TypeScript (`tsc`) pode travar o servidor. Ativamos 2 GB de memória virtual usando o SSD:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### C. Criação do Arquivo `.env` de Produção
Para que o Better Auth e o banco funcionem de forma segura, primeiro crie o diretório do projeto e em seguida gere o arquivo de variáveis:
```bash
# Criar a pasta do projeto
mkdir -p ~/psy-manager

# Criar o arquivo .env lá dentro
cat << 'EOF' > ~/psy-manager/.env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=psy_manager
BETTER_AUTH_SECRET=9sK3mX7qA2vF5wD8eR1tY4uI0oP3lL6k
BETTER_AUTH_URL=http://56.125.229.202
EOF
```

---

## 3. 🐙 Configuração do Repositório GitHub (Secrets)

No seu repositório no GitHub, acesse **Settings > Secrets and variables > Actions > New repository secret** e cadastre as credenciais para o CI/CD se conectar ao EC2:

1. **`EC2_HOST`**: O IP público do seu servidor EC2 (ex: `56.125.229.202`).
2. **`EC2_USERNAME`**: `ubuntu`
3. **`EC2_SSH_KEY`**: Abra o seu arquivo `psy-manager-key.pem` local no bloco de notas, copie **todo o conteúdo** (incluindo as linhas `-----BEGIN...` e `-----END...`) e cole aqui.

---

## 🐳 4. Arquitetura Docker & Orquestração Multi-Container

Toda a lógica de microsserviços de produção foi estruturada nos seguintes arquivos do repositório:

### A. Orquestração: `docker-compose.prod.yml`
Define a infraestrutura contendo 3 containers:
- **`db`**: Banco de dados PostgreSQL 17 rodando em Alpine Linux com volumes persistentes (`postgres_data`). Possui um `healthcheck` que avisa quando o banco está pronto.
- **`api`**: Backend construído sobre o runtime Bun, escutando internamente na porta `3001` e conectado à rede isolada do banco.
- **`web`**: Servidor Nginx que escuta na porta pública `80`, servindo o frontend estático e atuando como proxy reverso de APIs.

### B. Backend: `docker/Dockerfile.api`
Otimizado para produção utilizando multi-stage build:
- **Estágio 1 (`deps`)**: Instala pacotes necessários com o Bun.
- **Estágio 2 (`production`)**: Copia apenas os binários necessários, compila o TypeScript (`bun run build`) e executa de forma leve através do comando `bun dist/index.js`.

### C. Frontend & Proxy: `docker/Dockerfile.web` e `docker/nginx.conf`
O **Nginx** serve a pasta `/usr/share/nginx/html` com os arquivos HTML/CSS/JS compilados do React. 
Adicionalmente, o proxy reverso intercepta requisições de API para evitar problemas de CORS:
```nginx
location /api {
    proxy_pass http://api:3001; # Roteia chamadas de Auth para a API interna
}
location /trpc {
    proxy_pass http://api:3001; # Roteia chamadas de Queries/Mutations para a API interna
}
```

---

