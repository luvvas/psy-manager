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

export function TermsOfUsePage() {
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
                    <span className="text-muted-foreground text-sm">/ Termos de Uso</span>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight">Termos de Uso</h1>
                    <p className="text-sm text-muted-foreground">
                        Última atualização: maio de 2026
                    </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    Ao criar uma conta ou utilizar o{" "}
                    <strong className="text-foreground">psy-manager</strong>, você concorda com
                    estes Termos de Uso. Leia-os com atenção. Caso não concorde, não utilize a
                    plataforma. Recomendamos que você armazene ou imprima uma cópia deste documento.
                </p>

                <Section title="1. Descrição do serviço">
                    <p>
                        O psy-manager é uma plataforma de gestão clínica voltada para psicólogos
                        brasileiros, que disponibiliza os seguintes módulos:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Agendamento de consultas;</li>
                        <li>Gestão de pacientes;</li>
                        <li>Prontuário eletrônico e registros clínicos;</li>
                        <li>Gestão de documentos e arquivos;</li>
                        <li>Controle financeiro;</li>
                        <li>Videochamada para atendimento online;</li>
                        <li>Sincronização com Google Calendar (opcional).</li>
                    </ul>
                    <p>
                        Em nenhuma hipótese o psy-manager presta serviços psicológicos,
                        laboratoriais, de aconselhamento, de saúde ou correlatos. A plataforma não
                        determina diagnósticos, tratamentos ou procedimentos clínicos — apenas
                        possibilita o registro e controle pelo profissional.
                    </p>
                    <p>
                        O psy-manager não se responsabiliza por decisões clínicas, condutas
                        profissionais ou qualquer prática do psicólogo que utiliza a plataforma.
                        A atuação clínica é totalmente independente da plataforma e de
                        responsabilidade exclusiva do profissional.
                    </p>
                </Section>

                <Section title="2. Elegibilidade">
                    <p>Para utilizar o psy-manager você deve:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Ser maior de 18 anos.</li>
                        <li>
                            Ser profissional de psicologia com registro ativo no Conselho Federal de
                            Psicologia (CFP) ou em conselho regional (CRP).
                        </li>
                        <li>Fornecer informações verdadeiras e mantê-las atualizadas.</li>
                    </ul>
                    <p>
                        Podemos recusar, suspender ou cancelar a conta de um usuário caso
                        suspeitos de fraude, informações falsas ou violação destes Termos.
                    </p>
                </Section>

                <Section title="3. Criação e segurança da conta">
                    <p>
                        Você é responsável por manter a confidencialidade de sua senha e por todas
                        as atividades realizadas sob sua conta. Em caso de uso não autorizado,
                        notifique-nos imediatamente em{" "}
                        <a
                            href="mailto:contato@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            contato@psy-manager.com.br
                        </a>
                        .
                    </p>
                    <p>
                        Ao criar sua conta, registramos a data, hora e versão dos documentos legais
                        aceitos (<em>consentedAt</em> e <em>consentVersion</em>) como evidência
                        auditável de consentimento, conforme exigido pela LGPD.
                    </p>
                </Section>

                <Section title="4. Uso aceitável">
                    <p>
                        Você concorda em utilizar o psy-manager apenas para fins lícitos e éticos.
                        É vedado:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Inserir dados falsos ou de pacientes sem relação clínica legítima.</li>
                        <li>
                            Utilizar a plataforma para fins não relacionados à prática clínica
                            em psicologia.
                        </li>
                        <li>
                            Tentar acessar contas de outros psicólogos ou dados que não lhe
                            pertencem.
                        </li>
                        <li>
                            Realizar engenharia reversa, scraping, ataques à infraestrutura ou
                            tentativas de invasão.
                        </li>
                        <li>Compartilhar credenciais de acesso com terceiros não autorizados.</li>
                        <li>
                            Responsabilizar o psy-manager por condutas de outros usuários cadastrados
                            na plataforma.
                        </li>
                    </ul>
                    <p>
                        Ao sinal de qualquer descumprimento de conduta, o usuário poderá ser
                        bloqueado ou ter sua conta encerrada, sem necessidade de aviso prévio.
                    </p>
                </Section>

                <Section title="5. Dados de pacientes — controlador e operador">
                    <p>
                        O psicólogo é o <strong className="text-foreground">controlador</strong>{" "}
                        dos dados pessoais e clínicos de seus pacientes inseridos na plataforma,
                        conforme definido pela LGPD. O psy-manager atua como{" "}
                        <strong className="text-foreground">operador</strong> desses dados,
                        processando-os exclusivamente conforme as instruções do psicólogo e as
                        finalidades da plataforma.
                    </p>
                    <p>O psicólogo é inteiramente responsável por:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            Obter o consentimento adequado dos pacientes para coleta e tratamento
                            de dados, conforme exigido pela LGPD e pelo Código de Ética Profissional
                            do Psicólogo.
                        </li>
                        <li>
                            Garantir que o uso da plataforma está em conformidade com as normas do
                            CFP e demais regulamentações aplicáveis ao exercício profissional.
                        </li>
                        <li>
                            Manter a confidencialidade e o sigilo profissional em relação às
                            informações clínicas registradas.
                        </li>
                        <li>
                            Estar ciente de que a guarda dos dados dos pacientes é obrigação do
                            profissional imposta pelo conselho profissional (Resolução CFP nº
                            001/2009 — guarda mínima de 5 anos para prontuários). O psy-manager
                            fornece o armazenamento como ferramenta, mas a responsabilidade legal
                            pela guarda é do psicólogo.
                        </li>
                    </ul>
                    <p>
                        O psy-manager não acessa, lê nem processa o conteúdo clínico dos pacientes.
                        Todos os dados sensíveis são armazenados com criptografia AES-256-GCM em
                        repouso, acessíveis apenas pelo psicólogo autenticado.
                    </p>
                </Section>

                <Section title="6. Integração com Google Calendar">
                    <p>
                        A integração com o Google Calendar é opcional. Ao conectar sua conta Google,
                        você autoriza o psy-manager a ler, criar e atualizar eventos de calendário
                        vinculados às suas consultas. O psy-manager não acessa, modifica ou exclui
                        outros eventos ou dados do Google fora do escopo autorizado.
                    </p>
                    <p>
                        O uso das APIs do Google obedece à{" "}
                        <a
                            href="https://developers.google.com/terms/api-services-user-data-policy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-4"
                        >
                            Política de dados do usuário dos Serviços de API do Google
                        </a>
                        , incluindo os requisitos de uso limitado. Dados do Google não são
                        compartilhados com terceiros além dos declarados na Política de Privacidade.
                    </p>
                    <p>
                        Você pode revogar o acesso a qualquer momento em{" "}
                        <a
                            href="https://myaccount.google.com/permissions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-4"
                        >
                            myaccount.google.com/permissions
                        </a>
                        .
                    </p>
                </Section>

                <Section title="7. Disponibilidade e alterações do serviço">
                    <p>
                        Envidamos esforços razoáveis para manter o serviço disponível, mas não
                        garantimos disponibilidade ininterrupta. Podemos modificar, suspender ou
                        descontinuar funcionalidades com aviso prévio razoável, salvo em casos de
                        urgência técnica ou legal.
                    </p>
                    <p>
                        O psy-manager reserva-se o direito de modificar unilateralmente a
                        plataforma, sua configuração, apresentação ou funcionalidades. A
                        continuidade de uso após publicação de alterações confirma a aceitação
                        das novas condições.
                    </p>
                </Section>

                <Section title="8. Propriedade intelectual">
                    <p>
                        Todo o código-fonte, design, marcas e conteúdo do psy-manager são
                        propriedade de seus desenvolvedores. O uso da plataforma não transfere
                        nenhum direito de propriedade intelectual ao usuário.
                    </p>
                    <p>
                        Os dados inseridos por você (perfil, pacientes, documentos) permanecem
                        de sua propriedade. Concedemos a você uma licença limitada, não exclusiva
                        e intransferível para acessá-los por meio da plataforma.
                    </p>
                    <p>
                        São proibidos: engenharia reversa, cópia, plágio, modificação ou
                        redistribuição de qualquer conteúdo da plataforma, sob pena de
                        responsabilização civil e criminal.
                    </p>
                </Section>

                <Section title="9. Isenção e limitação de responsabilidade">
                    <p>O psy-manager não se responsabiliza por:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Condutas, diagnósticos ou qualquer prática clínica do psicólogo.</li>
                        <li>Uso inadequado da plataforma pelo psicólogo.</li>
                        <li>Inserção de informações falsas pelos usuários.</li>
                        <li>Perda de dados causada por força maior ou falha de terceiros.</li>
                        <li>
                            Danos decorrentes de mau uso ou uso em desconformidade com estes Termos.
                        </li>
                        <li>
                            Violações de confidencialidade decorrentes do compartilhamento indevido
                            de credenciais pelo usuário.
                        </li>
                        <li>
                            Eventual indisponibilidade da plataforma não causada diretamente pelo
                            psy-manager.
                        </li>
                    </ul>
                    <p>
                        O psy-manager é fornecido "no estado em que se encontra". Nossa
                        responsabilidade total, em qualquer hipótese, fica limitada ao valor pago
                        pelo serviço nos últimos 12 meses (ou zero, caso o serviço seja gratuito).
                    </p>
                </Section>

                <Section title="10. Rescisão">
                    <p>
                        Você pode encerrar sua conta a qualquer momento em{" "}
                        <strong className="text-foreground">Perfil → Zona de Perigo</strong>.
                        Podemos suspender ou encerrar sua conta em caso de violação destes Termos,
                        com ou sem aviso prévio dependendo da gravidade.
                    </p>
                    <p>
                        Após o encerramento da conta, os dados são removidos conforme a Política de
                        Privacidade, ressalvadas as obrigações legais de retenção (prontuários
                        finalizados — 5 anos; logs de acesso — 6 meses).
                    </p>
                </Section>

                <Section title="11. Alterações destes Termos">
                    <p>
                        Podemos unilateralmente adicionar ou modificar cláusulas. A versão
                        atualizada valerá a partir de sua publicação. Caso a mudança exija
                        consentimento do usuário, apresentaremos a opção de aceitar ou recusar
                        antes de aplicá-la.
                    </p>
                </Section>

                <Section title="12. Lei aplicável e foro">
                    <p>
                        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica
                        eleito o foro da comarca de Curitiba — PR para dirimir quaisquer
                        controvérsias, salvo disposição legal em contrário.
                    </p>
                </Section>

                <Section title="13. Contato">
                    <p>
                        Dúvidas sobre estes Termos:{" "}
                        <a
                            href="mailto:contato@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            contato@psy-manager.com.br
                        </a>
                        .
                    </p>
                    <p>
                        Para assuntos de privacidade e proteção de dados:{" "}
                        <a
                            href="mailto:privacidade@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            privacidade@psy-manager.com.br
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
                        <Link to="/atualizacoes" className="hover:text-foreground transition-colors">
                            Atualizações
                        </Link>
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
