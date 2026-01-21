import { useState } from 'react';
import { Smartphone, Heart, Activity, Shield, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

interface PWAHealthDesktopBlockProps {
  customTitle?: string;
  customMessage?: string;
}

const PWAHealthDesktopBlock = ({
  customTitle = "Acesso Restrito",
  customMessage = "Knowyou AI Saúde está disponível apenas em dispositivos móveis."
}: PWAHealthDesktopBlockProps) => {
  const [copied, setCopied] = useState(false);

  // URL para o PWA Health - sempre https://pwa.iconsai.ai/health
  const pwaHealthUrl = 'https://pwa.iconsai.ai/health';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pwaHealthUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4 animate-fade-in">
        {/* Ícone e Título compactos */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/30">
              <Smartphone className="w-8 h-8 text-rose-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <Heart className="w-3 h-3 text-rose-400" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{customTitle}</h1>
            <p className="text-slate-400 text-sm">{customMessage}</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs font-medium text-slate-300 uppercase tracking-wider text-center mb-3">
            Escaneie o QR Code
          </p>
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG
                value={pwaHealthUrl}
                size={140}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
          <p className="text-slate-500 text-xs text-center mt-2">
            Aponte a câmera do celular para acessar o assistente de saúde
          </p>
        </div>

        {/* Benefícios compactos */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Heart className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-slate-400 text-xs">Saúde</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-pink-400" />
              </div>
              <span className="text-slate-400 text-xs">Triagem</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-slate-400 text-xs">Seguro</span>
            </div>
          </div>
        </div>

        {/* Link copiável compacto */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-hidden">
              <p className="text-rose-400 font-mono text-xs truncate">{pwaHealthUrl}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-rose-400 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span className="text-xs">{copied ? 'OK' : 'Copiar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAHealthDesktopBlock;
