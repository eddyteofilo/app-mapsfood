import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Product, ProductVariant } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductVariantModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (variant: ProductVariant) => void;
}

export default function ProductVariantModal({
    product,
    isOpen,
    onClose,
    onSelect,
}: ProductVariantModalProps) {
    if (!product || !product.variants) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none bg-card p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="relative aspect-video w-full overflow-hidden">
                    {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-4xl">🍕</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                </div>

                <div className="p-6 space-y-4">
                    <DialogHeader>
                        <DialogTitle className="font-display text-2xl font-black tracking-tight flex items-center gap-2">
                            {product.name}
                        </DialogTitle>
                        <p className="text-muted-foreground text-sm">Escolha uma opção para continuar:</p>
                    </DialogHeader>

                    <ScrollArea className="max-h-[300px] pr-4 -mr-4">
                        <div className="space-y-2">
                            {product.variants.map((variant) => (
                                <button
                                    key={variant.id}
                                    onClick={() => onSelect(variant)}
                                    className="w-full text-left p-4 rounded-2xl bg-muted/40 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between group"
                                >
                                    <div className="space-y-0.5">
                                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                            {variant.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                            Opção selecionável
                                        </p>
                                    </div>
                                    {variant.price && variant.price > 0 ? (
                                        <span className="text-sm font-black text-primary">
                                            + R$ {variant.price.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black text-muted-foreground uppercase">Grátis</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full rounded-xl text-muted-foreground font-bold hover:bg-muted"
                    >
                        CANCELAR
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
