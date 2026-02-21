// ============================================================
// PIZZA TRACK — Global Types
// ============================================================

export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'delivering'
  | 'delivered';

export interface Deliverer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  document?: string;
  vehicle: string; // Resumo do veículo (ex: "Moto Honda CG")
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  available: boolean;
  currentLocation?: [number, number]; // [lat, lng]
}

export interface OrderItem {
  id: string; // Referência ao ID do produto
  name: string;
  variantName?: string; // Nome da variação selecionada (ex: Grande, Chocolate)
  quantity: number;
  price: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price?: number; // Preço específico da variante (substitui o base se presente)
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number;
  categoryId: string;
  image?: string; // Base64 ou URL após upload
  available: boolean;
  isPromo: boolean;
  isFeatured?: boolean; // Novo campo para o Pop-up de Oferta Bônus
  variants?: ProductVariant[]; // Opções como Tamanho ou Sabor
}

export interface Order {
  id: string;
  number: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryCoords?: [number, number]; // [lat, lng]
  items: OrderItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'pix';
  status: OrderStatus;
  delivererId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  whatsappSent?: boolean;
}

export interface PizzeriaSettings {
  name: string;
  address: string;
  coords: [number, number]; // [lat, lng]
  phone: string;
  openTime: string;
  closeTime: string;
  // n8n webhook
  webhookUrl: string;
  webhookEnabled: boolean;
  // WhatsApp API
  whatsappProvider: 'none' | 'official' | 'evolution';
  whatsappApiUrl: string;
  whatsappApiKey: string;
  whatsappInstanceName: string;
  whatsappPhoneNumberId: string; // For official API
  // Google Maps
  googleMapsApiKey: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface AppState {
  orders: Order[];
  deliverers: Deliverer[];
  products: Product[];
  categories: Category[];
  cart: CartItem[]; // Novo estado para o carrinho
  settings: PizzeriaSettings;
  currentUser: { role: 'admin' | 'deliverer'; delivererId?: string } | null;
}

export type StatusLabel = {
  [K in OrderStatus]: string;
};

export const STATUS_LABELS: StatusLabel = {
  received: 'Recebido',
  preparing: 'Preparando',
  delivering: 'Saiu para entrega',
  delivered: 'Entregue',
};

export const STATUS_ORDER: OrderStatus[] = ['received', 'preparing', 'delivering', 'delivered'];

export const PAYMENT_LABELS: Record<Order['paymentMethod'], string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'PIX',
};

export const DEFAULT_SETTINGS: PizzeriaSettings = {
  name: 'Pizzaria Bella Napoli',
  address: 'Rua das Pizzas, 123 - Centro',
  coords: [-23.5505, -46.6333],
  phone: '5511999999999',
  openTime: '18:00',
  closeTime: '23:30',
  webhookUrl: '',
  webhookEnabled: false,
  whatsappProvider: 'none',
  whatsappApiUrl: '',
  whatsappApiKey: '',
  whatsappInstanceName: '',
  whatsappPhoneNumberId: '',
  googleMapsApiKey: '',
};

export const MOCK_DELIVERERS: Deliverer[] = [
  { id: 'd1', name: 'Carlos Motoboy', phone: '5511988880001', vehicle: 'Moto Honda CG 150', available: true },
  { id: 'd2', name: 'João Delivery', phone: '5511988880002', vehicle: 'Bicicleta Elétrica', available: true },
  { id: 'd3', name: 'Pedro Rápido', phone: '5511988880003', vehicle: 'Moto Yamaha Fazer', available: false },
];
