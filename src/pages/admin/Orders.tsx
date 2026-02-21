import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { useNavigate, Link } from 'react-router-dom';
import { Order, OrderStatus, STATUS_LABELS, STATUS_ORDER, PAYMENT_LABELS } from '@/types';
import { Plus, Search, Filter, Trash2, Edit, ChevronRight, Phone, MapPin, Truck, MessageCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<OrderStatus, string> = {
  received: 'status-received',
  preparing: 'status-preparing',
  delivering: 'status-delivering',
  delivered: 'status-delivered',
};

export default function Orders() {
  const { state, dispatch, sendWebhook, generateWhatsAppMessage, sendWhatsAppMessage } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = state.orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o =>
      !search || o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      String(o.number).includes(search) || o.customerPhone.includes(search)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  async function handleStatusChange(order: Order, status: OrderStatus) {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { id: order.id, status } });
    const updated = { ...order, status };

    // Webhook
    await sendWebhook(updated, `order_${status}`);

    // WhatsApp for key status changes
    if (status === 'received' || status === 'delivering' || status === 'delivered') {
      const type = status === 'received' ? 'received' : status === 'delivering' ? 'delivering' : 'delivered';
      const msg = generateWhatsAppMessage(updated, type);
      const sent = await sendWhatsAppMessage(order.customerPhone, msg);
      if (sent) {
        dispatch({ type: 'UPDATE_ORDER', payload: { ...updated, whatsappSent: true } });
        toast({ title: '✅ WhatsApp enviado', description: `Notificação enviada para ${order.customerName}` });
      }
    }

    toast({ title: 'Status atualizado', description: `Pedido #${order.number}: ${STATUS_LABELS[status]}` });
  }

  function handleDelete(order: Order) {
    if (confirm(`Excluir pedido #${order.number}?`)) {
      dispatch({ type: 'DELETE_ORDER', payload: order.id });
      toast({ title: 'Pedido excluído' });
    }
  }

  function handleWhatsAppLink(order: Order, type: 'received' | 'delivering' | 'delivered') {
    const msg = generateWhatsAppMessage(order, type);
    const url = `https://wa.me/${order.customerPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} pedido(s)</p>
        </div>
        <Link
          to="/admin/orders/new"
          className="flex items-center gap-2 gradient-hero text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-glow hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, número..."
            className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', ...STATUS_ORDER] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${filterStatus === s
                ? 'gradient-hero text-white shadow-glow'
                : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
            >
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const deliverer = state.deliverers.find(d => d.id === order.delivererId);
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Order header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    <span className="text-lg font-display font-bold text-primary">#{order.number}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{order.customerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>R$ {order.total.toFixed(2)}</span>
                      <span>{PAYMENT_LABELS[order.paymentMethod]}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4 animate-fade-in">
                    {/* Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{order.customerPhone}</span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{order.deliveryAddress}</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="bg-muted rounded-xl p-3 space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-foreground">{item.quantity}x {item.name}{item.variantName ? ` (${item.variantName})` : ''}</span>
                          <span className="text-muted-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 mt-2 flex justify-between font-semibold text-sm">
                        <span>Total</span>
                        <span className="text-primary">R$ {order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Deliverer */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Entregador</label>
                      <div className="flex gap-2 flex-wrap">
                        <select
                          value={order.delivererId || ''}
                          onChange={e => dispatch({ type: 'ASSIGN_DELIVERER', payload: { orderId: order.id, delivererId: e.target.value } })}
                          className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">Sem entregador</option>
                          {state.deliverers.map(d => (
                            <option key={d.id} value={d.id}>{d.name} {d.available ? '✓' : '(indisponível)'}</option>
                          ))}
                        </select>
                        {deliverer && (
                          <a
                            href={`https://wa.me/${deliverer.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" /> Chamar entregador
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Status change */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Alterar status</label>
                      <div className="flex gap-2 flex-wrap">
                        {STATUS_ORDER.map(s => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(order, s)}
                            disabled={order.status === s}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${order.status === s
                              ? `${STATUS_COLORS[s]} opacity-80`
                              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                              }`}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp & Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => handleWhatsAppLink(order, 'received')}
                        className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" /> Recebido
                      </button>
                      <button
                        onClick={() => handleWhatsAppLink(order, 'delivering')}
                        className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <Truck className="w-3 h-3" /> Saiu pra entrega
                      </button>
                      <button
                        onClick={() => handleWhatsAppLink(order, 'delivered')}
                        className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" /> Entregue
                      </button>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => navigate(`/admin/orders/${order.id}/edit`)}
                          className="flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-3 py-2 rounded-lg hover:text-foreground transition-colors"
                        >
                          <Edit className="w-3 h-3" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(order)}
                          className="flex items-center gap-1.5 text-xs bg-destructive/10 text-destructive px-3 py-2 rounded-lg hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </button>
                      </div>
                    </div>

                    {/* Tracking link */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                      <span className="font-medium">Link rastreio:</span>
                      <a
                        href={`/track/${order.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {window.location.origin}/track/{order.id}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
