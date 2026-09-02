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
                        Última atualização: maio de 2026
                    </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    O <strong className="text-foreground">psy-manager</strong> ("nós", "nosso") é uma
                    plataforma de gestão clínica para psicólogos brasileiros. Esta Política de
                    Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados
                    pessoais, em conformidade com a{" "}
                    <strong className="text-foreground">
                        Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)
                    </strong>{" "}
                    e o{" "}
                    <strong className="text-foreground">
                        Marco Civil da Internet (Lei nº 12.965/2014)
                    </strong>
                    .
                </p>

                <Section title="1. Quem somos">
                    <p>
                        O psy-manager é operado por seus desenvolvedores e disponibilizado como serviço
                        web e desktop. Para questões relacionadas a esta política ou ao tratamento de
                        seus dados, entre em contato com nosso Encarregado de Dados (DPO) pelo e-mail:{" "}
                        <a
                            href="mailto:privacidade@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            privacidade@psy-manager.com.br
                        </a>
                        .
                    </p>
                    <p>
                        Em nenhuma hipótese o psy-manager presta serviços psicológicos, de
                        aconselhamento, de saúde ou correlatos. A plataforma é exclusivamente uma
                        ferramenta de gestão administrativa e clínica para uso do profissional.
                    </p>
                </Section>

                <Section title="2. Explicação de termos">
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">Controlador:</strong> pessoa ou empresa
                            que decide como os dados pessoais serão tratados. O psicólogo é o
                            controlador dos dados de seus pacientes; o psy-manager é controlador dos
                            dados de cadastro do psicólogo.
                        </li>
                        <li>
                            <strong className="text-foreground">Operador:</strong> quem trata dados em
                            nome do controlador. O psy-manager atua como operador dos dados clínicos
                            dos pacientes inseridos pelo psicólogo.
                        </li>
                        <li>
                            <strong className="text-foreground">Titular:</strong> pessoa a quem os
                            dados pertencem.
                        </li>
                        <li>
                            <strong className="text-foreground">Dado pessoal sensível:</strong>{" "}
                            informações sobre saúde, biometria, convicção religiosa, origem étnica etc.,
                            com proteção reforçada pela LGPD.
                        </li>
                    </ul>
                </Section>

                <Section title="3. Dados que coletamos">
                    <p>Coletamos apenas os dados estritamente necessários para a operação da plataforma:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">Dados de cadastro do psicólogo:</strong>{" "}
                            nome completo, e-mail, senha (armazenada com hash seguro), CRP, telefone e
                            cidade.
                        </li>
                        <li>
                            <strong className="text-foreground">Registro de consentimento:</strong>{" "}
                            data e hora em que você concordou com os Termos de Uso e esta Política
                            (<em>consentedAt</em>), e a versão dos documentos vigente naquele momento
                            (<em>consentVersion</em>), armazenados para fins de auditoria LGPD.
                        </li>
                        <li>
                            <strong className="text-foreground">Dados de pacientes:</strong>{" "}
                            informações inseridas pelo psicólogo (nome, contato, dados clínicos,
                            prontuários, documentos). Esses dados são tratados como dados pessoais
                            sensíveis (saúde) e são de responsabilidade do psicólogo como controlador
                            independente.
                        </li>
                        <li>
                            <strong className="text-foreground">Dados de uso técnico:</strong>{" "}
                            registros de sessão (token de autenticação, IP de origem e user-agent
                            armazenados pelo sistema de autenticação para segurança de sessão).
                        </li>
                        <li>
                            <strong className="text-foreground">Registros de acesso (logs):</strong>{" "}
                            nos termos do art. 15 da Lei nº 12.965/2014, armazenamos registros de
                            acesso (data, hora e IP) por prazo mínimo de 6 (seis) meses, sob sigilo e
                            em ambiente seguro.
                        </li>
                        <li>
                            <strong className="text-foreground">Relatórios de erro:</strong>{" "}
                            logs de falhas técnicas enviados ao Sentry, configurado sem envio de dados
                            pessoais identificáveis (<code>sendDefaultPii: false</code>; headers
                            sensíveis removidos antes do envio).
                        </li>
                    </ul>
                    <p>
                        Não coletamos dados de pagamento, documentos de identidade (CPF/RG do
                        psicólogo) ou dados biométricos do psicólogo diretamente. O CPF/RG de
                        pacientes, quando inserido pelo psicólogo, é armazenado com criptografia.
                    </p>
                </Section>

                <Section title="4. Finalidade e bases legais">
                    <p>Tratamos seus dados com as seguintes finalidades e bases legais (Art. 7º, LGPD):</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">Execução do contrato (Art. 7º, V):</strong>{" "}
                            criação e manutenção de conta, autenticação e disponibilização dos módulos
                            da plataforma.
                        </li>
                        <li>
                            <strong className="text-foreground">Consentimento (Art. 7º, I):</strong>{" "}
                            registro da data e versão de aceite dos documentos legais no momento do
                            cadastro.
                        </li>
                        <li>
                            <strong className="text-foreground">
                                Cumprimento de obrigação legal (Art. 7º, II):
                            </strong>{" "}
                            retenção de logs de acesso por 6 meses (art. 15, Lei nº 12.965/2014) e
                            atendimento a determinações judiciais ou de autoridades competentes.
                        </li>
                        <li>
                            <strong className="text-foreground">Legítimo interesse (Art. 7º, IX):</strong>{" "}
                            monitoramento de erros técnicos (Sentry) para garantir estabilidade e
                            segurança do serviço.
                        </li>
                    </ul>
                </Section>

                <Section title="5. Dados de pacientes — responsabilidade do psicólogo">
                    <p>
                        O psicólogo é o <strong className="text-foreground">controlador</strong> dos
                        dados pessoais e clínicos de seus pacientes, conforme a LGPD. O psy-manager
                        atua como <strong className="text-foreground">operador</strong>, tratando esses
                        dados exclusivamente conforme as instruções do psicólogo e as finalidades da
                        plataforma.
                    </p>
                    <p>
                        Todos os dados de pacientes (nome, CPF, RG, telefone, endereço, dados
                        financeiros, prontuários e documentos) são armazenados com{" "}
                        <strong className="text-foreground">
                            criptografia AES-256-GCM em repouso
                        </strong>
                        , de modo que apenas o psicólogo dono dos dados pode visualizá-los
                        autenticado na plataforma. O psy-manager não lê nem processa o conteúdo
                        clínico dos pacientes.
                    </p>
                    <p>
                        O psicólogo é inteiramente responsável por obter o consentimento de seus
                        pacientes para coleta e tratamento de dados, conforme LGPD e Código de Ética
                        Profissional do Psicólogo (CFP).
                    </p>
                </Section>

                <Section title="6. Compartilhamento de dados">
                    <p>
                        Seus dados são compartilhados apenas com os seguintes prestadores de serviço
                        essenciais:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">AWS (Amazon Web Services):</strong>{" "}
                            hospedagem de arquivos (S3) e banco de dados (RDS PostgreSQL), localizados
                            na região us-east-1 (EUA). Dados transferidos internacionalmente com base
                            no art. 33, IX da LGPD — necessário para execução do serviço.
                        </li>
                        <li>
                            <strong className="text-foreground">Sentry:</strong> monitoramento de
                            erros, configurado sem envio de PII.
                        </li>
                        <li>
                            <strong className="text-foreground">Google (opcional):</strong> se o
                            psicólogo conectar sua conta Google para sincronização do Google Calendar,
                            dados de agendamentos são compartilhados com o Google conforme seção 7
                            abaixo.
                        </li>
                    </ul>
                    <p>
                        Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins
                        de marketing ou publicidade.
                    </p>
                </Section>

                <Section title="7. Integração com Google Calendar">
                    <p>
                        O psy-manager oferece integração opcional com o Google Calendar. Ao conectar
                        sua conta Google, você autoriza o psy-manager a:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Ler seus eventos de calendário para sincronização de agendamentos.</li>
                        <li>
                            Criar e atualizar eventos no Google Calendar referentes a consultas
                            agendadas na plataforma.
                        </li>
                    </ul>
                    <p>
                        <strong className="text-foreground">
                            O uso e a transferência de informações recebidas das APIs do Google para
                            quaisquer outros aplicativos obedecem à{" "}
                            <a
                                href="https://developers.google.com/terms/api-services-user-data-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-4"
                            >
                                Política de dados do usuário dos Serviços de API do Google
                            </a>
                            , incluindo os requisitos de uso limitado.
                        </strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            Dados obtidos via API do Google (tokens de acesso, informações de agenda)
                            não são compartilhados com terceiros além dos declarados nesta política.
                        </li>
                        <li>
                            Tokens de autenticação do Google são armazenados com criptografia em
                            repouso e em trânsito (TLS/HTTPS).
                        </li>
                        <li>
                            Você pode revogar o acesso a qualquer momento em{" "}
                            <a
                                href="https://myaccount.google.com/permissions"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline underline-offset-4"
                            >
                                myaccount.google.com/permissions
                            </a>{" "}
                            ou pelo e-mail do DPO. Após revogação, os tokens são removidos em até
                            30 dias.
                        </li>
                    </ul>
                </Section>

                <Section title="8. Cookies e rastreamento">
                    <p>Utilizamos exclusivamente:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">
                                Cookies de sessão (estritamente necessários):
                            </strong>{" "}
                            gerenciados pelo sistema de autenticação para manter sua sessão ativa.
                            Sem esses cookies, o serviço não funciona. Expiram com o encerramento
                            da sessão ou após o prazo configurado.
                        </li>
                    </ul>
                    <p>
                        Não utilizamos cookies de rastreamento, publicidade, analytics comportamental
                        ou Meta Pixel.
                    </p>
                </Section>

                <Section title="9. Retenção de dados">
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Dados de conta são mantidos enquanto a conta estiver ativa.</li>
                        <li>
                            Após a exclusão da conta, todos os dados pessoais são removidos em até{" "}
                            <strong className="text-foreground">30 dias</strong> dos sistemas de
                            produção e backups rotativos — incluindo arquivos armazenados em S3.
                        </li>
                        <li>
                            Prontuários <em>finalizados</em> estão sujeitos à obrigação legal de
                            guarda mínima de 5 anos imposta pela Resolução CFP nº 001/2009. Essa
                            retenção constitui base legal de obrigação legal (LGPD Art. 7º, II) e é
                            uma exceção legítima ao direito ao esquecimento.
                        </li>
                        <li>
                            Registros de acesso (logs) são mantidos por 6 meses, conforme art. 15
                            da Lei nº 12.965/2014.
                        </li>
                        <li>
                            Logs de erro anonimizados podem ser retidos pelo Sentry por até 90 dias.
                        </li>
                    </ul>
                </Section>

                <Section title="10. Seus direitos como titular">
                    <p>Em conformidade com os Arts. 17–22 da LGPD, você tem direito a:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            <strong className="text-foreground">Confirmação e acesso:</strong>{" "}
                            confirmar o tratamento e acessar seus dados.
                        </li>
                        <li>
                            <strong className="text-foreground">Correção:</strong> atualizar dados
                            incompletos ou desatualizados (disponível em{" "}
                            <strong className="text-foreground">Perfil</strong> na plataforma).
                        </li>
                        <li>
                            <strong className="text-foreground">Portabilidade:</strong> baixar uma
                            cópia completa dos seus dados em formato JSON (disponível em{" "}
                            <strong className="text-foreground">
                                Perfil → Exportar meus dados
                            </strong>
                            ).
                        </li>
                        <li>
                            <strong className="text-foreground">Exclusão:</strong> remover seus dados
                            e encerrar a conta (disponível em{" "}
                            <strong className="text-foreground">
                                Perfil → Zona de Perigo → Excluir minha conta
                            </strong>
                            , ou por e-mail ao DPO).
                        </li>
                        <li>
                            <strong className="text-foreground">Anonimização ou bloqueio:</strong>{" "}
                            de dados desnecessários ou tratados em desconformidade com a lei.
                        </li>
                        <li>
                            <strong className="text-foreground">
                                Informação sobre compartilhamento:
                            </strong>{" "}
                            saber com quais empresas seus dados foram compartilhados.
                        </li>
                        <li>
                            <strong className="text-foreground">
                                Revogação do consentimento:
                            </strong>{" "}
                            quando aplicável, sem prejuízo da licitude do tratamento realizado
                            anteriormente.
                        </li>
                        <li>
                            <strong className="text-foreground">Oposição:</strong> opor-se a
                            tratamentos realizados com base em legítimo interesse.
                        </li>
                    </ul>
                    <p>
                        Para exercer seus direitos, acesse o Perfil na plataforma ou envie um e-mail
                        para{" "}
                        <a
                            href="mailto:privacidade@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            privacidade@psy-manager.com.br
                        </a>
                        . Atendemos em até 15 dias úteis.
                    </p>
                </Section>

                <Section title="11. Segurança da informação">
                    <p>
                        Adotamos as seguintes medidas de segurança técnica e organizacional:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            Comunicação via <strong className="text-foreground">HTTPS/TLS</strong>{" "}
                            em todas as camadas.
                        </li>
                        <li>
                            Senhas armazenadas com{" "}
                            <strong className="text-foreground">hash seguro</strong> (gerenciado pelo
                            sistema de autenticação Better Auth).
                        </li>
                        <li>
                            Dados sensíveis de pacientes (nome, CPF, RG, telefone, endereço, dados
                            financeiros, conteúdo de prontuários e documentos) armazenados com{" "}
                            <strong className="text-foreground">
                                criptografia AES-256-GCM em repouso
                            </strong>
                            , com chave derivada de variável de ambiente e nunca armazenada no banco.
                        </li>
                        <li>
                            Arquivos clínicos acessíveis apenas via{" "}
                            <strong className="text-foreground">
                                URLs pré-assinadas de curta duração
                            </strong>{" "}
                            (AWS S3), nunca por links públicos permanentes.
                        </li>
                        <li>
                            Dados de cada psicólogo{" "}
                            <strong className="text-foreground">
                                isolados por ID de usuário autenticado
                            </strong>{" "}
                            — nenhum psicólogo pode acessar dados de outro.
                        </li>
                        <li>
                            Monitoramento de erros sem transmissão de PII (Sentry com{" "}
                            <code>sendDefaultPii: false</code>; headers sensíveis removidos).
                        </li>
                        <li>
                            Proteção contra força bruta com{" "}
                            <strong className="text-foreground">rate limiting</strong> nos endpoints
                            de autenticação.
                        </li>
                    </ul>
                    <p>
                        Nenhum serviço na internet possui garantia total contra invasões. Em caso de
                        incidente de segurança com potencial impacto a titulares, notificaremos a
                        ANPD e os afetados no prazo legal.
                    </p>
                </Section>

                <Section title="12. Alterações nesta política">
                    <p>
                        Podemos atualizar esta política periodicamente. Quando isso ocorrer,
                        atualizaremos a data de "última atualização" no topo desta página e
                        incrementaremos o <em>consentVersion</em> registrado nos novos cadastros.
                        Para alterações materiais, notificaremos pelo e-mail cadastrado.
                    </p>
                </Section>

                <Section title="13. Contato e reclamações">
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
