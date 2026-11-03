import * as z from "zod/v3";

export const NETWORK_ERROR_MESSAGE = "Não foi possível conectar. Verifique sua internet e tente novamente.";

export const emailSchema = z.string().min(1, "O email é obrigatório").email("Formato de email inválido");

export const passwordSchema = z.string().min(6, "A senha deve ter pelo menos 6 caracteres");
