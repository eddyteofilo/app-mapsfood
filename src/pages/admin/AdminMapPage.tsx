import { useApp } from '@/hooks/use-app';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import * as L from 'leaflet';
import { useMemo } from 'react';
import { STATUS_LABELS } from '@/types';
import { Truck, MapPin, Pizza } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const pizzeriaIcon = L.divIcon({
  html: `<div style="background:hsl(5,87%,53%);width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  className: '',
});

const customerIcon = L.divIcon({
  html: `<div style="background:hsl(24,95%,55%);width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: '',
});

const delivererIcon = L.divIcon({
  html: `<div style="background:hsl(142,70%,45%);width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:16px">🛵</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: '',
});

export default function AdminMapPage() {
  const { state } = useApp();
  const { settings, orders, deliverers } = state;

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.deliveryCoords);
  const activeDeliverers = deliverers.filter(d => d.currentLocation);

  const allCoords = useMemo(() => {
    const coords: [number, number][] = [settings.coords];
    activeOrders.forEach(o => { if (o.deliveryCoords) coords.push(o.deliveryCoords); });
    activeDeliverers.forEach(d => { if (d.currentLocation) coords.push(d.currentLocation); });
    return coords;
  }, [settings.coords, activeOrders, activeDeliverers]);

  const center = settings.coords;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="p-4 md:p-6 pb-3">
        <h1 className="font-display text-2xl font-bold">Mapa ao Vivo</h1>
        <p className="text-muted-foreground text-sm">Pedidos e entregadores em tempo real</p>
      </div>

      {/* Legend */}
      <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-3">
        {[
          { color: 'bg-primary', label: 'Pizzaria' },
          { color: 'bg-secondary', label: 'Cliente' },
          { color: 'bg-status-delivered', label: 'Entregador' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`w-3 h-3 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{activeOrders.length} pedido(s) ativo(s)</span>
      </div>

      <div className="flex-1 mx-4 mb-4 md:mx-6 md:mb-6 rounded-2xl overflow-hidden border border-border min-h-[400px]">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', minHeight: 400 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Pizzeria */}
          {Array.isArray(settings.coords) && typeof settings.coords[0] === 'number' && (
            <Marker position={settings.coords} icon={pizzeriaIcon}>
              <Popup>
                <div className="text-sm font-semibold">🍕 {settings.name}</div>
                <div className="text-xs text-gray-500">{settings.address}</div>
              </Popup>
            </Marker>
          )}

          {/* Active orders */}
          {activeOrders.map(order => (
            <span key={order.id}>
              {order.deliveryCoords && (
                <>
                  <Marker position={order.deliveryCoords} icon={customerIcon}>
                    <Popup>
                      <div className="text-sm font-semibold">#{order.number} — {order.customerName}</div>
                      <div className="text-xs">{STATUS_LABELS[order.status]}</div>
                      <div className="text-xs text-gray-500">{order.deliveryAddress}</div>
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={[settings.coords, order.deliveryCoords]}
                    color="hsl(5, 87%, 53%)"
                    weight={2}
                    dashArray="6,6"
                    opacity={0.6}
                  />
                </>
              )}
            </span>
          ))}

          {/* Deliverers */}
          {activeDeliverers.map(d => (
            d.currentLocation && (
              <Marker key={d.id} position={d.currentLocation} icon={delivererIcon}>
                <Popup>
                  <div className="text-sm font-semibold">🛵 {d.name}</div>
                  <div className="text-xs">{d.vehicle}</div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>

      {activeOrders.length === 0 && (
        <div className="absolute inset-x-0 bottom-24 flex justify-center pointer-events-none">
          <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm text-muted-foreground flex items-center gap-2 shadow-md">
            <Pizza className="w-4 h-4 text-primary" />
            Nenhum pedido ativo com localização definida
          </div>
        </div>
      )}
    </div>
  );
}
