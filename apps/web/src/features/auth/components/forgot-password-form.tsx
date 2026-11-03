import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { NETWORK_ERROR_MESSAGE, emailSchema } from "../constants";
import { AuthErrorBanner } from "./auth-shell";

const forgotSchema = z.object({
    email: emailSchema,
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

interface ForgotPasswordFormProps {
    onSent: () => void;
}

export function ForgotPasswordForm({ onSent }: ForgotPasswordFormProps) {
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotFormValues>({
        resolver: zodResolver(forgotSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (data: ForgotFormValues) => {
        setError(null);
        try {
            const { error } = await requestPasswordReset({
                email: data.email,
                redirectTo: `${window.location.origin}/redefinir-senha`,
            });
            if (error) {
                setError(error.message || "Erro ao solicitar redefinição de senha.");
                return;
            }
            onSent();
        } catch (err) {
            logger.error("Erro ao solicitar redefinição de senha", err);
            setError(NETWORK_ERROR_MESSAGE);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AuthErrorBanner message={error} />
            <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                    id="forgot-email"
                    type="email"
                    placeholder="psicologo@email.com"
                    disabled={isSubmitting}
                    {...register("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Enviar link de redefinição
            </Button>
        </form>
    );
}
