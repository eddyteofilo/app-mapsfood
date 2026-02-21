import { useEffect, useState, useRef } from 'react';
import { useApp } from '@/hooks/use-app';
import { useNavigate } from 'react-router-dom';
import { Order } from '@/types';
import { supabase } from '@/lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import * as L from 'leaflet';
import {
  Navigation, CheckCircle, PlayCircle, MapPin, Phone,
  Pizza, LogOut, Bike, Clock, Package
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const meIcon = L.divIcon({
  html: `<div style="background:hsl(5,87%,53%);width:40px;height:40px;border-radius:50%;border:4px solid white;box-shadow:0 2px 12px rgba(229,62,62,0.6);display:flex;align-items:center;justify-content:center;font-size:20px">🛵</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: '',
});

const destIcon = L.divIcon({
  html: `<div style="background:hsl(24,95%,55%);width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  className: '',
});

export default function DeliveryMode() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [myLocation, setMyLocation] = useState<[number, number] | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const delivererId = state.currentUser?.delivererId;
  const deliverer = state.deliverers.find(d => d.id === delivererId);

  const myOrders = state.orders.filter(
    o => o.delivererId === delivererId && o.status !== 'delivered'
  );

  const activeOrder = activeOrderId ? state.orders.find(o => o.id === activeOrderId) : null;

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = window.navigator.geolocation.watchPosition(
      async pos => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMyLocation(loc);
        if (delivererId) {
          // Atualiza no Supabase em tempo real
          await supabase
            .from('deliverers')
            .update({ current_location: loc })
            .eq('id', delivererId);
        }
      },
      () => {
        // Fallback simulação (apenas se GPS falhar)
        const base = state.settings.coords;
        const sim: [number, number] = [base[0] + (Math.random() - 0.5) * 0.01, base[1] + (Math.random() - 0.5) * 0.01];
        setMyLocation(sim);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [delivererId, state.settings.coords]);

  async function startDelivery(order: Order) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivering', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw error;
      setActiveOrderId(order.id);
    } catch (err) {
      console.error('[StartDelivery Error]', err);
    }
  }

  async function finishDelivery(order: Order) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw error;
      setActiveOrderId(null);
    } catch (err) {
      console.error('[FinishDelivery Error]', err);
    }
  }

  function logout() {
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  }

  const mapCenter = myLocation || state.settings.coords;

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-glow">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground leading-none">{deliverer?.name || 'Entregador'}</p>
            <p className="text-xs text-muted-foreground">{deliverer?.vehicle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${myLocation ? 'status-delivered' : 'bg-muted text-muted-foreground'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${myLocation ? 'bg-status-delivered animate-pulse' : 'bg-muted-foreground'}`} />
            {myLocation ? 'GPS ativo' : 'Sem GPS'}
          </div>
          <button onClick={logout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Active delivery map */}
      {activeOrder && (
        <div className="mx-3 mt-3 rounded-2xl overflow-hidden border border-primary/30 shadow-glow" style={{ height: 240 }}>
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {myLocation && (
              <Marker position={myLocation} icon={meIcon}>
                <Popup>Você está aqui 🛵</Popup>
              </Marker>
            )}
            {activeOrder.deliveryCoords && (
              <>
                <Marker position={activeOrder.deliveryCoords} icon={destIcon}>
                  <Popup>{activeOrder.customerName}</Popup>
                </Marker>
                {myLocation && (
                  <Polyline positions={[myLocation, activeOrder.deliveryCoords]} color="#E53E3E" weight={3} dashArray="8,4" />
                )}
              </>
            )}
          </MapContainer>
        </div>
      )}

      {/* Stats bar */}
      <div className="px-3 py-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Entregas hoje', value: myOrders.length + state.orders.filter(o => o.delivererId === delivererId && o.status === 'delivered').length },
          { label: 'Pendentes', value: myOrders.length },
          { label: 'Concluídas', value: state.orders.filter(o => o.delivererId === delivererId && o.status === 'delivered').length },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="flex-1 px-3 pb-6 space-y-3">
        <h2 className="font-display font-semibold text-foreground px-1">
          {myOrders.length === 0 ? '🎉 Nenhuma entrega pendente' : `${myOrders.length} entrega(s) atribuída(s)`}
        </h2>

        {myOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <Pizza className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aguardando pedidos...</p>
            <p className="text-xs mt-1">O admin irá atribuir entregas para você</p>
          </div>
        )}

        {myOrders.map(order => {
          const isActive = activeOrderId === order.id;
          return (
            <div key={order.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${isActive ? 'border-primary shadow-glow' : 'border-border'}`}>
              {/* Order header */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-primary text-lg">#{order.number}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === 'delivering' ? 'status-delivering' : 'status-preparing'}`}>
                    {order.status === 'delivering' ? '🛵 Em entrega' : '⏳ Aguardando'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground font-medium">{order.customerName}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{order.deliveryAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={`tel:${order.customerPhone}`} className="text-primary hover:underline">{order.customerPhone}</a>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">R$ {order.total.toFixed(2)}</span>
                  <span>•</span>
                  <span>{order.paymentMethod === 'cash' ? '💵 Dinheiro' : order.paymentMethod === 'pix' ? '📱 PIX' : '💳 Cartão'}</span>
                  {order.notes && <span>• {order.notes}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                {order.status === 'preparing' && (
                  <button
                    onClick={() => startDelivery(order)}
                    className="flex-1 flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl shadow-glow hover:opacity-90 transition-all"
                  >
                    <PlayCircle className="w-4 h-4" /> Iniciar Entrega
                  </button>
                )}
                {order.status === 'delivering' && (
                  <>
                    <a
                      href={order.deliveryCoords
                        ? `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryCoords[0]},${order.deliveryCoords[1]}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground font-medium py-3 rounded-xl hover:bg-accent transition-colors text-sm"
                    >
                      <Navigation className="w-4 h-4" /> Navegar
                    </a>
                    <button
                      onClick={() => finishDelivery(order)}
                      className="flex-1 flex items-center justify-center gap-2 bg-status-delivered/20 text-status-delivered border border-status-delivered/30 font-semibold py-3 rounded-xl hover:bg-status-delivered/30 transition-all text-sm"
                    >
                      <CheckCircle className="w-4 h-4" /> Entregue!
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
