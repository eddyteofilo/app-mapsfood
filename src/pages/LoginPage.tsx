import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/hooks/use-toast';
import { Pizza, Eye, EyeOff, Bike, Lock, User } from 'lucide-react';

const MOCK_USERS = [
  { username: 'admin', password: 'pizza123', role: 'admin' as const },
  { username: 'entregador1', password: 'moto123', role: 'deliverer' as const, delivererId: 'd1' },
  { username: 'entregador2', password: 'moto123', role: 'deliverer' as const, delivererId: 'd2' },
];

export default function LoginPage() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const user = MOCK_USERS.find(u => u.username === username && u.password === password);
    if (!user) {
      toast({ title: 'Credenciais inválidas', description: 'Verifique usuário e senha.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    dispatch({ type: 'SET_USER', payload: { role: user.role, delivererId: user.delivererId } });
    navigate(user.role === 'admin' ? '/admin' : '/delivery');
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-hero mb-4 shadow-glow animate-pulse-glow">
            <Pizza className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">PizzaTrack</h1>
          <p className="text-muted-foreground mt-1">Sistema de Delivery Inteligente</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-md">
          <h2 className="font-display text-xl font-semibold mb-6">Entrar no sistema</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Usuário</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted border border-border rounded-lg pl-10 pr-12 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-hero text-primary-foreground font-semibold py-3 rounded-lg shadow-glow hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Entrar'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-muted rounded-xl border border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credenciais de demo</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-foreground font-medium">Admin:</span>
                <span className="text-muted-foreground">admin / pizza123</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bike className="w-3 h-3 text-secondary" />
                <span className="text-foreground font-medium">Entregador:</span>
                <span className="text-muted-foreground">entregador1 / moto123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
