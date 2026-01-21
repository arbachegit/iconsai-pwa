import { Ban, ShieldAlert, AlertTriangle, Mail } from "lucide-react";

interface BannedScreenProps {
  reason: string;
  deviceId: string;
  bannedAt?: string;
}

export const BannedScreen = ({ reason, deviceId, bannedAt }: BannedScreenProps) => {
  const formattedDate = bannedAt 
    ? new Date(bannedAt).toLocaleString("pt-BR", { 
        timeZone: "America/Sao_Paulo",
        dateStyle: "long",
        timeStyle: "short"
      })
    : new Date().toLocaleString("pt-BR", { 
        timeZone: "America/Sao_Paulo",
        dateStyle: "long",
        timeStyle: "short"
      });

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gradient-to-br from-red-950 via-red-900 to-red-950">
      <div className="max-w-lg mx-auto p-8 text-center">
        {/* Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center animate-ping">
            <Ban className="w-24 h-24 text-red-500/30" />
          </div>
          <Ban className="w-24 h-24 text-red-500 mx-auto relative" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-red-400 mb-4 tracking-tight">
          ACESSO BLOQUEADO
        </h1>

        {/* Warning Badge */}
        <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 rounded-full mb-6">
          <ShieldAlert className="w-5 h-5" />
          <span className="text-sm font-medium">Banimento Permanente</span>
        </div>

        {/* Description */}
        <p className="text-red-200/80 text-lg mb-8">
          Tentativa de inspeção de código detectada.<br />
          Este dispositivo foi banido permanentemente.
        </p>

        {/* Details Card */}
        <div className="bg-black/40 border border-red-500/30 rounded-xl p-6 mb-8 backdrop-blur-sm">
          <div className="space-y-3 text-left">
            <div className="flex justify-between items-center">
              <span className="text-red-400/70 text-sm">Motivo:</span>
              <span className="text-red-200 text-sm font-mono">{reason}</span>
            </div>
            <div className="border-t border-red-500/20" />
            <div className="flex justify-between items-center">
              <span className="text-red-400/70 text-sm">ID do Dispositivo:</span>
              <span className="text-red-200 text-sm font-mono">{deviceId}</span>
            </div>
            <div className="border-t border-red-500/20" />
            <div className="flex justify-between items-center">
              <span className="text-red-400/70 text-sm">Data do Banimento:</span>
              <span className="text-red-200 text-sm">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-200/80 text-sm text-left">
              Se você acredita que isso foi um erro, entre em contato com o suporte 
              informando o ID do dispositivo acima. Apenas um Super Administrador 
              pode reverter esta ação.
            </p>
          </div>
        </div>

        {/* Contact Button */}
        <a 
          href="mailto:suporte@knowyou.app?subject=Solicitação de Revisão de Banimento&body=ID do Dispositivo: ${deviceId}"
          className="inline-flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 px-4 py-2 rounded-lg transition-colors mb-6"
        >
          <Mail className="w-4 h-4" />
          Contatar Suporte
        </a>

        {/* Footer */}
        <p className="text-red-400/50 text-xs">
          Sistema de Segurança KnowYOU v3 • Tolerância Zero
        </p>
      </div>
    </div>
  );
};
