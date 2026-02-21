import { useState } from 'react';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/hooks/use-toast';
import {
  Settings, Webhook, MessageCircle, Clock, MapPin, Save,
  ChevronDown, ChevronUp, ExternalLink, Eye, EyeOff, Package, Trash2,
  Upload, ImageIcon, Share2, MousePointer2, Smartphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-semibold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">{children}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground block mb-1.5">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls = "w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";

export default function AdminSettings() {
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  const [settings, setSettings] = useState(state.settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  function update(field: string, value: any) {
    setSettings(s => ({ ...s, [field]: value }));
  }

  function save() {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    toast({ title: '✅ Configurações salvas!' });
  }

  async function testWebhook() {
    if (!settings.webhookUrl) {
      toast({ title: 'Informe a URL do webhook', variant: 'destructive' });
      return;
    }
    setTestingWebhook(true);
    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          message: 'Teste de conexão PizzaTrack → Webhook',
          pizzeria: settings.name,
          details: 'Se você está vendo isso, sua integração está funcionando!'
        }),
      });
      toast({ title: '✅ Webhook enviado!', description: 'Verifique o seu destino (n8n, etc).' });
    } catch {
      toast({ title: 'Erro ao enviar webhook', variant: 'destructive' });
    } finally {
      setTestingWebhook(false);
    }
  }

  async function handleFileUpload(file: File, field: keyof typeof settings) {
    if (!file) return;

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é 2MB.', variant: 'destructive' });
      return;
    }

    const toastId = toast({ title: 'Enviando imagem...', description: 'Aguarde um momento.' });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${String(field)}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('branding')
        .getPublicUrl(filePath);

      update(String(field), data.publicUrl);
      toast({ title: '✅ Upload concluído!' });
    } catch (err: any) {
      console.error('[Upload Error]', err);
      toast({ title: 'Erro ao enviar imagem', description: 'Verifique se o balde "branding" existe no seu Supabase Storage.', variant: 'destructive' });
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-sm">Pizzaria, integrações e APIs</p>
        </div>
        <button
          onClick={save}
          className="flex items-center gap-2 gradient-hero text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-glow hover:opacity-90 transition-all"
        >
          <Save className="w-4 h-4" /> Salvar
        </button>
      </div>

      {/* Pizzaria */}
      <Section title="Dados da Pizzaria" icon={Settings}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nome da pizzaria">
            <input value={settings.name} onChange={e => update('name', e.target.value)} className={inputCls} placeholder="Bella Napoli" />
          </Field>
          <Field label="WhatsApp (com DDI)">
            <input value={settings.phone} onChange={e => update('phone', e.target.value)} className={inputCls} placeholder="5511999999999" />
          </Field>
        </div>
        <Field label="Endereço (ponto de saída)">
          <input value={settings.address} onChange={e => update('address', e.target.value)} className={inputCls} placeholder="Rua das Pizzas, 123" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Coordenada Lat">
            <input
              type="number" step="0.0001"
              value={Array.isArray(settings.coords) ? settings.coords[0] : ''}
              onChange={e => {
                const lat = parseFloat(e.target.value);
                const lng = Array.isArray(settings.coords) ? settings.coords[1] : 0;
                update('coords', [lat, lng]);
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Coordenada Lng">
            <input
              type="number" step="0.0001"
              value={Array.isArray(settings.coords) ? settings.coords[1] : ''}
              onChange={e => {
                const lng = parseFloat(e.target.value);
                const lat = Array.isArray(settings.coords) ? settings.coords[0] : 0;
                update('coords', [lat, lng]);
              }}
              className={inputCls}
            />
          </Field>
          <button
            type="button"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  update('coords', [pos.coords.latitude, pos.coords.longitude]);
                  toast({ title: '📍 Coordenadas atualizadas!' });
                });
              }
            }}
            className="col-span-2 text-xs text-primary hover:underline flex items-center justify-center gap-1 mt-1"
          >
            <MapPin className="w-3 h-3" /> Usar minha localização atual (GPS)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Abre">
            <input type="time" value={settings.openTime} onChange={e => update('openTime', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fecha">
            <input type="time" value={settings.closeTime} onChange={e => update('closeTime', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* n8n Webhook */}
      <Section title="Webhook n8n" icon={Webhook}>
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Como funciona:</p>
          <p>A cada novo pedido ou mudança de status, o PizzaTrack envia os dados automaticamente para o seu workflow no n8n. Configure a URL do Webhook Trigger no n8n abaixo.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Ativar webhook</span>
          <button
            onClick={() => update('webhookEnabled', !settings.webhookEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${settings.webhookEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.webhookEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <Field label="URL do Webhook (n8n)" hint="Cole a URL do seu 'Webhook Trigger' no n8n">
          <input
            value={settings.webhookUrl}
            onChange={e => update('webhookUrl', e.target.value)}
            className={inputCls}
            placeholder="https://seu-n8n.app.n8n.cloud/webhook/xxxx"
          />
        </Field>

        <div className="flex gap-3">
          <button
            onClick={testWebhook}
            disabled={testingWebhook || !settings.webhookUrl}
            className="flex items-center gap-2 text-sm bg-primary/10 text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {testingWebhook ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Webhook className="w-4 h-4" />}
            Testar Webhook
          </button>
          <a
            href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Docs n8n
          </a>
        </div>

        <div className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
          <p className="font-semibold mb-1">Eventos enviados:</p>
          <div className="grid grid-cols-2 gap-1">
            {['order_created', 'order_received', 'order_preparing', 'order_delivering', 'order_delivered'].map(e => (
              <span key={e} className="font-mono bg-card px-2 py-0.5 rounded">{e}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* WhatsApp */}
      <Section title="WhatsApp API" icon={MessageCircle}>
        <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Integração com WhatsApp</p>
          <p>Escolha entre a API Oficial do Meta ou a Evolution API (open source) para envio automático de notificações.</p>
        </div>

        <Field label="Provedor WhatsApp">
          <select
            value={settings.whatsappProvider}
            onChange={e => update('whatsappProvider', e.target.value)}
            className={inputCls}
          >
            <option value="none">Desativado</option>
            <option value="evolution">Evolution API (Open Source)</option>
            <option value="official">API Oficial Meta/WhatsApp Business</option>
          </select>
        </Field>

        {settings.whatsappProvider === 'evolution' && (
          <>
            <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Evolution API v2</p>
              <p>Self-hosted ou Evolution Cloud. Configure a URL base da sua instância e a API Key.</p>
              <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 mt-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> Documentação Evolution API
              </a>
            </div>
            <Field label="URL da Evolution API" hint="Ex: https://api.seudominio.com.br ou https://api.evolution-api.com">
              <input value={settings.whatsappApiUrl} onChange={e => update('whatsappApiUrl', e.target.value)} className={inputCls} placeholder="https://api.evolution-api.com" />
            </Field>
            <Field label="Nome da Instância">
              <input value={settings.whatsappInstanceName} onChange={e => update('whatsappInstanceName', e.target.value)} className={inputCls} placeholder="minha-pizzaria" />
            </Field>
            <Field label="API Key">
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.whatsappApiKey}
                  onChange={e => update('whatsappApiKey', e.target.value)}
                  className={inputCls + ' pr-10'}
                  placeholder="••••••••••••"
                />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          </>
        )}

        {settings.whatsappProvider === 'official' && (
          <>
            <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">API Oficial Meta WhatsApp Business</p>
              <p>Requer conta verificada no Meta Business Manager e acesso aprovado à WhatsApp Business API.</p>
              <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 mt-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> Documentação Meta Cloud API
              </a>
            </div>
            <Field label="Phone Number ID" hint="ID do número no Meta Business Manager">
              <input value={settings.whatsappPhoneNumberId} onChange={e => update('whatsappPhoneNumberId', e.target.value)} className={inputCls} placeholder="123456789012345" />
            </Field>
            <Field label="Access Token (Permanent)">
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.whatsappApiKey}
                  onChange={e => update('whatsappApiKey', e.target.value)}
                  className={inputCls + ' pr-10'}
                  placeholder="EAAxxxxxx..."
                />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          </>
        )}

        {settings.whatsappProvider !== 'none' && (
          <div className="text-xs text-muted-foreground bg-muted rounded-xl p-3">
            <p className="font-semibold mb-1">Mensagens automáticas enviadas quando:</p>
            <ul className="space-y-0.5">
              <li>• Status muda para <span className="text-foreground font-medium">Recebido</span></li>
              <li>• Status muda para <span className="text-foreground font-medium">Saiu para entrega</span></li>
              <li>• Status muda para <span className="text-foreground font-medium">Entregue</span></li>
            </ul>
          </div>
        )}
      </Section>

      {/* Google Maps */}
      <Section title="Google Maps Platform" icon={MapPin}>
        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Geocodificação e Mapas</p>
          <p>O Google Maps é usado para encontrar a localização exata dos clientes a partir do endereço e mostrar o trajeto no mapa de rastreio.</p>
          <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 mt-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Obter API Key no Google Cloud
          </a>
        </div>

        <Field label="Google Maps API Key" hint="Necessário para Geocoding e Mapas Premium">
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.googleMapsApiKey}
              onChange={e => update('googleMapsApiKey', e.target.value)}
              className={inputCls + ' pr-10'}
              placeholder="AIzaSy..."
            />
            <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>
      </Section>

      {/* Identidade Visual */}
      <Section title="Identidade Visual" icon={ImageIcon}>
        <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Customização da Marca</p>
          <p>Altere as imagens que o seu cliente vê ao acessar o site, compartilhar no WhatsApp ou instalar o app.</p>
        </div>

        <div className="space-y-6">
          {/* Logo */}
          <div className="flex flex-col sm:flex-row gap-4 items-start border-b border-border pb-6">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" /> Logo Principal
              </label>
              <p className="text-[10px] text-muted-foreground">Recomendado: 400x120px (Fundo transparente .png)</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logoUrl')}
                className="hidden" id="logo-up"
              />
              <label htmlFor="logo-up" className="mt-2 inline-flex items-center gap-2 text-xs bg-muted hover:bg-accent px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3 h-3" /> Escolher Logo
              </label>
            </div>
            {settings.logoUrl && (
              <div className="w-32 h-16 bg-muted rounded-xl border border-border flex items-center justify-center p-2 relative group">
                <img src={settings.logoUrl} alt="Logo Prev" className="max-w-full max-h-full object-contain" />
                <button onClick={() => update('logoUrl', '')} className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Favicon */}
          <div className="flex flex-col sm:flex-row gap-4 items-start border-b border-border pb-6">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-primary" /> Favicon (Ícone da Aba)
              </label>
              <p className="text-[10px] text-muted-foreground">Recomendado: 32x32px ou 512x512px (.png)</p>
              <input
                type="file"
                accept="image/png"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'faviconUrl')}
                className="hidden" id="fav-up"
              />
              <label htmlFor="fav-up" className="mt-2 inline-flex items-center gap-2 text-xs bg-muted hover:bg-accent px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3 h-3" /> Escolher Favicon
              </label>
            </div>
            {settings.faviconUrl && (
              <div className="w-12 h-12 bg-muted rounded-xl border border-border flex items-center justify-center p-2 relative group">
                <img src={settings.faviconUrl} alt="Fav Prev" className="w-6 h-6 object-contain" />
                <button onClick={() => update('faviconUrl', '')} className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Social Image */}
          <div className="flex flex-col sm:flex-row gap-4 items-start border-b border-border pb-6">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" /> Imagem Social (Meta Tag OG)
              </label>
              <p className="text-[10px] text-muted-foreground">Recomendado: 1200x630px. Aparece ao enviar link no WhatsApp.</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'ogImageUrl')}
                className="hidden" id="og-up"
              />
              <label htmlFor="og-up" className="mt-2 inline-flex items-center gap-2 text-xs bg-muted hover:bg-accent px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3 h-3" /> Escolher Imagem
              </label>
            </div>
            {settings.ogImageUrl && (
              <div className="w-32 h-16 bg-muted rounded-xl border border-border flex items-center justify-center p-2 relative group">
                <img src={settings.ogImageUrl} alt="OG Prev" className="max-w-full max-h-full object-contain" />
                <button onClick={() => update('ogImageUrl', '')} className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* PWA Icon */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" /> Ícones do Aplicativo (PWA)
              </label>
              <p className="text-[10px] text-muted-foreground">Recomendado: 512x512px. Usado ao "Instalar App".</p>
              <input
                type="file"
                accept="image/png"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'pwaIconUrl')}
                className="hidden" id="pwa-up"
              />
              <label htmlFor="pwa-up" className="mt-2 inline-flex items-center gap-2 text-xs bg-muted hover:bg-accent px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3 h-3" /> Escolher Ícone
              </label>
            </div>
            {settings.pwaIconUrl && (
              <div className="w-16 h-16 bg-muted rounded-2xl border border-border flex items-center justify-center p-2 relative group">
                <img src={settings.pwaIconUrl} alt="PWA Prev" className="w-full h-full object-contain rounded-lg" />
                <button onClick={() => update('pwaIconUrl', '')} className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>

      <button
        onClick={save}
        className="w-full gradient-hero text-white font-semibold py-3 rounded-xl shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" /> Salvar todas as configurações
      </button>

      {/* Manutenção */}
      <Section title="Manutenção" icon={Trash2}>
        <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-destructive">Zona de Perigo!</p>
          <p>Se você estiver enfrentando problemas para salvar produtos ou eles sumirem ao atualizar, use o botão abaixo para limpar o banco de dados. Isso apagará todos os cadastros atuais e as categorias.</p>
        </div>
        <button
          onClick={() => {
            if (confirm('⚠️ ATENÇÃO: Isso apagará TODOS os produtos e categorias salvos permanentemente. Tem certeza?')) {
              dispatch({ type: 'RESET_PRODUCTS' });
              // Reset categorias padrão no storage também
              localStorage.removeItem('pt_categories');
              toast({ title: 'Banco de dados limpo!', description: 'O app foi resetado para os valores padrão.' });
              window.location.reload();
            }
          }}
          className="w-full flex items-center justify-center gap-2 bg-muted text-destructive border border-destructive/20 py-3 rounded-xl hover:bg-destructive hover:text-white transition-all text-sm font-semibold"
        >
          <Trash2 className="w-4 h-4" /> Limpar Banco de Dados (Produtos e Categorias)
        </button>
      </Section>
    </div>
  );
}
