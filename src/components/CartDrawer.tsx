import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { ShoppingBag, X, Plus, Minus, Send, MapPin, User, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { state, dispatch } = useApp();
    const { cart, settings } = state;
    const { toast } = useToast();

    const [customer, setCustomer] = useState({
        name: '',
        address: '',
        payment: 'pix' as 'pix' | 'money' | 'card',
        change: '',
    });

    const total = cart.reduce((s, i) => s + (((i.isPromo && i.promoPrice) ? i.promoPrice : i.price) * i.quantity), 0);

    if (!open) return null;

    function updateQuantity(id: string, variantId: string | undefined, newQty: number) {
        if (newQty < 1) {
            dispatch({ type: 'REMOVE_FROM_CART', payload: { id, variantId } });
        } else {
            dispatch({ type: 'UPDATE_CART_QUANTITY', payload: { id, variantId, quantity: newQty } });
        }
    }

    function handleSendOrder() {
        if (!customer.name || !customer.address) {
            toast({
                title: 'Dados faltando',
                description: 'Por favor, preencha seu nome e endereço.',
                variant: 'destructive'
            });
            return;
        }

        const itemsText = cart.map(i => {
            const price = i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price);
            return `• ${i.quantity}x ${i.name}${i.selectedVariant ? ` (${i.selectedVariant.name})` : ''} (R$ ${(price * i.quantity).toFixed(2)})`;
        }).join('\n');

        const message = `*🍕 NOVO PEDIDO - ${settings.name.toUpperCase()}*\n` +
            `--------------------------------\n` +
            `*Cliente:* ${customer.name}\n` +
            `*Endereço:* ${customer.address}\n` +
            `*Pagamento:* ${customer.payment.toUpperCase()}${customer.change ? ` (Troco para R$ ${customer.change})` : ''}\n` +
            `--------------------------------\n` +
            `*ITENS:*\n${itemsText}\n` +
            `--------------------------------\n` +
            `*TOTAL: R$ ${total.toFixed(2)}*\n\n` +
            `_Pedido feito via Cardápio Digital_`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${settings.phone}?text=${encodedMessage}`;

        // Dispara Webhook de Novo Pedido (Cliente)
        const orderData = {
            id: Math.random().toString(36).substring(2, 15),
            number: 0,
            customerName: customer.name,
            customerPhone: customer.name, // O cliente não informou o próprio telefone no form original, apenas nome e endereço
            deliveryAddress: customer.address,
            paymentMethod: customer.payment,
            total: total,
            createdAt: new Date().toISOString(),
            items: cart.map(i => ({
                id: i.id,
                name: i.name,
                variantName: i.selectedVariant?.name,
                quantity: i.quantity,
                price: i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price)
            }))
        } as any;

        const { sendWebhook } = useApp() as any;
        if (sendWebhook) {
            sendWebhook(orderData, 'order_client_request');
        }

        window.open(whatsappUrl, '_blank');
        dispatch({ type: 'CLEAR_CART' });
        onClose();
        toast({ title: 'Pedido enviado!', description: 'Você será redirecionado para o WhatsApp.' });
    }

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-display font-bold text-lg">Sua Sacola</h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{cart.length} itens selecionados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {cart.length === 0 ? (
                        <div className="text-center py-20 space-y-4">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                                <ShoppingBag className="w-8 h-8" />
                            </div>
                            <p className="text-muted-foreground font-medium">Sua sacola está vazia.</p>
                            <button
                                onClick={onClose}
                                className="text-primary font-bold text-sm hover:underline"
                            >
                                Voltar ao cardápio
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Items List */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Itens do Pedido</h3>
                                {cart.map(item => {
                                    const itemPrice = item.selectedVariant?.price || ((item.isPromo && item.promoPrice) ? item.promoPrice : item.price);
                                    const cartId = item.id + (item.selectedVariant?.id || '');

                                    return (
                                        <div key={cartId} className="flex gap-4 bg-muted/40 p-3 rounded-2xl border border-border/50">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Pizza className="w-6 h-6 text-muted-foreground opacity-20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-2">
                                                <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                                                {item.selectedVariant && (
                                                    <p className="text-[10px] font-bold text-primary uppercase">{item.selectedVariant.name}</p>
                                                )}
                                                <p className="text-xs text-primary font-bold mt-1">
                                                    R$ {itemPrice.toFixed(2)}
                                                </p>

                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.selectedVariant?.id, item.quantity - 1)}
                                                            className="p-0.5 hover:text-primary transition-colors"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.selectedVariant?.id, item.quantity + 1)}
                                                            className="p-0.5 hover:text-primary transition-colors"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: { id: item.id, variantId: item.selectedVariant?.id } })}
                                                className="text-muted-foreground hover:text-destructive self-start p-1"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Customer Info Form */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Seus Dados</h3>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            value={customer.name}
                                            onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                                            placeholder="Seu nome"
                                            className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                    </div>

                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            value={customer.address}
                                            onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))}
                                            placeholder="Endereço (Rua, Número, Bairro, Apto)"
                                            className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Forma de Pagamento</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'pix', label: 'PIX' },
                                                { id: 'money', label: 'Dinheiro' },
                                                { id: 'card', label: 'Cartão' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setCustomer(c => ({ ...c, payment: p.id as any }))}
                                                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${customer.payment === p.id
                                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                                        : 'bg-muted/50 border-border text-muted-foreground'
                                                        }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {customer.payment === 'money' && (
                                        <div className="relative animate-in slide-in-from-top-2 duration-200">
                                            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                value={customer.change}
                                                onChange={e => setCustomer(c => ({ ...c, change: e.target.value }))}
                                                placeholder="Troco para quanto?"
                                                type="number"
                                                className="w-full bg-muted border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="p-6 border-t border-border bg-card shadow-[0_-8px_30px_rgb(0,0,0,0.12)] space-y-4 z-20 relative">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-muted-foreground font-semibold">Subtotal</span>
                            <span className="text-2xl font-black tracking-tight text-foreground">R$ {total.toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handleSendOrder}
                            className="w-full gradient-hero text-white text-lg font-black py-4 rounded-2xl shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                        >
                            <Send className="w-5 h-5" />
                            FINALIZAR NO WHATSAPP
                        </button>
                        <p className="text-[10px] text-center text-muted-foreground font-medium italic">
                            * Você será redirecionado para concluir o pedido.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Pequeno mock para o ícone Pizza que pode faltar no lucide original ou vir do types
function Pizza({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M15 11h.01" /><path d="M11 15h.01" /><path d="M16 16h.01" /><path d="M2 16c0-4.42 3.58-8 8-8s8 3.58 8 8v4H2v-4Z" /><path d="M7 11h.01" /><path d="M7 16h.01" /><path d="M22 17a3 3 0 0 1-3 3h-1v-4h1a3 3 0 0 1 3 3Z" /><path d="m10 8 5-6" />
        </svg>
    );
}
