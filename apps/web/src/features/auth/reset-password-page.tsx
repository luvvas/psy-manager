import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { toast } from "sonner";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/auth-client";

const schema = z
    .object({
        newPassword: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
        confirmPassword: z.string().min(1, "Confirme sua senha"),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        message: "As senhas não coincidem",
        path: ["confirmPassword"],
    });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    const onSubmit = async (data: FormValues) => {
        if (!token) {
            toast.error("Link inválido ou expirado. Solicite um novo link de redefinição.");
            return;
        }

        setIsLoading(true);

        const { error } = await resetPassword({ newPassword: data.newPassword, token });

        setIsLoading(false);

        if (error) {
            toast.error(error.message || "Link inválido ou expirado. Solicite um novo link.");
        } else {
            setDone(true);
            toast.success("Senha redefinida com sucesso!");
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="mb-8 flex items-center gap-2">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Brain className="size-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">psy-manager</h1>
            </div>

            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
                <CardHeader className="pb-4">
                    <h2 className="text-lg font-semibold">Redefinir senha</h2>
                    {done ? (
                        <p className="text-sm text-muted-foreground">
                            Sua senha foi redefinida com sucesso.
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Escolha uma nova senha para sua conta.
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    {done ? (
                        <Button className="w-full" onClick={() => navigate("/login")}>
                            Ir para o login
                        </Button>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">Nova senha</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    disabled={isLoading}
                                    {...register("newPassword")}
                                />
                                {errors.newPassword && (
                                    <p className="text-xs text-destructive">{errors.newPassword.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    disabled={isLoading}
                                    {...register("confirmPassword")}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                                )}
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Redefinir senha
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
