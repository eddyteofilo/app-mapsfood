import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/hooks/use-app';
import { Deliverer } from '@/types';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, Phone, Mail, FileText, Bike, Hash, Palette, Save, Loader2, Lock, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DelivererForm() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToast();
    const isEdit = !!id;

    const existing = id ? state.deliverers.find(d => d.id === id) : null;

    const [form, setForm] = useState<Omit<Deliverer, 'id' | 'currentLocation'> & { username?: string; password?: string }>({
        name: '',
        phone: '',
        email: '',
        document: '',
        vehicle: '',
        vehicleModel: '',
        vehiclePlate: '',
        vehicleColor: '',
        available: true,
        username: '',
        password: '',
    });

    useEffect(() => {
        if (existing) {
            setForm({
                name: existing.name,
                phone: existing.phone,
                email: existing.email || '',
                document: existing.document || '',
                vehicle: existing.vehicle,
                vehicleModel: existing.vehicleModel || '',
                vehiclePlate: existing.vehiclePlate || '',
                vehicleColor: existing.vehicleColor || '',
                available: existing.available,
            });
        }
    }, [existing]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!form.name || !form.phone || !form.vehicle) {
            toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
            return;
        }

        try {
            if (isEdit && existing) {
                const { error } = await supabase
                    .from('deliverers')
                    .update({
                        name: form.name,
                        phone: form.phone,
                        email: form.email,
                        document: form.document,
                        vehicle: form.vehicle,
                        vehicle_model: form.vehicleModel,
                        vehicle_plate: form.vehiclePlate,
                        vehicle_color: form.vehicleColor,
                        available: form.available
                    })
                    .eq('id', existing.id);

                if (error) throw error;
                toast({ title: 'Entregador atualizado!' });
            } else {
                if (!form.username || !form.password) {
                    toast({ title: 'Preencha usuário e senha para o login', variant: 'destructive' });
                    return;
                }

                // 1. Criar o entregador
                const { data: newDel, error: delError } = await supabase
                    .from('deliverers')
                    .insert([{
                        name: form.name,
                        phone: form.phone,
                        email: form.email,
                        document: form.document,
                        vehicle: form.vehicle,
                        vehicle_model: form.vehicleModel,
                        vehicle_plate: form.vehiclePlate,
                        vehicle_color: form.vehicleColor,
                        available: form.available
                    }])
                    .select()
                    .single();

                if (delError) throw delError;

                // 2. Criar o usuário de acesso
                if (newDel) {
                    const { error: userError } = await supabase
                        .from('app_users')
                        .insert([{
                            username: form.username,
                            password: form.password,
                            role: 'deliverer',
                            deliverer_id: newDel.id
                        }]);

                    if (userError) {
                        // Opcional: deletar o entregador se falhar o usuário? 
                        // Melhor avisar.
                        console.error('[User Creation Error]', userError);
                        toast({ title: 'Entregador criado, mas erro ao criar login', description: userError.message, variant: 'destructive' });
                    } else {
                        toast({ title: 'Entregador e Login criados com sucesso!' });
                    }
                }
            }
            navigate('/admin/deliverers');
        } catch (err: any) {
            console.error('[Deliverer Save Error]', err);
            toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
        }
    }

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="font-display text-2xl font-bold">
                        {isEdit ? 'Editar Entregador' : 'Novo Entregador'}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {isEdit ? 'Atualize os dados do colaborador' : 'Cadastre um novo membro na equipe'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 pb-12">
                {/* Dados Pessoais */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <User className="w-5 h-5 text-primary" />
                        <h2 className="font-display font-bold text-lg">Dados Pessoais</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Nome Completo *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    required
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ex: João da Silva"
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">WhatsApp / Telefone *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    required
                                    value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="5511999999999"
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="joao@email.com"
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Documento (CPF/RG)</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    value={form.document}
                                    onChange={e => setForm(f => ({ ...f, document: e.target.value }))}
                                    placeholder="000.000.000-00"
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dados do Veículo */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Bike className="w-5 h-5 text-primary" />
                        <h2 className="font-display font-bold text-lg">Dados do Veículo</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Tipo de Veículo *</label>
                            <select
                                required
                                value={form.vehicle}
                                onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))}
                                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                                <option value="">Selecione...</option>
                                <option value="Moto">Moto</option>
                                <option value="Carro">Carro</option>
                                <option value="Bicicleta">Bicicleta</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Modelo do Veículo</label>
                            <div className="relative">
                                <Bike className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    value={form.vehicleModel}
                                    onChange={e => setForm(f => ({ ...f, vehicleModel: e.target.value }))}
                                    placeholder="Ex: Honda CG 160 Fan"
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Placa</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    value={form.vehiclePlate}
                                    onChange={e => setForm(f => ({ ...f, vehiclePlate: e.target.value.toUpperCase() }))}
                                    placeholder="ABC-1234"
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all uppercase"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Cor</label>
                            <div className="relative">
                                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    value={form.vehicleColor}
                                    onChange={e => setForm(f => ({ ...f, vehicleColor: e.target.value }))}
                                    placeholder="Ex: Vermelha"
                                    className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dados de Acesso (Login) - Apenas na Criação */}
                {!isEdit && (
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <Lock className="w-5 h-5 text-primary" />
                            <h2 className="font-display font-bold text-lg">Dados de Acesso</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Usuário de Login *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        required
                                        value={form.username}
                                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                        placeholder="Ex: joao_mot boy"
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Senha *</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        required
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        placeholder="••••••••"
                                        className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">
                            * Esses dados serão usados pelo entregador para entrar no sistema. Clique em Salvar para criar o acesso.
                        </p>
                    </div>
                )}

                {/* Status */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h3 className="font-bold text-sm">Disponibilidade</h3>
                            <p className="text-xs text-muted-foreground">O entregador aparecerá como disponível para novos pedidos?</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${form.available ? 'bg-primary' : 'bg-muted'
                                }`}
                        >
                            <span
                                className={`${form.available ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </button>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/deliverers')}
                        className="flex-1 bg-muted text-foreground font-bold py-3 rounded-xl hover:bg-muted/80 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="flex-1 gradient-hero text-white font-bold py-3 rounded-xl shadow-glow hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {isEdit ? 'Salvar Alterações' : 'Cadastrar Entregador'}
                    </button>
                </div>
            </form>
        </div>
    );
}
