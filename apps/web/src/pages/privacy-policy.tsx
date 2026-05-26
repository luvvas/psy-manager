import { Brain } from "lucide-react";
import { Link } from "react-router-dom";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
        </section>
    );
}

export function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
                <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-3">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Brain className="size-4" />
                        </div>
                        <span className="font-bold tracking-tight">psy-manager</span>
                    </Link>
                    <span className="text-muted-foreground text-sm">/ Política de Privacidade</span>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Política de Privacidade</h1>
                    <p className="text-sm text-muted-foreground">
                        Última atualização: maio de 2025
                    </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    O <strong className="text-foreground">psy-manager</strong> ("nós", "nosso") é uma
                    plataforma de gestão clínica para psicólogos brasileiros. Esta Política de
                    Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados
                    pessoais, em conformidade com a{" "}
                    <strong className="text-foreground">
                        Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)
                    </strong>
                    .
                </p>

                <Section title="1. Quem somos">
                    <p>
                        O psy-manager é operado por seus desenvolvedores e disponibilizado como serviço
                        web. Para questões relacionadas a esta política ou ao tratamento de seus dados,
                        entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail:{" "}
                        <a
                            href="mailto:privacidade@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            privacidade@psy-manager.com.br
                        </a>
                        .
                    </p>
                </Section>

                <Section title="2. Dados que coletamos">
                    <p>Coletamos apenas os dados estritamente necessários para a operação da plataforma:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">Dados de cadastro do psicólogo:</strong>{" "}
                            nome completo, e-mail, senha (armazenada com hash), CRP, telefone e cidade.
                        </li>
                        <li>
                            <strong className="text-foreground">Dados de pacientes:</strong> informações
                            inseridas pelo psicólogo (nome, contato, dados clínicos). Esses dados são de
                            responsabilidade do psicólogo como controlador independente.
                        </li>
                        <li>
                            <strong className="text-foreground">Dados de uso técnico:</strong> registros de
                            sessão (token de autenticação, IP de origem armazenado pelo Better Auth para
                            segurança de sessão, user-agent).
                        </li>
                        <li>
                            <strong className="text-foreground">Relatórios de erro:</strong> logs de falhas
                            técnicas enviados ao Sentry, sem dados pessoais identificáveis
                            (<code>sendDefaultPii: false</code>).
                        </li>
                    </ul>
                    <p>Não coletamos dados de pagamento, documentos de identidade ou dados biométricos.</p>
                </Section>

                <Section title="3. Finalidade e bases legais">
                    <p>Tratamos seus dados com as seguintes finalidades e bases legais (Art. 7º, LGPD):</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">Execução do contrato:</strong> criação e
                            manutenção de conta, autenticação e disponibilização dos módulos da plataforma.
                        </li>
                        <li>
                            <strong className="text-foreground">Legítimo interesse:</strong> monitoramento de
                            erros técnicos (Sentry) para garantir estabilidade e segurança do serviço.
                        </li>
                        <li>
                            <strong className="text-foreground">Cumprimento de obrigação legal:</strong>{" "}
                            quando exigido por autoridade competente ou legislação aplicável.
                        </li>
                    </ul>
                </Section>

                <Section title="4. Compartilhamento de dados">
                    <p>Seus dados são compartilhados apenas com os seguintes prestadores de serviço essenciais:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">AWS (Amazon Web Services):</strong> hospedagem
                            de arquivos (S3) e banco de dados (RDS PostgreSQL), localizados na região
                            us-east-1.
                        </li>
                        <li>
                            <strong className="text-foreground">Sentry:</strong> monitoramento de erros,
                            configurado sem envio de PII.
                        </li>
                    </ul>
                    <p>
                        Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins de
                        marketing ou publicidade.
                    </p>
                </Section>

                <Section title="5. Cookies e rastreamento">
                    <p>Utilizamos exclusivamente:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">Cookies de sessão (estritamente necessários):</strong>{" "}
                            gerenciados pelo Better Auth para manter sua autenticação ativa. Sem esses
                            cookies, o serviço não funciona. Expiram com o encerramento da sessão ou após o
                            prazo configurado.
                        </li>
                    </ul>
                    <p>
                        Não utilizamos cookies de rastreamento, publicidade ou análise comportamental de
                        terceiros.
                    </p>
                </Section>

                <Section title="6. Retenção de dados">
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            Dados de conta são mantidos enquanto a conta estiver ativa.
                        </li>
                        <li>
                            Após a exclusão da conta, todos os dados pessoais são removidos em até{" "}
                            <strong className="text-foreground">30 dias</strong> dos nossos sistemas de
                            produção e backups rotativos.
                        </li>
                        <li>
                            Logs de erro anonimizados podem ser retidos pelo Sentry por até 90 dias.
                        </li>
                    </ul>
                </Section>

                <Section title="7. Seus direitos como titular">
                    <p>Em conformidade com os Arts. 17–22 da LGPD, você tem direito a:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong className="text-foreground">Acesso:</strong> confirmar o tratamento e acessar seus dados.</li>
                        <li><strong className="text-foreground">Correção:</strong> atualizar dados incompletos ou desatualizados (disponível no Perfil da plataforma).</li>
                        <li><strong className="text-foreground">Portabilidade:</strong> solicitar exportação dos seus dados em formato estruturado.</li>
                        <li><strong className="text-foreground">Exclusão:</strong> solicitar a remoção de seus dados e a exclusão da sua conta (disponível em Perfil → Zona de Perigo, ou por e-mail ao DPO).</li>
                        <li><strong className="text-foreground">Revogação do consentimento:</strong> quando aplicável.</li>
                        <li><strong className="text-foreground">Oposição:</strong> opor-se a tratamentos realizados com base em legítimo interesse.</li>
                    </ul>
                    <p>
                        Para exercer seus direitos, acesse o Perfil na plataforma ou envie um e-mail para{" "}
                        <a
                            href="mailto:privacidade@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            privacidade@psy-manager.com.br
                        </a>
                        . Atendemos em até 15 dias úteis.
                    </p>
                </Section>

                <Section title="8. Segurança">
                    <p>Adotamos as seguintes medidas de segurança técnica e organizacional:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Comunicação via HTTPS/TLS em todas as camadas.</li>
                        <li>Senhas armazenadas com hash seguro (gerenciado pelo Better Auth).</li>
                        <li>Arquivos acessíveis apenas via URLs pré-assinadas de curta duração (AWS S3).</li>
                        <li>Dados de cada psicólogo isolados por ID de usuário autenticado.</li>
                        <li>Monitoramento de erros sem transmissão de PII (Sentry com <code>sendDefaultPii: false</code>).</li>
                    </ul>
                </Section>

                <Section title="9. Alterações nesta política">
                    <p>
                        Podemos atualizar esta política periodicamente. Quando isso ocorrer, atualizaremos
                        a data de "última atualização" no topo desta página. Para alterações materiais,
                        notificaremos pelo e-mail cadastrado.
                    </p>
                </Section>

                <Section title="10. Contato">
                    <p>
                        Dúvidas, solicitações ou reclamações relacionadas a privacidade:{" "}
                        <a
                            href="mailto:privacidade@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            privacidade@psy-manager.com.br
                        </a>
                        .
                    </p>
                    <p>
                        Você também pode registrar reclamações junto à{" "}
                        <strong className="text-foreground">
                            Autoridade Nacional de Proteção de Dados (ANPD)
                        </strong>{" "}
                        em{" "}
                        <a
                            href="https://www.gov.br/anpd"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-4"
                        >
                            www.gov.br/anpd
                        </a>
                        .
                    </p>
                </Section>
            </main>

            <footer className="border-t">
                <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <Link to="/" className="hover:text-foreground transition-colors">
                        ← Voltar para o início
                    </Link>
                    <div className="flex gap-4">
                        <Link to="/politica-de-privacidade" className="hover:text-foreground transition-colors">
                            Política de Privacidade
                        </Link>
                        <Link to="/termos-de-uso" className="hover:text-foreground transition-colors">
                            Termos de Uso
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
