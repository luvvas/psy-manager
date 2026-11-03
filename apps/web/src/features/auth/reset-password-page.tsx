import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { toast } from "sonner";

import { CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { AuthErrorBanner, AuthShell } from "./components/auth-shell";
import { NETWORK_ERROR_MESSAGE, passwordSchema } from "./constants";

const schema = z
    .object({
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, "Confirme sua senha"),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        message: "As senhas não coincidem",
        path: ["confirmPassword"],
    });

type FormValues = z.infer<typeof schema>;

function LoginLinkButton({ variant }: { variant?: "default" | "outline" }) {
    return (
        <Button asChild variant={variant} className="w-full">
            <Link to="/login">Ir para o login</Link>
        </Button>
    );
}

function ResetPasswordForm({ token, onDone }: { token: string; onDone: () => void }) {
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    const onSubmit = async (data: FormValues) => {
        setError(null);
        try {
            const { error } = await resetPassword({ newPassword: data.newPassword, token });
            if (error) {
                setError(error.message || "Link inválido ou expirado. Solicite um novo link.");
                return;
            }
            toast.success("Senha redefinida com sucesso!");
            onDone();
        } catch (err) {
            logger.error("Erro ao redefinir senha", err);
            setError(NETWORK_ERROR_MESSAGE);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AuthErrorBanner message={error} />
            <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                    id="new-password"
                    type="password"
                    disabled={isSubmitting}
                    {...register("newPassword")}
                />
                {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                    id="confirm-password"
                    type="password"
                    disabled={isSubmitting}
                    {...register("confirmPassword")}
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Redefinir senha
            </Button>
        </form>
    );
}

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const [done, setDone] = useState(false);

    if (!token) {
        return (
            <AuthShell>
                <CardHeader className="pb-4">
                    <h2 className="text-lg font-semibold">Link inválido</h2>
                    <p className="text-sm text-muted-foreground">
                        Este link de redefinição é inválido ou expirou. Solicite um novo link na tela de login.
                    </p>
                </CardHeader>
                <CardContent>
                    <LoginLinkButton variant="outline" />
                </CardContent>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">Redefinir senha</h2>
                <p className="text-sm text-muted-foreground">
                    {done ? "Sua senha foi redefinida com sucesso." : "Escolha uma nova senha para sua conta."}
                </p>
            </CardHeader>
            <CardContent>
                {done ? <LoginLinkButton /> : <ResetPasswordForm token={token} onDone={() => setDone(true)} />}
            </CardContent>
        </AuthShell>
    );
}
