import { Monitor, Clock, Mic, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PlatformMobileBlock = () => {
  const navigate = useNavigate();

  const handleGoToPWA = () => {
    navigate('/pwa');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Ícone principal */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30 backdrop-blur-sm">
              <Monitor className="w-16 h-16 text-indigo-400" />
            </div>
            <div className="absolute -top-2 -right-2">
              <div className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-300">Em breve!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Título */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-white">
            Plataforma para Computador
          </h1>
          <p className="text-slate-400 text-lg">
            A versão mobile será lançada até o final de 2024
          </p>
        </div>

        {/* Card informativo */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="font-medium">Enquanto isso, você pode:</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mic className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="font-medium">Usar o PWA</p>
                <p className="text-sm text-slate-500">Converse por voz com o KnowYOU</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Monitor className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Acessar pelo computador</p>
                <p className="text-sm text-slate-500">Experiência completa da plataforma</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão PWA */}
        <Button
          onClick={handleGoToPWA}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-[1.02]"
        >
          <Mic className="w-5 h-5 mr-2" />
          Ir para o PWA
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Nota */}
        <p className="text-center text-slate-500 text-sm">
          O PWA funciona direto no navegador do seu celular
        </p>
      </div>
    </div>
  );
};

export default PlatformMobileBlock;
