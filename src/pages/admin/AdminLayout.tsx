import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/hooks/use-app';
import {
  LayoutDashboard, ShoppingBag, Map, Settings, LogOut, Pizza, Menu, X, Bell, Plus, Package, Tag, Users
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/admin/deliverers', icon: Users, label: 'Entregadores' },
  { to: '/admin/categories', icon: Tag, label: 'Categorias' },
  { to: '/admin/products', icon: Package, label: 'Produtos' },
  { to: '/admin/map', icon: Map, label: 'Mapa ao Vivo' },
  { to: '/admin/settings', icon: Settings, label: 'Configurações' },
];

export default function AdminLayout() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeOrders = state.orders.filter(o => o.status !== 'delivered').length;

  function logout() {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <Link to="/admin" className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border group">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
            <Pizza className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground leading-none">PizzaDash</p>
            <p className="text-xs text-muted-foreground mt-0.5">Admin</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {label === 'Pedidos' && activeOrders > 0 && (
                <span className="ml-auto bg-secondary text-secondary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeOrders}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{state.settings.name}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex flex-col w-72 bg-sidebar border-r border-sidebar-border">
            <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
                  <Pizza className="w-5 h-5 text-white" />
                </div>
                <p className="font-display font-bold text-foreground">PizzaTrack</p>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-sidebar-border">
              <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive transition-all">
                <LogOut className="w-4 h-4" /><span>Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all outline-none"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/admin" className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
            <Pizza className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <span>Painel Administrativo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/orders/new"
              className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl shadow-glow hover:opacity-90 transition-all font-sans"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Novo Pedido</span>
            </Link>
            {activeOrders > 0 && (
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                  {activeOrders}
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
