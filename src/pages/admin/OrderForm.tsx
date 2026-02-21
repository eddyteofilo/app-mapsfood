import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/hooks/use-app';
import { Order, OrderItem } from '@/types';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus, Trash2, Pizza, Search as SearchIcon, MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const destIcon = L.divIcon({
  html: `<div style="background:hsl(24,95%,55%);width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5)"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  className: '',
});

function MapEvents({ onLocationSelect }: { onLocationSelect: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function RecenterMap({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      map.setView(coords);
    }
  }, [coords, map]);
  return null;
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'card', label: 'Cartão' },
  { value: 'pix', label: 'PIX' },
] as const;

// Removido o mock fixo para usar o estado global

export default function OrderForm() {
  const { state, dispatch, nextOrderNumber, sendWebhook } = useApp();
  console.log('[OrderForm] MOUNTED', { stateReady: !!state, settingsReady: !!state?.settings });
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  console.log('[OrderForm] Rendering...', { id, isEdit: !!id });
  const isEdit = !!id;

  const existing = id ? state.orders.find(o => o.id === id) : null;

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    paymentMethod: 'pix' as Order['paymentMethod'],
    notes: '',
    delivererId: '',
    deliveryCoords: undefined as [number, number] | undefined,
  });
  const [items, setItems] = useState<OrderItem[]>([{ id: '', name: '', quantity: 1, price: 0 }]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        customerName: existing.customerName,
        customerPhone: existing.customerPhone,
        deliveryAddress: existing.deliveryAddress,
        paymentMethod: existing.paymentMethod,
        notes: existing.notes || '',
        delivererId: existing.delivererId || '',
        deliveryCoords: existing.deliveryCoords,
      });
      setItems(existing.items);
    }
  }, []);

  async function searchAddress() {
    if (!form.deliveryAddress) {
      toast({ title: 'Digite um endereço para buscar', variant: 'destructive' });
      return;
    }
    setSearching(true);
    try {
      if (state.settings.googleMapsApiKey) {
        // Usar Google Maps Geocoding
        const resp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(form.deliveryAddress)}&key=${state.settings.googleMapsApiKey}`
        );
        const data = await resp.json();

        if (data.status === 'OK' && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          setForm(f => ({ ...f, deliveryCoords: [lat, lng] }));
          toast({ title: '📍 Google Maps: Localização encontrada!' });
        } else {
          console.warn('[Google Geocode Error]', data);
          toast({
            title: 'Endereço não encontrado (Google)',
            description: data.error_message || 'Tente ser mais específico.',
            variant: 'destructive'
          });
        }
      } else {
        // Fallback para Nominatim (OSM)
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.deliveryAddress)}&limit=1`);
        const data = await resp.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setForm(f => ({ ...f, deliveryCoords: [parseFloat(lat), parseFloat(lon)] }));
          toast({ title: '📍 OSM: Localização encontrada!' });
        } else {
          toast({ title: 'Endereço não encontrado no mapa', description: 'Tente ser mais específico ou clique no mapa.' });
        }
      }
    } catch (err) {
      console.error('[Geocode Error]', err);
      toast({ title: 'Erro ao buscar endereço', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newItem = { ...item, [field]: value };

      // Auto-preço baseado no produto selecionado
      if (field === 'id' && typeof value === 'string') {
        const product = state.products.find(p => p.id === value);
        if (product) {
          newItem.name = product.name;
          newItem.price = (product.isPromo && product.promoPrice) ? product.promoPrice : product.price;
        }
      }

      return newItem;
    }));
  }

  function addItem() {
    setItems(prev => [...prev, { id: '', name: '', quantity: 1, price: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.deliveryAddress) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }
    if (items.some(i => !i.name)) {
      toast({ title: 'Preencha o nome de todos os itens', variant: 'destructive' });
      return;
    }

    const now = new Date().toISOString();

    const orderData = {
      customer_name: form.customerName,
      customer_phone: form.customerPhone,
      delivery_address: form.deliveryAddress,
      delivery_coords: form.deliveryCoords,
      items,
      total,
      payment_method: form.paymentMethod,
      deliverer_id: form.delivererId || null,
      notes: form.notes,
      updated_at: now,
    };

    try {
      if (isEdit && existing) {
        const { error } = await supabase
          .from('orders')
          .update(orderData)
          .eq('id', existing.id);

        if (error) throw error;
        toast({ title: 'Pedido atualizado!' });
      } else {
        const { data, error } = await supabase
          .from('orders')
          .insert([{
            ...orderData,
            status: 'received',
            created_at: now,
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          await sendWebhook(data as any, 'order_created');
          toast({ title: `✅ Pedido #${data.number} criado!`, description: `${form.customerName} — R$ ${total.toFixed(2)}` });
        }
      }
      navigate('/admin/orders');
    } catch (err: any) {
      console.error('[Supabase Save Error]', err);
      toast({
        title: 'Erro ao salvar pedido',
        description: err.message,
        variant: 'destructive'
      });
    }
  }

  if (!state || !state.settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }


  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">{isEdit ? 'Editar Pedido' : 'Novo Pedido'}</h1>
          <p className="text-muted-foreground text-sm">Preencha os dados do pedido</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Nome *</label>
              <input
                value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Nome do cliente"
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">WhatsApp/Telefone *</label>
              <input
                value={form.customerPhone}
                onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                placeholder="5511999999999"
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Endereço de entrega *</label>
            <div className="flex gap-2">
              <input
                value={form.deliveryAddress}
                onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                placeholder="Rua, número, bairro, cidade"
                className="flex-1 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
              <button
                type="button"
                onClick={searchAddress}
                disabled={searching}
                className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl hover:bg-primary/20 transition-all disabled:opacity-50"
                title="Localizar no mapa"
              >
                {searching ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <SearchIcon className="w-5 h-5" />}
              </button>
            </div>

            {/* Map Picker */}
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-muted" style={{ height: 200, minHeight: 180 }}>
              <MapContainer
                key={id || 'new'}
                center={(form.deliveryCoords && Array.isArray(form.deliveryCoords) && typeof form.deliveryCoords[0] === 'number')
                  ? form.deliveryCoords
                  : (state.settings.coords && Array.isArray(state.settings.coords) && typeof state.settings.coords[0] === 'number')
                    ? state.settings.coords
                    : [-23.5505, -46.6333]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapEvents onLocationSelect={(latlng) => setForm(f => ({ ...f, deliveryCoords: latlng }))} />
                <RecenterMap coords={form.deliveryCoords || state.settings.coords} />
                {form.deliveryCoords && Array.isArray(form.deliveryCoords) && typeof form.deliveryCoords[0] === 'number' && (
                  <Marker position={form.deliveryCoords} icon={destIcon} />
                )}
              </MapContainer>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">Clique no mapa para ajustar a localização exata 📍</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Pagamento</label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as Order['paymentMethod'] }))}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                {PAYMENT_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Entregador</label>
              <select
                value={form.delivererId}
                onChange={e => setForm(f => ({ ...f, delivererId: e.target.value }))}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="">Nenhum</option>
                {state.deliverers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Sem cebola, campainha, etc."
              rows={2}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Items */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">Itens do Pedido</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="flex-1">
                <select
                  value={item.id || 'custom'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      updateItem(idx, 'id', '');
                      updateItem(idx, 'name', '');
                      updateItem(idx, 'price', 0);
                    } else {
                      updateItem(idx, 'id', val);
                    }
                  }}
                  className="w-full bg-muted border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                >
                  <option value="custom">Outro item / Sob medida...</option>
                  {state.categories.map(cat => (
                    <optgroup key={cat.id} label={cat.name}>
                      {state.products.filter(p => p.categoryId === cat.id && p.available).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — R$ {((p.isPromo && p.promoPrice) ? p.promoPrice : p.price).toFixed(2)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {(item.id === '' || !item.id) && (
                  <input
                    value={item.name}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    placeholder="Digite o nome do item..."
                    className="w-full mt-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                )}
              </div>
              <div className="w-16">
                <label className="text-xs text-muted-foreground block mb-1">Qtd</label>
                <input
                  type="number" min={1}
                  value={item.quantity}
                  onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-full bg-muted border border-border rounded-lg px-2 py-2 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-muted-foreground block mb-1">Preço R$</label>
                <input
                  type="number" min={0} step={0.01}
                  value={item.price}
                  onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                  className="w-full bg-muted border border-border rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="mt-5 text-destructive hover:opacity-70 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-xl font-display font-bold text-primary">R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 bg-muted text-foreground font-medium py-3 rounded-xl hover:bg-accent transition-colors">
            Cancelar
          </button>
          <button type="submit"
            className="flex-1 gradient-hero text-white font-semibold py-3 rounded-xl shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <Pizza className="w-4 h-4" />
            {isEdit ? 'Salvar' : 'Criar Pedido'}
          </button>
        </div>
      </form>
    </div>
  );
}
