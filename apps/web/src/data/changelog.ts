export type ChangeType = "new" | "fix" | "improvement";

export const changeTypeConfig: Record<ChangeType, { label: string; className: string }> = {
    new: { label: "Novo", className: "bg-primary/10 text-primary" },
    fix: { label: "Correção", className: "bg-destructive/10 text-destructive" },
    improvement: { label: "Melhoria", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

export interface ChangelogEntry {
    version: string;
    date: string;
    label?: string;
    changes: { type: ChangeType; text: string }[];
}

export const changelog: ChangelogEntry[] = [
    {
        version: "1.0.0",
        date: "26 de maio de 2026",
        label: "Mais recente",
        changes: [
            { type: "new", text: "Política de Privacidade e Termos de Uso com conformidade LGPD completa" },
            { type: "new", text: "Registro de consentimento no cadastro (data, hora e versão dos documentos aceitos)" },
            { type: "improvement", text: "Rodapé com links para documentos legais em todas as páginas públicas" },
        ],
    },
    {
        version: "0.9.0",
        date: "24 de maio de 2026",
        changes: [
            { type: "fix", text: "Patch de segurança: drizzle-orm atualizado para corrigir CVE de SQL injection" },
            { type: "new", text: "Dependabot configurado para atualizações automáticas de dependências" },
        ],
    },
    {
        version: "0.8.0",
        date: "23 de maio de 2026",
        changes: [
            { type: "new", text: "Recuperação de senha via link enviado por e-mail" },
            { type: "new", text: "Página inicial com apresentação da plataforma, funcionalidades e FAQ" },
            { type: "improvement", text: "Histórico de atualizações exibido na landing page" },
        ],
    },
    {
        version: "0.7.0",
        date: "22 de maio de 2026",
        changes: [
            { type: "new", text: "Aplicativo desktop (Electron) com build e deploy automatizados no CI/CD" },
            { type: "new", text: "Auto-atualização do app desktop via GitHub Releases" },
            { type: "fix", text: "Autenticação no desktop redirecionando corretamente após login" },
        ],
    },
    {
        version: "0.6.2",
        date: "21 de maio de 2026",
        changes: [
            { type: "new", text: "Formulário de feedback integrado ao menu lateral" },
            { type: "new", text: "Página 404 personalizada com redirecionamento para a agenda" },
        ],
    },
    {
        version: "0.6.1",
        date: "20 de maio de 2026",
        changes: [
            { type: "new", text: "Monitoramento de erros com Sentry (frontend e backend, sem envio de dados pessoais)" },
            { type: "new", text: "Testes unitários implementados nos módulos core da API" },
        ],
    },
    {
        version: "0.6.0",
        date: "18 de maio de 2026",
        changes: [
            { type: "new", text: "Criptografia AES-256-GCM em repouso para todos os campos sensíveis de pacientes" },
            { type: "improvement", text: "Nome, CPF, RG, telefone, endereço e dados financeiros do paciente agora criptografados" },
            { type: "improvement", text: "Chave de criptografia derivada de variável de ambiente, nunca armazenada no banco" },
        ],
    },
    {
        version: "0.5.1",
        date: "17 de maio de 2026",
        changes: [
            { type: "new", text: "Cache Redis para listagem de pacientes (TTL de 60 s, invalidado em escrita)" },
            { type: "new", text: "Store de sessão compartilhado via Redis (pré-requisito para escala horizontal)" },
            { type: "improvement", text: "Tempo de resposta do endpoint de sessão reduzido de ~29 ms para ~2 ms" },
        ],
    },
    {
        version: "0.5.0",
        date: "15 de maio de 2026",
        changes: [
            { type: "new", text: "Videochamada peer-to-peer (WebRTC) integrada diretamente aos agendamentos" },
            { type: "new", text: "Link de acesso para o paciente entrar na sala sem precisar de cadastro" },
            { type: "new", text: "Servidor TURN (coturn) no EC2 para redes com NAT restritivo ou CGNAT" },
            { type: "fix", text: "Fila de candidatos ICE corrigida para chamadas em redes distintas" },
            { type: "fix", text: "Estado 'disconnected' tratado como transitório (não encerra a chamada por oscilação de rede)" },
        ],
    },
    {
        version: "0.4.1",
        date: "13 de maio de 2026",
        changes: [
            { type: "new", text: "Temas visuais personalizáveis: cor primária e estilo da interface por psicólogo" },
            { type: "improvement", text: "Sidebar redesenhada com navegação mais clara e suporte a redimensionamento" },
            { type: "improvement", text: "Header das páginas com identidade visual do tema ativo" },
        ],
    },
    {
        version: "0.4.0",
        date: "12 de maio de 2026",
        changes: [
            { type: "new", text: "Módulo de Documentos: biblioteca de modelos com upload, visualização e download de PDFs" },
            { type: "new", text: "Prontuário clínico com status de rascunho e finalizado e anexo de PDF" },
            { type: "new", text: "Linha do tempo do paciente exibindo prontuários e consultas" },
            { type: "improvement", text: "Upload direto para S3 via presigned URL (arquivo não passa pela memória da API)" },
        ],
    },
    {
        version: "0.3.2",
        date: "10 de maio de 2026",
        changes: [
            { type: "new", text: "Segredos de produção migrados para AWS SSM Parameter Store (criptografados com KMS)" },
            { type: "new", text: "IAM Role para EC2 com princípio de menor privilégio (sem chaves de acesso no servidor)" },
            { type: "improvement", text: "Deploy agora stateless: EC2 sem banco local, todos os dados em RDS e S3" },
        ],
    },
    {
        version: "0.3.1",
        date: "9 de maio de 2026",
        changes: [
            { type: "new", text: "Frontend hospedado globalmente no Amazon S3 + CloudFront (HTTPS automático)" },
            { type: "new", text: "Banco de dados migrado para Amazon RDS PostgreSQL (Alta disponibilidade)" },
            { type: "fix", text: "Erro de MIME type em assets JS após deploy corrigido via separação de cache no CI/CD" },
            { type: "improvement", text: "Invalidação automática do CloudFront a cada deploy" },
        ],
    },
    {
        version: "0.3.0",
        date: "8 de maio de 2026",
        changes: [
            { type: "new", text: "Deploy contínuo (CI/CD) com GitHub Actions para AWS EC2" },
            { type: "new", text: "Contêineres Docker otimizados com multi-stage build para API e frontend" },
            { type: "new", text: "Migrações de banco executadas automaticamente a cada deploy" },
            { type: "improvement", text: "SWAP de 2 GB configurado no EC2 Free Tier para suportar build TypeScript" },
        ],
    },
    {
        version: "0.2.0",
        date: "7 de maio de 2026",
        changes: [
            { type: "new", text: "Módulo Financeiro: fluxo de caixa com receitas, despesas e categorias" },
            { type: "new", text: "Gráficos de desempenho financeiro com filtro por período" },
            { type: "new", text: "Importação de lançamentos financeiros via arquivo CSV" },
            { type: "new", text: "Sincronização bidirecional com Google Agenda via OAuth" },
        ],
    },
    {
        version: "0.1.0",
        date: "6 de maio de 2026",
        changes: [
            { type: "new", text: "Setup inicial: monorepo com Bun e Turborepo" },
            { type: "new", text: "Autenticação com e-mail e senha (Better Auth)" },
            { type: "new", text: "Módulo de Agendamento com visões diária, semanal e mensal" },
            { type: "new", text: "Módulo de Pacientes com listagem, cadastro e ficha detalhada" },
            { type: "new", text: "Módulo de Clínicas com CRUD e vínculo de psicólogos por e-mail" },
            { type: "new", text: "Perfil do psicólogo editável pelo menu lateral" },
            { type: "new", text: "Schema do banco com Drizzle ORM e padrão CQRS/Event Sourcing" },
        ],
    },
];
