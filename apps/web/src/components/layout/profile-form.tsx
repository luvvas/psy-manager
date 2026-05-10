import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const profileSchema = z.object({
    name: z.string().min(3, "Nome completo é obrigatório"),
    phone: z.string().optional().nullable(),
    crp: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
});

type ProfileValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    onSuccess?: () => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const utils = trpc.useContext();

    // Fetch current psychologist info
    const { data: profile, isLoading } = trpc.psychologist.me.useQuery();

    const updateMutation = trpc.psychologist.updateProfile.useMutation({
        onSuccess: () => {
            toast.success("Perfil atualizado com sucesso!");
            utils.psychologist.me.invalidate();
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar perfil: ${err.message}`);
        }
    });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: "",
            phone: "",
            crp: "",
            city: "",
        },
    });

    useEffect(() => {
        if (profile) {
            reset({
                name: profile.name || "",
                phone: profile.phone || "",
                crp: profile.crp || "",
                city: profile.city || "",
            });
        }
    }, [profile, reset]);

    const onSubmit = async (data: ProfileValues) => {
        setIsSubmitting(true);
        try {
            await updateMutation.mutateAsync({
                name: data.name,
                phone: data.phone || undefined,
                crp: data.crp || undefined,
                city: data.city || undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" {...register("name")} placeholder="Ex: Dr. João Silva" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="crp">CRP</Label>
                <Input id="crp" {...register("crp")} placeholder="Ex: 08/12345" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" {...register("phone")} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" {...register("city")} placeholder="Sua Cidade" />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>
        </form>
    );
}
