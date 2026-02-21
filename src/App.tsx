import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { useApp } from "@/hooks/use-app";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// Pages
import Index from "@/pages/Index";
import LoginPage from "@/pages/LoginPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Orders from "@/pages/admin/Orders";
import OrderForm from "@/pages/admin/OrderForm";
import Deliverers from "@/pages/admin/Deliverers";
import DelivererForm from "@/pages/admin/DelivererForm";
import AdminMapPage from "@/pages/admin/AdminMapPage";
import AdminSettings from "@/pages/admin/AdminSettings";
import Products from "@/pages/admin/Products";
import ProductForm from "@/pages/admin/ProductForm";
import Categories from "@/pages/admin/Categories";
import DeliveryMode from "@/pages/DeliveryMode";
import TrackingPage from "@/pages/TrackingPage";
import NotFound from "./pages/NotFound";
import Footer from "@/components/Footer";

const queryClient = new QueryClient();

function AuthGuard({ children, role }: { children: React.ReactNode; role?: 'admin' | 'deliverer' }) {
  const { state } = useApp();
  if (!state.currentUser) return <Navigate to="/login" replace />;
  if (role && state.currentUser.role !== role) {
    return <Navigate to={state.currentUser.role === 'admin' ? '/admin' : '/delivery'} replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  // Removido redirecionamento automático para permitir o Cardápio Público na /
  return <Index />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin */}
      <Route path="/admin" element={<AuthGuard role="admin"><AdminLayout /></AuthGuard>}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<OrderForm />} />
        <Route path="orders/:id/edit" element={<OrderForm />} />
        <Route path="map" element={<AdminMapPage />} />
        <Route path="deliverers" element={<Deliverers />} />
        <Route path="deliverers/new" element={<DelivererForm />} />
        <Route path="deliverers/:id/edit" element={<DelivererForm />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="categories" element={<Categories />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
      </Route>

      {/* Delivery */}
      <Route path="/delivery" element={<AuthGuard role="deliverer"><DeliveryMode /></AuthGuard>} />

      {/* Public tracking */}
      <Route path="/track/:orderId" element={<TrackingPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function GlobalErrorHandler() {
  const { toast } = useToast();
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      console.error('[GlobalError]', event.error);
      toast({
        title: 'Algo deu errado',
        description: event.error?.message || 'Erro inesperado no sistema.',
        variant: 'destructive',
      });
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, [toast]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalErrorHandler />
          <div className="flex flex-col min-h-screen">
            <div className="flex-1">
              <AppRoutes />
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
