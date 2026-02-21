import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { Tag, Plus, Edit, Trash2, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Categories() {
    const { state, dispatch } = useApp();
    const { categories } = state;
    const { toast } = useToast();
    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Edit Modal State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<any>(null);
    const [editValue, setEditValue] = useState('');
    const [isEditSaving, setIsEditSaving] = useState(false);

    // Delete Modal State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [catToDelete, setCatToDelete] = useState<any>(null);
    const [isDeleteSaving, setIsDeleteSaving] = useState(false);

    const { sendWebhook } = useApp() as any;

    async function addCategory() {
        if (!newName.trim()) return;
        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('categories')
                .insert([{ name: newName.trim() }])
                .select()
                .single();

            if (error) throw error;

            dispatch({
                type: 'ADD_CATEGORY',
                payload: data
            });

            if (sendWebhook) sendWebhook({ name: data.name, id: data.id, items: [] } as any, 'category_created');
            setNewName('');
            toast({ title: 'Categoria adicionada com sucesso!' });
        } catch (error: any) {
            toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    function openEditDialog(cat: any) {
        setEditingCat(cat);
        setEditValue(cat.name);
        setIsEditDialogOpen(true);
    }

    async function handleEdit() {
        if (!editValue.trim() || !editingCat) return;
        setIsEditSaving(true);
        try {
            const { error } = await supabase
                .from('categories')
                .update({ name: editValue.trim() })
                .eq('id', editingCat.id);

            if (error) throw error;

            const updated = { ...editingCat, name: editValue.trim() };
            dispatch({ type: 'UPDATE_CATEGORY', payload: updated });

            if (sendWebhook) sendWebhook({ name: updated.name, id: updated.id, items: [] } as any, 'category_updated');
            toast({ title: 'Categoria atualizada!' });
            setIsEditDialogOpen(false);
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        } finally {
            setIsEditSaving(false);
        }
    }

    function openDeleteDialog(cat: any) {
        setCatToDelete(cat);
        setIsDeleteDialogOpen(true);
    }

    async function handleDelete() {
        if (!catToDelete) return;
        setIsDeleteSaving(true);
        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', catToDelete.id);

            if (error) throw error;

            dispatch({ type: 'DELETE_CATEGORY', payload: catToDelete.id });
            if (sendWebhook) sendWebhook({ name: catToDelete.name, id: catToDelete.id, items: [] } as any, 'category_deleted');
            toast({ title: 'Categoria excluída' });
            setIsDeleteDialogOpen(false);
        } catch (error: any) {
            toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
        } finally {
            setIsDeleteSaving(false);
        }
    }

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="font-display text-2xl font-bold">Categorias</h1>
                <p className="text-muted-foreground text-sm">Gerencie as divisões do seu cardápio</p>
            </div>

            {/* Add Category Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Nome da nova categoria (ex: Pizzas Doces)"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                            disabled={isSaving}
                            className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
                        />
                    </div>
                    <button
                        onClick={addCategory}
                        disabled={isSaving}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Package className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Adicionar Categoria
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-card/50 border border-dashed border-border rounded-3xl">
                        <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h3 className="text-lg font-medium">Nenhuma categoria</h3>
                        <p className="text-sm text-muted-foreground mt-1">Adicione sua primeira categoria para organizar seus produtos.</p>
                    </div>
                ) : (
                    categories.map(cat => (
                        <div key={cat.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between group hover:border-primary/30 transition-all shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Tag className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-semibold text-foreground">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditDialog(cat)}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => openDeleteDialog(cat)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card border-border shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl font-bold">Editar Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Nome da Categoria</label>
                            <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                                className="bg-muted border-border focus:ring-primary/50"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="flex-1 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleEdit}
                            disabled={isEditSaving || !editValue.trim()}
                            className="flex-1 gradient-hero text-white rounded-xl shadow-glow"
                        >
                            {isEditSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border shadow-2xl rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-xl font-bold text-destructive">
                            Excluir Categoria?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Tem certeza que deseja excluir a categoria <span className="text-foreground font-semibold">"{catToDelete?.name}"</span>?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl bg-muted border-none hover:bg-muted/80">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
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

