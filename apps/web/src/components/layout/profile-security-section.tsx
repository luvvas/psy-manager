import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { signOutAndReset } from "@/lib/session";
import { trpc } from "@/lib/trpc";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function ProfileSecuritySection() {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const navigate = useNavigate();

    const { refetch: fetchExport, isFetching: isExporting } = trpc.psychologist.exportData.useQuery(undefined, {
        enabled: false,
    });

    const deleteAccountMutation = trpc.psychologist.deleteAccount.useMutation({
        onSuccess: async () => {
            await signOutAndReset();
            navigate("/", { replace: true });
        },
        onError: (err) => {
            toast.error(`Erro ao excluir conta: ${err.message}`);
        },
    });
    const isDeletingAccount = deleteAccountMutation.isPending;

    const handleExport = async () => {
        const { data, error } = await fetchExport();
        if (error || !data) {
            toast.error("Erro ao exportar dados. Tente novamente.");
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `psy-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        toast.success("Dados exportados com sucesso!");
    };

    return (
        <>
            <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Exportar meus dados</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Baixe uma cópia de todos os seus dados em formato JSON. O arquivo inclui
                    pacientes, prontuários, documentos, transações e agendamentos.
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                >
                    {isExporting
                        ? <Loader2 className="mr-2 size-4 animate-spin" />
                        : <Download className="mr-2 size-4" />}
                    {isExporting ? "Exportando..." : "Exportar meus dados"}
                </Button>
            </div>

            <div className="border border-destructive/40 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                    <TriangleAlert className="size-4 shrink-0" />
                    <span className="text-sm font-semibold">Zona de Perigo</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    A exclusão da sua conta é permanente e não pode ser desfeita. Todos os seus dados
                    serão removidos: pacientes, prontuários, documentos, transações financeiras e
                    agendamentos.
                </p>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button type="button" variant="destructive" size="sm">
                            Excluir minha conta
                        </Button>
                    </DialogTrigger>
                    <DialogContent showCloseButton={!isDeletingAccount}>
                        <DialogHeader>
                            <DialogTitle>Excluir conta permanentemente?</DialogTitle>
                            <DialogDescription>
                                Esta ação não pode ser desfeita. Os seguintes dados serão removidos
                                definitivamente:
                            </DialogDescription>
                        </DialogHeader>
                        <ul className="text-sm text-muted-foreground space-y-1 pl-4 list-disc">
                            <li>Sua conta e dados de perfil</li>
                            <li>Todos os pacientes cadastrados</li>
                            <li>Prontuários e registros clínicos</li>
                            <li>Documentos e arquivos</li>
                            <li>Transações financeiras</li>
                            <li>Agendamentos e sessões de vídeo</li>
                        </ul>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                                disabled={isDeletingAccount}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => deleteAccountMutation.mutate()}
                                disabled={isDeletingAccount}
                            >
                                {isDeletingAccount && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Excluir permanentemente
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
