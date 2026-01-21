import { useState, useEffect } from 'react';
import { Smartphone, Mic, Zap, Shield, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const PWADesktopBlock = () => {
  const [copied, setCopied] = useState(false);

  // URL fixa para o PWA - sempre https://pwa.iconsai.ai/pwa
  const pwaUrl = 'https://pwa.iconsai.ai/pwa';

  // URL completa com token do convite (para o QR code)
  const fullUrl = (() => {
    const path = window.location.pathname;
    const match = path.match(/\/pwa-register\/([^/]+)/);
    const token = match ? match[1] : null;
    return token ? `${pwaUrl}/${token}` : pwaUrl;
  })();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/30">
              <Smartphone className="w-8 h-8 text-blue-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">App Exclusivo para Celular</h1>
            <p className="text-slate-400 text-sm">KnowYOU PWA - experiência mobile otimizada</p>
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
                value={fullUrl}
                size={140}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
          <p className="text-slate-500 text-xs text-center mt-2">
            Aponte a câmera do celular para acessar
          </p>
        </div>

        {/* Benefícios compactos */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 border border-slate-700/50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Mic className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-slate-400 text-xs">Voz</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-slate-400 text-xs">Rápido</span>
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
              <p className="text-blue-400 font-mono text-xs truncate">{fullUrl}</p>
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-400 transition-colors"
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

export default PWADesktopBlock;
