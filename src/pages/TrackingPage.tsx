import { useParams } from 'react-router-dom';
import { useApp } from '@/hooks/use-app';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import * as L from 'leaflet';
import { STATUS_LABELS, STATUS_ORDER, OrderStatus, PAYMENT_LABELS } from '@/types';
import { Pizza, CheckCircle, Clock, Truck, ShoppingBag, MapPin, Phone } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const pizzeriaIcon = L.divIcon({
  html: `<div style="background:hsl(5,87%,53%);width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:16px">🍕</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: '',
});

const deliveryIcon = L.divIcon({
  html: `<div style="background:hsl(24,95%,55%);width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  className: '',
});

const delivererIcon = L.divIcon({
  html: `<div style="background:hsl(142,70%,45%);width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:16px">🛵</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  className: '',
});

const STATUS_ICONS: Record<OrderStatus, React.ElementType> = {
  received: ShoppingBag,
  preparing: Clock,
  delivering: Truck,
  delivered: CheckCircle,
};

function StatusStep({ status, currentStatus, label }: { status: OrderStatus; currentStatus: OrderStatus; label: string }) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const stepIndex = STATUS_ORDER.indexOf(status);
  const isDone = stepIndex < currentIndex;
  const isActive = stepIndex === currentIndex;
  const Icon = STATUS_ICONS[status];

  const statusClass = isDone || isActive
    ? isActive
      ? status === 'received' ? 'status-received' : status === 'preparing' ? 'status-preparing' : status === 'delivering' ? 'status-delivering' : 'status-delivered'
      : 'status-delivered'
    : 'bg-muted text-muted-foreground border border-border';

  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${statusClass} ${isActive ? 'animate-pulse-glow' : ''}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={`text-xs text-center leading-tight ${isDone || isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

export default function TrackingPage() {
  const { orderId } = useParams();
  const { state } = useApp();

  const order = state.orders.find(o => o.id === orderId);
  const settings = state.settings;
  const deliverer = order ? state.deliverers.find(d => d.id === order.delivererId) : null;

  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  // Sincronizar rota em tempo real
  useEffect(() => {
    if (order?.status === 'delivering' && deliverer?.currentLocation && order.deliveryCoords && settings.googleMapsApiKey) {
      const fetchRoute = async () => {
        try {
          const origin = `${deliverer.currentLocation[0]},${deliverer.currentLocation[1]}`;
          const destination = `${order.deliveryCoords[0]},${order.deliveryCoords[1]}`;
          const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${settings.googleMapsApiKey}`;

          const resp = await fetch(url);
          const data = await resp.json();

          if (data.status === 'OK' && data.routes.length > 0) {
            const route = data.routes[0];
            const leg = route.legs[0];

            setDistance(leg.distance.text);
            setDuration(leg.duration.text);

            // Decodifica a polyline (simplificado: pegando os pontos principais dos passos)
            const points: [number, number][] = [];
            route.legs[0].steps.forEach((step: any) => {
              points.push([step.end_location.lat, step.end_location.lng]);
            });
            setRoutePoints(points);
          }
        } catch (error) {
          console.error('[Directions Error]', error);
        }
      };

      fetchRoute();
      const interval = setInterval(fetchRoute, 15000); // Atualiza a cada 15s
      return () => clearInterval(interval);
    }
  }, [order?.status, deliverer?.currentLocation, order?.deliveryCoords, settings.googleMapsApiKey]);

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <Pizza className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
          <h1 className="font-display text-2xl font-bold text-foreground">Pedido não encontrado</h1>
          <p className="text-muted-foreground mt-2">Verifique o link ou contate a pizzaria.</p>
        </div>
      </div>
    );
  }

  const mapCenter = order.deliveryCoords || settings.coords;
  const isDelivering = order.status === 'delivering';

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="gradient-hero px-4 pt-10 pb-8 text-center flex flex-col items-center">
        <img
          src="/logo.png"
          alt={settings.name || 'EmRota'}
          className="h-12 w-auto object-contain mb-4 drop-shadow-md"
        />
        <h1 className="font-display text-2xl font-bold text-white">Pedido #{order.number}</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-3 pb-8 space-y-4">
        {/* Status card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-md">
          <h2 className="font-display font-semibold text-center text-foreground mb-5">
            {order.status === 'delivered' ? '🎉 Pedido entregue!' : '📍 Acompanhe seu pedido'}
          </h2>

          {/* Steps */}
          <div className="relative flex items-start">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border mx-5" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-primary mx-5 transition-all duration-700"
              style={{ right: `${((3 - STATUS_ORDER.indexOf(order.status)) / 3) * 100}%` }}
            />
            {STATUS_ORDER.map(s => (
              <StatusStep key={s} status={s} currentStatus={order.status} label={STATUS_LABELS[s]} />
            ))}
          </div>

          {/* Current status message */}
          <div className={`mt-5 p-3 rounded-xl text-center text-sm font-medium ${order.status === 'received' ? 'status-received' :
            order.status === 'preparing' ? 'status-preparing' :
              order.status === 'delivering' ? 'status-delivering' : 'status-delivered'
            }`}>
            {order.status === 'received' && '✅ Recebemos seu pedido! Já vamos começar a preparar.'}
            {order.status === 'preparing' && '👨‍🍳 Sua pizza está sendo preparada com carinho!'}
            {order.status === 'delivering' && (
              <div className="space-y-1">
                <p>🛵 Seu pedido saiu! Chegando em breve!</p>
                {duration && <p className="text-xs opacity-80">Previsão: Chega em {duration} ({distance})</p>}
              </div>
            )}
            {order.status === 'delivered' && '🎊 Entregue! Bom apetite!'}
          </div>
        </div>

        {/* Map */}
        {(order.deliveryCoords || isDelivering) && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-display font-semibold text-foreground text-sm">Rastreio no mapa</h3>
            </div>
            <div style={{ height: 220 }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={settings.coords} icon={pizzeriaIcon}>
                  <Popup>🍕 {settings.name}</Popup>
                </Marker>
                {order.deliveryCoords && (
                  <>
                    <Marker position={order.deliveryCoords} icon={deliveryIcon}>
                      <Popup>📍 Seu endereço</Popup>
                    </Marker>
                    {/* Se não houver rota do Google, mostra a linha reta tracejada */}
                    {routePoints.length === 0 && (
                      <Polyline positions={[settings.coords, order.deliveryCoords]} color="#E53E3E" weight={3} dashArray="8,4" opacity={0.7} />
                    )}
                  </>
                )}
                {/* Rota real do Google Maps */}
                {routePoints.length > 0 && deliverer?.currentLocation && (
                  <Polyline positions={[deliverer.currentLocation, ...routePoints]} color="#3B82F6" weight={5} opacity={0.8} />
                )}
                {deliverer?.currentLocation && (
                  <Marker position={deliverer.currentLocation} icon={delivererIcon}>
                    <Popup>🛵 {deliverer.name}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Deliverer info */}
        {deliverer && order.status === 'delivering' && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">🛵</div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{deliverer.name}</p>
              <p className="text-xs text-muted-foreground">{deliverer.vehicle}</p>
            </div>
            <a
              href={`https://wa.me/${deliverer.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-2 rounded-xl hover:bg-green-500/20 transition-colors"
            >
              <Phone className="w-3 h-3" /> Chamar
            </a>
          </div>
        )}

        {/* Order details */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h3 className="font-display font-semibold text-foreground">Detalhes do pedido</h3>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{order.deliveryAddress}</span>
          </div>

          <div className="space-y-1.5 bg-muted rounded-xl p-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-foreground">{item.quantity}x {item.name}</span>
                <span className="text-muted-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-semibold text-sm">
              <span className="text-foreground">Total</span>
              <span className="text-primary">R$ {order.total.toFixed(2)}</span>
            </div>
            <div className="text-xs text-muted-foreground">{PAYMENT_LABELS[order.paymentMethod]}</div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-1">
            Pedido feito em {new Date(order.createdAt).toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Call pizzeria */}
        <a
          href={`https://wa.me/${settings.phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-green-500/10 text-green-400 border border-green-500/30 py-3 rounded-2xl hover:bg-green-500/20 transition-colors font-medium text-sm"
        >
          <Phone className="w-4 h-4" /> Falar com a pizzaria
        </a>
      </div>
    </div>
  );
}
