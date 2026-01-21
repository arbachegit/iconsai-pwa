import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AppRole = "user" | "admin" | "superadmin";

interface UserInvitation {
  id: string;
  token: string;
  name: string;
  email: string;
  role: AppRole;
  status: string;
  phone: string | null;
  has_platform_access: boolean | null;
  has_app_access: boolean | null;
  pwa_access: string[] | null;
  verification_method: string | null;
}

interface EditInvitationModalProps {
  open: boolean;
  onClose: () => void;
  invitation: UserInvitation | null;
  onSuccess: () => void;
}

// Format phone number for display
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+') && cleaned.length > 0) {
    return '+' + cleaned;
  }
  return cleaned;
};

export const EditInvitationModal = ({ open, onClose, invitation, onSuccess }: EditInvitationModalProps) => {
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [hasPlatformAccess, setHasPlatformAccess] = useState(true);
  const [hasAppAccess, setHasAppAccess] = useState(false);
  
  const [emailChanged, setEmailChanged] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");

  // Load invitation data when modal opens
  useEffect(() => {
    if (invitation && open) {
      setName(invitation.name || "");
      setEmail(invitation.email || "");
      setOriginalEmail(invitation.email || "");
      setPhone(invitation.phone || "");
      setRole(invitation.role || "user");
      setHasPlatformAccess(invitation.has_platform_access ?? true);
      setHasAppAccess(invitation.has_app_access ?? false);
      setEmailChanged(false);
    }
  }, [invitation, open]);

  // Track email changes
  useEffect(() => {
    setEmailChanged(email !== originalEmail && originalEmail !== "");
  }, [email, originalEmail]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!invitation) throw new Error("Convite não encontrado");

      const { data, error } = await supabase.functions.invoke('update-invitation', {
        body: {
          invitation_id: invitation.id,
          updates: {
            name,
            email,
            phone: phone || null,
            role,
            has_platform_access: hasPlatformAccess,
            has_app_access: hasAppAccess
          }
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      if (emailChanged) {
        toast.success("Convite atualizado e reenviado para o novo email!");
      } else {
        toast.success("Convite atualizado com sucesso!");
      }
      queryClient.invalidateQueries({ queryKey: ["user-invitations"] });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar convite: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Email válido é obrigatório");
      return;
    }
    
    updateMutation.mutate();
  };

  const handleClose = () => {
    if (!updateMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Convite</DialogTitle>
          <DialogDescription>
            Altere os dados do convite. Se o email for alterado, um novo convite será enviado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {emailChanged && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-500">
                O email foi alterado. Um novo link de convite será gerado e enviado automaticamente.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome completo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do convidado"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="+55 11 99999-9999"
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)} disabled={updateMutation.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Tipo de Acesso</Label>
            
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Plataforma (Desktop/Tablet)</span>
              </div>
              <Switch
                checked={hasPlatformAccess}
                onCheckedChange={setHasPlatformAccess}
                disabled={updateMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">APP (Celular via WhatsApp)</span>
              </div>
              <Switch
                checked={hasAppAccess}
                onCheckedChange={setHasAppAccess}
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={updateMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {emailChanged ? "Atualizar e Reenviar" : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInvitationModal;
