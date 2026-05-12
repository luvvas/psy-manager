import { AggregateRoot } from "../../lib/cqrs";
import type { DomainEvent } from "../../lib/cqrs";

export interface PatientState {
    id: string;
    nome: string;
    email: string;
    telefone: string;
    dataNascimento: Date | null;
    cidade: string;
    cpf: string;
    psychologistId: string;
    valorSessao?: number | string | null;
    modeloCobranca?: string | null;
    
    // Extended Fields
    nomeSocial?: string | null;
    rg?: string | null;
    profissao?: string | null;
    endereco?: string | null;
    cep?: string | null;
    uf?: string | null;
    contatoEmergencia?: string | null;
    respLegalNome?: string | null;
    respLegalParentesco?: string | null;
    respLegalCpf?: string | null;
    respLegalTelefone?: string | null;
    respLegalEmail?: string | null;
    servicoContratadoTipo?: string | null;
    dataInicioAcompanhamento?: Date | null;
    formaPagamento?: string | null;
    formaPagamentoDetalhe?: string | null;
    responsavelFinanceiroTipo?: string | null;
    responsavelFinanceiroDetalhe?: string | null;
    origemContato?: string | null;
    origemContatoDetalhe?: string | null;

    isDeleted: boolean;
    createdAt: Date | null;
    updatedAt: Date | null;
}

export class PatientAggregate extends AggregateRoot<PatientState> {
    public readonly aggregateType = "patient";

    protected getInitialState(): PatientState {
        return {
            id: "",
            nome: "",
            email: "",
            telefone: "",
            dataNascimento: null,
            cidade: "",
            cpf: "",
            psychologistId: "",
            valorSessao: undefined,
            modeloCobranca: undefined,
            nomeSocial: null,
            rg: null,
            profissao: null,
            endereco: null,
            cep: null,
            uf: null,
            contatoEmergencia: null,
            respLegalNome: null,
            respLegalParentesco: null,
            respLegalCpf: null,
            respLegalTelefone: null,
            respLegalEmail: null,
            servicoContratadoTipo: null,
            dataInicioAcompanhamento: null,
            formaPagamento: null,
            formaPagamentoDetalhe: null,
            responsavelFinanceiroTipo: null,
            responsavelFinanceiroDetalhe: null,
            origemContato: null,
            origemContatoDetalhe: null,
            isDeleted: false,
            createdAt: null,
            updatedAt: null,
        };
    }

    /**
     * Creation business logic
     */
    public create(data: {
        id: string;
        nome: string;
        email: string;
        telefone: string;
        dataNascimento: Date;
        cidade: string;
        cpf: string;
        psychologistId: string;
        valorSessao?: number | string | null;
        modeloCobranca?: string | null;
        nomeSocial?: string | null;
        rg?: string | null;
        profissao?: string | null;
        endereco?: string | null;
        cep?: string | null;
        uf?: string | null;
        contatoEmergencia?: string | null;
        respLegalNome?: string | null;
        respLegalParentesco?: string | null;
        respLegalCpf?: string | null;
        respLegalTelefone?: string | null;
        respLegalEmail?: string | null;
        servicoContratadoTipo?: string | null;
        dataInicioAcompanhamento?: Date | null;
        formaPagamento?: string | null;
        formaPagamentoDetalhe?: string | null;
        responsavelFinanceiroTipo?: string | null;
        responsavelFinanceiroDetalhe?: string | null;
        origemContato?: string | null;
        origemContatoDetalhe?: string | null;
    }): void {
        if (this._version > 0) {
            throw new Error("Patient aggregate already initialized");
        }
        if (!data.nome) throw new Error("Patient name is required");
        if (!data.email.includes("@")) throw new Error("Invalid patient email");

        this._id = data.id;
        this.raise("PATIENT_CREATED", data);
    }

    /**
     * Update business logic
     */
    public update(data: {
        nome: string;
        email: string;
        telefone: string;
        dataNascimento: Date;
        cidade: string;
        cpf: string;
        valorSessao?: number | string | null;
        modeloCobranca?: string | null;
        nomeSocial?: string | null;
        rg?: string | null;
        profissao?: string | null;
        endereco?: string | null;
        cep?: string | null;
        uf?: string | null;
        contatoEmergencia?: string | null;
        respLegalNome?: string | null;
        respLegalParentesco?: string | null;
        respLegalCpf?: string | null;
        respLegalTelefone?: string | null;
        respLegalEmail?: string | null;
        servicoContratadoTipo?: string | null;
        dataInicioAcompanhamento?: Date | null;
        formaPagamento?: string | null;
        formaPagamentoDetalhe?: string | null;
        responsavelFinanceiroTipo?: string | null;
        responsavelFinanceiroDetalhe?: string | null;
        origemContato?: string | null;
        origemContatoDetalhe?: string | null;
    }): void {
        if (this._state.isDeleted) {
            throw new Error("Cannot update a deleted patient");
        }
        if (!data.nome) throw new Error("Patient name cannot be empty");

        this.raise("PATIENT_UPDATED", data);
    }

    /**
     * Delete business logic
     */
    public delete(): void {
        if (this._state.isDeleted) {
            throw new Error("Patient is already deleted");
        }
        this.raise("PATIENT_DELETED", {});
    }

    /**
     * Applies state changes corresponding to each event type.
     * This is pure function with no side effects.
     */
    protected applyEvent(state: PatientState, event: DomainEvent): PatientState {
        switch (event.type) {
            case "PATIENT_CREATED":
                return {
                    ...state,
                    id: event.data.id,
                    nome: event.data.nome,
                    email: event.data.email,
                    telefone: event.data.telefone,
                    dataNascimento: new Date(event.data.dataNascimento),
                    cidade: event.data.cidade,
                    cpf: event.data.cpf,
                    psychologistId: event.data.psychologistId,
                    valorSessao: event.data.valorSessao,
                    modeloCobranca: event.data.modeloCobranca,
                    // Extended props expansion
                    nomeSocial: event.data.nomeSocial,
                    rg: event.data.rg,
                    profissao: event.data.profissao,
                    endereco: event.data.endereco,
                    cep: event.data.cep,
                    uf: event.data.uf,
                    contatoEmergencia: event.data.contatoEmergencia,
                    respLegalNome: event.data.respLegalNome,
                    respLegalParentesco: event.data.respLegalParentesco,
                    respLegalCpf: event.data.respLegalCpf,
                    respLegalTelefone: event.data.respLegalTelefone,
                    respLegalEmail: event.data.respLegalEmail,
                    servicoContratadoTipo: event.data.servicoContratadoTipo,
                    dataInicioAcompanhamento: event.data.dataInicioAcompanhamento ? new Date(event.data.dataInicioAcompanhamento) : null,
                    formaPagamento: event.data.formaPagamento,
                    formaPagamentoDetalhe: event.data.formaPagamentoDetalhe,
                    responsavelFinanceiroTipo: event.data.responsavelFinanceiroTipo,
                    responsavelFinanceiroDetalhe: event.data.responsavelFinanceiroDetalhe,
                    origemContato: event.data.origemContato,
                    origemContatoDetalhe: event.data.origemContatoDetalhe,
                    isDeleted: false,
                    createdAt: event.createdAt ?? new Date(),
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "PATIENT_UPDATED":
                return {
                    ...state,
                    nome: event.data.nome,
                    email: event.data.email,
                    telefone: event.data.telefone,
                    dataNascimento: new Date(event.data.dataNascimento),
                    cidade: event.data.cidade,
                    cpf: event.data.cpf,
                    valorSessao: event.data.valorSessao,
                    modeloCobranca: event.data.modeloCobranca,
                    // Extended props update replaying
                    nomeSocial: event.data.nomeSocial,
                    rg: event.data.rg,
                    profissao: event.data.profissao,
                    endereco: event.data.endereco,
                    cep: event.data.cep,
                    uf: event.data.uf,
                    contatoEmergencia: event.data.contatoEmergencia,
                    respLegalNome: event.data.respLegalNome,
                    respLegalParentesco: event.data.respLegalParentesco,
                    respLegalCpf: event.data.respLegalCpf,
                    respLegalTelefone: event.data.respLegalTelefone,
                    respLegalEmail: event.data.respLegalEmail,
                    servicoContratadoTipo: event.data.servicoContratadoTipo,
                    dataInicioAcompanhamento: event.data.dataInicioAcompanhamento ? new Date(event.data.dataInicioAcompanhamento) : null,
                    formaPagamento: event.data.formaPagamento,
                    formaPagamentoDetalhe: event.data.formaPagamentoDetalhe,
                    responsavelFinanceiroTipo: event.data.responsavelFinanceiroTipo,
                    responsavelFinanceiroDetalhe: event.data.responsavelFinanceiroDetalhe,
                    origemContato: event.data.origemContato,
                    origemContatoDetalhe: event.data.origemContatoDetalhe,
                    updatedAt: event.createdAt ?? new Date(),
                };

            case "PATIENT_DELETED":
                return {
                    ...state,
                    isDeleted: true,
                    updatedAt: event.createdAt ?? new Date(),
                };

            default:
                return state;
        }
    }
}
