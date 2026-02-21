import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { ShoppingBag, X, Plus, Minus, Send, MapPin, User, Wallet, Loader2, QrCode, CreditCard, ChevronRight, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { state, dispatch } = useApp();
    const { cart, settings } = state;
    const { toast } = useToast();

    const [customer, setCustomer] = useState({
        name: '',
        phone: '',
        address: '',
        cpf: '',
        payment: 'pix' as 'pix' | 'money' | 'card',
        change: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [pixData, setPixData] = useState<{ qrCode: string; copyPaste: string; paymentId: string } | null>(null);

    const total = cart.reduce((s, i) => {
        const itemPrice = i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price);
        return s + (itemPrice * i.quantity);
    }, 0);

    if (!open) return null;

    function updateQuantity(id: string, variantId: string | undefined, newQty: number) {
        if (newQty < 1) {
            dispatch({ type: 'REMOVE_FROM_CART', payload: { id, variantId } });
        } else {
            dispatch({ type: 'UPDATE_CART_QUANTITY', payload: { id, variantId, quantity: newQty } });
        }
    }

    async function handleSendOrder() {
        if (!customer.name || !customer.address || !customer.phone) {
            toast({
                title: 'Dados obrigatórios',
                description: 'Por favor, preencha nome, telefone e endereço.',
                variant: 'destructive'
            });
            return;
        }

        // Se selecionou PIX ou Cartão, tratamos como pagamento online
        const isOnlinePayment = (customer.payment === 'pix' || customer.payment === 'card');

        if (isOnlinePayment && !settings.mercadopagoEnabled) {
            if (!settings.webhookEnabled) {
                toast({
                    title: 'Pagamento Online Desativado',
                    description: 'Ative o Webhook n8n nas Configurações para usar PIX/Cartão.',
                    variant: 'destructive'
                });
                return;
            }

            if (!settings.webhookUrl) {
                toast({
                    title: 'Erro de Configuração',
                    description: 'URL do Webhook não configurada no painel Admin.',
                    variant: 'destructive'
                });
                return;
            }
        }

        if (isOnlinePayment && !customer.cpf) {
            toast({
                title: 'CPF Obrigatório',
                description: 'O CPF é necessário para processar pagamentos online.',
                variant: 'destructive'
            });
            return;
        }

        setIsProcessing(true);

        try {
            if (isOnlinePayment) {
                const orderId = Math.random().toString(36).substring(2, 15);
                const orderNum = state.orders.length + 1001;

                let data;

                // Opção 1: Supabase Edge Function (Recomendado)
                if (settings.mercadopagoEnabled) {
                    const { data: funcData, error: funcError } = await supabase.functions.invoke('mercadopago-pix', {
                        body: {
                            orderId,
                            customerName: customer.name,
                            customerCpf: customer.cpf,
                            customerPhone: customer.phone,
                            paymentMethod: customer.payment,
                            amount: total,
                            accessToken: settings.mercadopagoAccessToken,
                            items: cart.map(i => ({
                                name: i.name,
                                quantity: i.quantity,
                                price: (i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price))
                            }))
                        }
                    });

                    if (funcError || funcData?.error) {
                        const errorMsg = funcData?.error || funcError?.message || 'Erro desconhecido no processamento';
                        throw new Error(`Erro no Pagamento: ${errorMsg}`);
                    }

                    data = funcData;
                }
                // Opção 2: Webhook n8n (Legado)
                else {
                    const response = await fetch(settings.webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            event: 'create_payment',
                            orderId,
                            customerName: customer.name,
                            customerCpf: customer.cpf,
                            customerPhone: customer.phone,
                            paymentMethod: customer.payment,
                            amount: total,
                            items: cart.map(i => ({
                                name: i.name,
                                quantity: i.quantity,
                                price: (i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price))
                            }))
                        })
                    });

                    if (!response.ok) throw new Error('Falha ao gerar pagamento via Webhook');
                    data = await response.json();
                }

                if (customer.payment === 'pix' && data.qr_code) {
                    setPixData({
                        qrCode: data.qr_code_base64,
                        copyPaste: data.copy_paste,
                        paymentId: String(data.payment_id)
                    });

                    await supabase.from('orders').insert([{
                        id: orderId,
                        number: orderNum,
                        customer_name: customer.name,
                        customer_phone: customer.phone,
                        delivery_address: customer.address,
                        payment_method: 'pix',
                        payment_status: 'pending',
                        payment_id: String(data.payment_id),
                        total: total,
                        status: 'received',
                        items: cart.map(i => ({
                            id: i.id,
                            name: i.name,
                            variantName: i.selectedVariant?.name,
                            quantity: i.quantity,
                            price: i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price)
                        }))
                    }]);
                    setIsProcessing(false);
                    return;
                }

                if (data.checkout_url) {
                    await supabase.from('orders').insert([{
                        id: orderId,
                        number: orderNum,
                        customer_name: customer.name,
                        customer_phone: customer.phone,
                        delivery_address: customer.address,
                        payment_method: customer.payment,
                        payment_status: 'pending',
                        total: total,
                        status: 'received',
                        items: cart.map(i => ({
                            id: i.id,
                            name: i.name,
                            variantName: i.selectedVariant?.name,
                            quantity: i.quantity,
                            price: i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price)
                        }))
                    }]);
                    window.location.href = data.checkout_url;
                    return;
                }

                throw new Error('O servidor não retornou dados de PIX ou Checkout. Verifique sua integração!');
            }

            // WhatsApp Flow (Somente Dinheiro)
            const itemsText = cart.map(i => {
                const price = i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price);
                return `• ${i.quantity}x ${i.name}${i.selectedVariant ? ` (${i.selectedVariant.name})` : ''} - R$ ${(price).toFixed(2)}`;
            }).join('\n');

            const message = `*NOVO PEDIDO - ${settings.name}*\n` +
                `--------------------------------\n` +
                `*Cliente:* ${customer.name}\n` +
                `*Endereço:* ${customer.address}\n` +
                `*Pagamento:* ${customer.payment.toUpperCase()}${customer.change ? ` (Troco p/ R$ ${customer.change})` : ''}\n` +
                `--------------------------------\n` +
                `*ITENS:*\n${itemsText}\n` +
                `--------------------------------\n` +
                `*TOTAL: R$ ${total.toFixed(2)}*`;

            const encodedMessage = encodeURIComponent(message);
            const cleanPhone = settings.phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

            await supabase.from('orders').insert([{
                id: Math.random().toString(36).substring(2, 15),
                number: state.orders.length + 1001,
                customer_name: customer.name,
                customer_phone: customer.phone,
                delivery_address: customer.address,
                payment_method: customer.payment === 'money' ? 'cash' : customer.payment,
                total: total,
                status: 'received',
                items: cart.map(i => ({
                    id: i.id,
                    name: i.name,
                    variantName: i.selectedVariant?.name,
                    quantity: i.quantity,
                    price: i.selectedVariant?.price || ((i.isPromo && i.promoPrice) ? i.promoPrice : i.price)
                }))
            }]);

            window.open(whatsappUrl, '_blank');
            dispatch({ type: 'CLEAR_CART' });
            onClose();
            toast({ title: 'Pedido Enviado!' });
        } catch (err: any) {
            console.error(err);
            toast({
                title: 'Erro no checkout',
                description: err.message || 'Tente novamente ou use outro método.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessing(false);
        }
    }

    // Se o webhook existir, mostramos todos os métodos habilitados
    const availablePayments = [
        { id: 'pix', label: 'PIX', icon: QrCode, enabled: settings.mercadopagoPixEnabled || !settings.mercadopagoEnabled },
        { id: 'money', label: 'Dinheiro', icon: Wallet, enabled: true },
        { id: 'card', label: 'Cartão', icon: CreditCard, enabled: settings.mercadopagoCardEnabled || !settings.mercadopagoEnabled }
    ].filter(p => p.enabled);

    return (
        <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-md bg-card h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 ease-out border-l border-border">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                    <div>
                        <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                            Sua Sacola <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{cart.length}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="p-6 space-y-6 pb-64"> {/* Aumentei ainda mais o PB para segurança total */}
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center py-20">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 opacity-50">
                                    <ShoppingBag className="w-8 h-8 text-muted-foreground font-bold" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Sua sacola está vazia</h3>
                                <p className="text-xs text-muted-foreground mt-1 mb-6">Que tal adicionar uma pizza deliciosa agora?</p>
                                <button onClick={onClose} className="text-primary font-bold text-sm hover:underline">Voltar ao cardápio</button>
                            </div>
                        ) : (
                            <>
                                {pixData ? (
                                    <div className="space-y-6 pt-4 animate-in zoom-in-95 duration-500 text-center">
                                        <div className="space-y-2">
                                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                                                <QrCode className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-black italic uppercase tracking-tight">Pagamento PIX</h3>
                                            <p className="text-[11px] text-muted-foreground px-8 leading-relaxed">Escaneie o código ou use o copia e cola para finalizar o seu pedido agora.</p>
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl border-2 border-border aspect-square flex items-center justify-center shadow-sm mx-auto max-w-[200px]">
                                            <img src={`data:image/png;base64,${pixData.qrCode}`} alt="PIX" className="w-full h-full" />
                                        </div>

                                        <div className="space-y-3 px-4">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(pixData.copyPaste);
                                                    toast({ title: 'Copiado!', description: 'Código PIX copiado com sucesso.' });
                                                }}
                                                className="w-full gradient-hero text-white h-11 rounded-xl text-[11px] font-black uppercase tracking-tight transition-transform active:scale-95 shadow-glow"
                                            >
                                                COPIAR CÓDIGO PIX
                                            </button>
                                            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-center gap-2.5">
                                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                                <span className="text-[10px] font-black text-primary tracking-widest uppercase">Aguardando Pagamento</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setPixData(null)} className="text-[10px] text-muted-foreground font-black uppercase tracking-widest hover:text-foreground transition-colors pt-2">Escolher outro método</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[2px] px-1">Seus Itens</h4>
                                            <div className="space-y-2">
                                                {cart.map(item => {
                                                    const itemPrice = item.selectedVariant?.price || ((item.isPromo && item.promoPrice) ? item.promoPrice : item.price);
                                                    return (
                                                        <div key={item.id + (item.selectedVariant?.id || '')} className="flex gap-4 group bg-muted/20 p-2.5 rounded-2xl border border-border/50">
                                                            <div className="w-14 h-14 rounded-xl bg-muted border border-border flex-shrink-0 overflow-hidden relative">
                                                                {item.image ? (
                                                                    <img src={item.image} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                                        <ShoppingBag className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0 py-0.5">
                                                                <div className="flex justify-between items-start">
                                                                    <h5 className="text-sm font-bold text-foreground truncate pr-2">{item.name}</h5>
                                                                    <button
                                                                        onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: { id: item.id, variantId: item.selectedVariant?.id } })}
                                                                        className="text-muted-foreground hover:text-red-500 transition-colors"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                {item.selectedVariant && <p className="text-[9px] font-bold text-primary uppercase mt-0.5 tracking-tighter">{item.selectedVariant.name}</p>}

                                                                <div className="flex items-center justify-between mt-1">
                                                                    <div className="flex items-center gap-2.5 bg-background/50 border border-border rounded-lg px-2 py-0.5">
                                                                        <button onClick={() => updateQuantity(item.id, item.selectedVariant?.id, item.quantity - 1)} className="hover:text-primary transition-colors"><Minus className="w-2 h-2" /></button>
                                                                        <span className="text-xs font-black text-foreground w-4 text-center">{item.quantity}</span>
                                                                        <button onClick={() => updateQuantity(item.id, item.selectedVariant?.id, item.quantity + 1)} className="hover:text-primary transition-colors"><Plus className="w-2 h-2" /></button>
                                                                    </div>
                                                                    <span className="text-xs font-black text-foreground">R$ {(itemPrice * item.quantity).toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-5 pt-4 border-t border-border">
                                            {/* Pagamento (Movido para cima para visibilidade) */}
                                            <div className="space-y-3 pb-2 pt-2 border-t border-border/50">
                                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px] px-1">Método de Pagamento</h4>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {availablePayments.map(p => {
                                                        const Icon = p.icon;
                                                        const active = customer.payment === p.id;
                                                        return (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => setCustomer(c => ({ ...c, payment: p.id as any }))}
                                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${active ? 'bg-primary/10 border-primary shadow-sm' : 'bg-muted/40 border-border opacity-70 hover:opacity-100'}`}
                                                            >
                                                                <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${active ? 'text-primary' : 'text-muted-foreground'}`}>{p.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {customer.payment === 'money' && (
                                                    <div className="relative animate-in slide-in-from-top-1 duration-200 mt-2">
                                                        <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                                        <input
                                                            value={customer.change}
                                                            onChange={e => setCustomer(c => ({ ...c, change: e.target.value }))}
                                                            placeholder="Troco para quanto?"
                                                            type="number"
                                                            className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-border/50">
                                                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[1.5px] px-1">Dados de Entrega</h4>
                                                <div className="space-y-3">
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 relative">
                                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                                            <input
                                                                value={customer.name}
                                                                onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))}
                                                                placeholder="Seu Nome"
                                                                className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                                            <input
                                                                value={customer.phone}
                                                                onChange={e => setCustomer(c => ({ ...c, phone: e.target.value.replace(/\D/g, '') }))}
                                                                placeholder="WhatsApp"
                                                                className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                                        <input
                                                            value={customer.address}
                                                            onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))}
                                                            placeholder="Endereço (Rua, Número, Bairro)"
                                                            className="w-full bg-muted/40 border border-border rounded-xl pl-10 pr-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                        />
                                                    </div>

                                                    {(customer.payment === 'pix' || customer.payment === 'card') && (
                                                        <div className="relative animate-in slide-in-from-top-2 duration-300">
                                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60 font-black text-[9px] uppercase">CPF</div>
                                                            <input
                                                                value={customer.cpf}
                                                                onChange={e => setCustomer(c => ({ ...c, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                                                                placeholder="CPF (obrigatório para pagamento online)"
                                                                className="w-full bg-primary/5 border border-primary/20 rounded-xl pl-12 pr-4 py-3 text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none text-foreground font-medium"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {cart.length > 0 && !pixData && (
                    <div className="p-4 sm:p-5 bg-card border-t border-border shadow-[0_-15px_50px_-10px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-between mb-3 px-2">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Geral</span>
                            <span className="text-xl font-black text-foreground">R$ {total.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleSendOrder}
                            disabled={isProcessing}
                            className="w-full gradient-hero text-white h-12 rounded-xl flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-50 shadow-glow"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span className="text-xs font-black italic uppercase tracking-wider">
                                        {(customer.payment === 'pix' || customer.payment === 'card')
                                            ? 'Confirmar Pagamento Online'
                                            : 'Finalizar via WhatsApp'}
                                    </span>
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
