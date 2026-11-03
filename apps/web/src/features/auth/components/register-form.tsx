import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/query-client";
import { formatCRP, formatPhone } from "@/utils/format";
import { NETWORK_ERROR_MESSAGE, emailSchema, passwordSchema } from "../constants";
import { AuthErrorBanner } from "./auth-shell";

const CONSENT_VERSION = "2025-05";

const registerSchema = z.object({
    name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
    crp: z.string().min(8, "CRP inválido (formato esperado: 00/000000)"),
    phone: z.string().min(14, "Telefone inválido"),
    city: z.string().min(2, "A cidade é obrigatória"),
    email: emailSchema,
    password: passwordSchema,
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { name: "", crp: "", phone: "", city: "", email: "", password: "" },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setError(null);
        try {
            const { error } = await signUp.email({
                ...data,
                consentedAt: new Date().toISOString(),
                consentVersion: CONSENT_VERSION,
            });
            if (error) {
                setError(error.message || "Erro ao criar conta. Verifique os dados.");
                return;
            }
            toast.success("Conta criada com sucesso! Boas-vindas ao psy-manager.");
            queryClient.clear();
            navigate("/inicio", { replace: true });
        } catch (err) {
            logger.error("Erro ao criar conta", err);
            setError(NETWORK_ERROR_MESSAGE);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AuthErrorBanner message={error} />
            <div className="space-y-2">
                <Label htmlFor="reg-name">Nome Completo</Label>
                <Input
                    id="reg-name"
                    placeholder="João Silva"
                    disabled={isSubmitting}
                    {...register("name")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="reg-crp">CRP</Label>
                    <Controller
                        name="crp"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="reg-crp"
                                placeholder="00/000000"
                                inputMode="numeric"
                                disabled={isSubmitting}
                                name={field.name}
                                ref={field.ref}
                                value={field.value}
                                onBlur={field.onBlur}
                                onChange={(e) => field.onChange(formatCRP(e.target.value))}
                            />
                        )}
                    />
                    {errors.crp && <p className="text-xs text-destructive">{errors.crp.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="reg-phone">Celular</Label>
                    <Controller
                        name="phone"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="reg-phone"
                                type="tel"
                                placeholder="(00) 00000-0000"
                                disabled={isSubmitting}
                                name={field.name}
                                ref={field.ref}
                                value={field.value}
                                onBlur={field.onBlur}
                                onChange={(e) => field.onChange(formatPhone(e.target.value))}
                            />
                        )}
                    />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="reg-city">Cidade / Estado</Label>
                <Input
                    id="reg-city"
                    placeholder="Curitiba - PR"
                    disabled={isSubmitting}
                    {...register("city")}
                />
                {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                    id="reg-email"
                    type="email"
                    placeholder="psicologo@email.com"
                    disabled={isSubmitting}
                    {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="reg-password">Senha</Label>
                <Input
                    id="reg-password"
                    type="password"
                    placeholder="********"
                    disabled={isSubmitting}
                    {...register("password")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Ao criar sua conta, você concorda com os{" "}
                <Link
                    to="/termos-de-uso"
                    target="_blank"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                    Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                    to="/politica-de-privacidade"
                    target="_blank"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                    Política de Privacidade
                </Link>
                .
            </p>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Criar Conta
            </Button>
        </form>
    );
}
