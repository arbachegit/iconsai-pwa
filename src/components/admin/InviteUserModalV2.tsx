import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Phone, Copy, Check, UserPlus, Monitor, Smartphone, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { extractEdgeFunctionError, formatEdgeFunctionErrorForToast } from "@/lib/edge-function-errors";

const inviteSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  role: z.enum(["user", "admin", "superadmin"]),
  sendViaEmail: z.boolean(),
  sendViaWhatsapp: z.boolean(),
  hasPlatformAccess: z.boolean().default(true),
  hasAppAccess: z.boolean().default(false),
}).refine(
  (data) => data.sendViaEmail || data.sendViaWhatsapp,
  { message: "Selecione pelo menos um método de envio", path: ["sendViaEmail"] }
).refine(
  (data) => !data.sendViaWhatsapp || (data.phone && data.phone.length >= 10),
  { message: "Telefone é obrigatório para envio via WhatsApp", path: ["phone"] }
).refine(
  (data) => data.hasPlatformAccess || data.hasAppAccess,
  { message: "Selecione pelo menos um tipo de acesso", path: ["hasPlatformAccess"] }
).refine(
  // PWA-only requires phone
  (data) => !(data.hasAppAccess && !data.hasPlatformAccess) || (data.phone && data.phone.length >= 10),
  { message: "Telefone é obrigatório para convites de APP (envio via WhatsApp)", path: ["phone"] }
);

type InviteFormData = z.infer<typeof inviteSchema>;

interface SendResult {
  channel: string;
  product: string;
  success: boolean;
  error?: string;
}

interface InviteUserModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const InviteUserModalV2 = ({ open, onOpenChange, onSuccess }: InviteUserModalV2Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ 
    url: string; 
    token: string; 
    sendResults?: SendResult[];
    warnings?: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "user",
      sendViaEmail: true,
      sendViaWhatsapp: false,
      hasPlatformAccess: true,
      hasAppAccess: false,
    },
  });

  const sendViaWhatsapp = watch("sendViaWhatsapp");
  const hasPlatformAccess = watch("hasPlatformAccess");
  const hasAppAccess = watch("hasAppAccess");

  // REGRA: PWA-only = WhatsApp obrigatório, Email desabilitado
  const isPWAOnly = hasAppAccess && !hasPlatformAccess;

  useEffect(() => {
    if (isPWAOnly) {
      setValue("sendViaEmail", false);
      setValue("sendViaWhatsapp", true);
    }
  }, [isPWAOnly, setValue]);

  const onSubmit = async (data: InviteFormData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("create-invitation", {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          sendViaEmail: data.sendViaEmail,
          sendViaWhatsapp: data.sendViaWhatsapp,
          hasPlatformAccess: data.hasPlatformAccess,
          hasAppAccess: data.hasAppAccess,
        },
      });

      if (error) {
        // Extrai erro detalhado da edge function
        const parsed = extractEdgeFunctionError(error);
        throw new Error(parsed.message);
      }
      
      // Verifica se a resposta contém success: false (novo padrão)
      if (result?.success === false) {
        throw new Error(result.error || result.message || 'Erro ao criar convite');
      }
      
      // Erro legado (campo error direto)
      if (result?.error) {
        throw new Error(result.error);
      }

      setInviteResult({
        url: result.inviteUrl,
        token: result.invitation.token,
        sendResults: result.sendResults,
        warnings: result.warnings,
      });

      // Mostrar sucesso principal
      toast.success("Convite criado com sucesso!");

      // Mostrar warnings se houver
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning: string) => {
          toast.warning("Aviso no envio", {
            description: warning,
            duration: 10000
          });
        });
      }

      onSuccess?.();
    } catch (err: unknown) {
      const { title, description } = formatEdgeFunctionErrorForToast(err);
      toast.error(title, { description });
      console.error('[InviteUserModalV2] Erro detalhado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (inviteResult?.url) {
      await navigator.clipboard.writeText(inviteResult.url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    reset();
    setInviteResult(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Format phone as user types
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Helper to get send status for a specific channel/product
  const getSendStatus = (channel: string, product: string) => {
    if (!inviteResult?.sendResults) return null;
    return inviteResult.sendResults.find(r => r.channel === channel && r.product === product);
  };

  // Check if there are any failures
  const hasFailures = inviteResult?.sendResults?.some(r => !r.success) ?? false;
  const allSuccess = inviteResult?.sendResults?.every(r => r.success) ?? true;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Usuário
          </DialogTitle>
          <DialogDescription>
            Envie um convite para um novo usuário se cadastrar na plataforma.
          </DialogDescription>
        </DialogHeader>

        {!inviteResult ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                placeholder="João Silva"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@empresa.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Telefone {sendViaWhatsapp && "*"}
              </Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...register("phone", {
                  onChange: (e) => {
                    e.target.value = formatPhone(e.target.value);
                  },
                })}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Seção de Acesso */}
            <div className="space-y-4 pt-2 border-t">
              <Label className="text-base font-semibold">Tipo de Acesso *</Label>
              
              {errors.hasPlatformAccess && (
                <p className="text-sm text-destructive">{errors.hasPlatformAccess.message}</p>
              )}

              {/* Acesso à Plataforma */}
              <div className={`p-4 rounded-lg border transition-colors ${hasPlatformAccess ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Acesso à Plataforma</p>
                      <p className="text-sm text-muted-foreground">Computador ou Tablet</p>
                    </div>
                  </div>
                  <Switch
                    checked={hasPlatformAccess}
                    onCheckedChange={(checked) => setValue("hasPlatformAccess", checked)}
                  />
                </div>
                
                {hasPlatformAccess && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Label className="text-sm">Tipo de permissão</Label>
                    <Select
                      defaultValue="user"
                      onValueChange={(value) => setValue("role", value as any)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o tipo de acesso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Acesso ao APP */}
              <div className={`p-4 rounded-lg border transition-colors ${hasAppAccess ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-medium">Acesso ao APP</p>
                      <p className="text-sm text-muted-foreground">Apenas Celular via WhatsApp</p>
                    </div>
                  </div>
                  <Switch
                    checked={hasAppAccess}
                    onCheckedChange={(checked) => setValue("hasAppAccess", checked)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Enviar convite via *</Label>
              <div className="flex flex-col gap-3">
                <label className={`flex items-center gap-2 ${isPWAOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <Checkbox
                    checked={watch("sendViaEmail")}
                    onCheckedChange={(checked) => setValue("sendViaEmail", !!checked)}
                    disabled={isPWAOnly}
                  />
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email</span>
                  {isPWAOnly && (
                    <span className="text-xs text-muted-foreground ml-1">(Desabilitado para APP)</span>
                  )}
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={watch("sendViaWhatsapp")}
                    onCheckedChange={(checked) => setValue("sendViaWhatsapp", !!checked)}
                    disabled={isPWAOnly}
                  />
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">WhatsApp</span>
                  {isPWAOnly && (
                    <span className="text-xs text-emerald-600 ml-1">(Obrigatório para APP)</span>
                  )}
                </label>
              </div>
              {isPWAOnly && !watch("phone") && (
                <p className="text-xs text-destructive ml-6">
                  ⚠️ Telefone é obrigatório para convites de APP
                </p>
              )}
              {watch("sendViaWhatsapp") && !watch("phone") && !isPWAOnly && (
                <p className="text-xs text-destructive ml-6">
                  ⚠️ Preencha o telefone para enviar via WhatsApp
                </p>
              )}
              {watch("sendViaWhatsapp") && watch("phone") && (
                <p className="text-xs text-emerald-600 ml-6">
                  ✓ WhatsApp será enviado para {watch("phone")}
                </p>
              )}
              {errors.sendViaEmail && (
                <p className="text-sm text-destructive">{errors.sendViaEmail.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Convite"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Status principal */}
            <div className={`rounded-lg p-4 text-center ${
              allSuccess 
                ? 'bg-emerald-500/10 border border-emerald-500/20' 
                : hasFailures 
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-emerald-500/10 border border-emerald-500/20'
            }`}>
              <div className="text-4xl mb-2">
                {allSuccess ? '✅' : hasFailures ? '⚠️' : '✅'}
              </div>
              <h3 className={`font-semibold text-lg ${
                allSuccess ? 'text-emerald-600' : hasFailures ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                Convite Criado!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {allSuccess 
                  ? 'O usuário receberá o convite pelos métodos selecionados.'
                  : 'Convite criado, mas alguns envios falharam.'}
              </p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {hasPlatformAccess && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                    <span>Plataforma</span>
                  </div>
                )}
                {hasAppAccess && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <span>APP</span>
                  </div>
                )}
              </div>
            </div>

            {/* Aviso proeminente se WhatsApp falhou */}
            {inviteResult.sendResults?.some(r => r.channel === 'whatsapp' && !r.success) && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive font-semibold text-sm">⚠️ WhatsApp NÃO foi enviado!</p>
                <p className="text-destructive/80 text-xs mt-1">
                  Verifique as credenciais Twilio no Supabase.
                </p>
              </div>
            )}

            {/* Status detalhado dos envios */}
            {inviteResult && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status dos envios</Label>
                {inviteResult.sendResults && inviteResult.sendResults.length > 0 ? (
                  <div className="space-y-2">
                    {inviteResult.sendResults.map((result, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          result.success 
                            ? 'bg-emerald-500/10 text-emerald-700' 
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span className="capitalize">
                            {result.channel === 'email' ? '📧' : '💬'} {result.channel} / {result.product}
                          </span>
                        </div>
                        <span className="text-xs">
                          {result.success ? 'Enviado' : result.error}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                    <p className="text-amber-600 font-medium">⚠️ Nenhum envio registrado</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Verifique se marcou Email ou WhatsApp no formulário.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Warnings */}
            {inviteResult.warnings && inviteResult.warnings.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-600">Avisos:</p>
                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                      {inviteResult.warnings.map((warning, idx) => (
                        <li key={idx} className="text-xs">{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Link do convite</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteResult.url}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 7 dias. Você pode copiar e enviar manualmente se necessário.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
