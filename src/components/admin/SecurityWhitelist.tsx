import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Shield, 
  Plus, 
  Trash2, 
  RefreshCw,
  Globe,
  User,
  Calendar,
  Info,
  Fingerprint,
  ShieldCheck,
  Copy
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";

interface WhitelistEntry {
  id: string;
  ip_address: string;
  device_fingerprint: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export function SecurityWhitelist() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  const [currentFingerprint, setCurrentFingerprint] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    ip_address: "",
    device_fingerprint: "",
    user_name: "",
    user_email: "",
    description: "",
    expires_at: "",
  });

  // Get current device info on mount
  useEffect(() => {
    fetchCurrentIP();
    const fingerprint = getDeviceFingerprint();
    setCurrentFingerprint(fingerprint);
  }, []);

  const fetchCurrentIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setCurrentIP(data.ip);
    } catch {
      console.error("Could not fetch current IP");
    }
  };

  // Fetch whitelist entries
  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["security-whitelist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_whitelist")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as WhitelistEntry[];
    },
  });

  // Add mutation using edge function
  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: result, error } = await supabase.functions.invoke("add-to-whitelist", {
        body: {
          ipAddress: data.ip_address || undefined,
          deviceFingerprint: data.device_fingerprint || undefined,
          userName: data.user_name || undefined,
          userEmail: data.user_email || undefined,
          description: data.description || undefined,
          expiresAt: data.expires_at || undefined,
        },
      });
      
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || "Erro desconhecido");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-whitelist"] });
      toast.success("Adicionado à whitelist com sucesso");
      setIsAddDialogOpen(false);
      setFormData({
        ip_address: "",
        device_fingerprint: "",
        user_name: "",
        user_email: "",
        description: "",
        expires_at: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("security_whitelist")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-whitelist"] });
      toast.success("Status atualizado");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("security_whitelist")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-whitelist"] });
      toast.success("Entrada removida");
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  // Whitelist my device mutation
  const whitelistMyDeviceMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase.functions.invoke("add-to-whitelist", {
        body: {
          ipAddress: currentIP,
          deviceFingerprint: currentFingerprint,
          userName: user?.user_metadata?.full_name || "Admin",
          userEmail: user?.email,
          description: "Auto-whitelist do dispositivo do administrador",
        },
      });
      
      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || "Erro desconhecido");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-whitelist"] });
      toast.success("Seu dispositivo foi adicionado à whitelist!");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleAdd = () => {
    if (!formData.ip_address && !formData.device_fingerprint) {
      toast.error("IP ou Device Fingerprint é obrigatório");
      return;
    }
    addMutation.mutate(formData);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Whitelist de Segurança</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => whitelistMyDeviceMutation.mutate()}
            disabled={whitelistMyDeviceMutation.isPending || (!currentIP && !currentFingerprint)}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            {whitelistMyDeviceMutation.isPending ? "Adicionando..." : "Whitelist Meu Dispositivo"}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar à Whitelist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* IP Address */}
                <div className="space-y-2">
                  <Label htmlFor="ip_address">Endereço IP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ip_address"
                      placeholder="Ex: 192.168.1.1"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (currentIP) {
                          setFormData({ ...formData, ip_address: currentIP });
                        }
                      }}
                      disabled={!currentIP}
                    >
                      Meu IP
                    </Button>
                  </div>
                  {currentIP && (
                    <p className="text-xs text-muted-foreground">
                      Seu IP atual: {currentIP}
                    </p>
                  )}
                </div>

                {/* Device Fingerprint */}
                <div className="space-y-2">
                  <Label htmlFor="device_fingerprint">Device Fingerprint</Label>
                  <div className="flex gap-2">
                    <Input
                      id="device_fingerprint"
                      placeholder="Ex: abc123xyz..."
                      value={formData.device_fingerprint}
                      onChange={(e) => setFormData({ ...formData, device_fingerprint: e.target.value })}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (currentFingerprint) {
                          setFormData({ ...formData, device_fingerprint: currentFingerprint });
                        }
                      }}
                      disabled={!currentFingerprint}
                    >
                      Meu Device
                    </Button>
                  </div>
                  {currentFingerprint && (
                    <p className="text-xs text-muted-foreground">
                      Seu fingerprint: {currentFingerprint.substring(0, 20)}...
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="user_name">Nome do Usuário</Label>
                  <Input
                    id="user_name"
                    placeholder="Ex: Fernando (Admin)"
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="user_email">Email</Label>
                  <Input
                    id="user_email"
                    type="email"
                    placeholder="Ex: admin@knowyou.app"
                    value={formData.user_email}
                    onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Ex: Super Admin - Acesso para desenvolvimento"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expiração (opcional)</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para whitelist permanente
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleAdd} disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-500">O que é a Whitelist?</p>
              <p className="text-sm text-muted-foreground mt-1">
                IPs e dispositivos na whitelist podem usar DevTools e outras ferramentas de desenvolvimento 
                <strong className="text-foreground"> sem serem banidos</strong>. 
                As ações ainda são registradas na auditoria (com flag "whitelisted"), 
                mas nenhuma ação punitiva é tomada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Device Info */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Fingerprint className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-500">Seu Dispositivo Atual</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">IP:</span>
                  <code className="bg-muted px-1 rounded">{currentIP || "Carregando..."}</code>
                  {currentIP && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(currentIP, "IP")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Fingerprint className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Fingerprint:</span>
                  <code className="bg-muted px-1 rounded truncate max-w-[200px]">
                    {currentFingerprint || "Carregando..."}
                  </code>
                  {currentFingerprint && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(currentFingerprint, "Fingerprint")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Entradas na Whitelist</CardTitle>
          <CardDescription>
            {entries?.length || 0} entrada(s) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries && entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP / Device</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
                  
                  return (
                    <TableRow key={entry.id} className={isExpired ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <code className="text-sm">{entry.ip_address}</code>
                          </div>
                          {entry.device_fingerprint && (
                            <div className="flex items-center gap-2">
                              <Fingerprint className="h-4 w-4 text-muted-foreground" />
                              <code className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {entry.device_fingerprint}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 w-5 p-0"
                                onClick={() => copyToClipboard(entry.device_fingerprint!, "Fingerprint")}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {entry.user_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{entry.user_name}</span>
                            </div>
                          )}
                          {entry.user_email && (
                            <span className="text-xs text-muted-foreground">{entry.user_email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {entry.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={entry.is_active}
                            onCheckedChange={(checked) => 
                              toggleMutation.mutate({ id: entry.id, is_active: checked })
                            }
                            disabled={toggleMutation.isPending}
                          />
                          {isExpired ? (
                            <Badge variant="outline" className="text-red-500">Expirado</Badge>
                          ) : entry.is_active ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.expires_at ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(entry.expires_at).toLocaleDateString("pt-BR")}
                          </div>
                        ) : (
                          <Badge variant="secondary">Permanente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            if (confirm("Remover esta entrada da whitelist?")) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma entrada na whitelist</p>
              <p className="text-sm mt-1">Adicione IPs ou dispositivos para permitir uso de DevTools</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
