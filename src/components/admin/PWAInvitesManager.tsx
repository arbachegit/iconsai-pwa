import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Mail,
  MessageSquare,
  Smartphone,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PWAUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface PWAInvite {
  id: string;
  user_id: string;
  access_code: string;
  channel: "email" | "whatsapp" | "sms";
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  pwa_users?: PWAUser;
}

type InviteChannel = "email" | "whatsapp" | "sms";

const generateAccessCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Rate limiting config (proteção local para conta Trial)
const RATE_LIMIT = {
  maxSendsPerMinute: 3,
  cooldownMs: 60000, // 1 minuto
};

export default function PWAInvitesManager() {
  const [invites, setInvites] = useState<PWAInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  
  // Rate limiting state
  const [sendTimestamps, setSendTimestamps] = useState<number[]>([]);
  const [rateLimitCooldown, setRateLimitCooldown] = useState<number>(0);

  // Form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<InviteChannel>("whatsapp");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Cooldown timer effect
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setRateLimitCooldown((prev) => Math.max(0, prev - 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [rateLimitCooldown > 0]);

  // Check rate limit before sending
  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const recentSends = sendTimestamps.filter(
      (ts) => now - ts < RATE_LIMIT.cooldownMs
    );
    
    if (recentSends.length >= RATE_LIMIT.maxSendsPerMinute) {
      const oldestSend = Math.min(...recentSends);
      const remainingMs = RATE_LIMIT.cooldownMs - (now - oldestSend);
      setRateLimitCooldown(remainingMs);
      toast.warning(
        `Limite de ${RATE_LIMIT.maxSendsPerMinute} envios/min atingido. Aguarde ${Math.ceil(remainingMs / 1000)}s.`
      );
      return false;
    }
    return true;
  };

  // Record send timestamp
  const recordSend = () => {
    setSendTimestamps((prev) => [...prev, Date.now()].slice(-10)); // Keep last 10
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Using type assertion since types may not be synced yet
      const { data, error } = await (supabase as any)
        .from("pwa_invites")
        .select("*, pwa_users(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setInvites(data as PWAInvite[]);
    } catch (err) {
      console.error("Erro ao carregar convites:", err);
      toast.error("Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    if (!newUserName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (selectedChannel === "email" && !newUserEmail.trim()) {
      toast.error("Email é obrigatório para envio por email");
      return;
    }

    if ((selectedChannel === "whatsapp" || selectedChannel === "sms") && !newUserPhone.trim()) {
      toast.error("Telefone é obrigatório para envio por WhatsApp/SMS");
      return;
    }

    setCreating(true);
    try {
      // 1. Criar usuário
      const { data: user, error: userError } = await (supabase as any)
        .from("pwa_users")
        .insert({
          name: newUserName.trim(),
          email: newUserEmail.trim() || null,
          phone: newUserPhone.trim() || null,
        })
        .select()
        .single();

      if (userError) throw userError;

      // 2. Gerar código único
      const accessCode = generateAccessCode();

      // 3. Criar convite
      const { error: inviteError } = await (supabase as any)
        .from("pwa_invites")
        .insert({
          user_id: user.id,
          access_code: accessCode,
          channel: selectedChannel,
          is_used: false,
        });

      if (inviteError) throw inviteError;

      toast.success(`Convite criado! Código: ${accessCode}`);
      
      // Reset form
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPhone("");
      setDialogOpen(false);
      
      // Refresh data
      fetchData();

    } catch (err) {
      console.error("Erro ao criar convite:", err);
      toast.error("Erro ao criar convite");
    } finally {
      setCreating(false);
    }
  };

  const sendInvite = async (invite: PWAInvite) => {
    // Rate limit check
    if (!checkRateLimit()) {
      return;
    }
    
    setSending(invite.id);
    try {
      const user = invite.pwa_users;
      if (!user) throw new Error("Usuário não encontrado");
      
      // Validate phone for WhatsApp/SMS
      if (!user.phone && invite.channel !== "email") {
        toast.error("Usuário não possui telefone cadastrado");
        return;
      }

      // Warn if email selected (not implemented)
      if (invite.channel === "email") {
        toast.warning("Email não implementado. Enviando via SMS...");
      }

      const effectiveChannel = invite.channel === "email" ? "sms" : invite.channel;

      // URL COMPLETA para o convite (usando code do pwa_invites)
      const inviteUrl = `https://pwa.iconsai.ai/pwa-register?code=${invite.access_code}`;

      console.log(`[PWA Invites] Enviando via ${effectiveChannel} para ${user.phone?.slice(0, 5)}***`);
      console.log(`[PWA Invites] URL completa: ${inviteUrl}`);

      const { data, error } = await supabase.functions.invoke("send-pwa-notification", {
        body: {
          to: user.phone,
          template: "invitation",
          variables: {
            "1": user.name || "Usuário",
            "2": "Equipe KnowYOU",
            "3": inviteUrl, // URL COMPLETA
          },
          channel: effectiveChannel,
          userId: user.id,
        },
      });

      // A função agora sempre retorna 200, verificamos success no payload
      console.log("[PWA Invites] Resposta:", data);

      if (error) {
        // Erro de invocação (rede, etc)
        console.error("[PWA Invites] Erro de invocação:", error);
        toast.error(`Erro de conexão: ${error.message || "Tente novamente"}`);
        return;
      }

      if (data?.success) {
        recordSend();
        const channelName = data.channel === "whatsapp" ? "WhatsApp" : "SMS";
        const providerInfo = data.provider ? ` via ${data.provider}` : "";
        toast.success(`Convite enviado via ${channelName}${providerInfo}!`);
      } else {
        // Erro de negócio - agora temos detalhes!
        const errorDetail = data?.error || "Erro desconhecido";
        const errorCode = data?.error_code ? `[${data.error_code}]` : "";
        toast.error(`Falha ao enviar ${errorCode}: ${errorDetail}`);
      }
    } catch (err) {
      console.error("[PWA Invites] Exceção:", err);
      toast.error("Erro ao enviar convite");
    } finally {
      setSending(null);
    }
  };

  const resendWelcome = async (invite: PWAInvite) => {
    // Rate limit check
    if (!checkRateLimit()) {
      return;
    }
    
    setSending(invite.id);
    try {
      const user = invite.pwa_users;
      if (!user?.phone) throw new Error("Telefone não encontrado");

      const pwaUrl = `${window.location.origin}/pwa`;

      const { data, error } = await supabase.functions.invoke("send-pwa-notification", {
        body: {
          to: user.phone,
          template: "resend_welcome",
          variables: { 
            "1": user.name || "Usuário"
          },
          channel: "whatsapp",
          userId: user.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        recordSend(); // Record successful send for rate limiting
        toast.success("Boas-vindas reenviadas!");
      } else {
        toast.error(data?.error || "Falha ao reenviar");
      }
    } catch (err) {
      toast.error("Erro ao reenviar boas-vindas");
    } finally {
      setSending(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const deleteInvite = async (id: string) => {
    try {
      await (supabase as any).from("pwa_invites").delete().eq("id", id);
      toast.success("Convite removido");
      fetchData();
    } catch (err) {
      toast.error("Erro ao remover convite");
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="w-4 h-4" />;
      case "whatsapp": return <MessageSquare className="w-4 h-4" />;
      case "sms": return <Smartphone className="w-4 h-4" />;
      default: return null;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "email": return "border-blue-500 text-blue-500";
      case "whatsapp": return "border-green-500 text-green-500";
      case "sms": return "border-purple-500 text-purple-500";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Convite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Convite</DialogTitle>
              <DialogDescription>
                Preencha os dados do usuário e escolha o canal de envio
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (com DDD)</Label>
                  <Input
                    id="phone"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+5511999999999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Canal de Envio</Label>
                <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as InviteChannel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        WhatsApp (preferencial)
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-500" />
                        SMS
                      </div>
                    </SelectItem>
                    <SelectItem value="email" disabled>
                      <div className="flex items-center gap-2 opacity-50">
                        <Mail className="w-4 h-4 text-blue-500" />
                        Email (em breve)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createInvite} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Convite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-3">
          <p className="text-2xl font-bold">{invites.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold text-green-500">
            {invites.filter(i => i.is_used).length}
          </p>
          <p className="text-xs text-muted-foreground">Usados</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold text-amber-500">
            {invites.filter(i => !i.is_used).length}
          </p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </Card>
      </div>

      {/* Tabela de Convites */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum convite criado ainda
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invite.pwa_users?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.pwa_users?.email || invite.pwa_users?.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {invite.access_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyCode(invite.access_code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getChannelColor(invite.channel)}>
                      <span className="flex items-center gap-1">
                        {getChannelIcon(invite.channel)}
                        {invite.channel}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invite.is_used ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Usado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!invite.is_used && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => sendInvite(invite)}
                          disabled={sending === invite.id}
                          title="Enviar convite"
                        >
                          {sending === invite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      {invite.is_used && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-400"
                          onClick={() => resendWelcome(invite)}
                          disabled={sending === invite.id}
                          title="Reenviar boas-vindas"
                        >
                          {sending === invite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteInvite(invite.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
