import { useState } from "react";
import { Monitor, Smartphone, Send, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserModalityIconsProps {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  hasPlatformAccess: boolean;
  hasAppAccess: boolean;
  platformRegistered: boolean;
  appRegistered: boolean;
  onInviteSent?: () => void;
}

export function UserModalityIcons({
  userId,
  userName,
  userEmail,
  userPhone,
  hasPlatformAccess,
  hasAppAccess,
  platformRegistered,
  appRegistered,
  onInviteSent
}: UserModalityIconsProps) {
  const [sendingPlatform, setSendingPlatform] = useState(false);
  const [sendingApp, setSendingApp] = useState(false);

  const sendInvite = async (product: "platform" | "app") => {
    const setSending = product === "platform" ? setSendingPlatform : setSendingApp;
    setSending(true);

    try {
      const { error } = await supabase.functions.invoke("create-invitation", {
        body: {
          name: userName,
          email: userEmail,
          phone: userPhone,
          role: "user",
          sendViaEmail: true,
          sendViaWhatsapp: !!userPhone,
          hasPlatformAccess: product === "platform",
          hasAppAccess: product === "app"
        }
      });

      if (error) throw error;

      toast.success(`Convite enviado!`, {
        description: `Convite para ${product === "platform" ? "Plataforma" : "APP"} enviado para ${userName}`
      });

      onInviteSent?.();
    } catch (err: any) {
      toast.error("Erro ao enviar convite", {
        description: err.message
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Platform Icon */}
        {hasPlatformAccess && (
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`p-1.5 rounded-md ${
                    platformRegistered 
                      ? "bg-indigo-500/20 text-indigo-400" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                {platformRegistered ? "Cadastrado na Plataforma" : "Não cadastrado na Plataforma"}
              </TooltipContent>
            </Tooltip>

            {/* Send invite button if not registered */}
            {!platformRegistered && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-0.5"
                    onClick={() => sendInvite("platform")}
                    disabled={sendingPlatform}
                  >
                    {sendingPlatform ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Enviar convite para Plataforma</TooltipContent>
              </Tooltip>
            )}

            {platformRegistered && (
              <Check className="w-3 h-3 ml-0.5 text-indigo-400" />
            )}
          </div>
        )}

        {/* Separator */}
        {hasPlatformAccess && hasAppAccess && (
          <div className="w-px h-4 bg-border mx-1" />
        )}

        {/* APP Icon */}
        {hasAppAccess && (
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`p-1.5 rounded-md ${
                    appRegistered 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                {appRegistered ? "Cadastrado no APP" : "Não cadastrado no APP"}
              </TooltipContent>
            </Tooltip>

            {/* Send invite button if not registered */}
            {!appRegistered && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-0.5"
                    onClick={() => sendInvite("app")}
                    disabled={sendingApp}
                  >
                    {sendingApp ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Enviar convite para APP</TooltipContent>
              </Tooltip>
            )}

            {appRegistered && (
              <Check className="w-3 h-3 ml-0.5 text-emerald-400" />
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
