import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Activity, CreditCard, Plus, MapPin, Users, FileSignature } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PatientTimeline } from "@/features/pacientes/components/patient-timeline";
import { AppSheet } from "@/components/layout/app-sheet";
import { DocumentForm } from "@/features/documentos/components/document-form";
import { toast } from "sonner";

export function PatientDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isSheetOpen, setSheetOpen] = useState(false);

    // Using useUtils instead of useContext as confirmed across typical v10 usages or standard TRPC patterns in codebase
    const utils = trpc.useUtils();

    const { data: patient, isLoading } = trpc.patient.getById.useQuery(
        { id: id! },
        { enabled: !!id, retry: false }
    );

    const createMutation = trpc.clinicalRecord.create.useMutation({
        onSuccess: () => {
            toast.success("Registro criado com sucesso!");
            // Invalidate specific patient timeline
            utils.clinicalRecord.list.invalidate({ patientId: id });
            setSheetOpen(false);
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        },
    });

    const handleSave = async (data: any) => {
        await createMutation.mutateAsync({
            ...data,
        });
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-6">
                <Skeleton className="h-12 w-64 mb-6" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-semibold mb-2">Paciente não encontrado</h2>
                <p className="text-muted-foreground mb-4">O paciente que você está procurando não existe ou foi removido.</p>
                <Button onClick={() => navigate("/pacientes")}>Voltar para Pacientes</Button>
            </div>
        );
    }

    const formPatients = [{ id: patient.id, nome: patient.nome }];

    return (
        <div className="flex flex-col flex-1 h-full">
            <AppHeader
                title={patient.nome}
                description="Visão detalhada do paciente e prontuários"
                icon={User}
                actions={
                    <Button variant="outline" size="sm" onClick={() => navigate("/pacientes")} className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                }
            />

            <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
                <Tabs defaultValue="prontuario" className="flex-1 flex flex-col">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                        <TabsList className="grid w-full max-w-xl grid-cols-3">
                            <TabsTrigger value="geral" className="gap-2">
                                <User className="w-4 h-4" /> Visão Geral
                            </TabsTrigger>
                            <TabsTrigger value="prontuario" className="gap-2">
                                <Activity className="w-4 h-4" /> Prontuário
                            </TabsTrigger>
                            <TabsTrigger value="financeiro" className="gap-2">
                                <CreditCard className="w-4 h-4" /> Financeiro
                            </TabsTrigger>
                        </TabsList>

                        <Button onClick={() => setSheetOpen(true)} className="gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Novo Prontuário
                        </Button>
                    </div>

                    <TabsContent value="geral" className="flex-1 mt-0 overflow-y-auto pr-2">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* 1. Identidade */}
                            <Card className="shadow-none border-border bg-card">
                                <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b py-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base font-semibold">Identidade</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-5 grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground font-medium">Nome Completo</p>
                                        <p className="font-medium mt-0.5 text-foreground">{patient.nome}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground font-medium">Nome Social</p>
                                        <p className="font-medium mt-0.5">{patient.nomeSocial || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">CPF</p>
                                        <p className="font-medium mt-0.5">{patient.cpf}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">RG</p>
                                        <p className="font-medium mt-0.5">{patient.rg || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Data de Nascimento</p>
                                        <p className="font-medium mt-0.5">{format(new Date(patient.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Profissão</p>
                                        <p className="font-medium mt-0.5">{patient.profissao || "—"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 2. Contato */}
                            <Card className="shadow-none border-border bg-card">
                                <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b py-3">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base font-semibold">Contato</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-5 grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground font-medium">E-mail</p>
                                        <p className="font-medium mt-0.5">{patient.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Telefone / WhatsApp</p>
                                        <p className="font-medium mt-0.5">{patient.telefone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">CEP</p>
                                        <p className="font-medium mt-0.5">{patient.cep || "—"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground font-medium">Endereço Residencial</p>
                                        <p className="font-medium mt-0.5">{patient.endereco || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Cidade</p>
                                        <p className="font-medium mt-0.5">{patient.cidade}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">UF</p>
                                        <p className="font-medium mt-0.5">{patient.uf?.toUpperCase() || "—"}</p>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-dashed">
                                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">Contato de Emergência</p>
                                        <p className="font-semibold mt-0.5 text-orange-900 dark:text-orange-100">{patient.contatoEmergencia || "—"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 3. Resp. Legal */}
                            <Card className="shadow-none border-border bg-card">
                                <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b py-3">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base font-semibold">Resp. Legal</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-5 grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground font-medium">Nome Completo do Responsável</p>
                                        <p className="font-medium mt-0.5">{patient.respLegalNome || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Grau de Parentesco</p>
                                        <p className="font-medium mt-0.5">{patient.respLegalParentesco || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">CPF</p>
                                        <p className="font-medium mt-0.5">{patient.respLegalCpf || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Telefone</p>
                                        <p className="font-medium mt-0.5">{patient.respLegalTelefone || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">E-mail</p>
                                        <p className="font-medium mt-0.5">{patient.respLegalEmail || "—"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 4. Contrato */}
                            <Card className="shadow-none border-border bg-card">
                                <CardHeader className="pb-3 flex flex-row items-center gap-2 border-b py-3">
                                    <FileSignature className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base font-semibold">Contrato</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-5 grid grid-cols-2 gap-y-5 gap-x-4 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Tipo de Serviço</p>
                                        <p className="font-medium capitalize mt-0.5">{patient.servicoContratadoTipo || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Início do Acompanhamento</p>
                                        <p className="font-medium mt-0.5">
                                            {patient.dataInicioAcompanhamento
                                                ? format(new Date(patient.dataInicioAcompanhamento), "dd/MM/yyyy", { locale: ptBR })
                                                : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Valor Base da Sessão</p>
                                        <p className="font-medium mt-0.5">
                                            {patient.valorSessao ? `R$ ${Number(patient.valorSessao).toFixed(2)}` : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Forma de Pagamento</p>
                                        <p className="font-medium capitalize mt-0.5">{patient.formaPagamento || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Responsável Financeiro</p>
                                        <p className="font-medium capitalize mt-0.5">{patient.responsavelFinanceiroTipo || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Origem</p>
                                        <p className="font-medium capitalize mt-0.5">{patient.origemContato || "—"}</p>
                                    </div>
                                    {patient.responsavelFinanceiroDetalhe && (
                                        <div className="col-span-2 pt-2 border-t border-dashed">
                                            <p className="text-xs text-muted-foreground font-medium">Detalhes do Financeiro</p>
                                            <p className="font-medium mt-0.5">{patient.responsavelFinanceiroDetalhe}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="prontuario" className="flex-1 mt-0 h-full overflow-hidden">
                        <PatientTimeline patientId={patient.id} />
                    </TabsContent>

                    <TabsContent value="financeiro" className="flex-1 mt-0">
                        <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed bg-muted/10">
                            <div className="text-center">
                                <CreditCard className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                                <h3 className="font-medium">Gestão Financeira</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Em breve você poderá gerenciar as faturas e recebimentos específicos deste paciente aqui.
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Lifted Slide-over Form from timeline for cleaner page structure and visibility */}
            <AppSheet
                open={isSheetOpen}
                onOpenChange={setSheetOpen}
                title="Novo Registro Clínico"
            >
                <DocumentForm
                    onSave={handleSave}
                    onCancel={() => setSheetOpen(false)}
                    patients={formPatients}
                    initialData={{
                        title: "",
                        category: "evolucao",
                        patientId: id!,
                    }}
                />
            </AppSheet>
        </div>
    );
}
