import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/hooks/use-app';
import { Product } from '@/types';
import { ArrowLeft, Save, Package, Image as ImageIcon, Camera, Trash2, X, Plus, Tag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function ProductForm() {
    const { state, dispatch } = useApp();
    const { sendWebhook } = useApp() as any;
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEdit = !!id;
    const existing = id ? state.products.find(p => p.id === id) : null;

    const [form, setForm] = useState<Partial<Product>>({
        name: '',
        description: '',
        price: 0,
        promoPrice: undefined,
        categoryId: state.categories[0]?.id || '',
        image: '',
        available: true,
        isPromo: false,
        variants: [],
    });

    const [variantName, setVariantName] = useState('');
    const [variantPrice, setVariantPrice] = useState<number | ''>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (existing) {
            setForm(existing);
        }
    }, [existing]);

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limite de 5MB para o Storage (o Supabase aceita bem mais, mas 5MB é seguro)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'Imagem muito pesada',
                description: 'O limite do servidor é de 5MB por foto.',
                variant: 'destructive'
            });
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setForm(f => ({ ...f, image: publicUrl }));
            toast({ title: 'Foto enviada com sucesso!' });
        } catch (error: any) {
            toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    }

    function removeImage() {
        setForm(f => ({ ...f, image: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || form.price === undefined || !form.categoryId) {
            toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            const productData = {
                name: form.name,
                description: form.description,
                price: form.price,
                promo_price: form.promoPrice, // Mapeado para snake_case do banco
                category_id: form.categoryId,
                image_url: form.image,
                available: form.available ?? true,
                is_promo: form.isPromo ?? false,
                variants: form.variants || []
            };

            let finalProduct;

            if (isEdit) {
                const { data, error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                finalProduct = data;

                // Mapear de volta para as keys que o frontend espera (camelCase)
                const mappedProduct = {
                    ...finalProduct,
                    categoryId: finalProduct.category_id,
                    imageUrl: finalProduct.image_url,
                    promoPrice: finalProduct.promo_price,
                    isPromo: finalProduct.is_promo
                };

                dispatch({ type: 'UPDATE_PRODUCT', payload: mappedProduct });
                if (sendWebhook) sendWebhook({ ...mappedProduct, items: [] } as any, 'product_updated');
                toast({ title: 'Produto atualizado no banco!' });
            } else {
                const { data, error } = await supabase
                    .from('products')
                    .insert([productData])
                    .select()
                    .single();

                if (error) throw error;
                finalProduct = data;

                const mappedProduct = {
                    ...finalProduct,
                    categoryId: finalProduct.category_id,
                    imageUrl: finalProduct.image_url,
                    promoPrice: finalProduct.promo_price,
                    isPromo: finalProduct.is_promo
                };

                dispatch({ type: 'ADD_PRODUCT', payload: mappedProduct });
                if (sendWebhook) sendWebhook({ ...mappedProduct, items: [] } as any, 'product_created');
                toast({ title: 'Produto criado no banco!' });
            }

            navigate('/admin/products');
        } catch (error: any) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="font-display text-2xl font-bold">{isEdit ? 'Editar Produto' : 'Novo Produto'}</h1>
                    <p className="text-muted-foreground text-sm">Gerencie os detalhes do item no cardápio</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Image Upload */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-card border border-border rounded-2xl p-4 overflow-hidden">
                        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4 text-center">Imagem do Produto</h2>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${form.image ? 'border-primary/20 bg-muted' : 'border-border hover:border-primary/50 hover:bg-primary/5'
                                }`}
                        >
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            ) : form.image ? (
                                <>
                                    <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-2">
                                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest text-center px-2">
                                        Clique para fazer upload
                                    </p>
                                    <p className="text-[9px] text-muted-foreground mt-1">(Máx: 5MB)</p>
                                </>
                            )}

                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />

                        {form.image && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeImage(); }}
                                className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-destructive hover:bg-destructive/10 py-2 rounded-xl transition-all"
                            >
                                <Trash2 className="w-3 h-3" /> Remover Imagem
                            </button>
                        )}
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Disponível</label>
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                                className={`w-10 h-5 rounded-full relative transition-colors ${form.available ? 'bg-primary' : 'bg-muted'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${form.available ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                Em Promoção <Tag className="w-3 h-3 text-secondary" />
                            </label>
                            <button
                                type="button"
                                onClick={() => setForm(f => ({ ...f, isPromo: !f.isPromo }))}
                                className={`w-10 h-5 rounded-full relative transition-colors ${form.isPromo ? 'bg-secondary' : 'bg-muted'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${form.isPromo ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações Básicas</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1.5">Nome do Produto *</label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ex: Pizza Margherita Grande"
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-foreground block mb-1.5">Descrição</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Descreva os ingredientes ou detalhes do produto..."
                                    rows={3}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none font-sans"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1.5">Categoria *</label>
                                    <select
                                        value={form.categoryId}
                                        onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                                        required
                                    >
                                        {state.categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-foreground block mb-1.5">Preço Base (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.price}
                                        onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
                                        required
                                    />
                                </div>
                            </div>

                            {form.isPromo && (
                                <div className="bg-secondary/10 border border-secondary/20 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                                    <label className="text-sm font-medium text-secondary block mb-1.5">Preço Promocional (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.promoPrice || ''}
                                        onChange={e => setForm(f => ({ ...f, promoPrice: parseFloat(e.target.value) || undefined }))}
                                        placeholder="Deixe vazio para usar apenas o badge"
                                        className="w-full bg-background border border-secondary/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all font-sans"
                                    />
                                    <p className="text-[10px] text-secondary mt-2 italic font-sans font-medium">O preço promocional substituirá o preço base visualmente.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Opções (Tamanhos/Sabores)</h2>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Opcional</span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-[2] relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        value={variantName}
                                        onChange={e => setVariantName(e.target.value)}
                                        placeholder="Ex: Grande, Chocolate, 500ml"
                                        className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={variantPrice}
                                        onChange={e => setVariantPrice(e.target.value ? parseFloat(e.target.value) : '')}
                                        placeholder="Preço (Opcional)"
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-sans"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!variantName.trim()) return;
                                        const newVariant = {
                                            id: Math.random().toString(36).substring(2, 9),
                                            name: variantName.trim(),
                                            price: variantPrice === '' ? undefined : variantPrice
                                        };
                                        setForm(f => ({ ...f, variants: [...(f.variants || []), newVariant] }));
                                        setVariantName('');
                                        setVariantPrice('');
                                    }}
                                    className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl transition-all hover:opacity-90 flex items-center justify-center"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {form.variants?.map(v => (
                                    <div key={v.id} className="flex items-center gap-2 bg-muted border border-border px-3 py-1.5 rounded-lg group animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold leading-none">{v.name}</span>
                                            {v.price !== undefined && (
                                                <span className="text-[10px] text-primary font-bold mt-1">R$ {v.price.toFixed(2)}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, variants: f.variants?.filter(x => x.id !== v.id) }))}
                                            className="ml-1 p-1 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {(!form.variants || form.variants.length === 0) && (
                                    <p className="text-xs text-muted-foreground italic py-2">Sem opções cadastradas.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/products')}
                            className="flex-1 bg-muted border border-border text-foreground font-semibold py-3.5 rounded-2xl hover:bg-accent transition-all font-sans"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || isUploading}
                            className="flex-[2] gradient-hero text-white font-bold py-3.5 rounded-2xl shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2 font-sans disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {isEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
                        </button>

                    </div>
                </div>
            </form>
        </div>
    );
}
