import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { queryClient } from "@/lib/query-client";
import { useRedirectAfterLogin } from "../use-redirect-after-login";
import { NETWORK_ERROR_MESSAGE, emailSchema, passwordSchema } from "../constants";
import { AuthErrorBanner } from "./auth-shell";

const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
    onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
    const navigate = useNavigate();
    const redirectTo = useRedirectAfterLogin();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setError(null);
        try {
            const { error, data: sessionData } = await signIn.email({
                email: data.email,
                password: data.password,
            });
            if (error) {
                setError(error.message || "Email ou senha incorretos. Tente novamente.");
                return;
            }
            toast.success(`Boas-vindas de volta, Dr(a). ${sessionData?.user?.name || ""}!`);
            queryClient.clear();
            navigate(redirectTo, { replace: true });
        } catch (err) {
            logger.error("Erro ao entrar", err);
            setError(NETWORK_ERROR_MESSAGE);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AuthErrorBanner message={error} />
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="psicologo@email.com"
                    disabled={isSubmitting}
                    {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Esqueci minha senha
                    </button>
                </div>
                <Input
                    id="password"
                    type="password"
                    disabled={isSubmitting}
                    {...register("password")}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Entrar
            </Button>
        </form>
    );
}
