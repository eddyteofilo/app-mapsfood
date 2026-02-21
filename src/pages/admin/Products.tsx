import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { Link } from 'react-router-dom';
import { Product, Category } from '@/types';
import {
    Plus, Search, Filter, Trash2, Edit, Package, Star, Tag, Eye, EyeOff, Pizza, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
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

export default function Products() {
    const { state, dispatch } = useApp();
    const { products, categories } = state;
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    // Delete Modal State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleteSaving, setIsDeleteSaving] = useState(false);

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const { sendWebhook } = useApp() as any;

    function openDeleteDialog(product: Product) {
        setProductToDelete(product);
        setIsDeleteDialogOpen(true);
    }

    async function handleDeleteProduct() {
        if (!productToDelete) return;
        setIsDeleteSaving(true);
        setIsProcessing(productToDelete.id);
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productToDelete.id);

            if (error) throw error;

            dispatch({ type: 'DELETE_PRODUCT', payload: productToDelete.id });
            if (sendWebhook) {
                sendWebhook({ ...productToDelete, items: [] } as any, 'product_deleted');
            }
            toast({ title: 'Produto removido com sucesso' });
            setIsDeleteDialogOpen(false);
        } catch (error: any) {
            toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
        } finally {
            setIsDeleteSaving(false);
            setIsProcessing(null);
        }
    }

    async function toggleAvailability(product: Product) {
        const newStatus = !product.available;
        setIsProcessing(product.id);

        try {
            const { error } = await supabase
                .from('products')
                .update({ available: newStatus })
                .eq('id', product.id);

            if (error) throw error;

            dispatch({
                type: 'UPDATE_PRODUCT',
                payload: { ...product, available: newStatus }
            });

            if (sendWebhook) {
                sendWebhook({ ...product, available: newStatus, items: [] } as any, 'product_availability_changed');
            }

            toast({
                title: newStatus ? 'Produto ativado' : 'Produto pausado',
                description: `${product.name} agora está ${newStatus ? 'disponível' : 'indisponível'}.`
            });
        } catch (error: any) {
            toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessing(null);
        }
    }

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold">Produtos</h1>
                    <p className="text-muted-foreground text-sm">{filtered.length} produto(s) cadastrado(s)</p>
                </div>
                <Link
                    to="/admin/products/new"
                    className="flex items-center gap-2 gradient-hero text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-glow hover:opacity-90 transition-all font-sans"
                >
                    <Plus className="w-4 h-4" /> Novo Produto
                </Link>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou descrição..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>
                    <button className="bg-foreground text-background px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90">
                        BUSCAR
                    </button>
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                    >
                        <option value="all">Todas as Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-card/50 border border-dashed border-border rounded-3xl">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <h3 className="text-lg font-medium text-foreground">Nenhum produto encontrado</h3>
                    <p className="text-sm text-muted-foreground mt-1">Tente ajustar seus filtros ou cadastre um novo produto.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filtered.map(product => (
                        <div key={product.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                            {/* Image Placeholder or Uploaded Image */}
                            <div className="aspect-video bg-muted relative overflow-hidden">
                                {product.image ? (
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Pizza className="w-10 h-10 text-muted-foreground opacity-20" />
                                    </div>
                                )}

                                {product.isPromo && (
                                    <div className="absolute top-2 left-2 bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                                        <Tag className="w-3 h-3" /> PROMOÇÃO
                                    </div>
                                )}

                                {!product.available && (
                                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                                        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                                            INDISPONÍVEL
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="font-display font-bold text-foreground truncate">{product.name}</h3>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => toggleAvailability(product)}
                                            disabled={isProcessing === product.id}
                                            className={`p-1.5 rounded-lg transition-colors ${product.available ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted'}`}
                                            title={product.available ? 'Pausar venda' : 'Ativar venda'}
                                        >
                                            {isProcessing === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                product.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>

                                </div>

                                <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                                    {product.description || 'Sem descrição cadastrada.'}
                                </p>

                                <div className="pt-2 flex items-center justify-between border-t border-border">
                                    <div>
                                        {product.isPromo && product.promoPrice ? (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground line-through">R$ {product.price.toFixed(2)}</span>
                                                <span className="text-lg font-bold text-primary">R$ {product.promoPrice.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-lg font-bold text-foreground">R$ {product.price.toFixed(2)}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Link
                                            to={`/admin/products/${product.id}/edit`}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => openDeleteDialog(product)}
                                            disabled={isProcessing === product.id}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-card border-border shadow-2xl rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-xl font-bold text-destructive">
                            Excluir Produto?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Tem certeza que deseja excluir o produto <span className="text-foreground font-semibold">"{productToDelete?.name}"</span>?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="rounded-xl bg-muted border-none hover:bg-muted/80">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteProduct}
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
