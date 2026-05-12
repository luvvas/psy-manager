import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, MapPin, Users, FileSignature } from "lucide-react";
import { formatCPF, formatPhone, formatCEP, formatRG } from "@/utils/format";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/date-picker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const patientSchema = z.object({
    // Base Obrigatória
    nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    email: z.string().min(1, "O e-mail é obrigatório").email("Formato de e-mail inválido"),
    telefone: z.string().min(10, "Telefone inválido"),
    dataNascimento: z.date({ required_error: "A data de nascimento é obrigatória" }),
    cidade: z.string().min(2, "A cidade é obrigatória"),
    cpf: z.string().min(11, "CPF inválido"),

    // Extensão Identidade
    nomeSocial: z.string().optional().nullable(),
    rg: z.string().optional().nullable(),
    profissao: z.string().optional().nullable(),

    // Extensão Localização
    endereco: z.string().optional().nullable(),
    cep: z.string().optional().nullable(),
    uf: z.string().optional().nullable(),
    contatoEmergencia: z.string().optional().nullable(),

    // Extensão Responsável Legal
    respLegalNome: z.string().optional().nullable(),
    respLegalParentesco: z.string().optional().nullable(),
    respLegalCpf: z.string().optional().nullable(),
    respLegalTelefone: z.string().optional().nullable(),
    respLegalEmail: z.string().optional().nullable(),

    // Extensão Contrato / Financeiro
    valorSessao: z.string().or(z.number()).optional().nullable(),
    modeloCobranca: z.string().optional().nullable(),
    servicoContratadoTipo: z.string().optional().nullable(),
    dataInicioAcompanhamento: z.date().optional().nullable(),
    formaPagamento: z.string().optional().nullable(),
    formaPagamentoDetalhe: z.string().optional().nullable(),
    responsavelFinanceiroTipo: z.string().optional().nullable(),
    responsavelFinanceiroDetalhe: z.string().optional().nullable(),
    origemContato: z.string().optional().nullable(),
    origemContatoDetalhe: z.string().optional().nullable(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;

interface NewPatientFormProps {
    onSave: (patient: PatientFormValues) => Promise<void>;
    onCancel: () => void;
    initialData?: any;
}

export function NewPatientForm({ onSave, onCancel, initialData }: NewPatientFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors },
    } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            nome: initialData?.nome || "",
            email: initialData?.email || "",
            telefone: initialData?.telefone || "",
            dataNascimento: initialData?.dataNascimento ? new Date(initialData.dataNascimento) : undefined,
            cidade: initialData?.cidade || "",
            cpf: initialData?.cpf || "",

            nomeSocial: initialData?.nomeSocial || "",
            rg: initialData?.rg || "",
            profissao: initialData?.profissao || "",

            endereco: initialData?.endereco || "",
            cep: initialData?.cep || "",
            uf: initialData?.uf || "",
            contatoEmergencia: initialData?.contatoEmergencia || "",

            respLegalNome: initialData?.respLegalNome || "",
            respLegalParentesco: initialData?.respLegalParentesco || "",
            respLegalCpf: initialData?.respLegalCpf || "",
            respLegalTelefone: initialData?.respLegalTelefone || "",
            respLegalEmail: initialData?.respLegalEmail || "",

            valorSessao: initialData?.valorSessao || "",
            modeloCobranca: initialData?.modeloCobranca || "sessao_avulsa",
            servicoContratadoTipo: initialData?.servicoContratadoTipo || "online",
            dataInicioAcompanhamento: initialData?.dataInicioAcompanhamento ? new Date(initialData.dataInicioAcompanhamento) : null,
            formaPagamento: initialData?.formaPagamento || "pix",
            formaPagamentoDetalhe: initialData?.formaPagamentoDetalhe || "",
            responsavelFinanceiroTipo: initialData?.responsavelFinanceiroTipo || "paciente",
            responsavelFinanceiroDetalhe: initialData?.responsavelFinanceiroDetalhe || "",
            origemContato: initialData?.origemContato || "outro",
            origemContatoDetalhe: initialData?.origemContatoDetalhe || "",
        },
    });

    const cpfWatch = watch("cpf");
    const rgWatch = watch("rg");
    const telefoneWatch = watch("telefone");
    const cepWatch = watch("cep");
    const respCpfWatch = watch("respLegalCpf");
    const respTelefoneWatch = watch("respLegalTelefone");

    const onSubmitForm = async (data: PatientFormValues) => {
        setIsSubmitting(true);
        try {
            const submissionData = {
                ...data,
                valorSessao: data.valorSessao === "" ? null : data.valorSessao,
            };
            await onSave(submissionData);
        } catch (error) {
            console.error("Erro ao salvar paciente", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmitForm)} className="flex flex-col h-full">
            <Tabs defaultValue="identidade" className="flex-1 flex flex-col w-full space-y-4">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50">
                    <TabsTrigger value="identidade" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <User className="h-4 w-4" /> Identidade
                    </TabsTrigger>
                    <TabsTrigger value="local" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <MapPin className="h-4 w-4" /> Contato
                    </TabsTrigger>
                    <TabsTrigger value="responsavel" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <Users className="h-4 w-4" /> Resp. Legal
                    </TabsTrigger>
                    <TabsTrigger value="contrato" className="flex-col gap-1 py-2 text-[10px] xs:text-xs">
                        <FileSignature className="h-4 w-4" /> Contrato
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Identidade */}
                <TabsContent value="identidade" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="nome">Nome Completo *</Label>
                        <Input id="nome" disabled={isSubmitting} placeholder="Ex: João da Silva" {...register("nome")} />
                        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="nomeSocial">Nome Social (se houver)</Label>
                        <Input id="nomeSocial" disabled={isSubmitting} placeholder="Como prefere ser chamado" {...register("nomeSocial")} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                            <Controller
                                name="dataNascimento"
                                control={control}
                                render={({ field }) => <DatePicker date={field.value as any} setDate={field.onChange} />}
                            />
                            {errors.dataNascimento && <p className="text-xs text-destructive">{errors.dataNascimento.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="profissao">Profissão/Ocupação</Label>
                            <Input id="profissao" disabled={isSubmitting} placeholder="Ex: Estudante" {...register("profissao")} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="cpf">CPF *</Label>
                            <Input
                                id="cpf"
                                placeholder="000.000.000-00"
                                value={cpfWatch}
                                onChange={(e) => setValue("cpf", formatCPF(e.target.value), { shouldValidate: true })}
                            />
                            {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="rg">RG</Label>
                            <Input 
                                id="rg" 
                                placeholder="00.000.000-0" 
                                value={rgWatch || ""}
                                onChange={(e) => setValue("rg", formatRG(e.target.value))}
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: Local & Contato */}
                <TabsContent value="local" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">E-mail *</Label>
                            <Input id="email" type="email" placeholder="paciente@email.com" {...register("email")} />
                            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="telefone">Telefone/WhatsApp *</Label>
                            <Input 
                                id="telefone" 
                                placeholder="(00) 00000-0000" 
                                value={telefoneWatch}
                                onChange={(e) => setValue("telefone", formatPhone(e.target.value), { shouldValidate: true })}
                            />
                            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-1.5 mt-4 border-t pt-4">
                        <Label htmlFor="endereco">Endereço Residencial</Label>
                        <Input id="endereco" placeholder="Rua, número, complemento" {...register("endereco")} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="cidade">Cidade *</Label>
                            <Input id="cidade" placeholder="Nome da cidade" {...register("cidade")} />
                            {errors.cidade && <p className="text-xs text-destructive">{errors.cidade.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="uf">UF</Label>
                            <Input id="uf" maxLength={2} placeholder="EX: SP" className="uppercase" {...register("uf")} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="cep">CEP</Label>
                        <Input 
                            id="cep" 
                            placeholder="00000-000" 
                            value={cepWatch || ""}
                            onChange={(e) => setValue("cep", formatCEP(e.target.value))}
                        />
                    </div>

                    <div className="space-y-1.5 mt-4 border-t pt-4">
                        <Label htmlFor="contatoEmergencia" className="text-amber-700 dark:text-amber-500">Contato de Emergência</Label>
                        <Input id="contatoEmergencia" placeholder="Nome e Telefone do familiar" {...register("contatoEmergencia")} />
                    </div>
                </TabsContent>

                {/* TAB 3: Responsável Legal */}
                <TabsContent value="responsavel" className="flex-1 space-y-4 overflow-y-auto px-1 pt-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="respLegalNome">Nome Completo do Responsável</Label>
                        <Input id="respLegalNome" {...register("respLegalNome")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="respLegalParentesco">Grau de Parentesco</Label>
                        <Input id="respLegalParentesco" placeholder="Ex: Pai, Mãe, Tutor" {...register("respLegalParentesco")} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="respLegalCpf">CPF do Responsável</Label>
                        <Input
                            id="respLegalCpf"
                            value={respCpfWatch || ""}
                            onChange={(e) => setValue("respLegalCpf", formatCPF(e.target.value))}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="respLegalTelefone">Telefone Responsável</Label>
                            <Input 
                                id="respLegalTelefone" 
                                value={respTelefoneWatch || ""}
                                onChange={(e) => setValue("respLegalTelefone", formatPhone(e.target.value))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="respLegalEmail">E-mail Responsável</Label>
                            <Input id="respLegalEmail" type="email" {...register("respLegalEmail")} />
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 4: Contrato & Financeiro */}
                <TabsContent value="contrato" className="flex-1 space-y-4 overflow-y-auto px-1 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Tipo de Serviço</Label>
                            <Controller
                                name="servicoContratadoTipo"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value || ""} onValueChange={field.onChange}>
                                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="presencial">Presencial</SelectItem>
                                            <SelectItem value="online">On-line</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Início do Acompanhamento</Label>
                            <Controller
                                name="dataInicioAcompanhamento"
                                control={control}
                                render={({ field }) => <DatePicker date={field.value as any} setDate={field.onChange} />}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5 mt-2 border-t pt-4">
                        <Label htmlFor="valorSessao" className="font-semibold">Valor Base da Sessão (R$)</Label>
                        <Input id="valorSessao" type="number" step="0.01" placeholder="0.00" {...register("valorSessao")} />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Forma de Pagamento Principal</Label>
                        <Controller
                            name="formaPagamento"
                            control={control}
                            render={({ field }) => (
                                <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pix">PIX</SelectItem>
                                        <SelectItem value="cartao">Cartão</SelectItem>
                                        <SelectItem value="transferencia">Transferência / Boleto</SelectItem>
                                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Responsável Financeiro</Label>
                        <Controller
                            name="responsavelFinanceiroTipo"
                            control={control}
                            render={({ field }) => (
                                <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="paciente">A própria pessoa atendida</SelectItem>
                                        <SelectItem value="responsavel">Responsável Legal</SelectItem>
                                        <SelectItem value="outro">Terceiro / Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    {watch("responsavelFinanceiroTipo") === "outro" && (
                        <div className="bg-muted/30 p-3 rounded border animate-in slide-in-from-top-2">
                            <Label htmlFor="responsavelFinanceiroDetalhe" className="text-xs font-medium">Dados Financeiros do Terceiro</Label>
                            <Input
                                id="responsavelFinanceiroDetalhe"
                                className="mt-1.5"
                                placeholder="Insira Nome, CPF e Contato"
                                {...register("responsavelFinanceiroDetalhe")}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5 mt-2 border-t pt-4">
                        <Label>Origem (Como nos conheceu?)</Label>
                        <Controller
                            name="origemContato"
                            control={control}
                            render={({ field }) => (
                                <Select value={field.value || ""} onValueChange={field.onChange}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="indicacao">Indicação</SelectItem>
                                        <SelectItem value="redes">Redes Sociais</SelectItem>
                                        <SelectItem value="encaminhamento">Encaminhamento Médico/Profissional</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    {watch("origemContato") === "outro" && (
                        <Input placeholder="Detalhe a origem..." {...register("origemContatoDetalhe")} />
                    )}
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4 w-full bg-background z-10">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="px-6">
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Salvar Cadastro
                </Button>
            </div>
        </form>
    );
}

