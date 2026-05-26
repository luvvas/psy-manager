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
                        Última atualização: maio de 2025
                    </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    Ao criar uma conta ou utilizar o{" "}
                    <strong className="text-foreground">psy-manager</strong>, você concorda com estes
                    Termos de Uso. Leia-os com atenção. Caso não concorde, não utilize a plataforma.
                </p>

                <Section title="1. Descrição do serviço">
                    <p>
                        O psy-manager é uma plataforma de gestão clínica voltada para psicólogos
                        brasileiros, que disponibiliza módulos de agendamento, gestão de pacientes,
                        prontuário eletrônico, financeiro e documentos. O serviço é oferecido via
                        navegador, sem necessidade de instalação.
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
                </Section>

                <Section title="3. Criação e segurança da conta">
                    <p>
                        Você é responsável por manter a confidencialidade de sua senha e por todas as
                        atividades realizadas sob sua conta. Em caso de uso não autorizado, notifique-nos
                        imediatamente em{" "}
                        <a
                            href="mailto:contato@psy-manager.com.br"
                            className="text-primary underline underline-offset-4"
                        >
                            contato@psy-manager.com.br
                        </a>
                        .
                    </p>
                </Section>

                <Section title="4. Uso aceitável">
                    <p>Você concorda em utilizar o psy-manager apenas para fins lícitos e éticos. É vedado:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Inserir dados falsos ou de pacientes sem relação clínica legítima.</li>
                        <li>Utilizar a plataforma para fins não relacionados à prática clínica.</li>
                        <li>Tentar acessar contas de outros psicólogos ou dados que não lhe pertencem.</li>
                        <li>Realizar engenharia reversa, scrapers ou ataques à infraestrutura.</li>
                        <li>Compartilhar credenciais de acesso com terceiros não autorizados.</li>
                    </ul>
                </Section>

                <Section title="5. Dados de pacientes e responsabilidade do psicólogo">
                    <p>
                        O psicólogo é o <strong className="text-foreground">controlador</strong> dos dados
                        pessoais e clínicos de seus pacientes inseridos na plataforma, conforme definido
                        pela LGPD. O psy-manager atua como <strong className="text-foreground">operador</strong>{" "}
                        desses dados, processando-os exclusivamente conforme as instruções do psicólogo e
                        as finalidades da plataforma.
                    </p>
                    <p>
                        O psicólogo é inteiramente responsável por:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>
                            Obter o consentimento adequado dos pacientes para coleta e tratamento de dados,
                            conforme exigido pela LGPD e pelo Código de Ética Profissional do Psicólogo.
                        </li>
                        <li>
                            Garantir que o uso da plataforma está em conformidade com as normas do CFP e
                            demais regulamentações aplicáveis ao exercício profissional.
                        </li>
                        <li>
                            Manter a confidencialidade do sigilo profissional em relação às informações
                            clínicas registradas.
                        </li>
                    </ul>
                </Section>

                <Section title="6. Disponibilidade e alterações do serviço">
                    <p>
                        Envidamos esforços razoáveis para manter o serviço disponível, mas não garantimos
                        disponibilidade ininterrupta. Podemos modificar, suspender ou descontinuar
                        funcionalidades com aviso prévio razoável, salvo em casos de urgência técnica ou
                        legal.
                    </p>
                </Section>

                <Section title="7. Propriedade intelectual">
                    <p>
                        Todo o código-fonte, design, marcas e conteúdo do psy-manager são propriedade de
                        seus desenvolvedores. O uso da plataforma não transfere nenhum direito de
                        propriedade intelectual ao usuário.
                    </p>
                    <p>
                        Os dados inseridos por você (perfil, pacientes, documentos) permanecem de sua
                        propriedade. Concedemos a você uma licença limitada, não exclusiva e intransferível
                        para acessá-los por meio da plataforma.
                    </p>
                </Section>

                <Section title="8. Limitação de responsabilidade">
                    <p>
                        O psy-manager é fornecido "no estado em que se encontra". Não nos
                        responsabilizamos por danos decorrentes de:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Uso inadequado da plataforma pelo psicólogo.</li>
                        <li>Perda de dados causada por força maior ou falha de terceiros.</li>
                        <li>Decisões clínicas baseadas em informações registradas na plataforma.</li>
                        <li>
                            Violações de confidencialidade decorrentes do compartilhamento indevido de
                            credenciais pelo usuário.
                        </li>
                    </ul>
                    <p>
                        Nossa responsabilidade total, em qualquer hipótese, fica limitada ao valor pago
                        pelo serviço nos últimos 12 meses (ou zero, caso o serviço seja gratuito).
                    </p>
                </Section>

                <Section title="9. Rescisão">
                    <p>
                        Você pode encerrar sua conta a qualquer momento em Perfil → Zona de Perigo. Podemos
                        suspender ou encerrar sua conta em caso de violação destes termos, com ou sem
                        aviso prévio dependendo da gravidade.
                    </p>
                </Section>

                <Section title="10. Lei aplicável e foro">
                    <p>
                        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica
                        eleito o foro da comarca de Curitiba – PR para dirimir quaisquer controvérsias,
                        salvo disposição legal em contrário.
                    </p>
                </Section>

                <Section title="11. Contato">
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
