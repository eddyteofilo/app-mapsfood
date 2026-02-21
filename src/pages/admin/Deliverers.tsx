import { useApp } from '@/hooks/use-app';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit2, Trash2, Bike, User, Phone, Mail, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Deliverer } from '@/types';

export default function Deliverers() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Modal State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [delivererToDelete, setDelivererToDelete] = useState<Deliverer | null>(null);
    const [isDeleteSaving, setIsDeleteSaving] = useState(false);

    function openDeleteDialog(deliverer: Deliverer) {
        setDelivererToDelete(deliverer);
        setIsDeleteDialogOpen(true);
    }

    async function handleDeleteConfirm() {
        if (!delivererToDelete) return;
        setIsDeleteSaving(true);
        try {
            // Nota: Precisamos adicionar a action DELETE_DELIVERER no AppContext se não existir
            dispatch({ type: 'DELETE_DELIVERER' as any, payload: delivererToDelete.id });
            toast({ title: 'Entregador excluído!' });
            setIsDeleteDialogOpen(false);
        } catch (err: any) {
            toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
        } finally {
            setIsDeleteSaving(false);
        }
    }

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold">Entregadores</h1>
                    <p className="text-muted-foreground">Gerencie sua equipe de entregas</p>
                </div>
                <button
                    onClick={() => navigate('/admin/deliverers/new')}
                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold shadow-glow hover:opacity-90 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    <span>Cadastrar Entregador</span>
                </button>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nome ou veículo..."
                            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                                <th className="px-6 py-4">Entregador</th>
                                <th className="px-6 py-4">Veículo</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map(deliverer => (
                                <tr key={deliverer.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {deliverer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-foreground">{deliverer.name}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {deliverer.phone}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium flex items-center gap-1.5">
                                                <Bike className="w-4 h-4 text-muted-foreground" />
                                                {deliverer.vehicle}
                                            </p>
                                            {deliverer.vehiclePlate && (
                                                <p className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded w-fit uppercase">
                                                    {deliverer.vehiclePlate}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${deliverer.available
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-yellow-500/10 text-yellow-500'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${deliverer.available ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                            {deliverer.available ? 'Disponível' : 'Ocupado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => navigate(`/admin/deliverers/${deliverer.id}/edit`)}
                                                className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openDeleteDialog(deliverer)}
                                                className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum entregador encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border shadow-2xl rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-xl font-bold text-destructive">
                            Excluir Entregador?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Tem certeza que deseja excluir o entregador <span className="text-foreground font-semibold">"{delivererToDelete?.name}"</span>?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl bg-muted border-none hover:bg-muted/80">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isDeleteSaving}
                            className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg px-6"
                        >
                            {isDeleteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
