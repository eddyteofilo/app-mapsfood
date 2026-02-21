import { useApp } from '@/hooks/use-app';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Clock, CheckCircle, Truck, TrendingUp, Plus, ArrowRight, Bike, Package, Tag } from 'lucide-react';
import { STATUS_LABELS, OrderStatus } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { icon: React.ElementType; className: string }> = {
  received: { icon: ShoppingBag, className: 'status-received' },
  preparing: { icon: Clock, className: 'status-preparing' },
  delivering: { icon: Truck, className: 'status-delivering' },
  delivered: { icon: CheckCircle, className: 'status-delivered' },
};

export default function Dashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const { orders, deliverers, products, categories } = state;

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
  const availableDeliverers = deliverers.filter(d => d.available).length;

  const statusCounts = (['received', 'preparing', 'delivering', 'delivered'] as OrderStatus[]).map(s => ({
    status: s,
    count: orders.filter(o => o.status === s).length,
  }));

  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Visão geral dos pedidos</p>
        </div>
        <Link
          to="/admin/orders/new"
          className="flex items-center gap-2 gradient-hero text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-glow hover:opacity-90 transition-all font-sans"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pedidos Hoje', value: todayOrders.length, icon: ShoppingBag, color: 'text-primary' },
          { label: 'Em Andamento', value: activeOrders.length, icon: Truck, color: 'text-secondary' },
          { label: 'Faturamento Hoje', value: `R$ ${todayRevenue.toFixed(2)}`, icon: TrendingUp, color: 'text-status-delivered' },
          { label: 'Entregadores', value: `${availableDeliverers}/${deliverers.length}`, icon: Bike, color: 'text-status-received' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Catalog Stats */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
            <Package className={`w-6 h-6 text-secondary`} />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">Seu Cardápio</h3>
            <p className="text-sm text-muted-foreground">Gestão de itens e promoções</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center md:justify-end">
          <div className="text-center px-4 py-2 bg-muted rounded-xl">
            <span className="block text-lg font-bold text-foreground">{products.length}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Produtos</span>
          </div>
          <div className="text-center px-4 py-2 bg-muted rounded-xl">
            <span className="block text-lg font-bold text-foreground">{categories.length}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Categorias</span>
          </div>
          <div className="text-center px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-xl">
            <span className="block text-lg font-bold text-secondary">{products.filter(p => p.isPromo).length}</span>
            <span className="text-[10px] text-secondary uppercase font-bold tracking-wider">Promoções</span>
          </div>
          <Link
            to="/admin/products"
            className="flex items-center gap-2 bg-foreground text-background text-sm font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-all font-sans"
          >
            Gerenciar Itens
          </Link>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-display font-semibold text-foreground mb-4">Status dos Pedidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statusCounts.map(({ status, count }) => {
            const { icon: Icon, className } = STATUS_CONFIG[status];
            return (
              <div key={status} className={`rounded-xl p-3 ${className}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{STATUS_LABELS[status]}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-foreground">Pedidos Recentes</h2>
          <button onClick={() => navigate('/admin/orders')} className="flex items-center gap-1 text-sm text-primary hover:underline">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum pedido ainda</p>
            <button onClick={() => navigate('/admin/orders/new')} className="text-primary text-sm hover:underline mt-1">
              Criar primeiro pedido
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(order => {
              const { className } = STATUS_CONFIG[order.status];
              return (
                <div
                  key={order.id}
                  onClick={() => navigate('/admin/orders')}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-accent cursor-pointer transition-colors"
                >
                  <span className="text-sm font-bold text-primary w-10">#{order.number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.deliveryAddress}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${className}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">R$ {order.total.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
