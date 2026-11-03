import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, DoorOpen, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Room {
    id: string;
    name: string;
}

interface ClinicRoomsProps {
    clinicId: string;
    rooms: Room[];
}

export function ClinicRooms({ clinicId, rooms }: ClinicRoomsProps) {
    const utils = trpc.useUtils();
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    const refresh = () => {
        utils.clinic.list.invalidate();
        utils.appointment.freeSlots.invalidate();
    };

    const addRoom = trpc.clinic.addRoom.useMutation({
        onSuccess: () => {
            setNewName("");
            refresh();
        },
        onError: (err) => toast.error(err.message),
    });
    const renameRoom = trpc.clinic.renameRoom.useMutation({
        onSuccess: () => {
            setEditingId(null);
            refresh();
        },
        onError: (err) => toast.error(err.message),
    });
    const removeRoom = trpc.clinic.removeRoom.useMutation({
        onSuccess: () => {
            toast.success("Sala removida.");
            refresh();
        },
        onError: (err) => toast.error(err.message),
    });

    function handleAdd() {
        const name = newName.trim();
        if (!name) return;
        if (rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
            toast.error("Já existe uma sala com esse nome.");
            return;
        }
        addRoom.mutate({ clinicId, name });
    }

    return (
        <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
                Cadastre as salas de atendimento. Nas sessões presenciais, cada psicóloga escolhe a sala, e o
                sistema não deixa duas sessões na mesma sala no mesmo horário.
            </p>

            <div className="flex gap-2">
                <Input
                    placeholder="Ex.: Sala 1, Sala Azul, Ludoterapia"
                    value={newName}
                    maxLength={60}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                    disabled={addRoom.isPending}
                />
                <Button
                    type="button"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={handleAdd}
                    disabled={addRoom.isPending || !newName.trim()}
                >
                    {addRoom.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Adicionar
                </Button>
            </div>

            <div className="divide-y rounded-lg border bg-muted/20">
                {rooms.map((room) => (
                    <div key={room.id} className="flex items-center gap-2 p-3 text-sm">
                        <DoorOpen className="size-4 shrink-0 text-muted-foreground" />
                        {editingId === room.id ? (
                            <>
                                <Input
                                    autoFocus
                                    className="h-8"
                                    value={editingName}
                                    maxLength={60}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            if (editingName.trim()) renameRoom.mutate({ roomId: room.id, name: editingName.trim() });
                                        }
                                        if (e.key === "Escape") setEditingId(null);
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    title="Salvar nome"
                                    disabled={renameRoom.isPending || !editingName.trim()}
                                    onClick={() => renameRoom.mutate({ roomId: room.id, name: editingName.trim() })}
                                >
                                    <Check className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    title="Cancelar"
                                    onClick={() => setEditingId(null)}
                                >
                                    <X className="size-4" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <span className="flex-1 font-medium">{room.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground"
                                    title="Renomear sala"
                                    onClick={() => {
                                        setEditingId(room.id);
                                        setEditingName(room.name);
                                    }}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-destructive hover:bg-destructive/10"
                                    title="Remover sala"
                                    disabled={removeRoom.isPending}
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                `Remover a ${room.name}? As sessões já marcadas nela continuam na agenda, mas ela não poderá mais ser escolhida.`
                                            )
                                        ) {
                                            removeRoom.mutate({ roomId: room.id });
                                        }
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </>
                        )}
                    </div>
                ))}
                {rooms.length === 0 && (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                        Nenhuma sala cadastrada. Sem salas, as sessões presenciais na clínica não são controladas por sala.
                    </p>
                )}
            </div>
        </div>
    );
}
