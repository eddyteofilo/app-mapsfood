import { useState, useEffect } from 'react';
import { useApp } from '@/hooks/use-app';
import { Pizza, ShoppingBag, Search, Tag, Star, X, Plus, ChevronRight } from 'lucide-react';
import { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import CartDrawer from '@/components/CartDrawer';
import ProductVariantModal from '@/components/ProductVariantModal';

export default function Index() {
    const { state, dispatch } = useApp();
    const { products, categories, settings, cart } = state;
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showOffer, setShowOffer] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
    const [variantSelection, setVariantSelection] = useState<{ isOpen: boolean; product: Product | null }>({
        isOpen: false,
        product: null,
    });

    // Seleciona um produto em destaque para o Pop-up
    useEffect(() => {
        const featured = products.filter(p => p.isFeatured && p.available);
        if (featured.length > 0) {
            setFeaturedProduct(featured[Math.floor(Math.random() * featured.length)]);
            const timer = setTimeout(() => setShowOffer(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [products]);

    const filtered = products.filter(p => {
        // Garantia: mostra por padrão, a menos que marcado explicitamente como indisponível
        if (p.available === false) return false;

        const search = (searchTerm || '').toLowerCase().trim();
        const matchesSearch = !search ||
            (p.name?.toLowerCase() || '').includes(search) ||
            (p.description?.toLowerCase() || '').includes(search);

        const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;

        return matchesSearch && matchesCategory;
    });


    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

    function addToCart(product: Product) {
        if (product.variants && product.variants.length > 0) {
            setVariantSelection({ isOpen: true, product });
        } else {
            dispatch({ type: 'ADD_TO_CART', payload: { product } });
            toast({
                title: 'Item adicionado!',
                description: `${product.name} voou para sua sacola. 🍕`,
            });
        }
    }

    return (
        <div className="min-h-screen bg-background pb-32 safe-bottom">
            {/* Header / Hero */}
            <header className="relative h-[30vh] md:h-[50vh] overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
                    <img
                        src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop"
                        alt="Pizza Background"
                        className="w-full h-full object-cover scale-110"
                    />
                </div>

                <div className="relative z-20 text-center space-y-4 px-4 drop-shadow-2xl">
                    <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-primary/50 text-white animate-bounce shadow-2xl">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest">A melhor da região</span>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        {settings.logoUrl ? (
                            <img
                                src={settings.logoUrl}
                                alt={settings.name}
                                className="h-20 md:h-32 w-auto object-contain drop-shadow-lg animate-fade-in"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-3xl gradient-hero flex items-center justify-center shadow-glow animate-pulse-glow">
                                <Pizza className="w-10 h-10 text-white" />
                            </div>
                        )}
                        <h1 className="sr-only">
                            {settings.name || 'EmRota'}
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm md:text-lg max-w-md mx-auto font-medium">
                        Ingredientes selecionados e massa artesanal. Peça agora pelo WhatsApp!
                    </p>
                </div>
            </header>

            {/* Quick Actions / Categories */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                    {/* Search */}
                    <form
                        onSubmit={(e) => e.preventDefault()}
                        className="flex gap-2 max-w-xl mx-auto"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="O que você quer comer hoje?"
                                className="w-full bg-muted/50 border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                            />
                        </div>
                        <button
                            type="button"
                            className="bg-foreground text-background px-4 py-3 rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                        >
                            BUSCAR
                        </button>
                    </form>

                    {/* Categories Tab */}
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar touch-pan-x">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={`px-6 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${activeCategory === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                        >
                            Tudo <span className="ml-1 opacity-60 text-[10px] bg-black/10 px-1.5 rounded-full">{products.filter(p => p.available !== false).length}</span>
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border ${activeCategory === cat.id
                                    ? 'bg-primary text-primary-foreground border-primary shadow-glow'
                                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(product => {
                        const finalPrice = (product.isPromo && product.promoPrice) ? product.promoPrice : product.price;
                        return (
                            <div
                                key={product.id}
                                className="group bg-card border border-border rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300"
                            >
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <PizzaIcon className="w-12 h-12 text-muted-foreground opacity-20" />
                                        </div>
                                    )}
                                    {product.isPromo && (
                                        <div className="absolute top-4 left-4 bg-secondary text-secondary-foreground text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-lg ring-2 ring-white/20">
                                            <Tag className="w-3.5 h-3.5" /> PROMOÇÃO
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="space-y-1">
                                        <h3 className="font-display font-bold text-xl text-foreground">{product.name}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 h-8 leading-relaxed">
                                            {product.description || 'Uma delícia preparada com todo carinho para você.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            {(product.isPromo && product.promoPrice) && (
                                                <span className="text-[10px] text-muted-foreground line-through font-medium">De R$ {product.price.toFixed(2)}</span>
                                            )}
                                            <span className="text-2xl font-black text-foreground tracking-tight">
                                                R$ {finalPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => addToCart(product)}
                                            className="w-12 h-12 gradient-hero rounded-2xl flex items-center justify-center shadow-glow active:scale-95 transition-transform"
                                        >
                                            <Plus className="w-6 h-6 text-white" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Floating Cart Button */}
            {cartCount > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-300 w-full px-4 max-w-md">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full flex items-center justify-between bg-foreground text-background px-6 py-4 rounded-2xl font-bold shadow-2xl hover:scale-[1.02] active:scale-95 transition-all outline-none ring-primary/20 focus:ring-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingBag className="w-5 h-5" />
                                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                    {cartCount}
                                </span>
                            </div>
                            <span>Ver Sacola</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-[1px] bg-background/20" />
                            <span>R$ {cart.reduce((s, i) => s + (((i.isPromo && i.promoPrice) ? i.promoPrice : i.price) * i.quantity), 0).toFixed(2)}</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Offer Pop-up */}
            {showOffer && featuredProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowOffer(false)} />
                    <div className="relative w-full max-w-sm bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-20 duration-500">
                        <button
                            onClick={() => setShowOffer(false)}
                            className="absolute top-4 right-4 z-10 w-8 h-8 bg-card rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors shadow-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative aspect-video">
                            <img src={featuredProduct.image || 'https://images.unsplash.com/photo-1593504049359-7b7d92c7385f?q=80&w=1000'} alt="Offer" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                            <div className="absolute top-4 left-4 flex gap-2">
                                <div className="bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg">⚡ OFERTA BÔNUS</div>
                            </div>
                        </div>

                        <div className="p-8 text-center space-y-6">
                            <div className="space-y-2">
                                <h2 className="font-display text-3xl font-black tracking-tight">{featuredProduct.name}</h2>
                                <p className="text-muted-foreground text-sm leading-relaxed">Não perca essa oportunidade especial preparada hoje para você!</p>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <span className="text-sm text-muted-foreground line-through font-medium">De R$ {featuredProduct.price.toFixed(2)}</span>
                                <span className="text-5xl font-black text-primary tracking-tighter italic">
                                    R$ {((featuredProduct.isPromo && featuredProduct.promoPrice) ? featuredProduct.promoPrice : featuredProduct.price).toFixed(2)}
                                </span>
                            </div>

                            <button
                                onClick={() => {
                                    addToCart(featuredProduct);
                                    setShowOffer(false);
                                }}
                                className="w-full gradient-hero text-white text-lg font-black py-4 rounded-2xl shadow-glow hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                QUERO ESSA AGORA!
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer */}
            <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />

            {/* Variant Selection Modal */}
            <ProductVariantModal
                isOpen={variantSelection.isOpen}
                product={variantSelection.product}
                onClose={() => setVariantSelection({ isOpen: false, product: null })}
                onSelect={(variant) => {
                    if (variantSelection.product) {
                        dispatch({
                            type: 'ADD_TO_CART',
                            payload: { product: variantSelection.product, variant }
                        });
                        toast({
                            title: 'Item adicionado!',
                            description: `${variantSelection.product.name} (${variant.name}) voou para sua sacola. 🍕`,
                        });
                    }
                    setVariantSelection({ isOpen: false, product: null });
                }}
            />
        </div>
    );
}

function PizzaIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M15 11h.01" /><path d="M11 15h.01" /><path d="M16 16h.01" /><path d="M2 16c0-4.42 3.58-8 8-8s8 3.58 8 8v4H2v-4Z" /><path d="M7 11h.01" /><path d="M7 16h.01" /><path d="M22 17a3 3 0 0 1-3 3h-1v-4h1a3 3 0 0 1 3 3Z" /><path d="m10 8 5-6" />
        </svg>
    );
}
