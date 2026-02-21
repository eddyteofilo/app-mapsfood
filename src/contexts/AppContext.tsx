import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  AppState,
  Order,
  Deliverer,
  PizzeriaSettings,
  DEFAULT_SETTINGS,
  MOCK_DELIVERERS,
  OrderStatus,
  Product,
  ProductVariant,
} from '@/types';
import { supabase } from '@/lib/supabase';


// ─── Storage Keys ────────────────────────────────────────────
const STORAGE_KEYS = {
  orders: 'pt_orders',
  deliverers: 'pt_deliverers',
  settings: 'pt_settings',
  user: 'pt_user',
  orderCounter: 'pt_counter',
  products: 'pt_products',
  categories: 'pt_categories',
  cart: 'pt_cart',
};

// ─── Helpers ─────────────────────────────────────────────────
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    // Para objetos (como settings), faz o merge para garantir que novas chaves existam
    if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed };
    }
    return parsed;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Erro crítico ao salvar [${key}] no localStorage. Possível limite atingido.`, e);
    // Se estourar a cota, avisamos globalmente
    if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      alert("ALERTA: Memória do navegador cheia! O produto não foi salvo. Como você está usando o limite de 3MB por foto, a memória lota rápido. Tente fotos menores ou limpe o banco nas Configurações.");
    }
    return false;
  }
}


// ─── Actions ─────────────────────────────────────────────────
type Action =
  | { type: 'SET_USER'; payload: AppState['currentUser'] }
  | { type: 'LOGOUT' }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: Order }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { id: string; status: OrderStatus } }
  | { type: 'ASSIGN_DELIVERER'; payload: { orderId: string; delivererId: string } }
  | { type: 'UPDATE_DELIVERER_LOCATION'; payload: { id: string; location: [number, number] } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<PizzeriaSettings> }
  | { type: 'ADD_DELIVERER'; payload: Deliverer }
  | { type: 'UPDATE_DELIVERER'; payload: Deliverer }
  | { type: 'DELETE_DELIVERER'; payload: string }
  | { type: 'ADD_PRODUCT'; payload: AppState['products'][0] }
  | { type: 'UPDATE_PRODUCT'; payload: AppState['products'][0] }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'RESET_PRODUCTS' }
  | { type: 'ADD_CATEGORY'; payload: AppState['categories'][0] }
  | { type: 'UPDATE_CATEGORY'; payload: AppState['categories'][0] }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'ADD_TO_CART'; payload: { product: Product; variant?: ProductVariant } }
  | { type: 'REMOVE_FROM_CART'; payload: { id: string; variantId?: string } }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { id: string; variantId?: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_CATEGORIES'; payload: AppState['categories'] };


// ─── Reducer ─────────────────────────────────────────────────
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'ADD_ORDER': {
      const orders = [action.payload, ...state.orders];
      saveToStorage(STORAGE_KEYS.orders, orders);
      return { ...state, orders };
    }
    case 'UPDATE_ORDER': {
      const orders = state.orders.map(o => o.id === action.payload.id ? action.payload : o);
      saveToStorage(STORAGE_KEYS.orders, orders);
      return { ...state, orders };
    }
    case 'DELETE_ORDER': {
      const orders = state.orders.filter(o => o.id !== action.payload);
      saveToStorage(STORAGE_KEYS.orders, orders);
      return { ...state, orders };
    }
    case 'UPDATE_ORDER_STATUS': {
      const orders = state.orders.map(o =>
        o.id === action.payload.id
          ? { ...o, status: action.payload.status, updatedAt: new Date().toISOString() }
          : o
      );
      saveToStorage(STORAGE_KEYS.orders, orders);
      return { ...state, orders };
    }
    case 'ASSIGN_DELIVERER': {
      const orders = state.orders.map(o =>
        o.id === action.payload.orderId
          ? { ...o, delivererId: action.payload.delivererId, updatedAt: new Date().toISOString() }
          : o
      );
      saveToStorage(STORAGE_KEYS.orders, orders);
      return { ...state, orders };
    }
    case 'UPDATE_DELIVERER_LOCATION': {
      const deliverers = state.deliverers.map(d =>
        d.id === action.payload.id ? { ...d, currentLocation: action.payload.location } : d
      );
      saveToStorage(STORAGE_KEYS.deliverers, deliverers);
      return { ...state, deliverers };
    }
    case 'UPDATE_SETTINGS': {
      const settings = { ...state.settings, ...action.payload };
      saveToStorage(STORAGE_KEYS.settings, settings);
      return { ...state, settings };
    }
    case 'ADD_DELIVERER': {
      const deliverers = [...state.deliverers, action.payload];
      saveToStorage(STORAGE_KEYS.deliverers, deliverers);
      return { ...state, deliverers };
    }
    case 'UPDATE_DELIVERER': {
      const deliverers = state.deliverers.map(d => d.id === action.payload.id ? action.payload : d);
      saveToStorage(STORAGE_KEYS.deliverers, deliverers);
      return { ...state, deliverers };
    }
    case 'DELETE_DELIVERER': {
      const deliverers = state.deliverers.filter(d => d.id !== action.payload);
      saveToStorage(STORAGE_KEYS.deliverers, deliverers);
      return { ...state, deliverers };
    }
    case 'ADD_PRODUCT': {
      const products = [...state.products, action.payload];
      saveToStorage(STORAGE_KEYS.products, products);
      return { ...state, products };
    }
    case 'UPDATE_PRODUCT': {
      const products = state.products.map(p => p.id === action.payload.id ? action.payload : p);
      saveToStorage(STORAGE_KEYS.products, products);
      return { ...state, products };
    }
    case 'DELETE_PRODUCT': {
      const products = state.products.filter(p => p.id !== action.payload);
      saveToStorage(STORAGE_KEYS.products, products);
      return { ...state, products };
    }
    case 'RESET_PRODUCTS': {
      saveToStorage(STORAGE_KEYS.products, []);
      return { ...state, products: [] };
    }

    case 'ADD_CATEGORY': {
      const categories = [...state.categories, action.payload];
      saveToStorage(STORAGE_KEYS.categories, categories);
      return { ...state, categories };
    }
    case 'UPDATE_CATEGORY': {
      const categories = state.categories.map(c => c.id === action.payload.id ? action.payload : c);
      saveToStorage(STORAGE_KEYS.categories, categories);
      return { ...state, categories };
    }
    case 'DELETE_CATEGORY': {
      const categories = state.categories.filter(c => c.id !== action.payload);
      saveToStorage(STORAGE_KEYS.categories, categories);
      return { ...state, categories };
    }
    case 'ADD_TO_CART': {
      const { product, variant } = action.payload as { product: Product, variant?: ProductVariant };
      const cartId = variant ? `${product.id}-${variant.id}` : product.id;

      const existing = state.cart.find(item => {
        const itemCartId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
        return itemCartId === cartId;
      });

      let newCart;
      if (existing) {
        newCart = state.cart.map(item => {
          const itemCartId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
          return itemCartId === cartId ? { ...item, quantity: item.quantity + 1 } : item;
        });
      } else {
        newCart = [...state.cart, { ...product, quantity: 1, selectedVariant: variant }];
      }
      saveToStorage(STORAGE_KEYS.cart, newCart);
      return { ...state, cart: newCart };
    }
    case 'REMOVE_FROM_CART': {
      const { id, variantId } = action.payload as { id: string; variantId?: string };
      const newCart = state.cart.filter(item => {
        const itemVariantId = item.selectedVariant?.id;
        return !(item.id === id && itemVariantId === variantId);
      });
      saveToStorage(STORAGE_KEYS.cart, newCart);
      return { ...state, cart: newCart };
    }
    case 'UPDATE_CART_QUANTITY': {
      const { id, variantId, quantity } = action.payload as { id: string; variantId?: string; quantity: number };
      const newCart = state.cart.map(item => {
        const itemVariantId = item.selectedVariant?.id;
        return (item.id === id && itemVariantId === variantId) ? { ...item, quantity } : item;
      });
      saveToStorage(STORAGE_KEYS.cart, newCart);
      return { ...state, cart: newCart };
    }
    case 'CLEAR_CART': {
      saveToStorage(STORAGE_KEYS.cart, []);
      return { ...state, cart: [] };
    }
    case 'SET_PRODUCTS': {
      saveToStorage(STORAGE_KEYS.products, action.payload);
      return { ...state, products: action.payload };
    }
    case 'SET_CATEGORIES': {
      saveToStorage(STORAGE_KEYS.categories, action.payload);
      return { ...state, categories: action.payload };
    }
    default:
      return state;
  }
}


// ─── Context ─────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  nextOrderNumber: () => number;
  sendWebhook: (order: Order, event: string) => Promise<void>;
  generateWhatsAppMessage: (order: Order, type: 'received' | 'delivering' | 'delivered') => string;
  sendWhatsAppMessage: (phone: string, message: string) => Promise<boolean>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const sanitizeCoords = (coords: any): [number, number] => {
    if (Array.isArray(coords) && coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return coords as [number, number];
    }
    // Tenta converter se for string ou array de strings
    try {
      const c = typeof coords === 'string' ? JSON.parse(coords) : coords;
      if (Array.isArray(c) && c.length === 2) {
        const lat = parseFloat(c[0]);
        const lng = parseFloat(c[1]);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
      }
    } catch { }
    return [-23.5505, -46.6333]; // Fallback São Paulo
  };

  const initialState: AppState = {
    orders: loadFromStorage(STORAGE_KEYS.orders, []).map(o => ({
      ...o,
      deliveryCoords: o.deliveryCoords ? sanitizeCoords(o.deliveryCoords) : undefined
    })),
    deliverers: loadFromStorage(STORAGE_KEYS.deliverers, MOCK_DELIVERERS),
    settings: {
      ...loadFromStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
      coords: sanitizeCoords(loadFromStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS).coords)
    },
    currentUser: loadFromStorage(STORAGE_KEYS.user, null),
    products: loadFromStorage(STORAGE_KEYS.products, []),
    categories: [], // Inicia vazio para forçar o carregamento do banco e evitar IDs de mock (cat1, cat2...)
    cart: loadFromStorage(STORAGE_KEYS.cart, []),
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Carregar dados do Supabase ao iniciar
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Carregar Categorias
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');

        if (catError) throw catError;

        if (catData && catData.length > 0) {
          dispatch({ type: 'SET_CATEGORIES', payload: catData });
        }

        // Carregar Produtos
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('id, name, description, price, promo_price, category_id, image_url, available, is_promo, variants');

        if (prodError) throw prodError;

        if (prodData) {
          // Normaliza os IDs e campos que podem vir do banco
          const normalizedProducts = prodData.map(p => ({
            ...p,
            id: p.id.toString(), // Garante que o ID seja string como o resto do app espera
            categoryId: p.category_id,
            image: p.image_url, // Mapeia para o campo correto esperado pelo frontend
            promoPrice: p.promo_price,
            isPromo: p.is_promo,
            available: p.available ?? true,
            variants: Array.isArray(p.variants) ? p.variants : []
          }));
          dispatch({ type: 'SET_PRODUCTS', payload: normalizedProducts });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do Supabase:', error);
      }
    }
    loadInitialData();
  }, [dispatch]);


  // Persist user

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.user, state.currentUser);
  }, [state.currentUser]);

  // Sincronização entre abas (Cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Se houver mudança em produtos, categorias ou configurações em outra aba, recarrega
      if (e.key === STORAGE_KEYS.products || e.key === STORAGE_KEYS.categories || e.key === STORAGE_KEYS.settings) {
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);


  const nextOrderNumber = useCallback(() => {
    const current = loadFromStorage<number>(STORAGE_KEYS.orderCounter, 0);
    const next = (Number(current) || 0) + 1;
    saveToStorage(STORAGE_KEYS.orderCounter, next);
    return next;
  }, []);

  // ─── n8n Webhook ───────────────────────────────────────────
  const sendWebhook = useCallback(async (order: Order, event: string) => {
    const { settings } = state;
    if (!settings.webhookEnabled || !settings.webhookUrl) return;

    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          pizzeria: settings.name,
          order: {
            id: order.id,
            number: order.number,
            customer: order.customerName,
            phone: order.customerPhone,
            address: order.deliveryAddress,
            total: order.total,
            status: order.status,
            paymentMethod: order.paymentMethod,
            notes: order.notes,
            createdAt: order.createdAt,
            items: order.items.map(i => ({
              id: i.id,
              name: i.name,
              variant: i.variantName,
              quantity: i.quantity,
              price: i.price
            }))
          },
        }),
      });
    } catch (err) {
      console.error('[Webhook] Error sending to n8n:', err);
    }
  }, [state]);

  // ─── WhatsApp message generators ───────────────────────────
  const generateWhatsAppMessage = useCallback(
    (order: Order, type: 'received' | 'delivering' | 'delivered'): string => {
      const { settings } = state;
      const baseUrl = window.location.origin;
      const trackUrl = `${baseUrl}/track/${order.id}`;

      const messages = {
        received: `🍕 *${settings.name}*\n\nOlá, *${order.customerName}*! ✅\n\nSeu pedido *#${order.number}* foi *recebido* e já está sendo preparado com todo carinho!\n\n📦 *Itens:*\n${order.items.map(i => `• ${i.quantity}x ${i.name}`).join('\n')}\n\n💰 *Total:* R$ ${order.total.toFixed(2)}\n💳 *Pagamento:* ${order.paymentMethod === 'cash' ? 'Dinheiro' : order.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}\n\n🔍 *Rastreie seu pedido:*\n${trackUrl}\n\n_Tempo estimado: 30-45 min_ ⏱️`,
        delivering: `🛵 *${settings.name}*\n\n${order.customerName}, seu pedido *#${order.number}* *saiu para entrega!* 🎉\n\n🔍 *Acompanhe em tempo real:*\n${trackUrl}\n\n_Seu pedido está a caminho! Prepare-se_ 🍕`,
        delivered: `✅ *${settings.name}*\n\n${order.customerName}, seu pedido *#${order.number}* foi *entregue!* 🎊\n\nObrigado por escolher a *${settings.name}*!\n\n_Bom apetite!_ 🍕❤️\n\n⭐ Ficou satisfeito? Compartilhe sua experiência!`,
      };

      return messages[type];
    },
    [state]
  );

  // ─── WhatsApp API send ──────────────────────────────────────
  const sendWhatsAppMessage = useCallback(
    async (phone: string, message: string): Promise<boolean> => {
      const { settings } = state;
      if (settings.whatsappProvider === 'none') return false;

      try {
        if (settings.whatsappProvider === 'evolution') {
          // Evolution API v2
          const response = await fetch(
            `${settings.whatsappApiUrl}/message/sendText/${settings.whatsappInstanceName}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': settings.whatsappApiKey,
              },
              body: JSON.stringify({
                number: phone,
                text: message,
              }),
            }
          );
          return response.ok;
        } else if (settings.whatsappProvider === 'official') {
          // Meta Official API
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${settings.whatsappPhoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.whatsappApiKey}`,
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'text',
                text: { body: message },
              }),
            }
          );
          return response.ok;
        }
      } catch (err) {
        console.error('[WhatsApp] Error sending message:', err);
      }
      return false;
    },
    [state]
  );

  // Otimização: Memoizar o valor do contexto para evitar re-renderizações desnecessárias
  const value = React.useMemo(() => ({
    state,
    dispatch,
    nextOrderNumber,
    sendWebhook,
    generateWhatsAppMessage,
    sendWhatsAppMessage
  }), [
    state.currentUser,
    state.settings,
    state.deliverers,
    state.products,
    state.categories,
    state.orders,
    dispatch,
    nextOrderNumber,
    sendWebhook,
    generateWhatsAppMessage,
    sendWhatsAppMessage
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}


