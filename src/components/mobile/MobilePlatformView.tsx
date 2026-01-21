import { Link } from 'react-router-dom';
import { Smartphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobilePlatformViewProps {
  isAdmin?: boolean;
}

export function MobilePlatformView({ isAdmin = false }: MobilePlatformViewProps) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Voxia AI</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Acesse o painel administrativo em um computador para uma melhor experiência."
              : "Esta página está disponível apenas para desktop."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/app">
            <Button className="w-full gap-2">
              Ir para o App
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          <Link to="/">
            <Button variant="outline" className="w-full">
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
