import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Monitor, Smartphone, Send, Loader2, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Invitation {
  id: string;
  token: string;
  name: string;
  email: string;
  phone?: string | null;
  has_platform_access: boolean | null;
  has_app_access: boolean | null;
  status: string;
}

interface ResendInvitationModalProps {
  open: boolean;
  onClose: () => void;
  invitation: Invitation | null;
  onSuccess?: () => void;
}

export function ResendInvitationModal({ open, onClose, invitation, onSuccess }: ResendInvitationModalProps) {
  const [product, setProduct] = useState<"platform" | "app" | "both">("both");
  const [loading, setLoading] = useState(false);

  // Auto-select product based on invitation access
  useEffect(() => {
    if (invitation) {
      if (invitation.has_platform_access && invitation.has_app_access) {
        setProduct("both");
      } else if (invitation.has_app_access && !invitation.has_platform_access) {
        setProduct("app");
      } else if (invitation.has_platform_access && !invitation.has_app_access) {
        setProduct("platform");
      }
    }
  }, [invitation]);

  if (!invitation) return null;

  const hasBothAccess = invitation.has_platform_access && invitation.has_app_access;
  const hasPhone = !!invitation.phone;
  
  // REGRA: APP = WhatsApp obrigatório, precisa de telefone
  const isAppSelected = product === "app" || (product === "both" && invitation.has_app_access);
  const cannotSendApp = isAppSelected && !hasPhone;

  const handleResend = async () => {
    if (cannotSendApp) {
      toast.error("Telefone obrigatório para APP", {
        description: "Convites de APP são enviados exclusivamente via WhatsApp."
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invitation-code", {
        body: {
          token: invitation.token,
          product
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Convite reenviado!", {
          description: data.results?.join("\n") || "Enviado com sucesso"
        });
        onSuccess?.();
        onClose();
      } else {
        throw new Error(data.error || "Erro ao reenviar");
      }
    } catch (err: any) {
      toast.error("Erro ao reenviar", {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Determine what channels will be used based on product
  const getChannelInfo = () => {
    if (product === "app") {
      return "📱 WhatsApp (obrigatório para APP)";
    }
    if (product === "platform") {
      return hasPhone ? "📧 Email + 💬 WhatsApp (informativo)" : "📧 Email";
    }
    // both
    if (hasPhone) {
      return "📧 Email (Plataforma) + 💬 WhatsApp (APP + Plataforma)";
    }
    return "📧 Email (Plataforma) - ⚠️ WhatsApp não disponível (sem telefone)";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Send className="w-5 h-5" />
            Reenviar Convite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info do usuário */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium text-foreground">{invitation.name}</p>
            <p className="text-sm text-muted-foreground">{invitation.email}</p>
            {invitation.phone && (
              <p className="text-sm text-muted-foreground">{invitation.phone}</p>
            )}
            {!invitation.phone && (
              <p className="text-sm text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Sem telefone cadastrado
              </p>
            )}
          </div>

          {/* Regra obrigatória */}
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm text-blue-600 dark:text-blue-400">
              <strong>Regra de envio:</strong><br/>
              • Plataforma: Email + WhatsApp (informativo)<br/>
              • APP: WhatsApp obrigatório
            </AlertDescription>
          </Alert>

          {/* Seleção de Produto */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Produto para reenviar</Label>
            <RadioGroup
              value={product}
              onValueChange={(v) => setProduct(v as "platform" | "app" | "both")}
              className="grid grid-cols-3 gap-2"
            >
              {invitation.has_platform_access && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="platform" id="platform" className="sr-only" />
                  <Label
                    htmlFor="platform"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all w-full ${
                      product === "platform"
                        ? "border-violet-500 bg-violet-500/10 text-violet-600"
                        : "border-border hover:border-violet-300"
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="text-xs">Plataforma</span>
                  </Label>
                </div>
              )}

              {invitation.has_app_access && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="app" 
                    id="app" 
                    className="sr-only" 
                    disabled={!hasPhone}
                  />
                  <Label
                    htmlFor="app"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all w-full ${
                      !hasPhone
                        ? "opacity-50 cursor-not-allowed border-border"
                        : product === "app"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 cursor-pointer"
                        : "border-border hover:border-emerald-300 cursor-pointer"
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">APP</span>
                    {!hasPhone && (
                      <span className="text-[10px] text-amber-500">Sem tel.</span>
                    )}
                  </Label>
                </div>
              )}

              {hasBothAccess && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value="both" 
                    id="both-product" 
                    className="sr-only"
                    disabled={!hasPhone}
                  />
                  <Label
                    htmlFor="both-product"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all w-full ${
                      !hasPhone
                        ? "opacity-50 cursor-not-allowed border-border"
                        : product === "both"
                        ? "border-primary bg-primary/10 text-primary cursor-pointer"
                        : "border-border hover:border-primary/50 cursor-pointer"
                    }`}
                  >
                    <div className="flex -space-x-1">
                      <Monitor className="w-4 h-4 text-violet-500" />
                      <Smartphone className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-xs">Ambos</span>
                    {!hasPhone && (
                      <span className="text-[10px] text-amber-500">Sem tel.</span>
                    )}
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Canal que será usado */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Canais que serão usados:</p>
            <p className="text-sm font-medium">{getChannelInfo()}</p>
          </div>

          {/* Warning se não tem telefone mas selecionou APP */}
          {cannotSendApp && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Convites de APP requerem telefone cadastrado para envio via WhatsApp.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleResend} 
            disabled={loading || cannotSendApp}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Reenviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
