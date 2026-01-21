import { Mail, MessageSquare, Eye, Link2, FileEdit, Send, UserCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/date-utils";

interface TrackingStep {
  key: string;
  label: string;
  icon: React.ElementType;
  timestamp: string | null;
}

interface InviteTrackingTimelineProps {
  emailSentAt: string | null;
  whatsappSentAt: string | null;
  emailOpenedAt: string | null;
  whatsappOpenedAt: string | null;
  linkOpenedAt: string | null;
  formStartedAt: string | null;
  verificationSentAt: string | null;
  completedAt: string | null;
}

export const InviteTrackingTimeline = ({
  emailSentAt,
  whatsappSentAt,
  emailOpenedAt,
  whatsappOpenedAt,
  linkOpenedAt,
  formStartedAt,
  verificationSentAt,
  completedAt,
}: InviteTrackingTimelineProps) => {
  const steps: TrackingStep[] = [
    { 
      key: 'email_sent', 
      label: 'Email enviado', 
      icon: Mail, 
      timestamp: emailSentAt 
    },
    { 
      key: 'whatsapp_sent', 
      label: 'WhatsApp enviado', 
      icon: MessageSquare, 
      timestamp: whatsappSentAt 
    },
    { 
      key: 'message_opened', 
      label: 'Mensagem aberta', 
      icon: Eye, 
      timestamp: emailOpenedAt || whatsappOpenedAt 
    },
    { 
      key: 'link_opened', 
      label: 'Link acessado', 
      icon: Link2, 
      timestamp: linkOpenedAt 
    },
    { 
      key: 'form_started', 
      label: 'Dados preenchidos', 
      icon: FileEdit, 
      timestamp: formStartedAt 
    },
    { 
      key: 'verification_sent', 
      label: 'Código enviado', 
      icon: Send, 
      timestamp: verificationSentAt 
    },
    { 
      key: 'completed', 
      label: 'Cadastrado', 
      icon: UserCheck, 
      timestamp: completedAt 
    },
  ];

  // Find the last completed step index
  const lastCompletedIndex = steps.reduce((acc, step, index) => {
    return step.timestamp ? index : acc;
  }, -1);

  return (
    <div className="py-4">
      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 rounded-full" />
        
        {/* Progress line */}
        {lastCompletedIndex >= 0 && (
          <div 
            className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full transition-all duration-500"
            style={{ 
              width: `${(lastCompletedIndex / (steps.length - 1)) * 100}%` 
            }}
          />
        )}

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = !!step.timestamp;
          const isActive = index === lastCompletedIndex + 1;
          const Icon = step.icon;

          return (
            <TooltipProvider key={step.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isCompleted 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                          : isActive 
                            ? 'bg-primary/20 text-primary border-2 border-primary animate-pulse'
                            : 'bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span 
                      className={`
                        text-[10px] text-center max-w-[70px] leading-tight
                        ${isCompleted ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}
                      `}
                    >
                      {step.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isCompleted ? (
                    <div className="text-xs">
                      <p className="font-medium text-emerald-400">{step.label}</p>
                      <p className="text-muted-foreground">{formatDateTime(step.timestamp!)}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aguardando</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};
