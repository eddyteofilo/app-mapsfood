import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Pizza } from 'lucide-react';

export default function Footer() {
    const { pathname } = useLocation();
    const currentYear = new Date().getFullYear();

    // Oculta o rodapé no Admin e Delivery para não poluir o layout
    if (pathname.startsWith('/admin') || pathname.startsWith('/delivery')) return null;

    return (
        <footer className="w-full bg-card border-t border-border mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center">
                            <Pizza className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-display font-bold text-foreground">PizzaDash</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">A melhor entrega da região</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <p className="text-xs text-muted-foreground">
                            © {currentYear} PizzaDash. Todos os direitos reservados.
                        </p>
                        <div className="h-4 w-[1px] bg-border hidden sm:block"></div>
                        <Link
                            to="/admin"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium group"
                        >
                            <ShieldCheck className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            Painel Admin
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
